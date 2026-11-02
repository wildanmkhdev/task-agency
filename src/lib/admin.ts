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

export function jenisAdmin(p: Pick<Profile, "nama_lengkap" | "team">): JenisAdmin {
  // Kolom jabatan (bila nanti tersedia di DB)
  const j = norm((p as { jabatan?: string | null }).jabatan);
  if (j.includes("sosmed")) return "sosmed";
  if (j.includes("utama")) return "utama";

  if (norm(p.nama_lengkap).includes("rania")) return "sosmed";
  const tim = norm(p.team?.nama);
  if (tim.includes("sosmed")) return "sosmed";
  if (tim.includes("utama") || tim === "tim 1") return "utama";
  return "cs";
}

/** Nama tampilan tanpa suffix "cs" (permintaan client). */
export function namaTampil(p: Pick<Profile, "nama_lengkap">): string {
  return p.nama_lengkap.replace(/\s+cs$/i, "").trim();
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
