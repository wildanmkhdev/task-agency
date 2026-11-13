import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const summary = await prisma.$queryRaw`
    SELECT 
      TO_CHAR(tanggal, 'YYYY-MM') as bulan,
      COUNT(*) as jumlah
    FROM pesanan
    WHERE tanggal >= '2026-09-01'
    GROUP BY TO_CHAR(tanggal, 'YYYY-MM')
    ORDER BY bulan;
  `;

  console.log('\nRingkasan data transaksi per bulan:');
  console.log('===================================');
  summary.forEach(row => {
    console.log(`${row.bulan}: ${row.jumlah} transaksi`);
  });
  
  const total = await prisma.pesanan.count();
  console.log(`\nTotal keseluruhan: ${total} transaksi`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
