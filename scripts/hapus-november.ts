import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Cek jumlah data November 2026
  const count = await prisma.pesanan.count({
    where: {
      tanggal: {
        gte: new Date('2026-11-01T00:00:00Z')
      }
    }
  });

  console.log(`\nDitemukan ${count} transaksi November 2026`);

  if (count === 0) {
    console.log('Tidak ada data untuk dihapus.');
    return;
  }

  // Tampilkan preview
  const preview = await prisma.pesanan.findMany({
    where: {
      tanggal: {
        gte: new Date('2026-11-01T00:00:00Z')
      }
    },
    select: {
      kode: true,
      tanggal: true,
      harga: true,
      customer: { select: { nama: true } },
      team: { select: { nama: true } }
    },
    take: 5
  });

  console.log('\nPreview data yang akan dihapus (maks 5):');
  preview.forEach(p => {
    console.log(`- ${p.kode} | ${p.tanggal.toISOString()} | ${p.customer.nama} | ${p.team.nama} | Rp ${p.harga.toLocaleString()}`);
  });

  // Uncomment baris di bawah untuk HAPUS
  // const result = await prisma.pesanan.deleteMany({
  //   where: {
  //     tanggal: {
  //       gte: new Date('2026-11-01T00:00:00Z')
  //     }
  //   }
  // });
  // console.log(`\n✓ ${result.count} transaksi November 2026 berhasil dihapus.`);

  console.log('\n⚠️  Uncomment baris deleteMany di script untuk eksekusi hapus.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
