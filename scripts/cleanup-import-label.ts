/**
 * Bersihkan label "[IMPORT] " pada nama customer hasil import September/Oktober.
 *
 * Script import lama membuat customer placeholder dengan nama
 * `[IMPORT] <nama penjoki>`. Label itu hanya penanda teknis import dan
 * sekarang diminta dihapus dari UI/DB karena terlihat berantakan.
 *
 * Jalankan:
 *   npx tsx scripts/cleanup-import-label.ts          → dry run (hanya hitung)
 *   npx tsx scripts/cleanup-import-label.ts --apply  → eksekusi UPDATE
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const POLA = /^\[IMPORT\]\s*/i;

async function main() {
  const apply = process.argv.includes("--apply");

  const customers = await prisma.customer.findMany({
    where: { nama: { startsWith: "[IMPORT]" } },
    select: { id: true, nama: true, teamId: true },
  });

  console.log(`Customer dengan label [IMPORT]: ${customers.length}`);
  for (const c of customers.slice(0, 5)) {
    console.log(`  • "${c.nama}" → "${c.nama.replace(POLA, "")}"`);
  }
  if (customers.length > 5) console.log(`  … dan ${customers.length - 5} lainnya`);

  if (!apply) {
    console.log("\nDry run. Tambahkan --apply untuk menulis perubahan.");
    return;
  }

  let updated = 0;
  for (const c of customers) {
    const nama = c.nama.replace(POLA, "").trim();
    if (!nama || nama === c.nama) continue;
    await prisma.customer.update({ where: { id: c.id }, data: { nama } });
    updated++;
  }
  console.log(`\n✅ ${updated} nama customer diperbarui.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
