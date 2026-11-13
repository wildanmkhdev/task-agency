-- Rating kualitas 1–5 per transaksi (revisi 11 Nov 2026).
-- Rating penjoki = rata-rata rating transaksinya, jadi tidak ada input manual lagi.
ALTER TABLE "pesanan" ADD COLUMN IF NOT EXISTS "rating" DECIMAL(2, 1);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pesanan_rating_check'
  ) THEN
    ALTER TABLE "pesanan"
      ADD CONSTRAINT pesanan_rating_check
      CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 5));
  END IF;
END $$;

COMMENT ON COLUMN "pesanan"."rating" IS
  'Rating kualitas 1-5 per transaksi; rata-ratanya menjadi rating penjoki.';
