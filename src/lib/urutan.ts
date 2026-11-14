/**
 * Satu sumber urutan untuk SEMUA daftar transaksi.
 *
 * Kenapa dipusatkan: halaman Transaksi dan Rincian Transaksi (Detail Rekap)
 * pernah memberi urutan berbeda untuk data yang sama, sehingga penjoki yang
 * sama tampak "berpindah posisi" antar menu. Semua halaman sekarang memanggil
 * `urutkanTransaksi()` agar tidak bisa menyimpang lagi.
 *
 * Kenapa butuh tiebreaker:
 * `pesanan.tanggal` disimpan sebagai tengah malam (`tanggalDb` →
 * "YYYY-MM-DDT00:00:00"), jadi SELURUH transaksi pada hari yang sama punya
 * nilai `tanggal` identik. Tanpa kolom penentu, PostgreSQL bebas
 * mengembalikan baris satu hari dalam urutan apa pun — dan urutannya bisa
 * berubah sendiri setelah UPDATE/import. Itulah penyebab daftar "ngacak".
 *
 * Susunan yang dipakai:
 *   1. `tanggal`    NAIK  → 01 Jan di atas, mirip Google Sheet / kalender.
 *   2. `created_at` NAIK  → dalam satu hari: urutan input; data import =
 *                           urutan baris Google Sheet (diverifikasi 14 Nov 2026:
 *                           0 baris tanggal turun di semua sheet).
 *   3. `kode`       NAIK  → penentu terakhir yang selalu unik, supaya urutan
 *                           deterministik walau dua baris diinput detik yang sama.
 *
 * Untuk membalik seluruh aplikasi (mis. terbaru di atas), ubah `true` pertama
 * jadi `false` — tidak perlu menyentuh halaman mana pun.
 */
export const URUTAN_TRANSAKSI = [
  ["tanggal",    true],
  ["created_at", true],
  ["kode",       true],
] as const satisfies readonly (readonly [string, boolean])[];

/** Bentuk minimal query builder Supabase yang dibutuhkan (order bisa dirantai). */
type Berurut = {
  order: (kolom: string, opsi: { ascending: boolean }) => Berurut;
};

/** Terapkan `URUTAN_TRANSAKSI` ke query builder Supabase. */
export function urutkanTransaksi<T>(q: T): T {
  const awal = q as unknown as Berurut;
  const hasil = URUTAN_TRANSAKSI.reduce<Berurut>(
    (acc, [kolom, naik]) => acc.order(kolom, { ascending: naik }),
    awal
  );
  return hasil as unknown as T;
}
