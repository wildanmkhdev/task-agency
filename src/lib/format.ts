const rupiahFmt = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Rp 250.000 */
export function rupiah(n: number): string {
  return rupiahFmt.format(n).replace(/\s/g, " ");
}

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** 01 Nov 2026 */
export function tanggalPendek(iso: string | Date): string {
  return dateFmt.format(new Date(iso));
}

/** 01 Nov 2026, 14:30 */
export function tanggalWaktu(iso: string | Date): string {
  return dateTimeFmt.format(new Date(iso));
}

const dateLongFmt = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Senin, 30 Juni 2025 */
export function tanggalPanjang(iso: string | Date): string {
  return dateLongFmt.format(new Date(iso));
}

/** yyyy-mm-dd (untuk input date) */
export function yyyyMmDd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Nilai untuk kolom `pesanan.tanggal` (TIMESTAMP tanpa timezone).
 *
 * JANGAN memakai `new Date(`${tanggal}T00:00:00`).toISOString()`: konversi itu
 * menggeser tengah malam lokal (WIB, UTC+7) menjadi 17:00 UTC hari sebelumnya.
 * Supabase mengembalikan timestamp tanpa zona apa adanya (mis.
 * "2026-10-10T17:00:00"), lalu browser membacanya sebagai waktu lokal →
 * tanggal tampil mundur sehari. Kirim string polos agar simpan-baca tetap di
 * tanggal yang sama. Filter rekap tetap benar karena batas query memakai
 * tengah malam lokal yang dikonversi ke UTC.
 */
export function tanggalDb(tanggal: string): string {
  return `${tanggal}T00:00:00`;
}

/**
 * Parse timestamp instant dari database (`created_at`, `updated_at`,
 * `selesai_at`). Kolom-kolom itu TIMESTAMP tanpa zona dan menyimpan UTC;
 * Supabase mengembalikannya tanpa `Z`. Kalau di-parse langsung, browser
 * menganggapnya waktu lokal (WIB) sehingga tampil 7 jam lebih awal.
 * Helper ini menambahkan `Z` bila zona belum ada.
 *
 * JANGAN dipakai untuk kolom `tanggal` — itu tanggal lokal tanpa jam.
 */
export function waktuDb(iso: string | Date): Date {
  if (iso instanceof Date) return iso;
  const sudahAdaZona = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso);
  return new Date(sudahAdaZona ? iso : `${iso}Z`);
}

/** Awal bulan berjalan (tanggal lokal, `YYYY-MM-DD`).
 *
 * Kolom `pesanan.tanggal` menyimpan tengah malam waktu lokal tanpa zona.
 * JANGAN pakai `toISOString()` di sini: di WIB hasilnya bergeser 7 jam
 * (mis. `2026-10-31T17:00:00Z`), sehingga batas bulan tidak lagi bulat.
 */
export function awalBulanIni(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Awal bulan berikutnya (`YYYY-MM-DD`) — batas eksklusif "bulan berjalan". */
export function awalBulanDepan(): string {
  const n = new Date();
  const d = new Date(n.getFullYear(), n.getMonth() + 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Kode transaksi tampilan: TRX-20261101-XXXX */
export function kodeTransaksi(): string {
  const n = new Date();
  const ymd = `${n.getFullYear()}${String(n.getMonth() + 1).padStart(2, "0")}${String(
    n.getDate()
  ).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TRX-${ymd}-${rand}`;
}

/**
 * Nama customer untuk tampilan.
 *
 * Data hasil import Excel lama menyimpan nama customer dengan penanda
 * teknis `[IMPORT] ` (mis. "[IMPORT] Eca"). Penanda itu tidak boleh terlihat
 * di UI. Data di DB sudah dibersihkan; helper ini pengaman kalau ada import
 * baru yang masih membawa penanda tersebut.
 */
export function namaCustomerTampil(nama?: string | null): string {
  const bersih = (nama ?? "").replace(/^\[IMPORT\]\s*/i, "").trim();
  return bersih || "-";
}
