/**
 * Restore dari backup JSON `scripts/backup-data.ts`.
 *
 *   npx tsx scripts/restore-data.ts /path/data-xxx.json --yes
 *
 * Hanya mengembalikan tabel yang diminta (default: pesanan, customers, penjoki
 * — tabel yang dihapus oleh `scripts/rebuild-data.ts`). Teams, jenis_tugas,
 * dan profiles tidak disentuh kecuali diminta eksplisit.
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const URUTAN = ["teams", "jenis_tugas", "profiles", "penjoki", "customers", "pesanan"];

/** Kolom DateTime → dikonversi balik dari string ISO. */
const TANGGAL: Record<string, string[]> = {
  profiles: ["created_at", "updated_at"],
  penjoki: ["created_at", "updated_at"],
  customers: ["created_at"],
  pesanan: ["tanggal", "selesai_at", "created_at", "updated_at"],
};

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
  const file = process.argv[2];
  if (!file || !fs.existsSync(file)) {
    throw new Error("Pemakaian: tsx scripts/restore-data.ts <file.json> --yes");
  }
  if (!process.argv.includes("--yes")) {
    throw new Error("Restore menimpa data. Tambahkan --yes.");
  }

  const isi = JSON.parse(fs.readFileSync(file, "utf8")) as {
    tables: Record<string, Record<string, unknown>[]>;
  };

  const diminta = (process.argv.find((a) => a.startsWith("--tables=")) ?? "")
    .replace("--tables=", "")
    .split(",")
    .filter(Boolean);
  const tabel = diminta.length > 0 ? diminta : ["pesanan", "customers", "penjoki"];

  // Hapus anak → induk agar FK aman.
  for (const nama of [...URUTAN].reverse()) {
    if (!tabel.includes(nama)) continue;
    const model = (prisma as unknown as Record<string, { deleteMany: () => Promise<{ count: number }> }>)[nama === "teams" ? "team" : nama === "jenis_tugas" ? "jenisTugas" : nama === "profiles" ? "profile" : nama === "penjoki" ? "penjoki" : nama === "customers" ? "customer" : "pesanan"];
    const hasil = await model.deleteMany();
    console.log(`🗑  ${nama}: ${hasil.count} baris dihapus`);
  }

  // Insert induk → anak.
  for (const nama of URUTAN) {
    if (!tabel.includes(nama)) continue;
    const rows = (isi.tables[nama] ?? []).map((r) => {
      const salin = { ...r };
      for (const kolom of TANGGAL[nama] ?? []) {
        if (salin[kolom] != null) salin[kolom] = new Date(String(salin[kolom]));
      }
      return salin;
    });
    if (rows.length === 0) continue;
    const model = (prisma as unknown as Record<string, { createMany: (args: { data: unknown[] }) => Promise<{ count: number }> }>)[nama === "teams" ? "team" : nama === "jenis_tugas" ? "jenisTugas" : nama === "profiles" ? "profile" : nama === "penjoki" ? "penjoki" : nama === "customers" ? "customer" : "pesanan"];
    const hasil = await model.createMany({ data: rows });
    console.log(`📥 ${nama}: ${hasil.count} baris dipulihkan`);
  }
  console.log("\n✅ Restore selesai");
}

main()
  .catch((e) => {
    console.error("❌", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
