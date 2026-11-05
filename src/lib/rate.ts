/**
 * Rate kinerja penjoki (revisi 4 Nov 2026).
 *
 * Rate = 70% ulasan (rating_skill) + 30% volume tugas bulan berjalan.
 * - Ulasan: nilai 0–100 dari form "Rating Ulasan" / data rekap.
 * - Volume: 8 tugas/bulan dianggap penuh (100). Tugas BATAL tidak dihitung.
 * - Bila ulasan belum diisi, dipakai nilai netral 60 supaya status tidak
 *   langsung jatuh ke "Perlu Perhatian" hanya karena data ulasan kosong.
 *
 * Status kinerja (mengikuti mockup "ui rate"):
 *   Sangat Aktif    >= 90
 *   Aktif           >= 70
 *   Cukup Aktif     >= 55
 *   Kurang Aktif    >= 40
 *   Perlu Perhatian <  40
 */
export type StatusKinerja = "sangat" | "aktif" | "cukup" | "kurang" | "perhatian";

export const BOBOT_ULASAN = 0.7;
export const BOBOT_TUGAS = 0.3;
export const TARGET_TUGAS_BULANAN = 8;
export const ULASAN_NETRAL = 60;

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** Hitung rate gabungan 0–100 dari ulasan dan jumlah tugas bulan ini. */
export function hitungRate(
  rating: number | null | undefined,
  tugasBulanIni: number
): number {
  const tugas = Math.max(0, Math.floor(tugasBulanIni));
  const skorTugas = clamp((tugas / TARGET_TUGAS_BULANAN) * 100);
  const skorUlasan = rating == null ? ULASAN_NETRAL : clamp(rating);
  return Math.round(BOBOT_ULASAN * skorUlasan + BOBOT_TUGAS * skorTugas);
}

/**
 * Penjoki belum punya data sama sekali: belum dinilai manual dan belum pernah
 * mendapat tugas bulan berjalan.
 *
 * Pada kondisi ini `hitungRate` mengembalikan 42 (0,7 × 60 + 0,3 × 0), yaitu
 * nilai fallback matematis — bukan hasil pengukuran. Menampilkannya sebagai
 * "Kurang Aktif" membuat semua penjoki baru tampak berkinerja buruk, jadi
 * layar harus menampilkan status netral "Belum ada data" alih-alih angka.
 */
export function belumAdaData(
  rating: number | null | undefined,
  tugasBulanIni: number
): boolean {
  return rating == null && Math.max(0, Math.floor(tugasBulanIni)) === 0;
}

export function statusKinerja(rate: number): StatusKinerja {
  if (rate >= 90) return "sangat";
  if (rate >= 70) return "aktif";
  if (rate >= 55) return "cukup";
  if (rate >= 40) return "kurang";
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
    label: "Sangat Aktif",
    badge: "border-emerald-300/40 bg-emerald-400/15 text-emerald-200",
    bar: "from-emerald-500 via-emerald-400 to-emerald-300",
    dot: "bg-emerald-300",
  },
  aktif: {
    label: "Aktif",
    badge: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    bar: "from-emerald-500 to-emerald-400",
    dot: "bg-emerald-400",
  },
  cukup: {
    label: "Cukup Aktif",
    badge: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    bar: "from-amber-500 to-amber-300",
    dot: "bg-amber-300",
  },
  kurang: {
    label: "Kurang Aktif",
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
  "Rate dihitung dari rating ulasan dan jumlah tugas selesai dalam periode ini.";
