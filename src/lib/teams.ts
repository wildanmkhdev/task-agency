/**
 * Tim yang tampil di daftar & filter (revisi client 5 Nov 2026).
 *
 * • "Sosmed" bukan tim operasional — admin sosmed punya ruang sendiri.
 * • "Tim 1" (tim admin utama) tidak ditampilkan di daftar penjoki, filter,
 *   maupun counter.
 *
 * Sebelumnya aturan ini hanya diterapkan di chip filter, sehingga penjoki
 * Tim 1 tetap muncul di "Semua Tim" dan ikut terhitung pada TOTAL PENJOKI /
 * AKTIF. Helper ini dipakai bersama oleh halaman penjoki, laporan, dan
 * statistik supaya UI dan angka tidak pernah berbeda aturan.
 */

const norm = (s?: string | null) => (s ?? "").toLowerCase().trim();

/** True bila tim ini harus disembunyikan dari daftar. */
export function timDisembunyikan(nama?: string | null): boolean {
  const n = norm(nama);
  return n.includes("sosmed") || /^tim\s*1$/.test(n);
}

/** Saring daftar tim (mis. chip filter) — urutan tetap dipertahankan. */
export function timTampil<T extends { nama?: string | null }>(teams: T[]): T[] {
  return teams.filter((t) => !timDisembunyikan(t.nama));
}

/** Saring baris yang membawa relasi `team: { nama }` (penjoki, pesanan). */
export function adaDiTimTampil(row: {
  team?: { nama?: string | null } | null;
}): boolean {
  return !timDisembunyikan(row.team?.nama);
}
