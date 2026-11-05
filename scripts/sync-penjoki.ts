import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { PENJOKI_DATA, type PenjokiSeed } from "../prisma/penjoki-data";

/**
 * Sync data penjoki TIM 2–5 dari rekap client ke Supabase.
 *
 * Aturan pencocokan (agar nama panggilan lama ikut berganti ke nama lengkap):
 * 1. Nomor HP ternormalisasi di tim yang sama.
 * 2. Nama ternormalisasi di tim yang sama.
 * 3. Tidak ketemu → insert.
 *
 * Baris TIM 2–5 yang tidak ada di rekap akan dihapus. Bila masih dirujuk
 * `pesanan`, baris hanya dinonaktifkan (aktif = false) agar histori aman.
 * TIM 1 tidak pernah disentuh.
 *
 * Jalankan: pnpm exec tsx scripts/sync-penjoki.ts [--dry-run]
 */

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

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DRY_RUN = process.argv.includes("--dry-run");
const TIM_DISYNC = new Set(["Tim 2", "Tim 3", "Tim 4", "Tim 5"]);

type ExistingRow = {
  id: string;
  nama: string;
  no_hp: string | null;
  team_id: string;
  rating_skill: number | null;
  keahlian: string[] | null;
  keterangan: string | null;
  aktif: boolean;
  teams: { nama: string } | null;
};

function normalisasiHp(hp: string | null): string {
  if (!hp) return "";
  const digit = hp.replace(/\D/g, "");
  return digit.startsWith("62") ? `0${digit.slice(2)}` : digit;
}

function normalisasiNama(nama: string): string {
  return nama.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Cari baris lama: HP dulu, lalu nama, hanya di tim yang sama. */
function cariPasangan(
  rows: ExistingRow[],
  row: PenjokiSeed,
  terpakai: Set<string>
): ExistingRow | undefined {
  const hp = normalisasiHp(row.no_hp);
  const kandidat = rows.filter(
    (r) => r.teams?.nama === row.tim && !terpakai.has(r.id)
  );
  const byHp = kandidat.find((r) => {
    const rhp = normalisasiHp(r.no_hp);
    if (!rhp || !hp) return false;
    return rhp === hp || rhp.slice(-9) === hp.slice(-9);
  });
  if (byHp) return byHp;
  const nama = normalisasiNama(row.nama);
  return kandidat.find((r) => normalisasiNama(r.nama) === nama);
}

async function main(): Promise<void> {
  const { data: teams, error: teamErr } = await supabase
    .from("teams")
    .select("id, nama");
  if (teamErr) throw teamErr;
  const teamId = new Map((teams ?? []).map((t) => [t.nama, t.id]));
  for (const tim of TIM_DISYNC) {
    if (!teamId.has(tim)) throw new Error(`Tim "${tim}" tidak ditemukan di database.`);
  }

  const { data: existing, error: penjokiErr } = await supabase
    .from("penjoki")
    .select(
      "id, nama, no_hp, team_id, rating_skill, keahlian, keterangan, aktif, teams(nama)"
    );
  if (penjokiErr) throw penjokiErr;
  const rows = (existing ?? []) as unknown as ExistingRow[];

  const { data: pesanan, error: pesananErr } = await supabase
    .from("pesanan")
    .select("penjoki_id");
  if (pesananErr) throw pesananErr;
  const dipakai = new Set((pesanan ?? []).map((p) => p.penjoki_id));

  const terpakai = new Set<string>();
  let diupdate = 0;
  let disisipkan = 0;

  for (const row of PENJOKI_DATA) {
    const pasangan = cariPasangan(rows, row, terpakai);
    const payload = {
      nama: row.nama,
      no_hp: row.no_hp,
      team_id: teamId.get(row.tim)!,
      rating_skill: row.rating,
      keahlian: row.keahlian,
      keterangan: row.keterangan,
      aktif: true,
    };

    if (pasangan) {
      terpakai.add(pasangan.id);
      const berubah =
        pasangan.nama !== payload.nama ||
        pasangan.no_hp !== payload.no_hp ||
        pasangan.team_id !== payload.team_id ||
        pasangan.rating_skill !== payload.rating_skill ||
        JSON.stringify(pasangan.keahlian ?? []) !== JSON.stringify(payload.keahlian) ||
        pasangan.keterangan !== payload.keterangan ||
        !pasangan.aktif;
      if (!berubah) {
        console.log(`= ${row.tim} | ${row.nama} (tidak berubah)`);
        continue;
      }
      console.log(`~ ${row.tim} | ${pasangan.nama} → ${row.nama}`);
      if (!DRY_RUN) {
        const { error } = await supabase
          .from("penjoki")
          .update(payload)
          .eq("id", pasangan.id);
        if (error) throw new Error(`Update ${row.nama}: ${error.message}`);
      }
      diupdate += 1;
    } else {
      console.log(`+ ${row.tim} | ${row.nama}`);
      if (!DRY_RUN) {
        const { error } = await supabase.from("penjoki").insert(payload);
        if (error) throw new Error(`Insert ${row.nama}: ${error.message}`);
      }
      disisipkan += 1;
    }
  }

  // Baris TIM 2–5 yang tidak ada di rekap → hapus / nonaktifkan.
  const sisa = rows.filter(
    (r) => TIM_DISYNC.has(r.teams?.nama ?? "") && !terpakai.has(r.id)
  );
  let dihapus = 0;
  let dinonaktifkan = 0;
  for (const r of sisa) {
    if (dipakai.has(r.id)) {
      console.log(`! ${r.teams?.nama} | ${r.nama} masih punya pesanan → nonaktifkan`);
      if (!DRY_RUN) {
        const { error } = await supabase
          .from("penjoki")
          .update({ aktif: false })
          .eq("id", r.id);
        if (error) throw new Error(`Nonaktifkan ${r.nama}: ${error.message}`);
      }
      dinonaktifkan += 1;
    } else {
      console.log(`- ${r.teams?.nama} | ${r.nama} (hapus)`);
      if (!DRY_RUN) {
        const { error } = await supabase.from("penjoki").delete().eq("id", r.id);
        if (error) throw new Error(`Hapus ${r.nama}: ${error.message}`);
      }
      dihapus += 1;
    }
  }

  console.log(
    `\n${DRY_RUN ? "[DRY RUN] " : ""}Ringkasan: ${diupdate} update, ${disisipkan} insert, ${dihapus} hapus, ${dinonaktifkan} nonaktif.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
