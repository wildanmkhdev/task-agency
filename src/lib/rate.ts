/**
 * Rate kinerja penjoki (revisi 11 Nov 2026).
 *
 * Rate = rata-rata rating ulasan transaksi bulan berjalan, skala 0–5.
 * - Tugas BATAL tidak dihitung.
 * - Penjoki tanpa transaksi = belum ada data (bukan 0).
 * - Transaksi tanpa rating diabaikan (tidak dihitung dalam rata-rata).
 *
 * Status kinerja bintang:
 *   Sangat Baik     >= 4.5
 *   Baik            >= 3.5
 *   Cukup           >= 2.5
 *   Kurang          >= 1.5
 *   Perlu Perhatian <  1.5
 */
export type StatusKinerja = "sangat" | "baik" | "cukup" | "kurang" | "perhatian";

/** Skala maksimum rating (bintang). */
export const SKALA_RATING_MAKS = 5;

/**
 * Hitung rate 0–5 dari rata-rata rating transaksi bulan berjalan.
 * `transaksi` = array nilai rating yang sudah difilter (tidak termasuk null/BATAL).
 */
export function hitungRate(transaksi: number[]): number {
  if (transaksi.length === 0) return 0;
  const total = transaksi.reduce((a, b) => a + b, 0);
  return Math.round((total / transaksi.length) * 10) / 10; // 1 desimal
}

/**
 * Nilai rating yang valid (0 tidak dipakai: rating manual 1–5).
 */
function adaNilai(n: number | null | undefined): n is number {
  return n != null && Number.isFinite(n);
}

/**
 * Rate penjoki = rata-rata rating transaksi bulan berjalan; bila belum ada
 * transaksi yang dinilai, pakai rating kualitas penjoki (`rating_skill`).
 *
 * Fallback ini yang membuat penjoki tanpa transaksi bulan ini tetap punya
 * angka dari rekap DOCX owner, bukan 0.
 */
export function ratePenjoki(
  ratings: number[],
  fallback?: number | null
): number {
  if (ratings.length > 0) return hitungRate(ratings);
  if (adaNilai(fallback)) return Math.round(fallback * 10) / 10;
  return 0;
}

/**
 * Penjoki belum punya dasar penilaian: tidak ada transaksi berating bulan ini
 * DAN tidak ada rating kualitas tersimpan.
 */
export function belumAdaData(
  ratings: number[],
  fallback?: number | null
): boolean {
  return ratings.length === 0 && !adaNilai(fallback);
}

/** Format angka rate 0–5 untuk tampilan: "4,3" · "5" · "—". */
export function formatRate(rate: number | null | undefined): string {
  if (!adaNilai(rate)) return "—";
  const teks = rate.toFixed(1).replace(".", ",");
  return teks.endsWith(",0") ? teks.slice(0, -2) : teks;
}

/**
 * Format rating ulasan manual (1–5) untuk tampilan: "4,5/5" · "5/5".
 * `null`/undefined berarti admin belum menilai.
 */
export function labelRating(rating: number | null | undefined): string {
  if (rating == null || !Number.isFinite(rating)) return "Belum dinilai";
  const angka = Number.isInteger(rating)
    ? String(rating)
    : rating.toFixed(1).replace(".", ",");
  return `${angka}/${SKALA_RATING_MAKS}`;
}

export function statusKinerja(rate: number): StatusKinerja {
  if (rate >= 4.5) return "sangat";
  if (rate >= 3.5) return "baik";
  if (rate >= 2.5) return "cukup";
  if (rate >= 1.5) return "kurang";
  return "perhatian";
}

export interface GayaStatus {
  label: string;
  /** kelas badge status */
  badge: string;
  /** gradient bar rate */
  bar: string;
  /** warna titik indikator di ujung bar */
  dot: string;
}

export const GAYA_STATUS: Record<StatusKinerja, GayaStatus> = {
  sangat: {
    label: "Sangat Baik",
    badge: "border-emerald-300/40 bg-emerald-400/15 text-emerald-200",
    bar: "from-emerald-500 via-emerald-400 to-emerald-300",
    dot: "bg-emerald-300",
  },
  baik: {
    label: "Baik",
    badge: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    bar: "from-emerald-500 to-emerald-400",
    dot: "bg-emerald-400",
  },
  cukup: {
    label: "Cukup",
    badge: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    bar: "from-amber-500 to-amber-300",
    dot: "bg-amber-300",
  },
  kurang: {
    label: "Kurang",
    badge: "border-orange-400/30 bg-orange-400/10 text-orange-300",
    bar: "from-orange-500 to-orange-300",
    dot: "bg-orange-300",
  },
  perhatian: {
    label: "Perlu Perhatian",
    badge: "border-rose-400/30 bg-rose-400/10 text-rose-300",
    bar: "from-rose-500 to-rose-400",
    dot: "bg-rose-400",
  },
};

/** Gaya visual untuk sebuah nilai rate. */
export function gayaStatus(rate: number): GayaStatus {
  return GAYA_STATUS[statusKinerja(rate)];
}

/** Deskripsi singkat untuk panel info di bawah daftar. */
export const KETERANGAN_RATE =
  "Rate = rata-rata rating ulasan transaksi bulan ini (skala bintang 1–5). Transaksi tanpa rating tidak dihitung.";
