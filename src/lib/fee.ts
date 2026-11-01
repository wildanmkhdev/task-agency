/**
 * Konfigurasi pembagian fee (Decision D5 — dikonfirmasi client 1 Nov 2026):
 *   50% Admin CS  +  50% Penjoki
 * NOTE: total = 100% harga customer. Fee owner (bila ada) dari sumber lain —
 * menunggu klarifikasi client (lihat laporan analisis, D5).
 */
export const SHARE_ADMIN = 0.5;

/** Hitung fee dari harga customer. Pembulatan: admin dulu, sisa ke penjoki. */
export function hitungFee(harga: number): { feeAdmin: number; feePenjoki: number } {
  const feeAdmin = Math.round(harga * SHARE_ADMIN);
  return { feeAdmin, feePenjoki: harga - feeAdmin };
}
