/**
 * Migrasi sheet "Oktober" → tabel pesanan (hanya Oktober 2026).
 * Idempoten via skipDuplicates + kode unik TRX-OKT26-XXXX.
 * Run: npx tsx scripts/migrate-oktober.ts
 */

import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const ALIAS: Record<string, string> = {
  riski: "Riski", wildan: "Wildan Mukhaladun", "wildan.": "Wildan Mukhaladun",
  wildn: "Wildan Mukhaladun", zulfa: "Zulfa Jalila", desi: "Desi Amalia",
  dessi: "Desi Amalia", mita: "Mita Lusari", mitta: "Mita Lusari",
  fahmi: "Muhammad Fahmi Affani", huda: "Alamul Huda", kholil: "Kholilul Anwar",
  fawaid: "Kholilul Anwar", akmal: "Akmal Falasifa", akml: "Akmal Falasifa",
  fira: "Nur Safira", anisq: "Desy Windayani", dyora: "Desy Windayani",
  dyra: "Desy Windayani", mila: "Mita Lusari", lisa: "Mita Lusari", mia: "Mita Lusari",
  anita: "Anita Sari", dara: "Dara Hayuning Priati", lika: "Lika",
  lita: "Affina Intan Permata", fadli: "Fadli Romadhan", eca: "Surty Septriana",
  vina: "Firsty Ayesha", kakawas: "Fadli Romadhan", ajeng: "Jessiana Olita",
  dyah: "Dara Hayuning Priati", rania: "Dara Hayuning Priati",
  sabrina: "Affina Intan Permata", sola: "Surty Septriana",
  arisanti: "Arisanti", ayu: "Ayu Hakikatul", lilis: "Lilis Anggreni",
  muhith: "Abdul Muhith", shinta: "Shinta Kurniawati", ami: "Annisa Nurpatiana",
  anisa: "Annisa Nurpatiana", echa: "Ayu Hakikatul", nilna: "Lilis Anggreni",
  nindiya: "Annisa Nurpatiana", salsa: "Arisanti",
  anik: "Ni Putu Anik Pradnyantri", muhyi: "Muhyi", radit: "M. Radit Apriansyah",
  tinia: "Tinia", intan: "Intan", asrori: "Annisa Asni", givan: "M. Radit Apriansyah",
};

function norm(s: string) { return s.toLowerCase().trim().replace(/\s+/g, ""); }

async function main() {
  // --- load master ---
  const teams = await prisma.team.findMany();
  const teamMap: Record<string, string> = {};
  for (const t of teams) teamMap[norm(t.nama)] = t.id;

  const penjokiAll = await prisma.penjoki.findMany();
  const penjokiLookup = new Map<string, string>(); // "teamId::normNama" → id
  for (const p of penjokiAll) penjokiLookup.set(`${p.teamId}::${norm(p.nama)}`, p.id);

  const profiles = await prisma.profile.findMany();
  const adminByTeam: Record<string, string> = {};
  let ownerId = "";
  for (const p of profiles) {
    if (p.role === "ADMIN" && p.teamId) adminByTeam[p.teamId] = p.id;
    if (p.role === "OWNER") ownerId = p.id;
  }

  const jenisTugas = await prisma.jenisTugas.findMany();
  const defaultJenisId = jenisTugas.find((j) => j.nama === "Tugas Umum")!.id;

  // --- penjoki resolution ---
  const newPenjoki: Array<{ nama: string; teamId: string }> = [];
  function resolvePenjokiId(teamId: string, namaRaw: string): string | null {
    const n = norm(namaRaw);
    const direct = penjokiLookup.get(`${teamId}::${n}`);
    if (direct) return direct;
    const canonical = ALIAS[n];
    if (canonical) {
      const aliased = penjokiLookup.get(`${teamId}::${norm(canonical)}`);
      if (aliased) return aliased;
      // lintas tim
      for (const [key, id] of penjokiLookup)
        if (key.endsWith(`::${norm(canonical)}`)) return id;
    }
    // lintas tim exact
    for (const [key, id] of penjokiLookup)
      if (key.endsWith(`::${n}`)) return id;
    return null; // akan di-create batch nanti
  }

  // --- baca Excel ---
  const xlPath = path.join(__dirname, "../data/Data Customer Jokitugasaja_id.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlPath);
  const ws = wb.getWorksheet("Oktober");
  if (!ws) throw new Error("Sheet 'Oktober' tidak ditemukan");

  // phase 1: scan semua baris, kumpulkan penjoki baru
  type PendingRow = {
    rowNum: number; tanggal: Date; teamId: string; timRaw: string;
    penjokiRaw: string; harga: number; lunas: boolean;
  };
  const pending: PendingRow[] = [];
  const skipped: { row: number; reason: string }[] = [];
  const unknownPenjoki = new Map<string, string>(); // "teamId::penjokiRaw" → canonical nama

  for (let rowNum = 2; rowNum <= ws.rowCount; rowNum++) {
    const row = ws.getRow(rowNum);
    const v = (c: number) => row.getCell(c).value;

    const rawDate = v(1);
    let tanggal: Date;
    if (rawDate instanceof Date) tanggal = rawDate;
    else { skipped.push({ row: rowNum, reason: `tanggal bukan Date: ${rawDate}` }); continue; }
    if (isNaN(tanggal.getTime()) || tanggal.getMonth() !== 9) {
      skipped.push({ row: rowNum, reason: `bukan Oktober: ${tanggal.toISOString?.() ?? rawDate}` });
      continue;
    }

    const timRaw = String(v(2) ?? "").trim();
    const teamId = teamMap[norm(timRaw)];
    if (!teamId) { skipped.push({ row: rowNum, reason: `tim: "${timRaw}"` }); continue; }

    const penjokiRaw = String(v(4) ?? "").trim();
    if (!penjokiRaw) { skipped.push({ row: rowNum, reason: "penjoki kosong" }); continue; }

    const harga = Math.round(Number(v(5)) || 0);
    if (harga <= 0) { skipped.push({ row: rowNum, reason: `harga 0 (${penjokiRaw})` }); continue; }

    // cek apakah perlu create penjoki baru
    if (!resolvePenjokiId(teamId, penjokiRaw)) {
      const key = `${teamId}::${penjokiRaw}`;
      if (!unknownPenjoki.has(key)) {
        const canonical = ALIAS[norm(penjokiRaw)] ?? penjokiRaw;
        unknownPenjoki.set(key, canonical);
      }
    }

    const lunas = v(3) === true || v(3) === "TRUE";
    pending.push({ rowNum, tanggal, teamId, timRaw, penjokiRaw, harga, lunas });
  }

  // phase 2: batch-create penjoki baru
  for (const [key, canonical] of unknownPenjoki) {
    const teamId = key.split("::")[0];
    // cek lagi (mungkin sudah ada via alias setelah loop)
    if (penjokiLookup.has(`${teamId}::${norm(canonical)}`)) continue;
    console.log(`  ➕ Buat penjoki: "${canonical}" di tim ${teams.find(t=>t.id===teamId)?.nama}`);
    const p = await prisma.penjoki.create({ data: { nama: canonical, teamId, keahlian: [], aktif: true } });
    penjokiLookup.set(`${teamId}::${norm(canonical)}`, p.id);
    // daftarkan semua variant nama yg mengarah ke sini
    for (const rawVariant of unknownPenjoki.keys()) {
      if (rawVariant.startsWith(`${teamId}::`) && unknownPenjoki.get(rawVariant) === canonical) {
        const penjokiRawOnly = rawVariant.split("::")[1];
        penjokiLookup.set(`${teamId}::${norm(penjokiRawOnly)}`, p.id);
      }
    }
  }

  // phase 3: batch-create customer placeholder
  const customerMap = new Map<string, string>(); // "teamId::penjokiRaw" → customer.id
  const customerKeys = [...new Set(pending.map(r => `${r.teamId}::${r.penjokiRaw}`))];
  for (const key of customerKeys) {
    const [teamId, penjokiRaw] = key.split("::");
    const nama = `[IMPORT] ${penjokiRaw}`;
    let c = await prisma.customer.findFirst({ where: { nama, teamId } });
    if (!c) c = await prisma.customer.create({ data: { nama, noWa: "0", catatan: "Import Excel Oktober 2026", teamId } });
    customerMap.set(key, c.id);
  }

  // phase 4: bulk insert pesanan
  const pesananData = [];
  for (const r of pending) {
    const penjokiId = resolvePenjokiId(r.teamId, r.penjokiRaw);
    if (!penjokiId) {
      skipped.push({ row: r.rowNum, reason: `penjoki masih null: ${r.penjokiRaw}` });
      continue;
    }
    const customerId = customerMap.get(`${r.teamId}::${r.penjokiRaw}`)!;
    const dibuatOleh = adminByTeam[r.teamId] ?? ownerId;
    const feePenjoki = Math.round(r.harga * 0.5);
    const feeAdmin = Math.round(r.harga * 0.23);
    const feeOwner = Math.round(r.harga * 0.2);
    const statusBayar = r.lunas ? "LUNAS" : "BELUM";
    const status = r.lunas ? "SELESAI" : "MENUNGU";
    const kode = `TRX-OKT26-${String(r.rowNum).padStart(4, "0")}`;

    pesananData.push({
      kode,
      teamId: r.teamId,
      customerId,
      jenisTugasId: defaultJenisId,
      penjokiId,
      harga: r.harga,
      feePenjoki,
      feeAdmin,
      feeOwner,
      jumlahKeterangan: "1 tugas",
      catatan: `Import Excel Oktober | ${r.penjokiRaw} | ${r.timRaw}`,
      status: status as "SELESAI" | "MENUNGU",
      statusBayar: statusBayar as "LUNAS" | "BELUM",
      selesaiAt: r.lunas ? r.tanggal : null,
      tanggal: r.tanggal,
      dibuatOleh,
    });
  }

  const result = await prisma.pesanan.createMany({ data: pesananData, skipDuplicates: true });

  console.log(`\n✅ Inserted : ${result.count}`);
  console.log(`⏭  Skip dup : ${pesananData.length - result.count}`);
  console.log(`❌ Skipped  : ${skipped.length}`);
  if (skipped.length) {
    console.log("\nDetail skipped:");
    for (const s of skipped) console.log(`  Row ${s.row}: ${s.reason}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
