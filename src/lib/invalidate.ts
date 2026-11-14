import type { QueryClient } from "@tanstack/react-query";

/**
 * Daftar cache yang ANGKA-nya bergantung pada tabel `pesanan`
 * (termasuk kolom `rating`). Setiap tambah/edit/hapus transaksi WAJIB
 * menyegarkan semuanya, kalau tidak halaman lain menampilkan rate lama.
 *
 * Kenapa dipusatkan di sini: sebelumnya tiap halaman punya daftar sendiri
 * dan beberapa key rating terlewat (`penjoki-rating-bulan-ini`,
 * `penjoki-rating-transaksi`, `rate-penjoki-transaksi`, `statistik-*`),
 * sehingga rate penjoki terlihat "tidak berubah" setelah transaksi diedit.
 */
const KEY_TRANSAKSI = [
  "pesanan",
  "dashboard-pesanan",
  "rekap",
  "rekap-admin",
  "rekap-admin-pembanding",
  "notifikasi",
  "penjoki-rate",
  "penjoki-tugas-bulan-ini",
  "penjoki-rating-akumulasi",
  "penjoki-rating-akumulasi-penjoki",
  "penjoki-rating-bulan-ini",
  "penjoki-rating-transaksi",
  "penjoki-rating-rata",
  "rate-penjoki-akumulasi",
  "rate-penjoki-transaksi",
  "statistik-pesanan",
  "statistik-penjoki",
  "statistik-rating-akumulasi",
  "admin-detail",
] as const;

/**
 * Segarkan semua cache yang terpengaruh perubahan transaksi.
 * `jenis-tugas` ikut karena dialog transaksi bisa membuat jenis baru.
 */
export function invalidateTransaksi(qc: QueryClient): void {
  for (const key of KEY_TRANSAKSI) {
    qc.invalidateQueries({ queryKey: [key] });
  }
  qc.invalidateQueries({ queryKey: ["jenis-tugas"] });
  qc.invalidateQueries({ queryKey: ["penjoki-detail"] });
}

/**
 * Segarkan cache setelah data penjoki berubah (nama, tim, status aktif).
 * Rate bisa berubah karena fallback `rating_skill` dan keanggotaan tim.
 */
export function invalidatePenjoki(qc: QueryClient): void {
  qc.invalidateQueries({ queryKey: ["penjoki"] });
  qc.invalidateQueries({ queryKey: ["penjoki-manajemen"] });
  qc.invalidateQueries({ queryKey: ["penjoki-detail"] });
  qc.invalidateQueries({ queryKey: ["penjoki-rate"] });
  qc.invalidateQueries({ queryKey: ["penjoki-rating-akumulasi"] });
  qc.invalidateQueries({ queryKey: ["penjoki-rating-akumulasi-penjoki"] });
  qc.invalidateQueries({ queryKey: ["penjoki-rating-bulan-ini"] });
  qc.invalidateQueries({ queryKey: ["penjoki-rating-transaksi"] });
  qc.invalidateQueries({ queryKey: ["penjoki-rating-rata"] });
  qc.invalidateQueries({ queryKey: ["penjoki-tugas-bulan-ini"] });
  qc.invalidateQueries({ queryKey: ["rate-penjoki-akumulasi"] });
  qc.invalidateQueries({ queryKey: ["rate-penjoki-transaksi"] });
  qc.invalidateQueries({ queryKey: ["statistik-penjoki"] });
  qc.invalidateQueries({ queryKey: ["statistik-pesanan"] });
  qc.invalidateQueries({ queryKey: ["statistik-rating-akumulasi"] });
  qc.invalidateQueries({ queryKey: ["admin-per-tim"] });
}
