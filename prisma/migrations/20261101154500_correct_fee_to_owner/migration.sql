-- Decision D5 FINAL (dikonfirmasi ulang client 1 Nov 2026):
--   50% Penjoki + 50% Owner  (otomatis, dari harga customer, total 100%)
--   Fee Admin = BAGIAN MANUAL — diisi sendiri oleh owner per transaksi
--     (bukan formula tetap; default 0 bila belum diisi)
ALTER TABLE "pesanan" ADD COLUMN "fee_owner" INTEGER NOT NULL DEFAULT 0;

-- Backfill baris lama (bila ada): penjoki 50%, owner sisa, admin → 0
-- (fee admin historis tidak diketahui — owner bisa isi manual via aplikasi)
UPDATE "pesanan"
SET "fee_penjoki" = ROUND("harga" * 0.5),
    "fee_owner" = "harga" - ROUND("harga" * 0.5),
    "fee_admin" = 0;
