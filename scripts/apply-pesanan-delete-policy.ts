/**
 * Terapkan policy DELETE pesanan untuk admin tim.
 *
 * `prisma db execute` memakai DIRECT_URL (port 5432) yang tidak bisa
 * dijangkau dari jaringan ini, jadi policy dijalankan lewat Prisma Client
 * (DATABASE_URL / pooler). Script ini idempoten (DROP POLICY IF EXISTS).
 *
 * Jalankan: npx tsx scripts/apply-pesanan-delete-policy.ts
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const file = new URL(
    "../prisma/migrations/20261106090000_pesanan_delete_admin_team/migration.sql",
    import.meta.url
  );
  const sql = readFileSync(file, "utf8");

  // Pecah per statement agar Prisma tidak menolak multiple commands.
  const statements = sql
    .split(";")
    .map((s) => s.replace(/--.*$/gm, "").trim())
    .filter(Boolean);

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
  console.log(`✅ ${statements.length} statement diterapkan.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
