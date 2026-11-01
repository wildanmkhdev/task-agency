-- Perubahan alur pembayaran (permintaan client 2026-11-02):
-- 1) Kolom `dibayar` (boolean) → `status_bayar` enum: BELUM / CICIL / LUNAS
--    (dropdown di Daftar Pesanan — cicil = belum lunas, belum masuk rekap)
-- 2) Kolom `fisk` DIHAPUS dari alur kerja (tidak lagi jadi syarat rekap)
-- Idempotent: aman dijalankan ulang (dipakai via Management API).

-- Enum status pembayaran
DO $$ BEGIN
  CREATE TYPE public.status_bayar AS ENUM ('BELUM', 'CICIL', 'LUNAS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.pesanan
  ADD COLUMN IF NOT EXISTS status_bayar public.status_bayar NOT NULL DEFAULT 'BELUM';

-- Backfill sekali dari kolom lama (aman diulang: hanya mengisi yang masih BELUM)
UPDATE public.pesanan SET status_bayar = 'LUNAS'
 WHERE status_bayar = 'BELUM'
   AND EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'pesanan'
                  AND column_name = 'dibayar')
   AND dibayar = true;

-- Kolom lama tidak dipakai lagi
ALTER TABLE public.pesanan DROP COLUMN IF EXISTS fisk;
ALTER TABLE public.pesanan DROP COLUMN IF EXISTS dibayar;

-- Index untuk filter status bayar (rekap & dashboard)
CREATE INDEX IF NOT EXISTS "pesanan_status_bayar_idx"
  ON public.pesanan("status_bayar");
