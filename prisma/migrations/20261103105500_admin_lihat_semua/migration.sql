-- ============================================================
-- REVISI 3 — 3 November 2026 (10:55 WIB)
--
-- Semua admin (Utama, CS, Sosmed) bisa melihat daftar semua admin
-- untuk keperluan rekap read-only. Tombol tambah transaksi tetap
-- hanya di ruangan sendiri (logic frontend + RLS INSERT).
-- ============================================================

-- Hapus policy lama untuk profiles SELECT
DROP POLICY IF EXISTS profiles_select_sosmed ON public.profiles;
DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_select ON public.profiles;

-- Policy baru: Owner, Sosmed, dan Admin biasa semua bisa SELECT profiles
CREATE POLICY profiles_select_all ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.is_owner()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Hapus policy lama untuk pesanan SELECT
DROP POLICY IF EXISTS pesanan_select_sosmed ON public.pesanan;
DROP POLICY IF EXISTS pesanan_select_admin ON public.pesanan;
DROP POLICY IF EXISTS pesanan_select ON public.pesanan;

-- Policy baru: Owner, Sosmed, dan Admin biasa semua bisa SELECT pesanan
CREATE POLICY pesanan_select_all ON public.pesanan
  FOR SELECT TO authenticated
  USING (
    public.is_owner()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );
