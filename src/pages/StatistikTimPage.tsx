import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type TooltipItem,
} from "chart.js";
import { supabase } from "../lib/supabase";
import { useScope } from "../hooks/useScope";
import { rupiah, yyyyMmDd } from "../lib/format";
import { geserPeriode, rentangPeriode } from "../lib/periode";
import { statistikBarLabels } from "../lib/statistik-chart";
import type { Penjoki } from "../lib/types";
import { formatRate } from "../lib/rate";
import {
  hitungStatistikTim,
  petaPenilaian,
  type BarisRating,
  type BarisStatistik,
} from "../lib/statistik";
import { Card, EmptyState, Spinner } from "../components/ui";
import {
  BanknotesIcon,
  ChartBarIcon,
  ChartPieIcon,
  StarIcon,
} from "../components/icons";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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
      {naik ? "↑" : "↓"} {formatRate(Math.abs(value))} poin dari bulan lalu
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
 * Chart menggunakan Chart.js (horizontal bar) dengan warna berbeda per tim.
 * Nilai metrik tampil langsung pada batang, selain legend di bawah grafik.
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
        .select("kode, team_id, penjoki_id, harga, status, status_bayar, rating")
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
        .select("kode, team_id, penjoki_id, harga, status, status_bayar, rating")
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

  /**
   * Rating akumulasi sampai akhir periode → rate tim memakai angka yang
   * sama dengan halaman Data Penjoki (tidak reset tiap bulan).
   * Untuk periode berjalan, batas atas ini = seluruh transaksi.
   */
  const ambilPenilaian = async (batas: string): Promise<Map<string, number[]>> => {
    const { data, error } = await supabase
      .from("pesanan")
      .select("penjoki_id, rating, status")
      .not("rating", "is", null)
      .lte("tanggal", batas);
    if (error) throw error;
    return petaPenilaian((data ?? []) as BarisRating[]);
  };

  const { data: penilaianKini, isLoading: loadingNilai } = useQuery({
    queryKey: ["statistik-rating-akumulasi", rentang.selesaiIso],
    queryFn: () => ambilPenilaian(rentang.selesaiIso),
  });

  const { data: penilaianLalu } = useQuery({
    queryKey: ["statistik-rating-akumulasi", rentang.sebelumnya.selesaiIso],
    queryFn: () => ambilPenilaian(rentang.sebelumnya.selesaiIso),
  });

  const statistik = useMemo(
    () =>
      hitungStatistikTim({
        pesananKini: pesananKini ?? [],
        pesananLalu: pesananLalu ?? [],
        teams,
        penjoki: penjoki ?? [],
        penilaianKini,
        penilaianLalu,
      }),
    [pesananKini, pesananLalu, teams, penjoki, penilaianKini, penilaianLalu]
  );

  if (isLoading || loadingNilai) return <Spinner label="Memuat statistik tim…" />;

  const { tim: daftarTim, total, delta } = statistik;

  /** Nilai numerik untuk chart metrik terpilih. */
  const nilaiMetrik = (t: (typeof daftarTim)[number]): number => {
    if (metrik === "transaksi") return t.transaksi;
    if (metrik === "pendapatan") return t.pendapatan;
    return t.rate ?? 0;
  };

  const labelMetrik = daftarTim.map((t) => {
    if (metrik === "transaksi")
      return `${t.transaksi.toLocaleString("id-ID")} transaksi`;
    if (metrik === "pendapatan") return rupiah(t.pendapatan);
    return t.rate === null ? "—" : `${formatRate(t.rate)}/5`;
  });

  const judulChart =
    metrik === "transaksi"
      ? `Transaksi Selesai per Tim (${rentang.label})`
      : metrik === "pendapatan"
        ? `Pendapatan per Tim (${rentang.label})`
        : `Rata-rata Rate per Tim (${rentang.label})`;

  // Warna berbeda per tim (vibrant & kontras dengan bg gelap)
  const warnaTim = [
    "rgba(251, 191, 36, 0.8)",  // amber
    "rgba(52, 211, 153, 0.8)",  // emerald
    "rgba(96, 165, 250, 0.8)",  // blue
    "rgba(244, 114, 182, 0.8)", // pink
    "rgba(167, 139, 250, 0.8)", // violet
    "rgba(248, 113, 113, 0.8)", // red
  ];

  const chartData = {
    labels: daftarTim.map((t) => t.nama),
    datasets: [
      {
        label:
          metrik === "transaksi"
            ? "Transaksi"
            : metrik === "pendapatan"
              ? "Pendapatan"
              : "Rate (0–5)",
        data: daftarTim.map(nilaiMetrik),
        backgroundColor: daftarTim.map((_, i) => warnaTim[i % warnaTim.length]),
        borderColor: daftarTim.map((_, i) =>
          warnaTim[i % warnaTim.length].replace("0.8", "1")
        ),
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      statistikBarLabels: {
        labels: labelMetrik,
      },
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(15, 42, 32, 0.95)",
        titleColor: "#f4efe2",
        bodyColor: "#f4efe2",
        borderColor: "rgba(217, 180, 95, 0.34)",
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: (context: TooltipItem<"bar">) => labelMetrik[context.dataIndex],
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ...(metrik === "rate" ? { max: 5 } : {}),
        grid: {
          color: "rgba(21, 84, 70, 0.3)",
        },
        ticks: {
          color: "#93b5a6",
          font: {
            size: 11,
          },
          callback: (value: any) => {
            if (metrik === "pendapatan") {
              return value >= 1000000
                ? `${(value / 1000000).toFixed(1)}jt`
                : value >= 1000
                  ? `${(value / 1000).toFixed(0)}rb`
                  : value;
            }
            return value;
          },
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#f4efe2",
          font: {
            size: 12,
            weight: "bold" as const,
          },
        },
      },
    },
  };

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

      {/* Chart batang horizontal (Chart.js) */}
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
          <>
            <div className="mt-4" style={{ height: `${Math.max(200, daftarTim.length * 60)}px` }}>
              <Bar
                data={chartData}
                options={chartOptions}
                plugins={[statistikBarLabels]}
                role="img"
                aria-label={judulChart}
                aria-describedby="statistik-legenda"
              />
            </div>
            <dl
              id="statistik-legenda"
              aria-label="Legenda dan nilai per tim"
              className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2"
            >
              {daftarTim.map((t, i) => (
                <div key={t.id} className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-xs text-text-secondary">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: chartData.datasets[0].backgroundColor[i] }}
                    />
                    {t.nama}
                  </dt>
                  <dd className="whitespace-nowrap text-right text-xs font-semibold tabular-nums text-text-main">
                    {labelMetrik[i]}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}

        <p className="mt-4 rounded-xl border border-line bg-surface-2 px-3 py-2 text-[10px] leading-relaxed text-text-muted">
          Dihitung dari transaksi berstatus <strong>Selesai</strong> dan{" "}
          <strong>Lunas</strong> pada periode ini. Satu transaksi = satu
          pesanan. Rate = rata-rata rating ulasan AKUMULASI sampai akhir
          periode ini (skala 1–5); bila belum ada transaksi yang dinilai,
          dipakai rating kualitas dari rekap penjoki. Penjoki tanpa data tidak
          ikut dirata-rata.
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
            {total.rate === null ? "—" : `${formatRate(total.rate)}/5`}
          </p>
          <div className="mt-1">
            <DeltaPoin value={delta.rate} />
          </div>
        </div>
      </div>
    </div>
  );
}
