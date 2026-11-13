import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.pesanan.count({
    where: {
      tanggal: {
        gte: new Date('2026-11-01T00:00:00Z')
      }
    }
  });

  console.log(`Ditemukan ${count} transaksi November 2026`);

  if (count === 0) {
    console.log('Tidak ada data untuk dihapus.');
    return;
  }

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
    take: 10
  });

  console.log('\nPreview data yang akan dihapus:');
  preview.forEach(p => {
    console.log(`${p.kode} | ${p.tanggal.toISOString().split('T')[0]} | ${p.customer.nama} | ${p.team.nama} | Rp ${p.harga.toLocaleString()}`);
  });

  console.log('\n=== KONFIRMASI HAPUS ===');
  console.log('Uncomment baris deleteMany di bawah untuk EKSEKUSI HAPUS:');
  console.log('');
  
  // EKSEKUSI HAPUS DATA NOVEMBER:
  const result = await prisma.pesanan.deleteMany({
    where: { tanggal: { gte: new Date('2026-11-01T00:00:00Z') } }
  });
  console.log(`\nSELESAI: ${result.count} transaksi November 2026 dihapus.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
