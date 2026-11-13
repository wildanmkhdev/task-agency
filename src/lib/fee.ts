/**
 * Pembagian fee — REVISI CLIENT 9 Nov 2026 (menggantikan versi 2 Nov).
 * Persentase dihitung dari TOTAL PENDAPATAN (bukan per transaksi):
 *   • Fee Penjoki       49%
 *   • Fee Admin CS      22%
 *   • Fee Admin Sosmed   6%
 *   • Fee Owner         20%
 *   • Kas                3%
 * Total = 100%.
 *
 * Perubahan dari versi lama (50/23/7/20): penjoki, admin CS, dan admin
 * sosmed masing-masing turun 1 poin; 3 poin itulah yang menjadi Kas.
 *
 * Nilai per transaksi tetap disimpan di kolom fee_* agar kompatibel dengan
 * data lama, tetapi tampilan rekap selalu menghitung ulang dari total
 * pendapatan sesuai persentase final di atas.
 */
export const BAGI_HASIL = {
  penjoki: 0.49,
  adminCs: 0.22,
  adminSosmed: 0.06,
  owner: 0.2,
  kas: 0.03,
} as const;

/** Persentase bulat untuk label (hindari 6.000000000000001%). */
export function persen(n: number): number {
  return Math.round(n * 100);
}

export interface AlokasiFee {
  penjoki: number;
  adminCs: number;
  adminSosmed: number;
  owner: number;
  kas: number;
}

/** Bagi total pendapatan ke 5 penerima. Sisa pembulatan masuk ke owner. */
export function alokasiFee(totalPendapatan: number): AlokasiFee {
  const total = Math.max(0, Math.round(totalPendapatan));
  const penjoki = Math.round(total * BAGI_HASIL.penjoki);
  const adminCs = Math.round(total * BAGI_HASIL.adminCs);
  const adminSosmed = Math.round(total * BAGI_HASIL.adminSosmed);
  const kas = Math.round(total * BAGI_HASIL.kas);
  const owner = total - penjoki - adminCs - adminSosmed - kas;
  return { penjoki, adminCs, adminSosmed, owner, kas };
}

/**
 * Fee Admin Sosmed yang DIKUMPULKAN DARI TIAP ADMIN.
 *
 * Revisi client 12 Nov 2026: angka Rania bukan total pendapatan kotor,
 * melainkan penjumlahan fee 6% dari pendapatan masing-masing admin
 * (satu pembulatan per admin, lalu dijumlahkan).
 *
 * Contoh: admin A Rp100.000 → Rp6.000, admin B Rp100.000 → Rp6.000,
 * hasil Rania Rp12.000. Dibuat terpusat di sini agar halaman daftar dan
 * ruangan Rania memakai angka yang sama.
 */
export function feeSosmedAkumulasi<
  T extends { dibuat_oleh: string; harga: number }
>(rows: readonly T[]): number {
  const perAdmin = new Map<string, number>();
  for (const row of rows) {
    perAdmin.set(row.dibuat_oleh, (perAdmin.get(row.dibuat_oleh) ?? 0) + row.harga);
  }
  let total = 0;
  for (const pendapatan of perAdmin.values()) {
    total += Math.round(pendapatan * BAGI_HASIL.adminSosmed);
  }
  return total;
}

/** Fee per transaksi (dipakai form input pesanan). */
export function hitungFee(harga: number): {
  feePenjoki: number;
  feeOwner: number;
  feeAdmin: number;
  feeSosmed: number;
  feeKas: number;
} {
  const a = alokasiFee(harga);
  return {
    feePenjoki: a.penjoki,
    feeOwner: a.owner,
    feeAdmin: a.adminCs,
    feeSosmed: a.adminSosmed,
    feeKas: a.kas,
  };
}
