/**
 * Verifikasi agregasi Statistik Tim dengan data sintetis.
 * Jalankan: npm run check:statistik
 *
 * Tidak menyentuh database — memastikan aturan angka (transaksi selesai+lunas,
 * pendapatan, rata-rata rate, delta bulan lalu, dan exclusion Tim 1/Sosmed)
 * berperilaku sesuai kontrak sebelum diuji di layar.
 */
import { hitungStatistikTim, type BarisStatistik } from "../src/lib/statistik";
import type { Penjoki, Team } from "../src/lib/types";

let gagal = 0;

function cek(nama: string, aktual: unknown, harap: unknown) {
  const ok = JSON.stringify(aktual) === JSON.stringify(harap);
  if (!ok) gagal++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${nama} → ${JSON.stringify(aktual)}` +
      (ok ? "" : ` (harap ${JSON.stringify(harap)})`)
  );
}

const teams: Team[] = [
  { id: "t1", nama: "Tim 1" },
  { id: "t2", nama: "Tim 2" },
  { id: "t3", nama: "Tim 3" },
  { id: "sos", nama: "Sosmed" },
];

const penjoki = [
  { id: "p1", team_id: "t1", rating_skill: 90, team: { nama: "Tim 1" } },
  { id: "p2", team_id: "t2", rating_skill: 80, team: { nama: "Tim 2" } },
  { id: "p3", team_id: "t3", rating_skill: null, team: { nama: "Tim 3" } },
  { id: "ps", team_id: "sos", rating_skill: 70, team: { nama: "Sosmed" } },
] as unknown as Penjoki[];

const baris = (
  team_id: string,
  penjoki_id: string,
  harga: number,
  status: BarisStatistik["status"],
  status_bayar: BarisStatistik["status_bayar"]
): BarisStatistik => ({ team_id, penjoki_id, harga, status, status_bayar });

const pesananKini: BarisStatistik[] = [
  baris("t2", "p2", 100_000, "SELESAI", "LUNAS"),
  baris("t2", "p2", 50_000, "SELESAI", "BELUM"), // belum masuk rekap, tetap dihitung sebagai tugas
  baris("t3", "p3", 200_000, "SELESAI", "LUNAS"),
  baris("t1", "p1", 999_999, "SELESAI", "LUNAS"), // Tim 1: masuk total, tidak masuk chart
  baris("t2", "p2", 75_000, "BATAL", "LUNAS"), // batal: tidak dihitung sama sekali
];

const pesananLalu: BarisStatistik[] = [
  baris("t2", "p2", 100_000, "SELESAI", "LUNAS"),
  baris("t3", "p3", 200_000, "SELESAI", "LUNAS"),
  baris("t1", "p1", 999_999, "SELESAI", "LUNAS"),
];

const hasil = hitungStatistikTim({ pesananKini, pesananLalu, teams, penjoki });

// 1. Tim 1 & Sosmed tidak muncul di chart, urutan tetap.
cek(
  "tim tampil = Tim 2, Tim 3",
  hasil.tim.map((t) => t.nama),
  ["Tim 2", "Tim 3"]
);

// 2. Transaksi & pendapatan per tim (hanya SELESAI + LUNAS).
cek("Tim 2 transaksi", hasil.tim[0].transaksi, 1);
cek("Tim 2 pendapatan", hasil.tim[0].pendapatan, 100_000);
cek("Tim 3 transaksi", hasil.tim[1].transaksi, 1);
cek("Tim 3 pendapatan", hasil.tim[1].pendapatan, 200_000);

// 3. Rate: 70% ulasan + 30% volume (8 tugas = penuh), data kosong tidak dinilai.
cek("rate Tim 2 (rating 80, 2 tugas)", hasil.tim[0].rate, 64);
cek("rate Tim 3 (rating null, 1 tugas)", hasil.tim[1].rate, 46);

// 4. Ringkasan memakai seluruh transaksi (termasuk Tim 1).
cek("total transaksi", hasil.total.transaksi, 3);
cek("total pendapatan", hasil.total.pendapatan, 1_299_999);
cek("rata-rata rate (hanya penjoki tampil)", hasil.total.rate, 55);

// 5. Delta terhadap bulan sebelumnya.
cek("delta transaksi (%)", hasil.delta.transaksi, 0);
cek("delta pendapatan (%)", hasil.delta.pendapatan, 0);
cek("delta rate (poin)", hasil.delta.rate, 2);

// 6. Bulan tanpa transaksi: delta tidak boleh NaN/Infinity.
const kosong = hitungStatistikTim({
  pesananKini: [],
  pesananLalu: [],
  teams,
  penjoki,
});
cek("bulan kosong: total transaksi", kosong.total.transaksi, 0);
cek("bulan kosong: total pendapatan", kosong.total.pendapatan, 0);
// Rating manual tetap dipakai walau belum ada transaksi (lihat types.ts:
// rating_skill = "rate awal manual"), jadi p2 (80) → 56.
cek("bulan kosong: rate dari rating manual", kosong.total.rate, 56);
cek("bulan kosong: delta transaksi", kosong.delta.transaksi, null);
cek("bulan kosong: delta rate", kosong.delta.rate, 0);

// 7. Tanpa penjoki sama sekali → rate tidak boleh dikarang.
const tanpaPenjoki = hitungStatistikTim({
  pesananKini: [],
  pesananLalu: [],
  teams,
  penjoki: [],
});
cek("tanpa penjoki: rate", tanpaPenjoki.total.rate, null);
cek("tanpa penjoki: delta rate", tanpaPenjoki.delta.rate, null);

console.log(gagal === 0 ? "\nSEMUA CEK LOLOS" : `\n${gagal} CEK GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
