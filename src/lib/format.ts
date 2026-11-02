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

/** Awal bulan berjalan (ISO) — dasar hitung KPI & rate */
export function awalBulanIni(): string {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1).toISOString();
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
