import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  // Count Oktober import
  const total = await prisma.pesanan.count({ where: { kode: { startsWith: "TRX-OKT26-" } } });
  const selesaiLunas = await prisma.pesanan.count({
    where: { kode: { startsWith: "TRX-OKT26-" }, status: "SELESAI", statusBayar: "LUNAS" }
  });
  const menunguBelum = await prisma.pesanan.count({
    where: { kode: { startsWith: "TRX-OKT26-" }, status: "MENUNGU", statusBayar: "BELUM" }
  });
  console.log(`Total import: ${total}`);
  console.log(`SELESAI+LUNAS (masuk rekap): ${selesaiLunas}`);
  console.log(`MENUNGU+BELUM (tidak masuk rekap): ${menunguBelum}`);

  // per tim
  const perTim = await prisma.pesanan.groupBy({
    by: ["teamId"],
    where: { kode: { startsWith: "TRX-OKT26-" }, status: "SELESAI", statusBayar: "LUNAS" },
    _count: { id: true },
    _sum: { harga: true },
  });
  const teams = await prisma.team.findMany();
  const tm = new Map(teams.map(t => [t.id, t.nama]));
  console.log("\nPer tim (masuk rekap):");
  for (const r of perTim) {
    console.log(`  ${tm.get(r.teamId)}: ${r._count.id} transaksi, Rp${r._sum.harga?.toLocaleString()}`);
  }

  // penjoki awas duplikat
  const awas = await prisma.penjoki.findMany({
    where: { nama: { in: ["awas", "awas.", "awass", "awasa", "awasss", "awws"] } }
  });
  console.log(`\nPenjoki 'awas' duplikat: ${awas.length}`);
  for (const p of awas) console.log(`  id=${p.id} nama="${p.nama}" tim=${tm.get(p.teamId)}`);

  // cek pesanan yang pakai penjoki awas duplikat
  const awasIds = awas.map(p => p.id);
  const pesananAwas = await prisma.pesanan.count({ where: { penjokiId: { in: awasIds } } });
  console.log(`  Pesanan yang pakai awas duplikat: ${pesananAwas}`);
}
main().finally(() => prisma.$disconnect());
