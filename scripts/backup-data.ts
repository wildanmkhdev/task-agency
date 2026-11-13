/**
 * Backup logis seluruh tabel aplikasi ke JSON (pengganti pg_dump bila versi
 * client tidak cocok dengan server).
 *
 *   npx tsx scripts/backup-data.ts
 *
 * Hasil: /home/wildan/backups/agency-tugas/data-<timestamp>.json
 * Restore: npx tsx scripts/restore-data.ts <file> [--yes]
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

/** Urutan aman untuk insert (induk → anak). */
export const TABEL = [
  "teams",
  "jenis_tugas",
  "profiles",
  "penjoki",
  "customers",
  "pesanan",
] as const;

const DIR_BACKUP = "/home/wildan/backups/agency-tugas";

function loadEnv(): void {
  for (const nama of [".env", ".env.local"]) {
    const file = path.join(__dirname, "..", nama);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  }
}

async function main(): Promise<void> {
  loadEnv();
  fs.mkdirSync(DIR_BACKUP, { recursive: true });

  const isi: Record<string, unknown[]> = {};
  const jumlah: Record<string, number> = {};

  for (const tabel of TABEL) {
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `select * from ${tabel}`
    );
    isi[tabel] = JSON.parse(JSON.stringify(rows));
    jumlah[tabel] = rows.length;
    console.log(`✔ ${tabel}: ${rows.length} baris`);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const file = path.join(DIR_BACKUP, `data-${stamp}.json`);
  fs.writeFileSync(
    file,
    JSON.stringify({ dibuat: new Date().toISOString(), jumlah, tables: isi }, null, 1)
  );

  const size = fs.statSync(file).size;
  console.log(`\n💾 ${file} (${(size / 1024).toFixed(1)} KB)`);
  console.log(
    `   total ${Object.values(jumlah).reduce((a, b) => a + b, 0)} baris`
  );
  fs.writeFileSync("/tmp/opencode/last-backup-path.txt", file);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
