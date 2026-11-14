/**
 * Koreksi tanggal pesanan:
 * 1. Seluruh baris dengan timestamp 17:00:00 (hasil bug UTC -7 jam dari toISOString lama)
 *    dimajukan +7 jam ke 00:00:00 tanggal semestinya.
 * 2. Transaksi manual Oktober yang tersimpan di tanggal September (MPA7, A4T0, 24S0, S52N)
 *    dipindahkan ke 2026-10-01 00:00:00.
 * 3. Verifikasi bahwa September kembali 100% identik dengan sheet (231 baris, Rp 14.153.000).
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== MEMULAI KOREKSI TANGGAL & SEPTEMBER ===");

  // 1. Majukan semua baris 17:00:00 sebanyak 7 jam ke 00:00:00
  const shifted = await prisma.$executeRaw`
    UPDATE pesanan
    SET tanggal = tanggal + interval '7 hours'
    WHERE to_char(tanggal, 'HH24:MI:SS') = '17:00:00';
  `;
  console.log(`✔ ${shifted} baris dengan jam 17:00:00 berhasil dimajukan +7 jam ke 00:00:00`);

  // 2. Pindahkan transaksi manual Oktober yang tersimpan di September ke 2026-10-01
  const manualToOkt = [
    "TRX-20261114-MPA7",
    "TRX-20261114-A4T0",
    "TRX-20261114-24S0",
    "TRX-20261114-S52N",
  ];

  const res = await prisma.pesanan.updateMany({
    where: { kode: { in: manualToOkt } },
    data: { tanggal: new Date("2026-10-01T00:00:00.000Z") },
  });
  console.log(`✔ ${res.count} transaksi manual sisa berhasil dipindahkan ke 2026-10-01 00:00:00`);

  // 3. Verifikasi September
  const sepRows = await prisma.pesanan.findMany({
    where: {
      tanggal: {
        gte: new Date("2026-09-01T00:00:00.000Z"),
        lt: new Date("2026-10-01T00:00:00.000Z"),
      },
    },
    include: { team: true },
  });

  const sepCount = sepRows.length;
  const sepTotal = sepRows.reduce((s, r) => s + r.harga, 0);

  console.log("\n=== HASIL VERIFIKASI SEPTEMBER ===");
  console.log(`Baris September: ${sepCount} (Harap: 231) -> ${sepCount === 231 ? "PAS / COCOK 100%" : "BEDA"}`);
  console.log(`Total September: Rp ${sepTotal.toLocaleString("id-ID")} (Harap: Rp 14.153.000) -> ${sepTotal === 14153000 ? "PAS / COCOK 100%" : "BEDA"}`);

  // Cek apakah ada kode non TRX-SEP26 di September
  const nonSep = sepRows.filter((r) => !r.kode.startsWith("TRX-SEP26-"));
  console.log(`Transaksi non-resmi di September: ${nonSep.length}`);

  // Cek apakah masih ada baris dengan jam non 00:00:00
  const nonMidnight = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*)::bigint as count
    FROM pesanan
    WHERE to_char(tanggal, 'HH24:MI:SS') != '00:00:00';
  `;
  console.log(`Baris dengan jam non-midnight: ${Number(nonMidnight[0]?.count ?? 0)}`);

  // Breakdown per tim September
  const perTim: Record<string, { count: number; total: number }> = {};
  for (const r of sepRows) {
    const t = r.team?.nama ?? "Tanpa Tim";
    if (!perTim[t]) perTim[t] = { count: 0, total: 0 };
    perTim[t].count++;
    perTim[t].total += r.harga;
  }
  console.log("\nBreakdown Per Tim September:");
  for (const [t, d] of Object.entries(perTim)) {
    console.log(`  ${t}: ${d.count} baris · Rp ${d.total.toLocaleString("id-ID")}`);
  }
}

main()
  .catch((e) => {
    console.error("Gagal koreksi:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
