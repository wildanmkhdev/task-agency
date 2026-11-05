import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useScope } from "../hooks/useScope";
import { rupiah, yyyyMmDd } from "../lib/format";
import { geserPeriode, rentangPeriode } from "../lib/periode";
import type { Penjoki } from "../lib/types";
import {
  hitungStatistikTim,
  type BarisStatistik,
} from "../lib/statistik";
import { Card, EmptyState, Spinner } from "../components/ui";
import {
  BanknotesIcon,
  ChartBarIcon,
  ChartPieIcon,
  StarIcon,
} from "../components/icons";

type Metrik = "transaksi" | "pendapatan" | "rate";

const TAB: { id: Metrik; label: string }[] = [
  { id: "transaksi", label: "Transaksi" },
  { id: "pendapatan", label: "Pendapatan" },
  { id: "rate", label: "Rata-rata Rate" },
];

function Delta({ value }: { value: number | null }) {
  if (value === null)
    return (
      <span className="text-[11px] font-semibold text-text-muted">
        — dari bulan lalu
      </span>
    );
  const naik = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold ${
        naik ? "text-emerald-300" : "text-danger"
      }`}
    >
      {naik ? "↑" : "↓"} {Math.abs(value).toFixed(0)}% dari bulan lalu
    </span>
  );
}

function DeltaPoin({ value }: { value: number | null }) {
  if (value === null)
    return (
      <span className="text-[11px] font-semibold text-text-muted">
        — dari bulan lalu
      </span>
    );
  const naik = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold ${
        naik ? "text-emerald-300" : "text-danger"
      }`}
    >
      {naik ? "↑" : "↓"} {Math.abs(value).toFixed(0)} poin dari bulan lalu
    </span>
  );
}

/**
 * Statistik Tim (revisi 5 Nov 2026, acuan panel "8. Statistik Tim").
 *
 * Membandingkan tim pada periode BULANAN: jumlah transaksi selesai,
 * pendapatan, dan rata-rata rate penjoki — plus ringkasan total agency
 * beserta perubahan terhadap bulan sebelumnya.
 *
 * Sumber angka:
 * - Transaksi & pendapatan: `pesanan` yang masuk rekap (SELESAI + LUNAS),
 *   aturan yang sama dengan halaman Data Rekap Harian Tim.
 * - Rate: rumus `hitungRate` (70% ulasan + 30% volume tugas bulan berjalan).
 *   Penjoki yang belum punya data tidak ikut dirata-rata.
 */
export function StatistikTimPage() {
  const { teams } = useScope();
  const [metrik, setMetrik] = useState<Metrik>("transaksi");
  const [bulan, setBulan] = useState(yyyyMmDd(new Date()));

  const rentang = rentangPeriode("bulanan", bulan);

  const { data: pesananKini, isLoading } = useQuery({
    queryKey: ["statistik-pesanan", rentang.mulaiIso, rentang.selesaiIso],
    queryFn: async (): Promise<BarisStatistik[]> => {
      const { data, error } = await supabase
        .from("pesanan")
        .select("team_id, penjoki_id, harga, status, status_bayar")
        .gte("tanggal", rentang.mulaiIso)
        .lte("tanggal", rentang.selesaiIso);
      if (error) throw error;
      return (data ?? []) as BarisStatistik[];
    },
  });

  const { data: pesananLalu } = useQuery({
    queryKey: [
      "statistik-pesanan",
      rentang.sebelumnya.mulaiIso,
      rentang.sebelumnya.selesaiIso,
    ],
    queryFn: async (): Promise<BarisStatistik[]> => {
      const { data, error } = await supabase
        .from("pesanan")
        .select("team_id, penjoki_id, harga, status, status_bayar")
        .gte("tanggal", rentang.sebelumnya.mulaiIso)
        .lte("tanggal", rentang.sebelumnya.selesaiIso);
      if (error) throw error;
      return (data ?? []) as BarisStatistik[];
    },
  });

  const { data: penjoki } = useQuery({
    queryKey: ["statistik-penjoki"],
    queryFn: async (): Promise<Penjoki[]> => {
      const { data, error } = await supabase
        .from("penjoki")
        .select("id, team_id, rating_skill, team:teams(nama)")
        .order("nama");
      if (error) throw error;
      return (data ?? []) as unknown as Penjoki[];
    },
  });

  const statistik = useMemo(
    () =>
      hitungStatistikTim({
        pesananKini: pesananKini ?? [],
        pesananLalu: pesananLalu ?? [],
        teams,
        penjoki: penjoki ?? [],
      }),
    [pesananKini, pesananLalu, teams, penjoki]
  );

  if (isLoading) return <Spinner label="Memuat statistik tim…" />;

  const { tim: daftarTim, total, delta } = statistik;

  /** Nilai numerik untuk panjang batang metrik terpilih. */
  const nilaiMetrik = (t: (typeof daftarTim)[number]): number => {
    if (metrik === "transaksi") return t.transaksi;
    if (metrik === "pendapatan") return t.pendapatan;
    return t.rate ?? 0;
  };

  const formatMetrik = (t: (typeof daftarTim)[number]): string => {
    if (metrik === "transaksi") return `${t.transaksi} transaksi`;
    if (metrik === "pendapatan") return rupiah(t.pendapatan);
    return t.rate === null ? "Belum ada data" : `${Math.round(t.rate)}%`;
  };

  const nilaiMaks = Math.max(...daftarTim.map(nilaiMetrik), 1);
  const judulChart =
    metrik === "transaksi"
      ? `Transaksi Selesai per Tim (${rentang.label})`
      : metrik === "pendapatan"
        ? `Pendapatan per Tim (${rentang.label})`
        : `Rata-rata Rate per Tim (${rentang.label})`;

  const gradien =
    metrik === "pendapatan"
      ? "from-[#cfa84f] via-[#e0bd68] to-[#e9ca7d]"
      : metrik === "rate"
        ? "from-emerald-600 via-emerald-400 to-emerald-300"
        : "from-brand/80 via-brand to-gold";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-extrabold text-text-main">
          Statistik Tim
        </h2>
        <p className="mt-0.5 text-[11px] text-text-secondary">
          Perbandingan jumlah transaksi, pendapatan, dan rata-rata rate.
        </p>
      </div>

      {/* Navigasi bulan */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setBulan(geserPeriode("bulanan", bulan, -1))}
          className="rounded-full border border-line bg-surface-2 p-2 text-text-secondary hover:border-brand-border hover:text-gold"
          aria-label="Bulan sebelumnya"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
          >
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <span className="flex items-center gap-2 rounded-full border border-brand-border bg-surface-2 px-4 py-2 text-xs font-bold text-gold-soft">
          <ChartPieIcon className="h-4 w-4 text-gold" />
          {rentang.label}
        </span>
        <button
          onClick={() => setBulan(geserPeriode("bulanan", bulan, 1))}
          className="rounded-full border border-line bg-surface-2 p-2 text-text-secondary hover:border-brand-border hover:text-gold"
          aria-label="Bulan berikutnya"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
          >
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </div>

      {/* Tab metrik */}
      <div className="flex gap-2">
        {TAB.map((t) => (
          <button
            key={t.id}
            onClick={() => setMetrik(t.id)}
            className={`flex-1 rounded-full border px-3 py-2 text-[11px] font-bold transition-all sm:text-xs ${
              metrik === t.id
                ? "border-brand bg-brand text-[#10231a]"
                : "border-line bg-surface-2 text-text-secondary hover:border-brand-border hover:text-text-main"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Chart batang per tim */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-border bg-brand/15 text-gold">
            <ChartBarIcon className="h-4 w-4" />
          </span>
          <p className="font-display text-[13px] font-extrabold text-text-main">
            {judulChart}
          </p>
        </div>

        {daftarTim.length === 0 ? (
          <EmptyState
            title="Belum ada tim"
            hint="Data tim akan tampil setelah tim dibuat."
          />
        ) : (
          <div className="mt-4 space-y-3">
            {daftarTim.map((t) => {
              const nilai = nilaiMetrik(t);
              const lebar = Math.max(0, Math.min(100, (nilai / nilaiMaks) * 100));
              return (
                <div key={t.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[11px] font-bold text-text-main">
                      {t.nama}
                    </span>
                    <span className="text-[11px] font-extrabold tabular text-gold-soft">
                      {formatMetrik(t)}
                    </span>
                  </div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${gradien}`}
                      style={{ width: `${lebar}%` }}
                      role="img"
                      aria-label={`${t.nama}: ${formatMetrik(t)}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-4 rounded-xl border border-line bg-surface-2 px-3 py-2 text-[10px] leading-relaxed text-text-muted">
          Dihitung dari transaksi berstatus <strong>Selesai</strong> dan{" "}
          <strong>Lunas</strong> pada periode ini. Satu transaksi = satu
          pesanan. Rate memakai rumus 70% ulasan + 30% volume tugas bulan
          berjalan; penjoki tanpa data tidak ikut dirata-rata.
        </p>
      </Card>

      {/* Ringkasan */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card-premium rounded-card p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
              <ChartBarIcon className="h-4 w-4" />
            </span>
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
              Total Transaksi Selesai
            </p>
          </div>
          <p className="mt-3 font-display text-xl font-extrabold tabular text-text-main">
            {total.transaksi}
          </p>
          <div className="mt-1">
            <Delta value={delta.transaksi} />
          </div>
        </div>

        <div className="card-premium rounded-card p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-border bg-brand/15 text-gold">
              <BanknotesIcon className="h-4 w-4" />
            </span>
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
              Total Pendapatan
            </p>
          </div>
          <p className="mt-3 font-display text-xl font-extrabold tabular text-gold-soft">
            {rupiah(total.pendapatan)}
          </p>
          <div className="mt-1">
            <Delta value={delta.pendapatan} />
          </div>
        </div>

        <div className="card-premium rounded-card p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/10 text-amber-300">
              <StarIcon className="h-4 w-4" />
            </span>
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
              Rata-rata Rate Tim
            </p>
          </div>
          <p className="mt-3 font-display text-xl font-extrabold tabular text-text-main">
            {total.rate === null ? "—" : `${Math.round(total.rate)}%`}
          </p>
          <div className="mt-1">
            <DeltaPoin value={delta.rate} />
          </div>
        </div>
      </div>
    </div>
  );
}
