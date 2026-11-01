/** Tipe row database — harus sinkron dengan prisma/schema.prisma (snake_case asli DB) */

export type Role = "OWNER" | "ADMIN";
export type PesananStatus = "MENUNGU" | "DIKERJAKAN" | "SELESAI" | "BATAL";

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
  customer_id: string;
  jenis_tugas_id: string;
  penjoki_id: string;
  harga: number;
  fee_admin: number;
  fee_penjoki: number;
  jumlah_keterangan: string;
  catatan: string | null;
  status: PesananStatus;
  dibayar: boolean;
  fisk: boolean;
  selesai_at: string | null;
  tanggal: string;
  dibuat_oleh: string;
  customer?: Customer | null;
  jenis_tugas?: JenisTugas | null;
  penjoki?: Penjoki | null;
  team?: Team | null;
}

/** Aturan rekap (dari mockup biru): hanya tugas SELESAI + pembayaran + fisk. */
export function masukRekap(p: Pick<Pesanan, "status" | "dibayar" | "fisk">): boolean {
  return p.status === "SELESAI" && p.dibayar && p.fisk;
}
