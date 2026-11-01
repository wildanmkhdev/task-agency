-- CreateEnum
CREATE TYPE "role" AS ENUM ('OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "pesanan_status" AS ENUM ('MENUNGU', 'DIKERJAKAN', 'SELESAI', 'BATAL');

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nama" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "role" "role" NOT NULL,
    "team_id" UUID,
    "nama_lengkap" TEXT NOT NULL,
    "no_hp" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jenis_tugas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nama" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jenis_tugas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nama" TEXT NOT NULL,
    "no_wa" TEXT NOT NULL,
    "catatan" TEXT,
    "team_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "penjoki" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nama" TEXT NOT NULL,
    "no_hp" TEXT,
    "team_id" UUID NOT NULL,
    "rating_skill" DOUBLE PRECISION,
    "keahlian" TEXT[],
    "keterangan" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "penjoki_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pesanan" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kode" TEXT NOT NULL,
    "team_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "jenis_tugas_id" UUID NOT NULL,
    "penjoki_id" UUID NOT NULL,
    "harga" INTEGER NOT NULL,
    "jumlah_keterangan" TEXT NOT NULL,
    "catatan" TEXT,
    "status" "pesanan_status" NOT NULL DEFAULT 'MENUNGU',
    "dibayar" BOOLEAN NOT NULL DEFAULT false,
    "fisk" BOOLEAN NOT NULL DEFAULT false,
    "selesai_at" TIMESTAMP(3),
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dibuat_oleh" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pesanan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teams_nama_key" ON "teams"("nama");

-- CreateIndex
CREATE INDEX "profiles_team_id_idx" ON "profiles"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "jenis_tugas_nama_key" ON "jenis_tugas"("nama");

-- CreateIndex
CREATE INDEX "customers_team_id_nama_idx" ON "customers"("team_id", "nama");

-- CreateIndex
CREATE INDEX "penjoki_team_id_aktif_idx" ON "penjoki"("team_id", "aktif");

-- CreateIndex
CREATE UNIQUE INDEX "pesanan_kode_key" ON "pesanan"("kode");

-- CreateIndex
CREATE INDEX "pesanan_team_id_tanggal_idx" ON "pesanan"("team_id", "tanggal");

-- CreateIndex
CREATE INDEX "pesanan_penjoki_id_tanggal_idx" ON "pesanan"("penjoki_id", "tanggal");

-- CreateIndex
CREATE INDEX "pesanan_status_idx" ON "pesanan"("status");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penjoki" ADD CONSTRAINT "penjoki_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan" ADD CONSTRAINT "pesanan_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan" ADD CONSTRAINT "pesanan_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan" ADD CONSTRAINT "pesanan_jenis_tugas_id_fkey" FOREIGN KEY ("jenis_tugas_id") REFERENCES "jenis_tugas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan" ADD CONSTRAINT "pesanan_penjoki_id_fkey" FOREIGN KEY ("penjoki_id") REFERENCES "penjoki"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan" ADD CONSTRAINT "pesanan_dibuat_oleh_fkey" FOREIGN KEY ("dibuat_oleh") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- KEAMANAN: Row Level Security (Decision D1)
-- Owner = lihat semua tim; Admin = HANYA timnya sendiri.
-- Pagar utama ada di DATABASE — bukan di UI.
-- ============================================================

-- updated_at otomatis
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER penjoki_set_updated_at BEFORE UPDATE ON public.penjoki
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER pesanan_set_updated_at BEFORE UPDATE ON public.pesanan
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helper peran (SECURITY DEFINER untuk hindari rekursi RLS pada profiles)
CREATE OR REPLACE FUNCTION public.app_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role::text FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.app_team_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT team_id FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE(public.app_role(), '') = 'OWNER' $$;

-- Auto-buat profile saat user baru dibuat di auth.users (via service role / dashboard)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, team_id, nama_lengkap)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.role, 'ADMIN'),
    NULLIF(NEW.raw_user_meta_data ->> 'team_id', '')::uuid,
    COALESCE(NEW.raw_user_meta_data ->> 'nama_lengkap', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Aktifkan RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jenis_tugas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penjoki ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesanan ENABLE ROW LEVEL SECURITY;

-- profiles: lihat diri sendiri ATAU semua (owner).
-- update self TIDAK boleh mengubah role/team (cegah eskalasi hak).
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_owner());
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role::text = COALESCE(public.app_role(), '')
    AND (team_id IS NOT DISTINCT FROM public.app_team_id())
  );
CREATE POLICY profiles_update_owner ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_owner()) WITH CHECK (public.is_owner());

-- teams: semua login boleh lihat nama tim (dibutuhkan filter & label)
CREATE POLICY teams_select ON public.teams FOR SELECT TO authenticated USING (true);

-- jenis_tugas: baca semua; kelola hanya owner
CREATE POLICY jenis_select ON public.jenis_tugas FOR SELECT TO authenticated USING (true);
CREATE POLICY jenis_insert ON public.jenis_tugas FOR INSERT TO authenticated WITH CHECK (public.is_owner());
CREATE POLICY jenis_update ON public.jenis_tugas FOR UPDATE TO authenticated
  USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY jenis_delete ON public.jenis_tugas FOR DELETE TO authenticated USING (public.is_owner());

-- customers: owner semua; admin hanya timnya; hapus hanya owner
CREATE POLICY customers_select ON public.customers FOR SELECT TO authenticated
  USING (public.is_owner() OR team_id = public.app_team_id());
CREATE POLICY customers_insert ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.is_owner() OR team_id = public.app_team_id());
CREATE POLICY customers_update ON public.customers FOR UPDATE TO authenticated
  USING (public.is_owner() OR team_id = public.app_team_id())
  WITH CHECK (public.is_owner() OR team_id = public.app_team_id());
CREATE POLICY customers_delete ON public.customers FOR DELETE TO authenticated
  USING (public.is_owner());

-- penjoki: owner semua; admin hanya timnya
CREATE POLICY penjoki_select ON public.penjoki FOR SELECT TO authenticated
  USING (public.is_owner() OR team_id = public.app_team_id());
CREATE POLICY penjoki_insert ON public.penjoki FOR INSERT TO authenticated
  WITH CHECK (public.is_owner() OR team_id = public.app_team_id());
CREATE POLICY penjoki_update ON public.penjoki FOR UPDATE TO authenticated
  USING (public.is_owner() OR team_id = public.app_team_id())
  WITH CHECK (public.is_owner() OR team_id = public.app_team_id());
CREATE POLICY penjoki_delete ON public.penjoki FOR DELETE TO authenticated
  USING (public.is_owner());

-- pesanan: owner semua; admin hanya timnya; insert wajib mencatat pembuat; hapus hanya owner
CREATE POLICY pesanan_select ON public.pesanan FOR SELECT TO authenticated
  USING (public.is_owner() OR team_id = public.app_team_id());
CREATE POLICY pesanan_insert ON public.pesanan FOR INSERT TO authenticated
  WITH CHECK ((public.is_owner() OR team_id = public.app_team_id()) AND dibuat_oleh = auth.uid());
CREATE POLICY pesanan_update ON public.pesanan FOR UPDATE TO authenticated
  USING (public.is_owner() OR team_id = public.app_team_id())
  WITH CHECK (public.is_owner() OR team_id = public.app_team_id());
CREATE POLICY pesanan_delete ON public.pesanan FOR DELETE TO authenticated
  USING (public.is_owner());
