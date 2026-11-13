/**
 * Sinkron HANYA kolom `rating_skill` penjoki dari rekap DOCX owner.
 *
 * Kenapa script terpisah dari `sync-penjoki.ts`:
 * `sync-penjoki.ts` bersifat destruktif — baris yang tidak ada di rekap
 * dihapus/dinonaktifkan. Di database ada 3 penjoki tambahan yang tidak
 * tercantum di DOCX (Ahmad Abidin, Rania Zahrotul Khumairo, Solagratia).
 * Script ini hanya MENULIS rating, tidak menambah/menghapus penjoki.
 *
 * Pencocokan: nama ternormalisasi di tim yang sama; bila tidak persis,
 * dipakai awalan nama (minimal 4 huruf). Setiap baris DB hanya dipakai sekali.
 *
 * Jalankan:
 *   npx tsx scripts/sync-rating-penjoki.ts --dry-run
 *   npx tsx scripts/sync-rating-penjoki.ts
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { PENJOKI_DATA, type PenjokiSeed } from "../prisma/penjoki-data";

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
  console.error("VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tidak ada di .env");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");
const norm = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface BarisDb {
  id: string;
  nama: string;
  team_id: string;
  rating_skill: number | null;
  team: { nama: string } | null;
}

async function main() {
  const { data, error } = await db
    .from("penjoki")
    .select("id, nama, team_id, rating_skill, team:teams(nama)")
    .order("nama");
  if (error) throw error;

  const semua = (data ?? []) as unknown as BarisDb[];
  const dipakai = new Set<string>();

  const cocok: { seed: PenjokiSeed; baris: BarisDb }[] = [];
  const takKetemu: PenjokiSeed[] = [];

  for (const seed of PENJOKI_DATA) {
    const kandidat = semua.filter(
      (p) => p.team?.nama === seed.tim && !dipakai.has(p.id)
    );
    const n = norm(seed.nama);
    let baris =
      kandidat.find((p) => norm(p.nama) === n) ??
      kandidat.find((p) => {
        const pn = norm(p.nama);
        return (
          n.length >= 4 &&
          pn.length >= 4 &&
          (pn.startsWith(n) || n.startsWith(pn))
        );
      });
    if (!baris) {
      takKetemu.push(seed);
      continue;
    }
    dipakai.add(baris.id);
    cocok.push({ seed, baris });
  }

  const perluUpdate = cocok.filter(
    ({ seed, baris }) => baris.rating_skill !== seed.rating
  );

  console.log(`Mode: ${dryRun ? "DRY RUN (tidak menulis)" : "TULIS"}`);
  console.log(`Penjoki di DOCX : ${PENJOKI_DATA.length}`);
  console.log(`Cocok dengan DB : ${cocok.length}`);
  console.log(`Perlu diubah    : ${perluUpdate.length}`);
  console.log(`Tidak ketemu    : ${takKetemu.length}`);

  for (const { seed, baris } of perluUpdate) {
    console.log(
      `  ${seed.tim.padEnd(6)} ${baris.nama.padEnd(28)} ${String(
        baris.rating_skill
      ).padStart(4)} → ${seed.rating}`
    );
  }
  for (const s of takKetemu) console.log(`  TIDAK KETEMU: ${s.tim} · ${s.nama}`);

  const tanpaPadanan = semua.filter((p) => !dipakai.has(p.id));
  if (tanpaPadanan.length) {
    console.log("\nPenjoki DB tanpa padanan DOCX (DIBIARKAN, tidak disentuh):");
    for (const p of tanpaPadanan) {
      console.log(`  ${p.team?.nama ?? "-"} · ${p.nama} (rating=${p.rating_skill})`);
    }
  }

  if (dryRun) {
    console.log("\nDry run selesai — tidak ada data yang ditulis.");
    return;
  }

  let berhasil = 0;
  for (const { seed, baris } of perluUpdate) {
    const { error: e } = await db
      .from("penjoki")
      .update({ rating_skill: seed.rating })
      .eq("id", baris.id);
    if (e) {
      console.error(`GAGAL ${baris.nama}: ${e.message}`);
      continue;
    }
    berhasil++;
  }
  console.log(`\n✔ ${berhasil}/${perluUpdate.length} rating diperbarui.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
