-- ============================================================
-- REVISI 3c — 3 November 2026 (11:17 WIB)
--
-- Simplifikasi: semua authenticated user bisa SELECT profiles.
-- INSERT/UPDATE tetap protected by their own policies.
-- Owner bisa UPDATE, admin bisa UPDATE self only.
-- ============================================================

-- Hapus policy lama
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;

-- Policy baru: semua authenticated user bisa SELECT profiles
-- Karena profiles cuma data admin/owner, ga ada data sensitif
CREATE POLICY profiles_select_all ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- Sama untuk pesanan: semua authenticated user bisa SELECT
-- (admin hanya bisa INSERT/UPDATE milik timnya sendiri via policy lain)
DROP POLICY IF EXISTS pesanan_select_all ON public.pesanan;

CREATE POLICY pesanan_select_all ON public.pesanan
  FOR SELECT TO authenticated
  USING (true);
