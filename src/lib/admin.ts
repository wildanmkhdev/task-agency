import type { Profile } from "./types";

/**
 * Identitas & jabatan admin (revisi client 2 Nov 2026).
 *
 * Client belum menambah kolom jabatan di database, jadi jabatan diturunkan
 * dari nama + tim. Bila nanti kolom `jabatan` ditambahkan ke tabel profiles,
 * cukup isi di sini sebagai prioritas pertama.
 */
export type JenisAdmin = "utama" | "cs" | "sosmed";

export const KETERANGAN_JABATAN: Record<JenisAdmin, string> = {
  utama: "Mengatur semua tim dan melayani customer",
  cs: "Melayani customer, pendataan keuangan harian dan rekap data harian",
  sosmed:
    "Mengelola sosial media, rekrutmen penjoki baru dan mengatur jadwal admin",
};

const norm = (s?: string | null) => (s ?? "").toLowerCase().trim();

/**
 * Peran admin diturunkan dari DATA, bukan dari nama orang.
 * Sumber kebenaran: nama tim (tabel `teams`).
 *   • tim "Sosmed"  → admin sosmed (read-only lintas tim)
 *   • tim "Tim 1"   → admin utama (tetap hanya timnya sendiri)
 *   • tim lainnya   → admin CS
 * Menebak dari nama pribadi ("rania") rapuh: ganti nama → peran berubah.
 */
export function jenisAdmin(p: Pick<Profile, "nama_lengkap" | "team">): JenisAdmin {
  // Kolom jabatan (bila nanti tersedia di DB) tetap diprioritaskan.
  const j = norm((p as { jabatan?: string | null }).jabatan);
  if (j.includes("sosmed")) return "sosmed";
  if (j.includes("utama")) return "utama";

  const tim = norm(p.team?.nama);
  if (tim.includes("sosmed")) return "sosmed";
  if (tim.includes("utama") || /^tim\s*1$/.test(tim)) return "utama";
  return "cs";
}

/**
 * Admin sosmed bersifat READ-ONLY: boleh melihat data seluruh tim,
 * tidak boleh menambah atau mengubah apa pun (revisi client 3 Nov 2026).
 */
export function hanyaBaca(
  p: Pick<Profile, "nama_lengkap" | "team"> | null | undefined
): boolean {
  return Boolean(p) && jenisAdmin(p as Pick<Profile, "nama_lengkap" | "team">) === "sosmed";
}

/**
 * Nama dasar tanpa suffix "sosmed" agar tidak dobel saat ditampilkan.
 * Suffix "CS" DIPERTAHANKAN — client minta nama tampil "Naim CS", "Widya CS", dst.
 */
export function namaTampil(p: Pick<Profile, "nama_lengkap">): string {
  return (p.nama_lengkap ?? "").replace(/\s+sosmed$/i, "").trim();
}

/** Nama lengkap untuk daftar admin: "Rania" → "Rania sosmed". */
export function namaLengkapAdmin(
  p: Pick<Profile, "nama_lengkap" | "team">
): string {
  const dasar = namaTampil(p);
  return jenisAdmin(p) === "sosmed" ? `${dasar} sosmed` : dasar;
}

/** Jabatan yang ditulis di bawah nama admin. */
export function labelJabatan(p: Pick<Profile, "nama_lengkap" | "team">): string {
  const jenis = jenisAdmin(p);
  if (jenis === "sosmed") return "Sekretaris dan Admin Sosmed";
  if (jenis === "utama") return "Admin Tim Utama";
  const tim = p.team?.nama?.replace(/^tim\s*/i, "").trim();
  return tim ? `Admin Tim ${tim}` : "Admin CS";
}

export function keteranganJabatan(p: Pick<Profile, "nama_lengkap" | "team">): string {
  return KETERANGAN_JABATAN[jenisAdmin(p)];
}

/** Urutan daftar admin: tim utama → tim 2..5 → admin sosmed (paling bawah). */
export function urutkanAdmin<T extends Pick<Profile, "nama_lengkap" | "team">>(
  list: T[]
): T[] {
  const rank = (p: T) => {
    const jenis = jenisAdmin(p);
    if (jenis === "sosmed") return 1000;
    if (jenis === "utama") return 0;
    const n = Number(norm(p.team?.nama).replace(/[^0-9]/g, "")) || 50;
    return n;
  };
  return [...list].sort((a, b) => rank(a) - rank(b) || namaTampil(a).localeCompare(namaTampil(b)));
}
