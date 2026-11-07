/**
 * Menghapus data uji yang ikut terhitung sebagai pendapatan:
 *   TRX-20261101-OH6P — Rp1.999.988 — Tim 1 — penjoki "testing" — ket. "ssss"
 *
 * Setelah transaksi dihapus, penjoki "testing" di Tim 1 juga dihapus
 * bila sudah tidak dipakai pesanan lain.
 *
 * Idempoten: aman dijalankan berulang.
 * Run: npx tsx scripts/hapus-data-testing.ts
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const KODE_TEST = "TRX-20261101-OH6P";

async function main() {
  const pesanan = await prisma.pesanan.findUnique({
    where: { kode: KODE_TEST },
    include: { penjoki: true, customer: true, team: true },
  });

  if (!pesanan) {
    console.log(`ℹ️  ${KODE_TEST} tidak ditemukan — sudah bersih.`);
  } else {
    console.log("🗑  Menghapus transaksi uji:");
    console.log(`   ${pesanan.kode} · ${pesanan.tanggal.toISOString().slice(0, 10)} · ` +
      `${pesanan.team.nama} · ${pesanan.penjoki.nama} · Rp${pesanan.harga.toLocaleString("id-ID")} · ` +
      `ket. "${pesanan.jumlahKeterangan}"`);

    // Guard: pastikan ini memang transaksi uji, bukan data riil.
    if (pesanan.harga !== 1999988 || pesanan.jumlahKeterangan !== "ssss") {
      throw new Error("Data tidak cocok dengan ciri transaksi uji — dibatalkan demi keamanan.");
    }

    await prisma.pesanan.delete({ where: { kode: KODE_TEST } });
    console.log("   ✅ terhapus.");
  }

  // Bersihkan penjoki "testing" bila tak dipakai lagi.
  const penjokiTesting = await prisma.penjoki.findMany({
    where: { nama: "testing" },
    include: { _count: { select: { pesanan: true } } },
  });
  for (const p of penjokiTesting) {
    if (p._count.pesanan === 0) {
      await prisma.penjoki.delete({ where: { id: p.id } });
      console.log(`   ✅ penjoki uji "${p.nama}" dihapus (tidak dipakai pesanan lain).`);
    } else {
      console.log(`   ℹ️  penjoki "${p.nama}" masih dipakai ${p._count.pesanan} pesanan — dibiarkan.`);
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
