-- ============================================================
-- REVISI 2 — 3 November 2026
--
-- 1) Admin Sosmed  : boleh MELIHAT data semua tim (read-only total)
-- 2) Admin Utama/CS: tetap terkunci ke timnya sendiri (tidak lintas tim)
-- 3) Owner         : tetap global
--
-- Catatan: helper is_sosmed() sudah terpasang manual di database
-- sebelum migrasi ini dibuat; di sini di-commit agar repo & DB sinkron
-- dan bisa dibuat ulang dari nol.
-- ============================================================

-- Deteksi admin sosmed dari tim ("Sosmed") atau nama.
-- Data produksi saat ini: tim "Sosmed" → user "Rania".
CREATE OR REPLACE FUNCTION public.is_sosmed()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.teams t ON t.id = p.team_id
    WHERE p.id = auth.uid()
      AND (
        lower(COALESCE(t.nama, '')) LIKE '%sosmed%'
        OR lower(COALESCE(p.nama_lengkap, '')) LIKE '%sosmed%'
      )
  );
$$;

-- ------------------------------------------------------------
-- profiles: sosmed boleh melihat daftar seluruh admin (read-only)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS profiles_select_sosmed ON public.profiles;
CREATE POLICY profiles_select_sosmed ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_sosmed());

-- ------------------------------------------------------------
-- pesanan: sosmed membaca semua tim, tetapi TIDAK boleh menulis
-- ------------------------------------------------------------
DROP POLICY IF EXISTS pesanan_select_sosmed ON public.pesanan;
CREATE POLICY pesanan_select_sosmed ON public.pesanan
  FOR SELECT TO authenticated
  USING (public.is_sosmed());

DROP POLICY IF EXISTS pesanan_insert ON public.pesanan;
CREATE POLICY pesanan_insert ON public.pesanan FOR INSERT TO authenticated
  WITH CHECK (
    NOT public.is_sosmed()
    AND (public.is_owner() OR team_id = public.app_team_id())
    AND dibuat_oleh = auth.uid()
  );

DROP POLICY IF EXISTS pesanan_update ON public.pesanan;
CREATE POLICY pesanan_update ON public.pesanan FOR UPDATE TO authenticated
  USING (
    NOT public.is_sosmed()
    AND (public.is_owner() OR team_id = public.app_team_id())
  )
  WITH CHECK (
    NOT public.is_sosmed()
    AND (public.is_owner() OR team_id = public.app_team_id())
  );

-- ------------------------------------------------------------
-- penjoki & customers: sosmed juga read-only
-- ------------------------------------------------------------
DROP POLICY IF EXISTS penjoki_insert ON public.penjoki;
CREATE POLICY penjoki_insert ON public.penjoki FOR INSERT TO authenticated
  WITH CHECK (
    NOT public.is_sosmed()
    AND (public.is_owner() OR team_id = public.app_team_id())
  );

DROP POLICY IF EXISTS penjoki_update ON public.penjoki;
CREATE POLICY penjoki_update ON public.penjoki FOR UPDATE TO authenticated
  USING (
    NOT public.is_sosmed()
    AND (public.is_owner() OR team_id = public.app_team_id())
  )
  WITH CHECK (
    NOT public.is_sosmed()
    AND (public.is_owner() OR team_id = public.app_team_id())
  );

DROP POLICY IF EXISTS customers_insert ON public.customers;
CREATE POLICY customers_insert ON public.customers FOR INSERT TO authenticated
  WITH CHECK (
    NOT public.is_sosmed()
    AND (public.is_owner() OR team_id = public.app_team_id())
  );

DROP POLICY IF EXISTS customers_update ON public.customers;
CREATE POLICY customers_update ON public.customers FOR UPDATE TO authenticated
  USING (
    NOT public.is_sosmed()
    AND (public.is_owner() OR team_id = public.app_team_id())
  )
  WITH CHECK (
    NOT public.is_sosmed()
    AND (public.is_owner() OR team_id = public.app_team_id())
  );
