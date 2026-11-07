/**
 * Verifikasi angka: isi tabel `pesanan` (yang dipakai web) vs file Excel di folder data/.
 *
 * Yang diperiksa:
 *   1. Jumlah baris & nominal per sheet (September / Oktober / November).
 *   2. Baris per baris lewat kode `TRX-<SHEET>-<baris>` — menangkap baris
 *      yang hilang, baris ekstra, atau nominal yang berubah.
 *   3. Grand total sheet (baris "Total Pendapatan") vs jumlah baris asli.
 *      Kalau formula Excel tidak mencakup semua baris, selisihnya dilaporkan
 *      sebagai masalah Excel — bukan masalah data.
 *   4. Subtotal fee: Gaji Penjoki 50%, Gaji Admin Sosmed 7%, Owner 20%
 *      (Excel) vs alokasiFee(total) yang dipakai web.
 *
 * Sheet "Copy of November" sengaja DIABAIKAN: isinya salinan lama dan tidak
 * diimpor. Kalau ikut dihitung, semua baris November terbaca dobel.
 *
 * Run: npx tsx scripts/cek-angka-excel.ts
 */

import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { alokasiFee } from "../src/lib/fee";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

/** Sheet yang benar-benar diimpor + prefix kode transaksinya. */
const SHEETS = [
  { sheet: "September", prefix: "TRX-SEP26-", bulan: "2026-09" },
  { sheet: "Oktober", prefix: "TRX-OKT26-", bulan: "2026-10" },
  { sheet: "November", prefix: "TRX-NOV26-", bulan: "2026-11" },
] as const;

/** Sheet yang ada di file tetapi tidak diimpor (salinan/arsip). */
const DIABAIKAN = ["Copy of November"];

const rupiah = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

function excelPath(): string {
  const dir = path.join(__dirname, "../data");
  const file = fs.readdirSync(dir).find((f) => f.toLowerCase().endsWith(".xlsx"));
  if (!file) throw new Error(`Tidak ada file .xlsx di ${dir}`);
  return path.join(dir, file);
}

const angka = (v: ExcelJS.CellValue): number => {
  if (v && typeof v === "object" && !(v instanceof Date)) {
    if ("result" in v) return Math.round(Number(v.result) || 0);
    return 0;
  }
  return Math.round(Number(v) || 0);
};

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(excelPath());

  let gagal = 0;
  const ringkasan: string[] = [];
  const targetBulan = new Map<string, { sheet: string; total: number }>();

  for (const { sheet, prefix, bulan } of SHEETS) {
    const ws = wb.getWorksheet(sheet);
    if (!ws) {
      console.log(`❌ Sheet "${sheet}" tidak ditemukan di file Excel.`);
      gagal++;
      continue;
    }

    // ---------- Excel: baris data ----------
    const xl = new Map<number, number>();
    let totalRow: { row: number; nilai: number; formula?: string } | null = null;
    let sumF = 0;
    let sumH = 0;
    let sumJ = 0;

    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const d = row.getCell(1).value;

      if (String(d ?? "").toLowerCase().includes("total pendapatan")) {
        const cell = row.getCell(5).value;
        totalRow = {
          row: r,
          nilai: angka(cell),
          formula:
            cell && typeof cell === "object" && "formula" in cell
              ? String(cell.formula)
              : undefined,
        };
        continue;
      }

      if (!(d instanceof Date)) continue;
      const harga = angka(row.getCell(5).value);
      if (harga <= 0) continue;

      xl.set(r, harga);
      sumF += angka(row.getCell(6).value);
      sumH += angka(row.getCell(8).value);
      sumJ += angka(row.getCell(10).value);
    }

    const xlTotal = [...xl.values()].reduce((a, b) => a + b, 0);

    // ---------- Database ----------
    const dbRows = await prisma.pesanan.findMany({
      where: { kode: { startsWith: prefix } },
      select: { kode: true, harga: true },
    });
    const db = new Map<number, number>();
    for (const p of dbRows) db.set(Number(p.kode.slice(prefix.length)), p.harga);
    const dbTotal = [...db.values()].reduce((a, b) => a + b, 0);

    // ---------- Bandingkan baris ----------
    const hilang: string[] = [];
    const ekstra: string[] = [];
    const bedaNominal: string[] = [];
    for (const [r, h] of xl) {
      if (!db.has(r)) hilang.push(`R${r}=${rupiah(h)}`);
      else if (db.get(r) !== h) bedaNominal.push(`R${r}: Excel ${rupiah(h)} vs DB ${rupiah(db.get(r)!)}`);
    }
    for (const [r, h] of db) if (!xl.has(r)) ekstra.push(`R${r}=${rupiah(h)}`);

    const barisCocok = hilang.length === 0 && ekstra.length === 0 && bedaNominal.length === 0;
    const totalCocok = xlTotal === dbTotal;
    if (!barisCocok || !totalCocok) gagal++;

    // ---------- Subtotal fee (web) ----------
    const fee = alokasiFee(dbTotal);
    const feeCocok =
      fee.penjoki === sumF &&
      Math.abs(fee.adminSosmed - sumH) <= 1 &&
      Math.abs(fee.owner - sumJ) <= 1;

    console.log(`\n=== ${sheet} ===`);
    console.log(
      `  Baris     : Excel ${xl.size} · DB ${db.size}  ${xl.size === db.size ? "OK" : "BEDA"}`
    );
    console.log(
      `  Pendapatan: Excel ${rupiah(xlTotal)} · DB ${rupiah(dbTotal)}  ${totalCocok ? "OK" : "BEDA"}`
    );
    if (totalRow) {
      const selisih = xlTotal - totalRow.nilai;
      console.log(
        `  Grand total Excel (R${totalRow.row}): ${rupiah(totalRow.nilai)}` +
          (totalRow.formula ? `  [=${totalRow.formula}]` : "")
      );
      if (selisih !== 0) {
        console.log(
          `  ⚠️  Formula total Excel tidak mencakup ${rupiah(selisih)} baris data ` +
            `(total baris asli ${rupiah(xlTotal)}).`
        );
      }
    } else {
      console.log("  ⚠️  Baris 'Total Pendapatan' tidak ditemukan.");
    }
    console.log(
      `  Subtotal  : Penjoki ${rupiah(fee.penjoki)} (Excel ${rupiah(sumF)}) · ` +
        `Sosmed ${rupiah(fee.adminSosmed)} (Excel ${rupiah(sumH)}) · ` +
        `Owner ${rupiah(fee.owner)} (Excel ${rupiah(sumJ)})  ${feeCocok ? "OK" : "BEDA"}`
    );
    if (hilang.length) console.log(`  ❌ Hilang di DB (${hilang.length}): ${hilang.join(", ")}`);
    if (ekstra.length) console.log(`  ❌ Ekstra di DB (${ekstra.length}): ${ekstra.join(", ")}`);
    if (bedaNominal.length)
      console.log(`  ❌ Nominal beda (${bedaNominal.length}): ${bedaNominal.join(", ")}`);

    ringkasan.push(
      `${sheet.padEnd(10)} ${String(db.size).padStart(4)} baris · ${rupiah(dbTotal).padEnd(16)} ` +
        `${barisCocok && totalCocok ? "OK" : "BEDA"}`
    );
    targetBulan.set(bulan, { sheet, total: xlTotal });
  }

  // ---------- Total per bulan (yang dilihat di menu "Bulanan") ----------
  console.log("\n=== TOTAL PER BULAN (menu Bulanan) ===");
  const perBulan = await prisma.$queryRaw<{ bln: string; n: bigint; s: bigint }[]>`
    SELECT to_char(tanggal, 'YYYY-MM') AS bln, count(*)::bigint AS n, sum(harga)::bigint AS s
    FROM pesanan
    WHERE kode ~ '^TRX-(SEP|OKT|NOV)26-'
    GROUP BY 1
    ORDER BY 1`;
  const bulanDb = new Map(perBulan.map((b) => [b.bln, { n: Number(b.n), s: Number(b.s) }]));
  for (const [bulan, target] of targetBulan) {
    const db = bulanDb.get(bulan) ?? { n: 0, s: 0 };
    const cocok = db.s === target.total;
    if (!cocok) gagal++;
    console.log(
      `  ${bulan} (${target.sheet}): DB ${db.n} trx · ${rupiah(db.s)} · ` +
        `sheet ${rupiah(target.total)}  ${cocok ? "OK" : "BEDA"}`
    );
  }
  const bulanLain = [...bulanDb.keys()].filter((b) => !targetBulan.has(b));
  if (bulanLain.length) {
    console.log(
      `  ⚠️  Ada transaksi di bulan lain: ` +
        bulanLain
          .map((b) => `${b} (${bulanDb.get(b)!.n} trx · ${rupiah(bulanDb.get(b)!.s)})`)
          .join(", ")
    );
    gagal++;
  }

  // ---------- Ringkasan ----------
  console.log("\n=== RINGKASAN ===");
  for (const r of ringkasan) console.log(`  ${r}`);

  const sheetsDiabaikan = wb.worksheets
    .map((w) => w.name)
    .filter((n) => DIABAIKAN.includes(n));
  if (sheetsDiabaikan.length)
    console.log(`\n  ℹ️  Diabaikan (tidak diimpor): ${sheetsDiabaikan.join(", ")}`);

  console.log(gagal === 0 ? "\n✅ SEMUA ANGKA COCOK" : `\n❌ ${gagal} SHEET BELUM COCOK`);
  process.exit(gagal === 0 ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
