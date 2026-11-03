-- ============================================================
-- REVISI 3b — 3 November 2026 (11:00 WIB)
--
-- Fix infinite recursion: policy profiles_select_all ga boleh
-- query table profiles dalam USING clause.
-- ============================================================

-- Hapus policy lama yang bikin infinite recursion
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;

-- Policy baru: Owner atau siapa aja yang ADMIN role bisa SELECT profiles
-- Cek role langsung tanpa subquery ke profiles (avoid recursion)
CREATE POLICY profiles_select_all ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.is_owner()
    OR (
      -- Cek row ini: kalau user login = row ini DAN role ADMIN, boleh
      id = auth.uid() AND role = 'ADMIN'
    )
    OR (
      -- Kalau bukan row sendiri, cek apakah user login punya role ADMIN
      -- di row MILIKNYA (tanpa query profiles lagi)
      EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
          AND u.raw_user_meta_data->>'role' = 'ADMIN'
      )
    )
  );
