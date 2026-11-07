/**
 * Menambal 6 baris Excel yang terlewat saat import September/Oktober:
 *
 *   Sheet       Baris  Tanggal      Tim    Penjoki  Nominal   Kode
 *   September   2      2026-06-28   TIM 3  Eca      80.000    TRX-SEP26-0002
 *   September   3      2026-06-29   TIM 3  Vina     68.000    TRX-SEP26-0003
 *   September   4      2026-08-19   TIM 4  Shinta   60.000    TRX-SEP26-0004
 *   Oktober     2      2026-01-02   TIM 3  Muhyi    88.000    TRX-OKT26-0002
 *   Oktober     451    2026-10-24   TIM 2  (kosong) 104.000   TRX-OKT26-0451
 *   Oktober     542    2026-11-01   TIM 4  Ayu     100.000    TRX-OKT26-0542
 *
 * Empat baris pertama bertanggal di luar bulan sheet-nya (kemungkinan salah
 * ketik bulan di Excel). Nilainya tetap dipertahankan apa adanya sesuai sheet;
 * koreksi tanggal dilakukan terpisah setelah dikonfirmasi owner.
 *
 * Idempoten: baris yang kodenya sudah ada akan dilewati.
 * Run: npx tsx scripts/fix-baris-terlewat.ts
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
  eca: "Surty Septriana",
  vina: "Firsty Ayesha",
  shinta: "Shinta Kurniawati",
  muhyi: "Muhyi",
  ayu: "Ayu Hakikatul",
};

const TARGETS = [
  { sheet: "September", row: 2, kode: "TRX-SEP26-0002" },
  { sheet: "September", row: 3, kode: "TRX-SEP26-0003" },
  { sheet: "September", row: 4, kode: "TRX-SEP26-0004" },
  { sheet: "Oktober", row: 2, kode: "TRX-OKT26-0002" },
  { sheet: "Oktober", row: 451, kode: "TRX-OKT26-0451" },
  { sheet: "Oktober", row: 542, kode: "TRX-OKT26-0542" },
] as const;

const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "");

function excelPath(): string {
  const dir = path.join(__dirname, "../data");
  const file = fs.readdirSync(dir).find((f) => f.toLowerCase().endsWith(".xlsx"));
  if (!file) throw new Error(`Tidak ada file .xlsx di ${dir}`);
  return path.join(dir, file);
}

async function main() {
  console.log("🔧 Menambal baris Excel yang terlewat…");

  const teams = await prisma.team.findMany();
  const teamMap = new Map(teams.map((t) => [norm(t.nama), t.id]));
  const teamNama = new Map(teams.map((t) => [t.id, t.nama]));

  const penjokiAll = await prisma.penjoki.findMany();
  const penjokiLookup = new Map<string, string>();
  for (const p of penjokiAll) penjokiLookup.set(`${p.teamId}::${norm(p.nama)}`, p.id);

  const profiles = await prisma.profile.findMany();
  const adminByTeam = new Map<string, string>();
  let ownerId = "";
  for (const p of profiles) {
    if (p.role === "ADMIN" && p.teamId) adminByTeam.set(p.teamId, p.id);
    if (p.role === "OWNER") ownerId = p.id;
  }

  const defaultJenisId = (await prisma.jenisTugas.findMany())
    .find((j) => j.nama === "Tugas Umum")?.id;
  if (!defaultJenisId) throw new Error("Jenis tugas 'Tugas Umum' tidak ditemukan");

  const xl = excelPath();
  console.log(`📄 Sumber: ${path.basename(xl)}`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xl);

  function resolve(teamId: string, namaRaw: string): string | null {
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
    const cached = penjokiLookup.get(`${teamId}::${norm(nama)}`);
    if (cached) return cached;
    const p = await prisma.penjoki.create({ data: { nama, teamId, keahlian: [], aktif: true } });
    penjokiLookup.set(`${teamId}::${norm(nama)}`, p.id);
    console.log(`  ➕ Penjoki baru: "${nama}" di ${teamNama.get(teamId)}`);
    return p.id;
  }

  async function ensureCustomer(teamId: string, namaRaw: string): Promise<string> {
    const nama = `[IMPORT] ${namaRaw || "(tanpa nama)"}`;
    let c = await prisma.customer.findFirst({ where: { nama, teamId } });
    if (!c) {
      c = await prisma.customer.create({
        data: { nama, noWa: "0", catatan: "Import Excel (baris terlewat)", teamId },
      });
    }
    return c.id;
  }

  let inserted = 0;
  for (const t of TARGETS) {
    const ws = wb.getWorksheet(t.sheet);
    if (!ws) throw new Error(`Sheet ${t.sheet} tidak ditemukan`);

    const row = ws.getRow(t.row);
    const tanggal = row.getCell(1).value;
    if (!(tanggal instanceof Date)) {
      console.log(`  ⚠️  ${t.kode}: kolom tanggal bukan Date, dilewati`);
      continue;
    }

    const timRaw = String(row.getCell(2).value ?? "").trim();
    const penjokiRaw = String(row.getCell(4).value ?? "").trim();
    const harga = Math.round(Number(row.getCell(5).value) || 0);
    const teamId = teamMap.get(norm(timRaw));
    if (!teamId) { console.log(`  ⚠️  ${t.kode}: tim "${timRaw}" tidak dikenal`); continue; }
    if (harga <= 0) { console.log(`  ⚠️  ${t.kode}: harga ${harga}, dilewati`); continue; }

    const sudah = await prisma.pesanan.findUnique({ where: { kode: t.kode } });
    if (sudah) { console.log(`  ⏭  ${t.kode} sudah ada, dilewati`); continue; }

    let penjokiId = resolve(teamId, penjokiRaw);
    if (!penjokiId && penjokiRaw) penjokiId = await ensurePenjoki(teamId, ALIAS[norm(penjokiRaw)] ?? penjokiRaw);
    if (!penjokiId) penjokiId = await ensurePenjoki(teamId, PLACEHOLDER);

    const customerId = await ensureCustomer(teamId, penjokiRaw);

    await prisma.pesanan.create({
      data: {
        kode: t.kode,
        teamId,
        customerId,
        jenisTugasId: defaultJenisId,
        penjokiId,
        harga,
        feePenjoki: Math.round(harga * 0.5),
        feeAdmin: Math.round(harga * 0.23),
        feeOwner: Math.round(harga * 0.2),
        jumlahKeterangan: "1 tugas",
        catatan: `Import Excel ${t.sheet} | ${penjokiRaw || "(kosong)"} | ${timRaw} | baris ${t.row}`,
        status: "SELESAI",
        statusBayar: "LUNAS",
        selesaiAt: tanggal,
        tanggal,
        dibuatOleh: adminByTeam.get(teamId) ?? ownerId,
      },
    });

    inserted++;
    console.log(
      `  ✅ ${t.kode}  ${tanggal.toISOString().slice(0, 10)}  ${teamNama.get(teamId)}  ` +
        `${penjokiRaw || "(tanpa nama)"}  Rp${harga.toLocaleString("id-ID")}`
    );
  }

  console.log(`\n✅ ${inserted} baris ditambahkan.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
