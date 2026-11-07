/**
 * Koreksi 5 baris Excel yang tanggalnya "nyasar" ke bulan lain.
 *
 * Disetujui owner (8 Nov 2026): tanggal dikoreksi ke bulan sheet-nya supaya
 * total Bulanan di web sama dengan grand total tiap sheet Excel. Tanggal asli
 * tetap dicatat di kolom `catatan` untuk jejak audit.
 *
 *   Sheet       Baris  Tanggal asli   → Tanggal koreksi   Kode
 *   September   2      2026-06-28     → 2026-09-28        TRX-SEP26-0002
 *   September   3      2026-06-29     → 2026-09-29        TRX-SEP26-0003
 *   September   4      2026-08-19     → 2026-09-19        TRX-SEP26-0004
 *   Oktober     2      2026-01-02     → 2026-10-02        TRX-OKT26-0002
 *   Oktober     542    2026-11-01     → 2026-10-01        TRX-OKT26-0542
 *
 * Idempoten: baris yang tanggalnya sudah benar dilewati.
 * Run: npx tsx scripts/koreksi-tanggal-nyasar.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const KOREKSI = [
  { kode: "TRX-SEP26-0002", asal: "2026-06-28", jadi: "2026-09-28" },
  { kode: "TRX-SEP26-0003", asal: "2026-06-29", jadi: "2026-09-29" },
  { kode: "TRX-SEP26-0004", asal: "2026-08-19", jadi: "2026-09-19" },
  { kode: "TRX-OKT26-0002", asal: "2026-01-02", jadi: "2026-10-02" },
  { kode: "TRX-OKT26-0542", asal: "2026-11-01", jadi: "2026-10-01" },
] as const;

/** Tanggal tengah malam UTC — sama dengan konvensi baris import lainnya. */
function tanggalImport(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

async function main() {
  console.log("🔧 Koreksi tanggal baris Excel yang nyasar…\n");
  let diubah = 0;

  for (const k of KOREKSI) {
    const p = await prisma.pesanan.findUnique({
      where: { kode: k.kode },
      select: { id: true, tanggal: true, catatan: true, harga: true },
    });
    if (!p) {
      console.log(`  ⚠️  ${k.kode} tidak ditemukan — dilewati.`);
      continue;
    }

    const sekarang = p.tanggal.toISOString().slice(0, 10);
    if (sekarang === k.jadi) {
      console.log(`  ✓ ${k.kode} sudah ${k.jadi} — dilewati.`);
      continue;
    }

    const jejak = `Koreksi tanggal: ${sekarang} → ${k.jadi} (tanggal Excel semula ${k.asal})`;
    await prisma.pesanan.update({
      where: { id: p.id },
      data: {
        tanggal: tanggalImport(k.jadi),
        selesaiAt: tanggalImport(k.jadi),
        catatan: p.catatan ? `${p.catatan} | ${jejak}` : jejak,
      },
    });
    diubah++;
    console.log(
      `  ✅ ${k.kode}: ${sekarang} → ${k.jadi}  (Rp${p.harga.toLocaleString("id-ID")})`
    );
  }

  console.log(`\n${diubah} baris diperbarui.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
