-- ============================================================
-- REVISI 6 November 2026
--
-- Admin tim boleh menghapus transaksi MILIK TIMNYA SENDIRI
-- (sebelumnya DELETE hanya untuk Owner). Scoping tetap dijaga:
-- admin tim lain tidak bisa menghapus, sosmed tetap read-only.
-- Sejalan dengan policy pesanan_update (team_id = app_team_id()).
-- ============================================================

DROP POLICY IF EXISTS pesanan_delete ON public.pesanan;

CREATE POLICY pesanan_delete ON public.pesanan FOR DELETE TO authenticated
  USING (
    NOT public.is_sosmed()
    AND (public.is_owner() OR team_id = public.app_team_id())
  );
