/**
 * Verifikasi modul rate (revisi 11 Nov 2026 — skala bintang 1–5).
 * Jalankan: npm run check:rate
 *
 * Mengunci perilaku:
 * - rate = rata-rata rating transaksi bulan berjalan (1 desimal, 0–5)
 * - penjoki tanpa transaksi berating memakai rating kualitas (fallback)
 * - penjoki tanpa data sama sekali = "belum ada data", bukan 0
 * - ambang 5 status kinerja versi bintang
 */
import {
  belumAdaData,
  formatRate,
  hitungRate,
  labelRating,
  ratePenjoki,
  statusKinerja,
} from "../src/lib/rate";

let gagal = 0;

function cek(nama: string, aktual: unknown, harap: unknown) {
  const ok = JSON.stringify(aktual) === JSON.stringify(harap);
  if (!ok) gagal++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${nama} → ${JSON.stringify(aktual)}` +
      (ok ? "" : ` (harap ${JSON.stringify(harap)})`)
  );
}

// 1. Rate = rata-rata rating transaksi (0–5, satu desimal).
cek("hitungRate([]) = 0", hitungRate([]), 0);
cek("hitungRate([5]) = 5", hitungRate([5]), 5);
cek("hitungRate([4, 5]) = 4,5", hitungRate([4, 5]), 4.5);
cek("hitungRate([3, 4, 4]) = 3,7", hitungRate([3, 4, 4]), 3.7);
cek("hitungRate([2, 3, 4, 5]) = 3,5", hitungRate([2, 3, 4, 5]), 3.5);

// 2. Rate penjoki: transaksi dulu, fallback rating kualitas.
cek("ratePenjoki([], 4) = 4 (fallback)", ratePenjoki([], 4), 4);
cek("ratePenjoki([], null) = 0", ratePenjoki([], null), 0);
cek("ratePenjoki([3, 5], 2) = 4 (transaksi menang)", ratePenjoki([3, 5], 2), 4);
cek("ratePenjoki([], 4.25) = 4,3", ratePenjoki([], 4.25), 4.3);

// 3. Ambang status kinerja bintang.
cek("statusKinerja(5)", statusKinerja(5), "sangat");
cek("statusKinerja(4.5)", statusKinerja(4.5), "sangat");
cek("statusKinerja(4.4)", statusKinerja(4.4), "baik");
cek("statusKinerja(3.5)", statusKinerja(3.5), "baik");
cek("statusKinerja(3.4)", statusKinerja(3.4), "cukup");
cek("statusKinerja(2.5)", statusKinerja(2.5), "cukup");
cek("statusKinerja(2.4)", statusKinerja(2.4), "kurang");
cek("statusKinerja(1.5)", statusKinerja(1.5), "kurang");
cek("statusKinerja(1.4)", statusKinerja(1.4), "perhatian");
cek("statusKinerja(0)", statusKinerja(0), "perhatian");

// 4. "Belum ada data" hanya bila tidak ada transaksi berating DAN fallback.
cek("belumAdaData([], null)", belumAdaData([], null), true);
cek("belumAdaData([], undefined)", belumAdaData([], undefined), true);
cek("belumAdaData([], 3) — ada rating kualitas", belumAdaData([], 3), false);
cek("belumAdaData([5], null) — ada transaksi", belumAdaData([5], null), false);

// 5. Label & format tampilan.
cek("labelRating(null)", labelRating(null), "Belum dinilai");
cek("labelRating(undefined)", labelRating(undefined), "Belum dinilai");
cek("labelRating(4)", labelRating(4), "4/5");
cek("labelRating(4.5)", labelRating(4.5), "4,5/5");
cek("labelRating(5)", labelRating(5), "5/5");
cek("formatRate(4.5)", formatRate(4.5), "4,5");
cek("formatRate(4)", formatRate(4), "4");
cek("formatRate(null)", formatRate(null), "—");

console.log(gagal === 0 ? "\nSEMUA CEK LOLOS" : `\n${gagal} CEK GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
