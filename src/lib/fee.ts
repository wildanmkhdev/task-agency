/**
 * Pembagian fee — REVISI CLIENT 2 Nov 2026.
 * Persentase dihitung dari TOTAL PENDAPATAN (bukan per transaksi):
 *   • Fee Penjoki       50%
 *   • Fee Admin CS      23%
 *   • Fee Admin Sosmed   7%
 *   • Fee Owner         20%
 * Total = 100%.
 *
 * Nilai per transaksi tetap disimpan di kolom fee_* agar kompatibel dengan
 * data lama, tetapi tampilan rekap selalu menghitung ulang dari total
 * pendapatan sesuai persentase final di atas.
 */
export const BAGI_HASIL = {
  penjoki: 0.5,
  adminCs: 0.23,
  adminSosmed: 0.07,
  owner: 0.2,
} as const;

/** Persentase bulat untuk label (hindari 7.000000000000001%). */
export function persen(n: number): number {
  return Math.round(n * 100);
}

export interface AlokasiFee {
  penjoki: number;
  adminCs: number;
  adminSosmed: number;
  owner: number;
}

/** Bagi total pendapatan ke 4 penerima. Sisa pembulatan masuk ke owner. */
export function alokasiFee(totalPendapatan: number): AlokasiFee {
  const total = Math.max(0, Math.round(totalPendapatan));
  const penjoki = Math.round(total * BAGI_HASIL.penjoki);
  const adminCs = Math.round(total * BAGI_HASIL.adminCs);
  const adminSosmed = Math.round(total * BAGI_HASIL.adminSosmed);
  const owner = total - penjoki - adminCs - adminSosmed;
  return { penjoki, adminCs, adminSosmed, owner };
}

/** Fee per transaksi (dipakai form input pesanan). */
export function hitungFee(harga: number): {
  feePenjoki: number;
  feeOwner: number;
  feeAdmin: number;
  feeSosmed: number;
} {
  const a = alokasiFee(harga);
  return {
    feePenjoki: a.penjoki,
    feeOwner: a.owner,
    feeAdmin: a.adminCs,
    feeSosmed: a.adminSosmed,
  };
}
