-- ============================================================
-- REVISI 4 — 3 November 2026 (15:33 WIB)
--
-- Admin bisa lihat semua penjoki (read-only), tapi edit/hapus
-- hanya penjoki di timnya sendiri. Owner tetap bisa edit semua.
-- ============================================================

-- Hapus policy lama
DROP POLICY IF EXISTS penjoki_select ON public.penjoki;

-- Policy baru: semua authenticated user bisa SELECT penjoki
-- (sama seperti profiles dan pesanan)
CREATE POLICY penjoki_select ON public.penjoki
  FOR SELECT TO authenticated
  USING (true);

-- INSERT/UPDATE tetap dibatasi owner atau tim sendiri (sudah ada di sosmed_readonly migration)
