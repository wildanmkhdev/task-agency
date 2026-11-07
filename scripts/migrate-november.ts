/**
 * Migrasi sheet "November" → tabel pesanan (hanya November 2026).
 * Idempoten via skipDuplicates + kode unik TRX-NOV26-XXXX.
 * Run: npx tsx scripts/migrate-november.ts
 *
 * Aturan yang dipakai (sama dengan import September/Oktober):
 * - Semua baris bertanggal dianggap transaksi SELESAI + LUNAS.
 *   Kolom "Status Gaji Penjoki = FALSE" berarti fee penjoki belum dibayar
 *   owner, BUKAN transaksi belum selesai — lihat scripts/cleanup-import.ts.
 * - 22 baris TIM 5 tidak punya nama penjoki di sheet. Baris tetap diimpor
 *   dengan penjoki placeholder "[TANPA PENJOKI]" supaya nominalnya tidak
 *   hilang dari rekap. Perbaiki nama penjokinya kapan saja.
 * - Nama "ina" (TIM 2) belum ada padanannya di master penjoki → dibuat
 *   penjoki baru "Ina" di Tim 2.
 */

import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const PLACEHOLDER = "[TANPA PENJOKI]";

const ALIAS: Record<string, string> = {
  riski: "Riski", rizki: "Riski", riskisupriyanti: "Riski",
  wildan: "Wildan Mukhaladun", "wildan.": "Wildan Mukhaladun",
  wildn: "Wildan Mukhaladun", wildanp: "Wildan Mukhaladun",
  zulfa: "Zulfa Jalila",
  desi: "Desi Amalia", dessi: "Desi Amalia", dess: "Desi Amalia",
  desisafira: "Desi Amalia",
  mita: "Mita Lusari", mitta: "Mita Lusari", mila: "Mita Lusari",
  lisa: "Mita Lusari", mia: "Mita Lusari",
  fahmi: "Muhammad Fahmi Affani",
  muhammadfahmifanani: "Muhammad Fahmi Affani",
  huda: "Alamul Huda", hud: "Alamul Huda", hudq: "Alamul Huda",
  kholil: "Kholilul Anwar", fawaid: "Kholilul Anwar",
  kholilanwar: "Kholilul Anwar",
  akmal: "Akmal Falasifa", akml: "Akmal Falasifa",
  fira: "Nur Safira",
  anisq: "Desy Windayani", dyora: "Desy Windayani", dyra: "Desy Windayani",
  anita: "Anita Sari",
  dara: "Dara Hayuning Priati", dyah: "Dara Hayuning Priati",
  rania: "Dara Hayuning Priati", raniaa: "Dara Hayuning Priati",
  ranianuril: "Dara Hayuning Priati",
  lika: "Lika",
  lita: "Affina Intan Permata", sabrina: "Affina Intan Permata",
  sabrinaoktaviani: "Affina Intan Permata",
  fadli: "Fadli Romadhan",
  eca: "Surty Septriana", sola: "Surty Septriana",
  vina: "Firsty Ayesha",
  kakawas: "Fadli Romadhan", "kak awas": "Fadli Romadhan",
  ajeng: "Jessiana Olita",
  arisanti: "Arisanti",
  ayu: "Ayu Hakikatul", echa: "Ayu Hakikatul", ayuhakikatulmaula: "Ayu Hakikatul",
  lilis: "Lilis Anggreni", nilna: "Lilis Anggreni",
  lilisanggreini: "Lilis Anggreni",
  // Varian nama "Ni Kadek Risma ..." di Excel → master "Arisanti" (Tim 4).
  // Sebelumnya varian ini membuat penjoki duplikat.
  nikadekrismaarisanti: "Arisanti", nikadekrisma: "Arisanti",
  muhith: "Abdul Muhith",
  shinta: "Shinta Kurniawati",
  ami: "Annisa Nurpatiana", anisa: "Annisa Nurpatiana",
  nindiya: "Annisa Nurpatiana",
  salsa: "Arisanti",
  anik: "Ni Putu Anik Pradnyantri",
  muhyi: "Muhyi",
  radit: "M. Radit Apriansyah", givan: "M. Radit Apriansyah",
  tinia: "Tinia", intan: "Intan",
  asrori: "Annisa Asni",
  awas: "Kak Awas", "awas.": "Kak Awas", awass: "Kak Awas",
  awasa: "Kak Awas", awasss: "Kak Awas", awws: "Kak Awas",
  yuyun: "Yuyun Puji Utami",
};

const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "");

function excelPath(): string {
  const dir = path.join(__dirname, "../data");
  const file = fs.readdirSync(dir).find((f) => f.toLowerCase().endsWith(".xlsx"));
  if (!file) throw new Error(`Tidak ada file .xlsx di ${dir}`);
  return path.join(dir, file);
}

async function main() {
  console.log("🚀 Migrasi data November 2026…");

  // --- master data ---
  const teams = await prisma.team.findMany();
  const teamMap = new Map(teams.map((t) => [norm(t.nama), t.id]));
  const teamNama = new Map(teams.map((t) => [t.id, t.nama]));

  const penjokiAll = await prisma.penjoki.findMany();
  const penjokiLookup = new Map<string, string>();
  const penjokiNama = new Map<string, string>();
  for (const p of penjokiAll) {
    penjokiLookup.set(`${p.teamId}::${norm(p.nama)}`, p.id);
    penjokiNama.set(p.id, p.nama);
  }

  const profiles = await prisma.profile.findMany();
  const adminByTeam = new Map<string, string>();
  let ownerId = "";
  for (const p of profiles) {
    if (p.role === "ADMIN" && p.teamId) adminByTeam.set(p.teamId, p.id);
    if (p.role === "OWNER") ownerId = p.id;
  }

  const jenisTugas = await prisma.jenisTugas.findMany();
  const defaultJenisId = jenisTugas.find((j) => j.nama === "Tugas Umum")?.id;
  if (!defaultJenisId) throw new Error("Jenis tugas 'Tugas Umum' tidak ditemukan");

  // --- baca Excel ---
  const xl = excelPath();
  console.log(`📄 Sumber: ${path.basename(xl)}`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xl);
  const ws = wb.getWorksheet("November");
  if (!ws) throw new Error("Sheet 'November' tidak ditemukan");

  const pending: {
    rowNum: number; tanggal: Date; teamId: string; timRaw: string;
    penjokiRaw: string; harga: number;
  }[] = [];
  const skipped: { row: number; reason: string }[] = [];

  for (let rowNum = 2; rowNum <= ws.rowCount; rowNum++) {
    const row = ws.getRow(rowNum);
    const v = (c: number) => row.getCell(c).value;

    const rawDate = v(1);
    if (String(rawDate ?? "").includes("Total Pendapatan")) break;
    if (!(rawDate instanceof Date)) continue; // baris kosong / footer

    const tanggal = rawDate;
    if (isNaN(tanggal.getTime()) || tanggal.getMonth() !== 10) {
      skipped.push({ row: rowNum, reason: `bukan November: ${tanggal.toISOString?.()}` });
      continue;
    }

    const timRaw = String(v(2) ?? "").trim();
    const teamId = teamMap.get(norm(timRaw));
    if (!teamId) { skipped.push({ row: rowNum, reason: `tim tidak dikenal: "${timRaw}"` }); continue; }

    const harga = Math.round(Number(v(5)) || 0);
    if (harga <= 0) { skipped.push({ row: rowNum, reason: `harga 0 (${timRaw})` }); continue; }

    pending.push({
      rowNum, tanggal, teamId, timRaw,
      penjokiRaw: String(v(4) ?? "").trim(),
      harga,
    });
  }

  // --- resolusi penjoki ---
  function resolvePenjokiId(teamId: string, namaRaw: string): string | null {
    const n = norm(namaRaw);
    if (!n) return null;
    const direct = penjokiLookup.get(`${teamId}::${n}`);
    if (direct) return direct;
    const canonical = ALIAS[n];
    if (canonical) {
      const scoped = penjokiLookup.get(`${teamId}::${norm(canonical)}`);
      if (scoped) return scoped;
      for (const [key, id] of penjokiLookup) if (key.endsWith(`::${norm(canonical)}`)) return id;
    }
    for (const [key, id] of penjokiLookup) if (key.endsWith(`::${n}`)) return id;
    return null;
  }

  async function ensurePenjoki(teamId: string, nama: string): Promise<string> {
    const existing = penjokiLookup.get(`${teamId}::${norm(nama)}`);
    if (existing) return existing;
    const p = await prisma.penjoki.create({
      data: { nama, teamId, keahlian: [], aktif: true },
    });
    penjokiLookup.set(`${teamId}::${norm(nama)}`, p.id);
    penjokiNama.set(p.id, p.nama);
    console.log(`  ➕ Penjoki baru: "${nama}" di ${teamNama.get(teamId)}`);
    return p.id;
  }

  // --- resolusi customer (satu customer per tim + nama penjoki kanonik) ---
  // Nama customer dibuat BERSIH (tanpa label "[IMPORT]") supaya tidak muncul
  // di UI. Customer lama yang masih berlabel tetap dipakai ulang agar tidak
  // membuat duplikat; labelnya dibersihkan oleh cleanup-import-label.ts.
  const customerMap = new Map<string, string>();
  async function ensureCustomer(teamId: string, namaRaw: string): Promise<string> {
    const nama = (namaRaw || "(tanpa nama)").trim();
    const key = `${teamId}::${norm(nama)}`;
    const cached = customerMap.get(key);
    if (cached) return cached;
    let c = await prisma.customer.findFirst({
      where: { teamId, nama: { in: [nama, `[IMPORT] ${nama}`] } },
    });
    if (!c) {
      c = await prisma.customer.create({
        data: { nama, noWa: "0", catatan: "Import Excel November 2026", teamId },
      });
    }
    customerMap.set(key, c.id);
    return c.id;
  }

  // --- susun data ---
  const data = [];
  for (const r of pending) {
    let penjokiId = resolvePenjokiId(r.teamId, r.penjokiRaw);
    if (!penjokiId && r.penjokiRaw) {
      // nama ada tapi tidak dikenal → buat penjoki dengan nama kanonik
      penjokiId = await ensurePenjoki(r.teamId, ALIAS[norm(r.penjokiRaw)] ?? r.penjokiRaw);
    }
    if (!penjokiId) {
      // nama kosong di sheet → placeholder, nominal tetap masuk rekap
      penjokiId = await ensurePenjoki(r.teamId, PLACEHOLDER);
    }

    const customerId = await ensureCustomer(
      r.teamId,
      penjokiNama.get(penjokiId) ?? r.penjokiRaw
    );
    const dibuatOleh = adminByTeam.get(r.teamId) ?? ownerId;

    data.push({
      kode: `TRX-NOV26-${String(r.rowNum).padStart(4, "0")}`,
      teamId: r.teamId,
      customerId,
      jenisTugasId: defaultJenisId,
      penjokiId,
      harga: r.harga,
      feePenjoki: Math.round(r.harga * 0.5),
      feeAdmin: Math.round(r.harga * 0.23),
      feeOwner: Math.round(r.harga * 0.2),
      jumlahKeterangan: "1 tugas",
      catatan: `Import Excel November | ${r.penjokiRaw || "(kosong)"} | ${r.timRaw} | baris ${r.rowNum}`,
      status: "SELESAI" as const,
      statusBayar: "LUNAS" as const,
      selesaiAt: r.tanggal,
      tanggal: r.tanggal,
      dibuatOleh,
    });
  }

  const hasil = await prisma.pesanan.createMany({ data, skipDuplicates: true });

  console.log(`\n✅ Baris dibaca   : ${pending.length}`);
  console.log(`✅ Inserted      : ${hasil.count}`);
  console.log(`⏭  Skip duplicate: ${data.length - hasil.count}`);
  console.log(`❌ Skipped       : ${skipped.length}`);
  for (const s of skipped) console.log(`   Row ${s.row}: ${s.reason}`);

  const total = data.reduce((s, d) => s + d.harga, 0);
  console.log(`💰 Total nominal  : Rp${total.toLocaleString("id-ID")}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
