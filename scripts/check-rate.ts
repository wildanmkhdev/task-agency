/**
 * Verifikasi modul rate (revisi A1 — "Belum ada data").
 * Jalankan: npm run check:rate
 *
 * Fokus: perubahan hanya menambah deteksi data kosong; nilai rate & ambang
 * status lama tidak boleh berubah (kompatibilitas dengan data produksi).
 */
import { belumAdaData, hitungRate, statusKinerja } from "../src/lib/rate";

let gagal = 0;

function cek(nama: string, aktual: unknown, harap: unknown) {
  const ok = JSON.stringify(aktual) === JSON.stringify(harap);
  if (!ok) gagal++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${nama} → ${JSON.stringify(aktual)}` +
      (ok ? "" : ` (harap ${JSON.stringify(harap)})`)
  );
}

// 1. Rate lama tidak berubah (kompatibilitas angka produksi).
cek("hitungRate(null, 0) = 42 (fallback)", hitungRate(null, 0), 42);
cek("hitungRate(85, 0) = 59", hitungRate(85, 0), 59);
cek("hitungRate(null, 8) = 72", hitungRate(null, 8), 72);

// 2. Ambang status kinerja tetap.
cek("statusKinerja(42)", statusKinerja(42), "kurang");
cek("statusKinerja(72)", statusKinerja(72), "aktif");
cek("statusKinerja(39)", statusKinerja(39), "perhatian");

// 3. Deteksi "belum ada data" hanya untuk kombinasi kosong.
cek("belumAdaData(null, 0)", belumAdaData(null, 0), true);
cek("belumAdaData(undefined, 0)", belumAdaData(undefined, 0), true);
cek("belumAdaData(null, 3) — sudah ditugaskan", belumAdaData(null, 3), false);
cek("belumAdaData(85, 0) — sudah dinilai", belumAdaData(85, 0), false);
cek("belumAdaData(0, 0) — dinilai 0", belumAdaData(0, 0), false);
cek("belumAdaData(null, -2) — nilai negatif dijaga", belumAdaData(null, -2), true);

console.log(gagal === 0 ? "\nSEMUA CEK LOLOS" : `\n${gagal} CEK GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
