/**
 * Cleanup pasca import Oktober:
 * 1. Update 42 pesanan MENUNGU+BELUM → SELESAI+LUNAS
 *    (status_bayar BELUM di Excel = gaji penjoki belum dibayar, bukan transaksi belum selesai)
 * 2. Merge 6 penjoki "awas" duplikat di Tim 2 → penjoki TIM 3 "Fadli Romadhan" (atau create "Kak Awas" baru)
 * Run: npx tsx scripts/cleanup-import.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // === 1. Update semua import MENUNGU+BELUM → SELESAI+LUNAS ===
  // Dasar: data Excel adalah rekap transaksi yang sudah selesai.
  // "Status Gaji Penjoki=FALSE" = fee ke penjoki belum dibayar owner,
  // bukan berarti tugas belum selesai. Semua baris di sheet Oktober
  // sudah selesai dikerjakan.
  const r1 = await prisma.pesanan.updateMany({
    where: {
      kode: { startsWith: "TRX-OKT26-" },
      status: "MENUNGU",
      statusBayar: "BELUM",
    },
    data: {
      status: "SELESAI",
      statusBayar: "LUNAS",
    },
  });
  console.log(`✅ Update MENUNGU→SELESAI: ${r1.count} pesanan`);

  // === 2. Merge penjoki awas duplikat ===
  // Cek apakah "Kak Awas" sudah ada di Tim 3
  const tim2Id = "7d43d625-bbac-4d9b-8d44-b1c70bf32bfd";
  const tim3Id = "8514945e-afbe-4687-997d-4e0b8928b05c";

  // "Kak Awas" di Tim 3 adalah Fadli Romadhan (alias dari alias.ts).
  // Penjoki awas* di Tim 2 — merge semua ke satu record "Kak Awas" Tim 2
  const awasNames = ["awas", "awas.", "awass", "awasa", "awasss", "awws"];
  const awasPenjoki = await prisma.penjoki.findMany({
    where: { nama: { in: awasNames }, teamId: tim2Id },
  });

  if (awasPenjoki.length === 0) {
    console.log("✅ Tidak ada penjoki awas duplikat");
  } else {
    // Buat/cari satu record canonical "Kak Awas" di Tim 2
    let canonical = await prisma.penjoki.findFirst({
      where: { nama: "Kak Awas", teamId: tim2Id },
    });
    if (!canonical) {
      canonical = await prisma.penjoki.create({
        data: { nama: "Kak Awas", teamId: tim2Id, keahlian: [], aktif: true },
      });
      console.log(`  ➕ Buat "Kak Awas" Tim 2: ${canonical.id}`);
    }

    // Re-point semua pesanan dari duplikat ke canonical
    const dupIds = awasPenjoki.map((p) => p.id);
    const r2 = await prisma.pesanan.updateMany({
      where: { penjokiId: { in: dupIds } },
      data: { penjokiId: canonical.id },
    });
    console.log(`✅ Re-point ${r2.count} pesanan ke "Kak Awas" (id=${canonical.id})`);

    // Hapus duplikat
    await prisma.penjoki.deleteMany({ where: { id: { in: dupIds } } });
    console.log(`✅ Hapus ${dupIds.length} penjoki duplikat`);

    // Juga re-point customer placeholder duplikat → satu
    const custDups = await prisma.customer.findMany({
      where: {
        nama: { in: awasNames.map((n) => `[IMPORT] ${n}`) },
        teamId: tim2Id,
      },
    });
    if (custDups.length > 0) {
      let custCanonical = await prisma.customer.findFirst({
        where: { nama: "[IMPORT] Kak Awas", teamId: tim2Id },
      });
      if (!custCanonical) {
        custCanonical = await prisma.customer.create({
          data: { nama: "[IMPORT] Kak Awas", noWa: "0", catatan: "Import Oktober 2026", teamId: tim2Id },
        });
      }
      await prisma.pesanan.updateMany({
        where: { customerId: { in: custDups.map((c) => c.id) } },
        data: { customerId: custCanonical.id },
      });
      await prisma.customer.deleteMany({ where: { id: { in: custDups.map((c) => c.id) } } });
      console.log(`✅ Merge ${custDups.length} customer "awas*" → "[IMPORT] Kak Awas"`);
    }
  }

  // === Verifikasi akhir ===
  const totalSelesai = await prisma.pesanan.count({
    where: { kode: { startsWith: "TRX-OKT26-" }, status: "SELESAI", statusBayar: "LUNAS" },
  });
  const totalBelum = await prisma.pesanan.count({
    where: { kode: { startsWith: "TRX-OKT26-" }, status: { not: "SELESAI" } },
  });
  const teams = await prisma.team.findMany();
  const tm = new Map(teams.map((t) => [t.id, t.nama]));
  const perTim = await prisma.pesanan.groupBy({
    by: ["teamId"],
    where: { kode: { startsWith: "TRX-OKT26-" }, status: "SELESAI", statusBayar: "LUNAS" },
    _count: { id: true },
    _sum: { harga: true },
  });

  console.log(`\n📊 Final rekap Oktober:`);
  console.log(`  Masuk rekap (SELESAI+LUNAS): ${totalSelesai}`);
  console.log(`  Tidak masuk rekap: ${totalBelum}`);
  for (const r of perTim.sort((a, b) => (tm.get(a.teamId) ?? "").localeCompare(tm.get(b.teamId) ?? ""))) {
    console.log(`  ${tm.get(r.teamId)}: ${r._count.id} trx, Rp${r._sum.harga?.toLocaleString()}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
