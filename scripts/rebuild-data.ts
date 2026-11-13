/**
 * REBUILD DATA — bersihkan lalu isi ulang dari XLSX client.
 *
 * Default: **September + Oktober 2026** (rekap resmi). Data November sudah
 * dibersihkan atas permintaan owner 14 Nov 2026; pakai `--dengan-november`
 * bila suatu saat sheet November ingin diimpor lagi.
 *
 * ⚠️  DESTRUKTIF: menghapus SELURUH baris `pesanan`, `customers`, dan `penjoki`
 * sebelum mengimpor. TIM, PROFILES (akun admin/owner), dan JENIS_TUGAS tidak
 * disentuh. WAJIB backup database dulu:
 *
 *   npx tsx scripts/backup-data.ts
 *
 * Pakai:
 *   npx tsx scripts/rebuild-data.ts --dry-run                # simulasi
 *   npx tsx scripts/rebuild-data.ts --yes                    # eksekusi Sep+Okt
 *   npx tsx scripts/rebuild-data.ts --yes --dengan-november  # ikutkan November
 *
 * Aturan import:
 * - Fee dihitung ulang dari kolom Payment Cust memakai BAGI_HASIL (49/22/6/20 + Kas 3%).
 * - Semua baris dianggap SELESAI + LUNAS (sesuai rekap client).
 * - Baris footer "Total Pendapatan" & baris kosong dilewati.
 * - Nama penjoki di-alias per tim; yang tidak dikenal dibuat baru + "perlu review".
 * - Baris tanpa nama penjoki memakai penjoki "[TANPA PENJOKI]" di timnya.
 */

import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BAGI_HASIL } from "../src/lib/fee";
import { PENJOKI_DATA } from "../prisma/penjoki-data";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes("--dry-run");
const KONFIRMASI = process.argv.includes("--yes");
const DENGAN_NOVEMBER = process.argv.includes("--dengan-november");
const DIR_DATA = path.join(__dirname, "../data");

const PLACEHOLDER = "[TANPA PENJOKI]";
const LABEL_PERLU_REVIEW =
  "Perlu review: nama muncul di Excel tetapi tidak ada di rekap DOCX.";

/** Total acuan — import dianggap gagal bila tidak sama persis. */
const ACUAN: Record<string, { baris: number; total: number; kode: string }> = {
  September: { baris: 231, total: 14_153_000, kode: "SEP26" },
  Oktober: { baris: 541, total: 39_731_500, kode: "OKT26" },
  November: { baris: 353, total: 27_857_500, kode: "NOV26" },
};

/**
 * Tanggal nyasar → bulan sheet-nya. File 13 Nov 2026 sudah dibetulkan
 * client (R2 Oktober = 1 Okt, R542 = 31 Okt), jadi tidak ada koreksi.
 */
const KOREKSI_TANGGAL: Record<string, string> = {};

/** Alias per tim (kunci: nama ternormalisasi). Hanya dipakai bila target ada di tim yang sama. */
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

const norm = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const judul = (s: string) =>
  s
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

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

interface BarisImport {
  sheet: string;
  baris: number;
  kode: string;
  tanggal: Date;
  tanggalAsli: string;
  tim: string;
  penjokiRaw: string;
  harga: number;
}

/** Baca satu sheet, buang footer/baris kosong, terapkan koreksi tanggal. */
async function bacaSheet(ws: ExcelJS.Worksheet): Promise<BarisImport[]> {
  const hasil: BarisImport[] = [];
  const acuan = ACUAN[ws.name];

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const raw = row.getCell(1).value;
    if (!(raw instanceof Date)) continue; // footer "Total Pendapatan" / kosong

    const timRaw = String(row.getCell(2).value ?? "").trim();
    if (!timRaw) continue;

    const harga = Math.round(Number(row.getCell(5).value) || 0);
    if (harga <= 0) continue;

    const kunci = `${ws.name}|${r}`;
    const koreksi = KOREKSI_TANGGAL[kunci];
    const tanggal = koreksi
      ? new Date(`${koreksi}T00:00:00.000Z`)
      : new Date(
          Date.UTC(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate())
        );
    if (Number.isNaN(tanggal.getTime())) {
      throw new Error(`Tanggal tidak valid di ${kunci}`);
    }

    const prefix = acuan?.kode ?? "IMP";
    hasil.push({
      sheet: ws.name,
      baris: r,
      kode: `TRX-${prefix}-${String(r).padStart(4, "0")}`,
      tanggal,
      tanggalAsli: raw.toISOString().slice(0, 10),
      tim: timRaw,
      penjokiRaw: String(row.getCell(4).value ?? "").replace(/\s+/g, " ").trim(),
      harga,
    });

  }

  return hasil;
}

async function main(): Promise<void> {
  loadEnv();
  console.log(`📄 Sumber: ${path.basename(excelPath())}`);
  if (!DRY_RUN && !KONFIRMASI) {
    throw new Error(
      "Perintah ini DESTRUKTIF. Tambahkan --yes setelah backup database, atau --dry-run untuk simulasi."
    );
  }

  // --- 1. baca & validasi XLSX ---
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(excelPath());
  const semua: BarisImport[] = [];
  const sheetDiproses = Object.keys(ACUAN).filter(
    (nama) => DENGAN_NOVEMBER || nama !== "November"
  );
  for (const nama of sheetDiproses) {
    const ws = wb.getWorksheet(nama);
    if (!ws) throw new Error(`Sheet '${nama}' tidak ditemukan`);
    const rows = await bacaSheet(ws);
    const total = rows.reduce((s, x) => s + x.harga, 0);
    const target = ACUAN[nama];
    const cocok = rows.length === target.baris && total === target.total;
    console.log(
      `${cocok ? "✔" : "✖"} ${nama}: ${rows.length}/${target.baris} baris · ` +
        `Rp${total.toLocaleString("id-ID")} / Rp${target.total.toLocaleString("id-ID")}`
    );
    if (!cocok) throw new Error(`Angka sheet ${nama} tidak sesuai acuan.`);
    semua.push(...rows);
  }
  console.log(
    `\n📊 TOTAL: ${semua.length} baris · Rp${semua
      .reduce((s, x) => s + x.harga, 0)
      .toLocaleString("id-ID")}`
  );

  // --- 2. master tim & admin (tidak dihapus) ---
  const teams = await prisma.team.findMany();
  const teamMap = new Map(teams.map((t) => [norm(t.nama), t.id]));
  const teamNama = new Map(teams.map((t) => [t.id, t.nama]));
  for (const nama of ["Tim 2", "Tim 3", "Tim 4", "Tim 5"]) {
    if (!teamMap.has(norm(nama))) throw new Error(`Tim '${nama}' tidak ada di database`);
  }

  const profiles = await prisma.profile.findMany();
  const adminPerTim = new Map<string, string>();
  let ownerId = "";
  for (const p of profiles) {
    if (p.role === "ADMIN" && p.teamId) adminPerTim.set(p.teamId, p.id);
    if (p.role === "OWNER") ownerId = p.id;
  }
  if (!ownerId) throw new Error("Profil OWNER tidak ditemukan");

  const jenis = await prisma.jenisTugas.findFirst({ where: { nama: "Tugas Umum" } });
  const jenisUmum =
    jenis ??
    (await prisma.jenisTugas.create({
      data: { nama: "Tugas Umum", aktif: true },
    }));

  // --- 3. resolusi penjoki (seed DOCX + alias + nama tak dikenal) ---
  interface PenjokiBaru {
    nama: string;
    tim: string;
    rating: number | null;
    keahlian: string[];
    keterangan: string;
    no_hp: string;
  }

  const seed: PenjokiBaru[] = PENJOKI_DATA.map((p) => ({ ...p }));

  /** Index nama global — penjoki boleh mengerjakan pesanan tim lain. */
  const seedByNama = new Map<string, PenjokiBaru[]>();
  for (const p of seed) {
    const n = norm(p.nama);
    seedByNama.set(n, [...(seedByNama.get(n) ?? []), p]);
  }

  const kunciPenjoki = (p: { tim: string; nama: string }) =>
    `${p.tim}::${norm(p.nama)}`;

  /**
   * Urutan pencocokan: tim yang sama → alias (tim sama) → alias unik global
   * → nama unik global. Pencocokan lintas tim disengaja: ada penjoki yang
   * mengerjakan pesanan tim lain (pola "penjoki lintas tim").
   */
  function resolvePenjoki(tim: string, namaRaw: string): PenjokiBaru | undefined {
    const n = norm(namaRaw);
    if (!n) return undefined;

    const diTim = seed.find((p) => p.tim === tim && norm(p.nama) === n);
    if (diTim) return diTim;

    const target = ALIAS[n];
    if (target) {
      const nTarget = norm(target);
      const scoped = seed.find(
        (p) => p.tim === tim && norm(p.nama) === nTarget
      );
      if (scoped) return scoped;
      const globalAlias = seedByNama.get(nTarget);
      if (globalAlias?.length === 1) return globalAlias[0];
    }

    const global = seedByNama.get(n);
    if (global?.length === 1) return global[0];
    return undefined;
  }

  const baru: PenjokiBaru[] = [];
  const baruByNama = new Map<string, PenjokiBaru>();

  function penjokiBaru(tim: string, nama: string, keterangan: string): PenjokiBaru {
    const n = norm(nama);
    const ada = baruByNama.get(n);
    if (ada) return ada;
    const p: PenjokiBaru = {
      nama,
      tim,
      rating: null,
      keahlian: [],
      keterangan,
      no_hp: "",
    };
    baruByNama.set(n, p);
    baru.push(p);
    return p;
  }

  const rencana = semua.map((r) => {
    const teamId = teamMap.get(norm(r.tim))!;
    const timEntry = teams.find((t) => t.id === teamId)!;
    const penjoki = !r.penjokiRaw
      ? penjokiBaru(
          timEntry.nama,
          PLACEHOLDER,
          "Transaksi Excel tanpa nama penjoki — perlu review."
        )
      : (resolvePenjoki(timEntry.nama, r.penjokiRaw) ??
        penjokiBaru(timEntry.nama, judul(r.penjokiRaw), LABEL_PERLU_REVIEW));
    return { ...r, teamId, penjoki, kunciPenjoki: kunciPenjoki(penjoki) };
  });

  console.log(`\n👥 Penjoki seed DOCX : ${seed.length}`);
  console.log(`➕ Penjoki baru      : ${baru.length}`);
  for (const b of baru) {
    const alasan =
      b.nama === PLACEHOLDER ? "tanpa nama penjoki" : "tidak ada di rekap DOCX";
    console.log(`   · ${b.tim} — ${b.nama} (${alasan})`);
  }

  const ringkasFee = { penjoki: 0, admin: 0, owner: 0 };
  for (const r of rencana) {
    ringkasFee.penjoki += Math.round(r.harga * BAGI_HASIL.penjoki);
    ringkasFee.admin += Math.round(r.harga * BAGI_HASIL.adminCs);
    ringkasFee.owner += Math.round(r.harga * BAGI_HASIL.owner);
  }
  console.log(
    `\n💰 Fee tersimpan: penjoki Rp${ringkasFee.penjoki.toLocaleString("id-ID")} · ` +
      `admin CS Rp${ringkasFee.admin.toLocaleString("id-ID")} · ` +
      `owner Rp${ringkasFee.owner.toLocaleString("id-ID")}`
  );

  if (DRY_RUN) {
    console.log("\n🔎 DRY RUN — tidak ada perubahan database.");
    return;
  }

  // --- 4. hapus data lama ---
  console.log("\n🧹 Menghapus pesanan, customers, penjoki lama…");
  const hapusPesanan = await prisma.pesanan.deleteMany({});
  const hapusCustomer = await prisma.customer.deleteMany({});
  const hapusPenjoki = await prisma.penjoki.deleteMany({});
  console.log(
    `   ${hapusPesanan.count} pesanan · ${hapusCustomer.count} customer · ${hapusPenjoki.count} penjoki dihapus`
  );

  // --- 5. seed penjoki (44 dari DOCX + yang perlu review) ---
  const idPenjoki = new Map<string, string>();
  for (const p of [...seed, ...baru]) {
    const teamId = teamMap.get(norm(p.tim));
    if (!teamId) throw new Error(`Tim tidak dikenal untuk penjoki ${p.nama}`);
    const dibuat = await prisma.penjoki.create({
      data: {
        nama: p.nama,
        noHp: p.no_hp || null,
        teamId,
        ratingSkill: p.rating,
        keahlian: p.keahlian,
        keterangan: p.keterangan || null,
        aktif: true,
      },
    });
    idPenjoki.set(kunciPenjoki(p), dibuat.id);
  }
  console.log(`👥 ${idPenjoki.size} penjoki dibuat`);

  // --- 6. customer (1 per tim + penjoki, konvensi import sebelumnya) ---
  const idCustomer = new Map<string, string>();
  for (const r of rencana) {
    const key = `${r.teamId}::${norm(r.penjoki.nama)}`;
    if (idCustomer.has(key)) continue;
    const c = await prisma.customer.create({
      data: {
        nama: r.penjoki.nama,
        noWa: "0",
        catatan: `Import Excel ${r.sheet} 2026`,
        teamId: r.teamId,
      },
    });
    idCustomer.set(key, c.id);
  }
  console.log(`🧾 ${idCustomer.size} customer dibuat`);

  // --- 7. import pesanan ---
  const data = rencana.map((r) => {
    const pId = idPenjoki.get(r.kunciPenjoki);
    if (!pId) throw new Error(`Penjoki tidak ditemukan: ${r.penjoki.nama}`);
    const cId = idCustomer.get(`${r.teamId}::${norm(r.penjoki.nama)}`)!;
    const dibuatOleh = adminPerTim.get(r.teamId) ?? ownerId;
    const catatanDasar = `Import Excel ${r.sheet} | baris ${r.baris}`;
    const catatan =
      r.tanggalAsli !== r.tanggal.toISOString().slice(0, 10)
        ? `${catatanDasar} | tanggal asli ${r.tanggalAsli}`
        : catatanDasar;
    return {
      kode: r.kode,
      teamId: r.teamId,
      customerId: cId,
      jenisTugasId: jenisUmum.id,
      penjokiId: pId,
      harga: r.harga,
      feePenjoki: Math.round(r.harga * BAGI_HASIL.penjoki),
      feeAdmin: Math.round(r.harga * BAGI_HASIL.adminCs),
      feeOwner: Math.round(r.harga * BAGI_HASIL.owner),
      jumlahKeterangan: "1 tugas",
      catatan,
      status: "SELESAI" as const,
      statusBayar: "LUNAS" as const,
      selesaiAt: r.tanggal,
      tanggal: r.tanggal,
      dibuatOleh,
    };
  });

  for (let i = 0; i < data.length; i += 400) {
    await prisma.pesanan.createMany({ data: data.slice(i, i + 400) });
  }
  console.log(`📥 ${data.length} pesanan diimpor`);

  // --- 9. verifikasi cepat ---
  const cek = await prisma.pesanan.aggregate({
    _count: { _all: true },
    _sum: { harga: true },
  });
  const totalMasuk = cek._sum.harga ?? 0;
  const totalAcuan = sheetDiproses.reduce((s, n) => s + ACUAN[n].total, 0);
  const barisAcuan = sheetDiproses.reduce((s, n) => s + ACUAN[n].baris, 0);
  const ok = cek._count._all === barisAcuan && totalMasuk === totalAcuan;
  console.log(
    `\n${ok ? "✅" : "❌"} Terverifikasi: ${cek._count._all} baris · ` +
      `Rp${totalMasuk.toLocaleString("id-ID")}`
  );
  if (!ok) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error("\n❌", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
