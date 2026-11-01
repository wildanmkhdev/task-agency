-- Decision D5: fee transaksi = 50% Admin CS + 50% Penjoki
ALTER TABLE "pesanan" ADD COLUMN "fee_admin" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "pesanan" ADD COLUMN "fee_penjoki" INTEGER NOT NULL DEFAULT 0;

-- Backfill baris lama (bila ada): bagi rata, pembulatan ke fee_admin
UPDATE "pesanan"
SET "fee_admin" = ROUND("harga" * 0.5),
    "fee_penjoki" = "harga" - ROUND("harga" * 0.5);
