/** Tipe row database — harus sinkron dengan prisma/schema.prisma (snake_case asli DB) */

export type Role = "OWNER" | "ADMIN";
export type PesananStatus = "MENUNGU" | "DIKERJAKAN" | "SELESAI" | "BATAL";
export type StatusBayar = "BELUM" | "CICIL" | "LUNAS";

export interface Team {
  id: string;
  nama: string;
}

export interface Profile {
  id: string;
  role: Role;
  team_id: string | null;
  nama_lengkap: string;
  no_hp: string | null;
  aktif: boolean;
  team?: Team | null;
}

export interface JenisTugas {
  id: string;
  nama: string;
  aktif: boolean;
}

export interface Customer {
  id: string;
  nama: string;
  no_wa: string;
  catatan: string | null;
  team_id: string;
}

export interface Penjoki {
  id: string;
  nama: string;
  no_hp: string | null;
  team_id: string;
  /**
   * Rating kualitas 1–5 dari rekap penjoki (DOCX owner). Dipakai sebagai
   * FALLBACK rate: bila penjoki belum punya transaksi berating bulan ini,
   * angka rate memakai nilai ini. Sumber utama rate tetap rata-rata
   * `pesanan.rating` bulan berjalan.
   */
  rating_skill: number | null;
  keahlian: string[] | null;
  keterangan: string | null;
  aktif: boolean;
  team?: Team | null;
}

export interface Pesanan {
  id: string;
  kode: string;
  team_id: string;
  customer_id: string | null;
  jenis_tugas_id: string;
  penjoki_id: string;
  harga: number;
  fee_admin: number;
  fee_owner: number;
  fee_penjoki: number;
  jumlah_keterangan: string;
  catatan: string | null;
  /** Rating kualitas 1–5 untuk transaksi ini. Rata-ratanya = rating penjoki. */
  rating: number | null;
  status: PesananStatus;
  status_bayar: StatusBayar;
  selesai_at: string | null;
  tanggal: string;
  dibuat_oleh: string;
  customer?: Customer | null;
  jenis_tugas?: JenisTugas | null;
  penjoki?: Penjoki | null;
  team?: Team | null;
}

/**
 * Kode transaksi Oktober yang TIDAK dihitung dalam agregat rekap.
 *
 * Dasar: permintaan owner 11 Nov 2026 — total Oktober di aplikasi harus sama
 * dengan footer sheet "Oktober" di file Excel client (Rp39.355.508).
 * Footer itu memakai `=SUM(E3:E538)` sehingga melewatkan 5 baris:
 *
 *   TRX-OKT26-0002  Rp88.000   (Excel baris 2)
 *   TRX-OKT26-0539  Rp80.000   (Excel baris 539)
 *   TRX-OKT26-0540  Rp28.000   (Excel baris 540)
 *   TRX-OKT26-0541  Rp80.000   (Excel baris 541)
 *   TRX-OKT26-0542  Rp100.000  (Excel baris 542)
 *   ─────────────────────────
 *   total dikecualikan Rp376.000
 *
 * Baris TETAP ada di database (histori & rincian transaksi utuh); hanya
 * tidak ikut dijumlahkan. Hapus entri di sini bila owner membetulkan rumus
 * Excel-nya (lihat `scripts/cek-angka-excel.ts`).
 */
export const KODE_DI_LUAR_REKAP: ReadonlySet<string> = new Set([
  "TRX-OKT26-0002",
  "TRX-OKT26-0539",
  "TRX-OKT26-0540",
  "TRX-OKT26-0541",
  "TRX-OKT26-0542",
]);

/**
 * Aturan rekap (final 2026-11-02, permintaan client):
 * tugas SELESAI + pembayaran LUNAS. CICIL/BELUM belum masuk rekap.
 * (Sebelumnya: SELESAI + dibayar + fisk — fisk sudah dihapus dari alur.)
 *
 * Revisi 11 Nov 2026: transaksi di `KODE_DI_LUAR_REKAP` dikecualikan agar
 * total Oktober sama dengan footer Excel owner. Pemanggil yang tidak
 * membawa `kode` tetap dihitung (aturan lama).
 */
export function masukRekap(
  p: Pick<Pesanan, "status" | "status_bayar"> & { kode?: string | null }
): boolean {
  if (p.status !== "SELESAI" || p.status_bayar !== "LUNAS") return false;
  return !(p.kode && KODE_DI_LUAR_REKAP.has(p.kode));
}
