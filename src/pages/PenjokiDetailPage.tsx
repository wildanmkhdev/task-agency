import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { awalBulanIni } from "../lib/format";
import type { Penjoki as PenjokiRow, Profile } from "../lib/types";
import { petaAdminPerTim } from "../lib/admin";
import {
  Card,
  EmptyState,
  RateBar,
  Spinner,
  StatusKinerjaBadge,
} from "../components/ui";
import { KETERANGAN_RATE, belumAdaData, formatRate, labelRating, ratePenjoki } from "../lib/rate";
import { ArrowLeftIcon, LockClosedIcon } from "../components/icons";

/**
 * Detail Penjoki — halaman baca-saja untuk penjoki yang bukan anggota tim
 * admin yang sedang login (revisi client 8 Nov 2026).
 *
 * Sebelumnya, kartu penjoki tim lain di daftar mobile tidak punya aksi sama
 * sekali (disabled). Sekarang klik pada penjoki tersebut membuka halaman ini
 * yang menampilkan informasi lengkap — sama dengan isi form edit admin
 * penanggung jawab — tetapi tanpa tombol ubah/hapus.
 *
 * Pagar keamanan tetap di database: SELECT penjoki memang terbuka untuk semua
 * akun login, sedangkan INSERT/UPDATE/DELETE tetap dibatasi RLS ke tim sendiri
 * (atau owner). Jadi halaman ini murni presentasi, bukan pengganti otorisasi.
 */
export function PenjokiDetailPage() {
  const { id = "" } = useParams();

  const { data: penjoki, isLoading, isError } = useQuery({
    queryKey: ["penjoki-detail", id],
    queryFn: async (): Promise<PenjokiRow | null> => {
      const { data, error } = await supabase
        .from("penjoki")
        .select("*, team:teams(nama)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as PenjokiRow | null) ?? null;
    },
    enabled: Boolean(id),
  });

  // Rating transaksi bulan ini — rate = rata-rata rating (skala bintang).
  const { data: ratingBulanIni } = useQuery({
    queryKey: ["penjoki-rating-bulan-ini", id],
    queryFn: async (): Promise<number[]> => {
      const { data, error } = await supabase
        .from("pesanan")
        .select("rating, status")
        .eq("penjoki_id", id)
        .gte("tanggal", awalBulanIni())
        .not("rating", "is", null);
      if (error) throw error;
      return (data ?? [])
        .filter((r) => r.status !== "BATAL")
        .map((r) => Number(r.rating))
        .filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);
    },
    enabled: Boolean(id),
  });

  // Rating ulasan (semua transaksi) — untuk info "rata-rata dari X transaksi".
  const { data: ratingUlasan } = useQuery({
    queryKey: ["penjoki-rating-transaksi", id],
    queryFn: async (): Promise<{ rata: number | null; jumlah: number }> => {
      const { data, error } = await supabase
        .from("pesanan")
        .select("rating")
        .eq("penjoki_id", id)
        .not("rating", "is", null);
      if (error) throw error;
      const nilai = (data ?? [])
        .map((r) => Number(r.rating))
        .filter((n) => Number.isFinite(n));
      const rata = nilai.length
        ? nilai.reduce((a, b) => a + b, 0) / nilai.length
        : null;
      return { rata, jumlah: nilai.length };
    },
    enabled: Boolean(id),
  });

  // Nama admin penanggung jawab tim — pakai key yang sama dengan halaman
  // manajemen agar cache-nya dipakai bersama dan nama yang tampil konsisten.
  const { data: admins } = useQuery({
    queryKey: ["admins-data-tim"],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, team_id, nama_lengkap, no_hp, aktif, team:teams(nama)")
        .eq("role", "ADMIN");
      if (error) throw error;
      return (data ?? []) as unknown as Profile[];
    },
  });

  const adminPerTim = useMemo(() => petaAdminPerTim(admins ?? []), [admins]);

  if (isLoading) return <Spinner label="Memuat detail penjoki…" />;

  if (isError || !penjoki) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          to="/penjoki/manajemen"
          className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-4 py-2 text-xs font-bold text-text-secondary transition-colors hover:border-brand-border hover:text-gold"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Kembali ke daftar
        </Link>
        <Card>
          <EmptyState
            title="Penjoki tidak ditemukan"
            hint="Data mungkin sudah dihapus, atau tautannya tidak valid."
          />
        </Card>
      </div>
    );
  }

  const ratings = ratingBulanIni ?? [];
  const rate = ratePenjoki(ratings, penjoki.rating_skill);
  const kosong = belumAdaData(ratings, penjoki.rating_skill);
  /** true = rate memakai rating kualitas karena belum ada transaksi dinilai. */
  const pakaiFallback = ratings.length === 0 && penjoki.rating_skill != null;
  const admin = adminPerTim.get(penjoki.team_id);
  const keahlian = penjoki.keahlian ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        to="/penjoki/manajemen"
        className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-4 py-2 text-xs font-bold text-text-secondary transition-colors hover:border-brand-border hover:text-gold"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Kembali ke daftar
      </Link>

      {/* Profil ringkas */}
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-brand-border/60 bg-brand/10 text-base font-extrabold text-gold">
            {penjoki.nama.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate font-display text-lg font-extrabold text-text-main">
                {penjoki.nama}
              </h2>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                  penjoki.aktif
                    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                    : "border-red-400/25 bg-red-400/10 text-danger"
                }`}
              >
                {penjoki.aktif ? "Akun aktif" : "Akun nonaktif"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[10px] font-bold text-text-muted">
                <LockClosedIcon className="h-3 w-3" />
                Hanya lihat
              </span>
            </div>
            <p className="mt-1 text-xs font-bold text-text-secondary">
              {penjoki.team?.nama ?? "-"}
              {admin ? ` · ${admin}` : ""}
            </p>
            {penjoki.no_hp && (
              <p className="mt-0.5 text-[11px] text-text-muted">{penjoki.no_hp}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Ringkasan rate */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
            Rate Kinerja
          </p>
          <StatusKinerjaBadge rate={rate} kosong={kosong} />
        </div>

        <div className="mt-3">
          {kosong ? (
            <>
              <p className="font-display text-3xl font-extrabold text-text-muted">—</p>
              <p className="mt-1 text-xs text-text-muted">
                Belum ada rating transaksi bulan ini dan belum ada rating
                kualitas tersimpan.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <p className="font-display text-5xl font-extrabold tabular-nums text-gold">
                  {formatRate(rate)}
                </p>
                <span className="text-2xl text-gold">★</span>
              </div>
              <RateBar rate={rate} full className="mt-2" skala={5} />
              {pakaiFallback && (
                <p className="mt-2 text-[11px] text-text-muted">
                  Belum ada transaksi yang dinilai bulan ini — angka memakai
                  rating kualitas dari rekap penjoki.
                </p>
              )}
            </>
          )}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-line bg-surface-2/60 px-3.5 py-2.5">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
              Transaksi Bulan Ini
            </dt>
            <dd className="mt-0.5 text-sm font-extrabold tabular-nums text-text-main">
              {ratings.length} dengan rating
            </dd>
          </div>
        </dl>
      </Card>

      {/* Informasi lengkap — sama dengan isi form edit admin tim tersebut */}
      <Card className="p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
          Informasi Penjoki
        </p>

        <dl className="mt-3 divide-y divide-line-soft">
          <BarisInfo label="Nama" value={penjoki.nama} />
          <BarisInfo
            label="No. WhatsApp"
            value={penjoki.no_hp || "Belum diisi"}
            muted={!penjoki.no_hp}
          />
          <BarisInfo label="Tim" value={penjoki.team?.nama ?? "-"} />
          <BarisInfo
            label="Admin Penanggung Jawab"
            value={admin ?? "Belum ditentukan"}
            muted={!admin}
          />
          <BarisInfo
            label="Status Akun"
            value={penjoki.aktif ? "Aktif" : "Nonaktif"}
            tone={penjoki.aktif ? "success" : "danger"}
          />
          <BarisInfo
            label="Rating Ulasan (Keseluruhan)"
            value={labelRating(ratingUlasan?.rata)}
            muted={ratingUlasan?.rata == null}
          />
          <div className="py-2.5">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
              Statistik Rating
            </dt>
            <dd className="mt-1 text-sm text-text-secondary">
              {ratingUlasan?.jumlah
                ? `${ratingUlasan.jumlah} transaksi dinilai (rata-rata ${labelRating(ratingUlasan.rata)})`
                : "Belum ada transaksi dinilai"}
            </dd>
          </div>
          <div className="py-2.5">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
              Keahlian
            </dt>
            <dd className="mt-1.5">
              {keahlian.length === 0 ? (
                <span className="text-sm text-text-muted">Belum ada keahlian dicatat.</span>
              ) : (
                <span className="flex flex-wrap gap-1.5">
                  {keahlian.map((k) => (
                    <span
                      key={k}
                      className="inline-flex items-center rounded-full border border-brand-border bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-gold"
                    >
                      {k}
                    </span>
                  ))}
                </span>
              )}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Keterangan bebas */}
      <Card className="p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
          Keterangan
        </p>
        <p
          className={`mt-2 whitespace-pre-line text-sm leading-relaxed ${
            penjoki.keterangan?.trim()
              ? "text-text-secondary"
              : "text-text-muted"
          }`}
        >
          {penjoki.keterangan?.trim() || "Belum ada keterangan."}
        </p>
      </Card>

      {/* Formula rate — disamakan dengan panel di halaman manajemen */}
      <div className="flex items-start gap-2.5 rounded-xl border border-sky-400/25 bg-sky-400/10 px-4 py-3 text-[11px] leading-relaxed text-sky-200">
        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-sky-400/40 text-[9px] font-extrabold">
          i
        </span>
        <p>
          {KETERANGAN_RATE} Bila belum ada transaksi yang dinilai, angka
          memakai rating kualitas dari rekap penjoki. Tugas batal tidak
          dihitung.
        </p>
      </div>
    </div>
  );
}

function BarisInfo({
  label,
  value,
  muted = false,
  tone,
}: {
  label: string;
  value: string;
  muted?: boolean;
  tone?: "success" | "danger";
}) {
  const toneCls =
    tone === "success"
      ? "text-emerald-300"
      : tone === "danger"
        ? "text-danger"
        : muted
          ? "text-text-muted"
          : "text-text-main";
  return (
    <div className="flex flex-wrap items-center justify-between gap-1 py-2.5">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
        {label}
      </dt>
      <dd className={`text-sm font-bold ${toneCls}`}>{value}</dd>
    </div>
  );
}
