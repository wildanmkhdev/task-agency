import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

/** Mini .env loader (tsx tidak auto-load .env) */
function loadEnv(): void {
  const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
loadEnv();

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error("VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum terisi di .env");
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const prisma = new PrismaClient();

/**
 * Seed akun login (idempotent):
 * - owner@jokitugasaja.id (OWNER)
 * - admin.tim1..5@jokitugasaja.id (ADMIN, terikat 1 tim — D2)
 * Profile dibuat otomatis oleh trigger handle_new_user di database.
 * Password acak dicetak & disimpan ke akun_seed.txt (tidak di-commit).
 */
async function main() {
  const teams = await prisma.team.findMany({ orderBy: { nama: "asc" } });
  if (teams.length === 0) throw new Error("Jalankan `pnpm db:seed` dulu (tim belum ada).");

  const akun: { email: string; nama: string; role: "OWNER" | "ADMIN"; teamId: string | null }[] = [
    { email: "owner@jokitugasaja.id", nama: "Owner", role: "OWNER", teamId: null },
    ...teams.map((t, i) => ({
      email: `admin.tim${i + 1}@jokitugasaja.id`,
      nama: `Admin ${t.nama}`,
      role: "ADMIN" as const,
      teamId: t.id,
    })),
  ];

  // Daftar semua user existing (hindari duplikat)
  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 100 });
  const existingEmails = new Set((existing?.users ?? []).map((u) => u.email?.toLowerCase()));

  const lines: string[] = [
    `Akun login JokiTugasAja_ID — dibuat ${new Date().toISOString()}`,
    "GANTI password setelah login pertama. Simpan di tempat aman.",
    "",
  ];

  for (const a of akun) {
    if (existingEmails.has(a.email)) {
      lines.push(`${a.email} : (sudah ada — reset via Supabase Dashboard jika lupa)`);
      continue;
    }
    const password = `JkTA-${randomBytes(9).toString("base64url")}`;
    const { error } = await admin.auth.admin.createUser({
      email: a.email,
      password,
      email_confirm: true,
      user_metadata: {
        role: a.role,
        team_id: a.teamId ?? "",
        nama_lengkap: a.nama,
      },
    });
    if (error) {
      console.error(`✖ ${a.email}: ${error.message}`);
      continue;
    }
    lines.push(`${a.email} : ${password}`);
    console.log(`✔ ${a.email} (${a.role}${a.teamId ? " · " + teams.find((t) => t.id === a.teamId)?.nama : ""})`);
  }

  writeFileSync("akun_seed.txt", lines.join("\n") + "\n", { mode: 0o600 });
  console.log("📄 Password tersimpan di akun_seed.txt (gitignored).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
