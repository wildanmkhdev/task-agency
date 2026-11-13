/**
 * Laporan anomali data untuk direview owner/admin.
 *
 *   npx tsx scripts/laporan-anomali.ts
 *
 * Output: `docs/anomali-review-<tanggal>.xlsx`
 *
 * Read-only. Sumber: tabel `pesanan`/`penjoki` + file Excel di folder data/.
 * Yang dilaporkan:
 *   1. Ringkasan kategori anomali.
 *   2. Transaksi duplikat persis (tanggal + tim + penjoki + nominal sama).
 *   3. Baris dengan Status Gaji Penjoki belum TRUE (FALSE/kosong).
 *   4. Transaksi lintas tim (penjoki mengerjakan pesanan tim lain).
 *   5. Nama di Excel yang digabung ke nama master (alias).
 *   6. 5 baris Oktober yang dikecualikan dari rekap (footer Excel).
 *   7. Penjoki yang datanya belum lengkap / belum punya transaksi.
 */

import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { KODE_DI_LUAR_REKAP } from "../src/lib/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const DIR_DATA = path.join(__dirname, "../data");
const DIR_OUT = path.join(__dirname, "../docs");
const rp = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const PREFIX: Record<string, string> = {
  September: "TRX-SEP26-",
  Oktober: "TRX-OKT26-",
  November: "TRX-NOV26-",
};

/** Data November dibersihkan 14 Nov 2026; ikutkan hanya bila diminta. */
const DENGAN_NOVEMBER = process.argv.includes("--dengan-november");
const SHEET_AKTIF = Object.keys(PREFIX).filter(
  (s) => DENGAN_NOVEMBER || s !== "November"
);

/** Harus sama dengan scripts/rebuild-data.ts. */
const ALIAS: Record<string, string> = {
  "kholil anwar": "Kholilul Anwar",
  "kholul anwar": "Kholilul Anwar",
  "muhammad fawaid": "Kholilul Anwar",
  "ni putu anik": "Ni Putu Anik Pradnyantri",
  "ni kadek risma": "Ni Kadek Risma Arisanti",
  "ni kadek risma arisanti": "Ni Kadek Risma Arisanti",
  "mita lusri": "Mita Lusari",
  "muhamad fahmi affani": "Muhammad Fahmi Affani",
  "muhammad fahmi fanani": "Muhammad Fahmi Affani",
  "alfi fitria": "Alfi Fitria Salsabila",
  "anisa asni": "Annisa Asni",
  "ayu hakikatul": "Ayu Hakikatul Maula",
  "desy amalia": "Desi Amalia",
  "lilis anggreini": "Lilis Anggreni",
};

function loadEnv(): void {
  for (const nama of [".env", ".env.local"]) {
    const file = path.join(__dirname, "..", nama);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  }
}

function excelPath(): string {
  const file = fs
    .readdirSync(DIR_DATA)
    .find((f) => f.toLowerCase().endsWith(".xlsx"));
  if (!file) throw new Error(`Tidak ada file .xlsx di ${DIR_DATA}`);
  return path.join(DIR_DATA, file);
}

function tambahSheet<T extends object>(
  wb: ExcelJS.Workbook,
  nama: string,
  kolom: { header: string; key: keyof T; width: number }[],
  rows: T[]
): void {
  const ws = wb.addWorksheet(nama);
  ws.columns = kolom.map((k) => ({ header: k.header, key: k.key, width: k.width }));
  ws.getRow(1).font = { bold: true };
  for (const r of rows) ws.addRow(r);
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: kolom.length },
  };
}

async function main(): Promise<void> {
  loadEnv();

  const teams = await prisma.team.findMany();
  const teamNama = new Map(teams.map((t) => [t.id, t.nama]));
  const pesanan = await prisma.pesanan.findMany({
    select: {
      kode: true,
      tanggal: true,
      harga: true,
      teamId: true,
      penjokiId: true,
      penjoki: { select: { nama: true, teamId: true, noHp: true, ratingSkill: true } },
    },
    orderBy: { kode: "asc" },
  });
  const penjoki = await prisma.penjoki.findMany({
    orderBy: [{ teamId: "asc" }, { nama: "asc" }],
    include: { team: true },
  });

  // ---------- 1. duplikat persis ----------
  const grup = new Map<string, typeof pesanan>();
  for (const p of pesanan) {
    const k = [
      p.tanggal.toISOString().slice(0, 10),
      p.teamId,
      p.penjokiId,
      p.harga,
    ].join("|");
    grup.set(k, [...(grup.get(k) ?? []), p]);
  }
  const duplikat = [...grup.values()]
    .filter((g) => g.length > 1)
    .map((g) => ({
      tanggal: g[0].tanggal.toISOString().slice(0, 10),
      tim: teamNama.get(g[0].teamId)!,
      penjoki: g[0].penjoki.nama,
      nominal: g[0].harga,
      jumlah: g.length,
      kode: g.map((x) => x.kode).join(", "),
    }));

  // ---------- 2. status gaji penjoki belum TRUE ----------
  const wbExcel = new ExcelJS.Workbook();
  await wbExcel.xlsx.readFile(excelPath());
  const gajiBelum = [] as {
    kode: string;
    tanggal: string;
    tim: string;
    penjoki: string;
    nominal: number;
    status: string;
  }[];
  for (const [sheet, prefix] of Object.entries(PREFIX)) {
    if (!SHEET_AKTIF.includes(sheet)) continue;
    const ws = wbExcel.getWorksheet(sheet);
    if (!ws) continue;
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const d = row.getCell(1).value;
      if (!(d instanceof Date)) continue;
      const harga = Math.round(Number(row.getCell(5).value) || 0);
      if (harga <= 0) continue;
      const v = row.getCell(3).value;
      if (v === true) continue;
      gajiBelum.push({
        kode: `${prefix}${String(r).padStart(4, "0")}`,
        tanggal: d.toISOString().slice(0, 10),
        tim: String(row.getCell(2).value ?? "").trim().replace(/^TIM /, "Tim "),
        penjoki: String(row.getCell(4).value ?? "").replace(/\s+/g, " ").trim(),
        nominal: harga,
        status: v === false ? "FALSE" : "KOSONG",
      });
    }
  }

  // ---------- 3. lintas tim ----------
  const lintas = pesanan
    .filter((p) => p.teamId !== p.penjoki.teamId)
    .map((p) => ({
      kode: p.kode,
      tanggal: p.tanggal.toISOString().slice(0, 10),
      timTransaksi: teamNama.get(p.teamId)!,
      penjoki: p.penjoki.nama,
      timAsal: teamNama.get(p.penjoki.teamId)!,
      nominal: p.harga,
    }));

  // ---------- 4. alias ----------
  const aliasRows = [] as {
    tim: string;
    namaExcel: string;
    digabungKe: string;
    jumlah: number;
    nominal: number;
  }[];
  const aliasMap = new Map<string, (typeof aliasRows)[number]>();
  for (const [sheet, prefix] of Object.entries(PREFIX)) {
    if (!SHEET_AKTIF.includes(sheet)) continue;
    const ws = wbExcel.getWorksheet(sheet);
    if (!ws) continue;
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const d = row.getCell(1).value;
      if (!(d instanceof Date)) continue;
      const harga = Math.round(Number(row.getCell(5).value) || 0);
      if (harga <= 0) continue;
      const nama = String(row.getCell(4).value ?? "").replace(/\s+/g, " ").trim();
      const target = ALIAS[norm(nama)];
      if (!target || target === nama) continue;
      const tim = String(row.getCell(2).value ?? "").trim().replace(/^TIM /, "Tim ");
      const key = `${tim}|${norm(nama)}`;
      const cur =
        aliasMap.get(key) ??
        { tim, namaExcel: nama, digabungKe: target, jumlah: 0, nominal: 0 };
      cur.jumlah += 1;
      cur.nominal += harga;
      aliasMap.set(key, cur);
    }
  }
  aliasRows.push(...aliasMap.values());

  // ---------- 5. Oktober dikecualikan ----------
  const dikecualikan = pesanan
    .filter((p) => KODE_DI_LUAR_REKAP.has(p.kode))
    .map((p) => ({
      kode: p.kode,
      tanggal: p.tanggal.toISOString().slice(0, 10),
      tim: teamNama.get(p.teamId)!,
      penjoki: p.penjoki.nama,
      nominal: p.harga,
    }));

  // ---------- 6. penjoki perlu data ----------
  const trxPerPenjoki = new Map<string, number>();
  for (const p of pesanan) {
    trxPerPenjoki.set(p.penjokiId, (trxPerPenjoki.get(p.penjokiId) ?? 0) + 1);
  }
  const penjokiPerlu = penjoki
    .filter(
      (p) =>
        !p.noHp ||
        p.ratingSkill === null ||
        (trxPerPenjoki.get(p.id) ?? 0) === 0 ||
        p.keterangan?.includes("Perlu review")
    )
    .map((p) => ({
      tim: p.team.nama,
      nama: p.nama,
      noHp: p.noHp ?? "-",
      rating: p.ratingSkill ?? "-",
      jumlahTransaksi: trxPerPenjoki.get(p.id) ?? 0,
      catatan: [
        !p.noHp ? "HP kosong" : "",
        p.ratingSkill === null ? "rating kosong" : "",
        (trxPerPenjoki.get(p.id) ?? 0) === 0 ? "belum ada transaksi" : "",
        p.keterangan?.includes("Perlu review") ? "nama tidak ada di DOCX" : "",
      ]
        .filter(Boolean)
        .join("; "),
    }));

  // ---------- 7. sinkron penjoki vs sheet ----------
  // Peta kode transaksi -> posisi baris aslinya di sheet (agar bisa ditunjuk
  // "Oktober baris 397" saat review).
  const posisi = new Map<string, { sheet: string; row: number; raw: string; tim: string }>();
  for (const [sheet, prefix] of Object.entries(PREFIX)) {
    if (!SHEET_AKTIF.includes(sheet)) continue;
    const ws = wbExcel.getWorksheet(sheet);
    if (!ws) continue;
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const d = row.getCell(1).value;
      if (!(d instanceof Date)) continue;
      const harga = Math.round(Number(row.getCell(5).value) || 0);
      if (harga <= 0) continue;
      posisi.set(`${prefix}${String(r).padStart(4, "0")}`, {
        sheet,
        row: r,
        raw: String(row.getCell(4).value ?? "").replace(/\s+/g, " ").trim(),
        tim: String(row.getCell(2).value ?? "").trim().replace(/^TIM /, "Tim "),
      });
    }
  }

  /** "8-9,19,28-30" — ringkas nomor baris berurutan. */
  const ringkasBaris = (nomor: number[]): string => {
    const s = [...nomor].sort((a, b) => a - b);
    const out: string[] = [];
    let i = 0;
    while (i < s.length) {
      let j = i;
      while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
      out.push(i === j ? `${s[i]}` : `${s[i]}-${s[j]}`);
      i = j + 1;
    }
    return out.join(",");
  };

  const barisPerPenjoki = new Map<
    string,
    { sheet: string; row: number; raw: string; tim: string; kode: string }[]
  >();
  const hargaPerKode = new Map(pesanan.map((p) => [p.kode, p.harga]));
  for (const p of pesanan) {
    const pos = posisi.get(p.kode);
    if (!pos) continue;
    barisPerPenjoki.set(p.penjokiId, [
      ...(barisPerPenjoki.get(p.penjokiId) ?? []),
      { ...pos, kode: p.kode },
    ]);
  }

  const sinkron = penjoki.map((x) => {
    const baris = barisPerPenjoki.get(x.id) ?? [];
    const namaBeda = baris.filter((b) => norm(b.raw) !== norm(x.nama));
    const lintas = baris.filter((b) => b.tim !== x.team.nama);
    const status = [
      namaBeda.length ? "NAMA BEDA" : "",
      lintas.length ? "LINTAS TIM" : "",
      baris.length === 0 ? "TANPA TRANSAKSI" : "",
      x.keterangan?.includes("Perlu review") ? "TIDAK ADA DI DOCX" : "",
    ].filter(Boolean);
    const barisBermasalah = [
      ...new Set([...namaBeda.map((b) => b.row), ...lintas.map((b) => b.row)]),
    ];
    const perluSemuaBaris = baris.length === 0 || x.keterangan?.includes("Perlu review");
    const barisTampil = perluSemuaBaris
      ? baris
      : baris.filter((b) => barisBermasalah.includes(b.row) && (norm(b.raw) !== norm(x.nama) || b.tim !== x.team.nama));
    const formatBaris = (daftar: typeof baris): string =>
      ["September", "Oktober", "November"]
        .filter((s) => SHEET_AKTIF.includes(s))
        .map((s) => {
          const rows = daftar.filter((b) => b.sheet === s).map((b) => b.row);
          return rows.length ? `${s.slice(0, 3)} ${ringkasBaris(rows)}` : "";
        })
        .filter(Boolean)
        .join(" · ");
    return {
      tim: x.team.nama,
      nama: x.nama,
      status: status.length ? status.join(" + ") : "SINKRON",
      jumlahTransaksi: baris.length,
      nominal: baris.reduce((s, b) => s + (hargaPerKode.get(b.kode) ?? 0), 0),
      barisExcel: status.length ? formatBaris(barisTampil) || "-" : "-",
      catatan: [
        namaBeda.length
          ? `Di sheet tertulis ${[...new Set(namaBeda.map((b) => `"${b.raw}"`))].join(", ")}`
          : "",
        lintas.length
          ? `Dicatat di ${[...new Set(lintas.map((b) => b.tim))].join(", ")} (tim asal ${x.team.nama})`
          : "",
        baris.length === 0 ? "Tidak ada transaksi Sep/Okt" : "",
        x.keterangan?.includes("Perlu review") ? "Nama tidak ada di rekap DOCX" : "",
      ]
        .filter(Boolean)
        .join("; "),
    };
  });

  // ---------- tulis Excel ----------
  const wb = new ExcelJS.Workbook();
  wb.creator = "task-agency";

  const ringkasan = [
    { kategori: "Transaksi duplikat persis", jumlah: duplikat.length, nominal: duplikat.reduce((s, x) => s + x.nominal * (x.jumlah - 1), 0), catatan: "Sama tanggal + tim + penjoki + nominal" },
    { kategori: "Status Gaji Penjoki belum TRUE", jumlah: gajiBelum.length, nominal: gajiBelum.reduce((s, x) => s + x.nominal, 0), catatan: "FALSE/kosong di Excel; aplikasi belum menyimpan status ini" },
    { kategori: "Transaksi lintas tim", jumlah: lintas.length, nominal: lintas.reduce((s, x) => s + x.nominal, 0), catatan: "Penjoki mengerjakan pesanan tim lain" },
    { kategori: "Nama di-alias", jumlah: aliasRows.reduce((s, x) => s + x.jumlah, 0), nominal: aliasRows.reduce((s, x) => s + x.nominal, 0), catatan: "Nama Excel digabung ke nama master" },
    { kategori: "Oktober dikecualikan dari rekap", jumlah: dikecualikan.length, nominal: dikecualikan.reduce((s, x) => s + x.nominal, 0), catatan: "Agar total = footer Excel" },
    { kategori: "Penjoki perlu dilengkapi", jumlah: penjokiPerlu.length, nominal: 0, catatan: "HP/rating/transaksi/nama perlu review" },
    { kategori: "Penjoki tidak sinkron dengan sheet", jumlah: sinkron.filter((x) => x.status !== "SINKRON").length, nominal: 0, catatan: "Nama beda / lintas tim / tanpa transaksi — detail di sheet Sinkron Penjoki" },
  ];
  tambahSheet(
    wb,
    "Ringkasan",
    [
      { header: "Kategori", key: "kategori", width: 40 },
      { header: "Jumlah", key: "jumlah", width: 10 },
      { header: "Nominal", key: "nominal", width: 18 },
      { header: "Catatan", key: "catatan", width: 55 },
    ],
    ringkasan
  );
  const wsRingkas = wb.getWorksheet("Ringkasan")!;
  for (let r = 2; r <= wsRingkas.rowCount; r++) {
    wsRingkas.getCell(`C${r}`).numFmt = '"Rp"#,##0';
  }

  tambahSheet(
    wb,
    "Duplikat",
    [
      { header: "Tanggal", key: "tanggal", width: 12 },
      { header: "Tim", key: "tim", width: 10 },
      { header: "Penjoki", key: "penjoki", width: 28 },
      { header: "Nominal", key: "nominal", width: 14 },
      { header: "Jumlah", key: "jumlah", width: 8 },
      { header: "Kode", key: "kode", width: 45 },
    ],
    duplikat
  );

  tambahSheet(
    wb,
    "Gaji Penjoki Belum TRUE",
    [
      { header: "Kode", key: "kode", width: 20 },
      { header: "Tanggal", key: "tanggal", width: 12 },
      { header: "Tim", key: "tim", width: 10 },
      { header: "Penjoki", key: "penjoki", width: 28 },
      { header: "Nominal", key: "nominal", width: 14 },
      { header: "Status", key: "status", width: 10 },
    ],
    gajiBelum
  );

  tambahSheet(
    wb,
    "Lintas Tim",
    [
      { header: "Kode", key: "kode", width: 20 },
      { header: "Tanggal", key: "tanggal", width: 12 },
      { header: "Tim Transaksi", key: "timTransaksi", width: 16 },
      { header: "Penjoki", key: "penjoki", width: 28 },
      { header: "Tim Asal", key: "timAsal", width: 12 },
      { header: "Nominal", key: "nominal", width: 14 },
    ],
    lintas
  );

  tambahSheet(
    wb,
    "Alias Nama",
    [
      { header: "Tim", key: "tim", width: 10 },
      { header: "Nama di Excel", key: "namaExcel", width: 28 },
      { header: "Digabung ke", key: "digabungKe", width: 28 },
      { header: "Jumlah", key: "jumlah", width: 10 },
      { header: "Nominal", key: "nominal", width: 16 },
    ],
    aliasRows
  );

  tambahSheet(
    wb,
    "Oktober Dikecualikan",
    [
      { header: "Kode", key: "kode", width: 20 },
      { header: "Tanggal", key: "tanggal", width: 12 },
      { header: "Tim", key: "tim", width: 10 },
      { header: "Penjoki", key: "penjoki", width: 28 },
      { header: "Nominal", key: "nominal", width: 14 },
    ],
    dikecualikan
  );

  tambahSheet(
    wb,
    "Penjoki Perlu Data",
    [
      { header: "Tim", key: "tim", width: 10 },
      { header: "Nama", key: "nama", width: 28 },
      { header: "No HP", key: "noHp", width: 18 },
      { header: "Rating", key: "rating", width: 8 },
      { header: "Jumlah Transaksi", key: "jumlahTransaksi", width: 16 },
      { header: "Catatan", key: "catatan", width: 45 },
    ],
    penjokiPerlu
  );

  tambahSheet(
    wb,
    "Sinkron Penjoki",
    [
      { header: "Tim", key: "tim", width: 10 },
      { header: "Nama Master", key: "nama", width: 28 },
      { header: "Status", key: "status", width: 34 },
      { header: "Jumlah Trx", key: "jumlahTransaksi", width: 12 },
      { header: "Nominal", key: "nominal", width: 16 },
      { header: "Baris Excel (yang tidak sinkron)", key: "barisExcel", width: 60 },
      { header: "Catatan", key: "catatan", width: 60 },
    ],
    sinkron
  );

  for (const nama of ["Duplikat", "Gaji Penjoki Belum TRUE", "Lintas Tim", "Alias Nama", "Oktober Dikecualikan", "Sinkron Penjoki"]) {
    const ws = wb.getWorksheet(nama)!;
    const kolom = nama === "Duplikat" ? 4 : nama === "Alias Nama" ? 5 : nama === "Sinkron Penjoki" ? 5 : 5;
    for (let r = 2; r <= ws.rowCount; r++) ws.getCell(r, kolom).numFmt = '"Rp"#,##0';
  }

  fs.mkdirSync(DIR_OUT, { recursive: true });
  const tanggal = new Date().toLocaleDateString("en-CA");
  const file = path.join(DIR_OUT, `anomali-review-${tanggal}.xlsx`);
  await wb.xlsx.writeFile(file);

  console.log(`✔ ${file}`);
  console.log(`  duplikat ${duplikat.length} grup · gaji belum TRUE ${gajiBelum.length} baris`);
  console.log(`  lintas tim ${lintas.length} trx (${rp(lintas.reduce((s, x) => s + x.nominal, 0))})`);
  console.log(`  alias ${aliasRows.reduce((s, x) => s + x.jumlah, 0)} trx · penjoki perlu data ${penjokiPerlu.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
