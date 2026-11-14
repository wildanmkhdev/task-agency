/**
 * Verifikasi agregasi Statistik Tim dengan data sintetis.
 * Jalankan: npm run check:statistik
 *
 * Tidak menyentuh database — memastikan aturan angka (transaksi selesai+lunas,
 * pendapatan, rata-rata rate bintang + fallback rating kualitas, delta bulan
 * lalu, exclusion Tim 1/Sosmed, dan exclusion kode Oktober) berperilaku
 * sesuai kontrak sebelum diuji di layar.
 */
import { hitungStatistikTim, type BarisStatistik } from "../src/lib/statistik";
import { KODE_DI_LUAR_REKAP, masukRekap, type Penjoki, type Team } from "../src/lib/types";

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
  { id: "p1", team_id: "t1", rating_skill: 5, team: { nama: "Tim 1" } },
  { id: "p2", team_id: "t2", rating_skill: 4, team: { nama: "Tim 2" } },
  { id: "p3", team_id: "t3", rating_skill: null, team: { nama: "Tim 3" } },
  { id: "ps", team_id: "sos", rating_skill: 4, team: { nama: "Sosmed" } },
] as unknown as Penjoki[];

const baris = (
  team_id: string,
  penjoki_id: string,
  harga: number,
  status: BarisStatistik["status"],
  status_bayar: BarisStatistik["status_bayar"],
  rating: number | null = null,
  kode = `TRX-UJI-${team_id}-${penjoki_id}-${status}-${harga}`
): BarisStatistik => ({ kode, team_id, penjoki_id, harga, status, status_bayar, rating });

const pesananKini: BarisStatistik[] = [
  baris("t2", "p2", 100_000, "SELESAI", "LUNAS", 5),
  baris("t2", "p2", 50_000, "SELESAI", "BELUM", 3), // belum rekap, rating tetap dinilai
  baris("t3", "p3", 200_000, "SELESAI", "LUNAS"), // tanpa rating → fallback (null)
  baris("t1", "p1", 999_999, "SELESAI", "LUNAS", 5), // Tim 1: masuk total, tidak masuk chart
  baris("t2", "p2", 75_000, "BATAL", "LUNAS", 1), // batal: tidak dihitung sama sekali
];

const pesananLalu: BarisStatistik[] = [
  baris("t2", "p2", 100_000, "SELESAI", "LUNAS", 3),
  baris("t3", "p3", 200_000, "SELESAI", "LUNAS"),
  baris("t1", "p1", 999_999, "SELESAI", "LUNAS", 5),
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

// 3. Rate bintang = rata-rata rating transaksi bulan ini.
//    p2: rating 5 dan 3 (BATAL diabaikan) → 4. p3: tanpa rating & tanpa
//    rating_skill → belum ada data (null), tidak ikut rata-rata.
cek("rate Tim 2 (rating 5 & 3)", hasil.tim[0].rate, 4);
cek("rate Tim 3 (belum ada data)", hasil.tim[1].rate, null);

// 4. Ringkasan memakai seluruh transaksi (termasuk Tim 1).
cek("total transaksi", hasil.total.transaksi, 3);
cek("total pendapatan", hasil.total.pendapatan, 1_299_999);
cek("rata-rata rate (hanya penjoki tampil)", hasil.total.rate, 4);

// 5. Delta terhadap bulan sebelumnya.
cek("delta transaksi (%)", hasil.delta.transaksi, 0);
cek("delta pendapatan (%)", hasil.delta.pendapatan, 0);
cek("delta rate (poin)", hasil.delta.rate, 4 - 3);

// 6. Bulan tanpa transaksi: rate jatuh ke rating kualitas, bukan NaN.
const kosong = hitungStatistikTim({
  pesananKini: [],
  pesananLalu: [],
  teams,
  penjoki,
});
cek("bulan kosong: total transaksi", kosong.total.transaksi, 0);
cek("bulan kosong: total pendapatan", kosong.total.pendapatan, 0);
cek("bulan kosong: rate = fallback p2", kosong.total.rate, 4);
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

// 8. Exclusion kode Oktober (footer Excel owner).
cek("KODE_DI_LUAR_REKAP berisi 4 kode", KODE_DI_LUAR_REKAP.size, 4);
for (const kode of KODE_DI_LUAR_REKAP) {
  cek(
    `${kode} tidak masuk rekap`,
    masukRekap({ status: "SELESAI", status_bayar: "LUNAS", kode }),
    false
  );
}
cek(
  "kode lain tetap masuk rekap",
  masukRekap({ status: "SELESAI", status_bayar: "LUNAS", kode: "TRX-OKT26-0003" }),
  true
);
cek(
  "TRX-OKT26-0002 masuk rekap (tanggal sudah dibetulkan)",
  masukRekap({ status: "SELESAI", status_bayar: "LUNAS", kode: "TRX-OKT26-0002" }),
  true
);

const denganExclusion = hitungStatistikTim({
  pesananKini: [
    baris("t2", "p2", 100_000, "SELESAI", "LUNAS", 5, "TRX-OKT26-0539"),
    baris("t2", "p2", 40_000, "SELESAI", "LUNAS", 4, "TRX-OKT26-0003"),
  ],
  pesananLalu: [],
  teams,
  penjoki,
});
cek("exclusion: transaksi Tim 2", denganExclusion.tim[0].transaksi, 1);
cek("exclusion: pendapatan Tim 2", denganExclusion.tim[0].pendapatan, 40_000);
cek("exclusion: total pendapatan", denganExclusion.total.pendapatan, 40_000);
cek("exclusion: rate tetap dari semua rating", denganExclusion.tim[0].rate, 4.5);

console.log(gagal === 0 ? "\nSEMUA CEK LOLOS" : `\n${gagal} CEK GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
