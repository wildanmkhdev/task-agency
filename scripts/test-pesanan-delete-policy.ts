/**
 * Uji policy DELETE pesanan tanpa mengubah data:
 * jalankan DELETE di dalam transaksi sebagai admin tim, lalu ROLLBACK.
 *
 * Jalankan: npx tsx scripts/test-pesanan-delete-policy.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.profile.findFirst({
    where: { role: "ADMIN", teamId: { not: null } },
    include: { team: true },
    orderBy: { createdAt: "asc" },
  });
  if (!admin?.teamId) throw new Error("Tidak ada admin dengan tim.");

  const own = await prisma.pesanan.findFirst({
    where: { teamId: admin.teamId },
    select: { id: true, kode: true },
  });
  const lain = await prisma.pesanan.findFirst({
    where: { teamId: { not: admin.teamId } },
    select: { id: true, kode: true },
  });
  if (!own || !lain) throw new Error("Butuh minimal 1 pesanan di 2 tim berbeda.");

  console.log(`Admin uji: ${admin.namaLengkap} (${admin.team?.nama})`);
  console.log(`Transaksi tim sendiri : ${own.kode}`);
  console.log(`Transaksi tim lain    : ${lain.kode}\n`);

  let hasil: { own: number; lain: number } = { own: -1, lain: -1 };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated`);
      await tx.$executeRawUnsafe(
        `SELECT set_config('request.jwt.claims', $1, true)`,
        JSON.stringify({ sub: admin.id, role: "authenticated" })
      );

      hasil.own = await tx.$executeRawUnsafe(
        `DELETE FROM public.pesanan WHERE id = $1::uuid`,
        own.id
      );
      hasil.lain = await tx.$executeRawUnsafe(
        `DELETE FROM public.pesanan WHERE id = $1::uuid`,
        lain.id
      );

      // Selalu batalkan agar data tidak berubah.
      throw new Error("ROLLBACK_TEST");
    });
  } catch (e) {
    if ((e as Error).message !== "ROLLBACK_TEST") throw e;
  }

  console.log(`DELETE transaksi tim sendiri : ${hasil.own} baris (harus 1)`);
  console.log(`DELETE transaksi tim lain    : ${hasil.lain} baris (harus 0)`);

  const masihAda = await prisma.pesanan.count({
    where: { id: { in: [own.id, lain.id] } },
  });
  console.log(`\nSetelah rollback, 2 transaksi masih ada: ${masihAda === 2 ? "ya ✅" : "TIDAK ❌"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
