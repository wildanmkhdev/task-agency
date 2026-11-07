import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const mig = await prisma.$queryRawUnsafe<{ migration_name: string; finished_at: Date | null }[]>(
    `SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at`
  );
  console.log("MIGRATIONS:");
  for (const m of mig) console.log(` ${m.finished_at ? "✓" : "…"} ${m.migration_name}`);
  const pol = await prisma.$queryRawUnsafe<{ policyname: string; cmd: string; qual: string | null }[]>(
    `SELECT policyname, cmd, qual FROM pg_policies WHERE schemaname='public' AND tablename='pesanan' ORDER BY policyname`
  );
  console.log("\nPOLICIES pesanan:");
  for (const p of pol) console.log(` ${p.policyname} [${p.cmd}] ${p.qual ?? ""}`);
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
