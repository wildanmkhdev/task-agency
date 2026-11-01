-- Admin boleh mengelola penuh penjoki TIMNYA SENDIRI (menu Manajemen Penjoki
-- kini juga tampil untuk admin). Sebelumnya DELETE hanya owner.
-- Scoping tetap di-enforce di sini: admin hanya miliknya, owner semua tim.
DROP POLICY IF EXISTS penjoki_delete ON public.penjoki;
CREATE POLICY penjoki_delete ON public.penjoki FOR DELETE TO authenticated
  USING (public.is_owner() OR team_id = public.app_team_id());
