/**
 * Konfigurasi pembagian fee — Decision D5 FINAL (dikonfirmasi client 1 Nov 2026):
 *   Dari harga customer (100%):
 *     • 50% Penjoki   → otomatis (rumus)
 *     • 50% Owner     → otomatis (rumus, sisa pembulatan)
 *     • Fee Admin     → TIDAK dari split; owner ISI MANUAL per transaksi
 *                       (default 0 bila belum diisi)
 */
export const SHARE_PENJOKI = 0.5;
export const SHARE_OWNER = 0.5;

/** Hitung fee otomatis dari harga customer. Pembulatan: penjoki dulu, sisa ke owner. */
export function hitungFee(harga: number): {
  feePenjoki: number;
  feeOwner: number;
  feeAdmin: number;
} {
  const feePenjoki = Math.round(harga * SHARE_PENJOKI);
  return {
    feePenjoki,
    feeOwner: harga - feePenjoki,
    feeAdmin: 0, // manual oleh owner — lihat D5
  };
}
