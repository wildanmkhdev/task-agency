import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useScope } from "../hooks/useScope";
import { awalBulanIni, rupiah, tanggalWaktu } from "../lib/format";
import { masukRekap, type Pesanan } from "../lib/types";
import {
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  WalletIcon,
} from "../components/icons";
import { Card, EmptyState, Spinner, StatCard, StatusBadge, TeamTabs } from "../components/ui";

const PESANAN_SELECT =
  "id, kode, harga, fee_admin, fee_owner, fee_penjoki, status, dibayar, fisk, tanggal, team_id, customer:customers(nama), penjoki:penjoki(nama), team:teams(nama)";

export function DashboardPage() {
  const { isOwner, teams, teamFilter, setTeamFilter, applyScope } = useScope();
  const awal = awalBulanIni();

  // Data bulan berjalan (di-scope; RLS DB = pagar utama)
  const { data: pesanan, isLoading } = useQuery({
    queryKey: ["dashboard-pesanan", teamFilter],
    queryFn: async (): Promise<Pesanan[]> => {
      let q = supabase
        .from("pesanan")
        .select(PESANAN_SELECT)
        .gte("tanggal", awal)
        .order("tanggal", { ascending: false });
      q = applyScope(q as never) as typeof q;
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Pesanan[];
    },
  });

  const { data: penjokiAktif } = useQuery({
    queryKey: ["dashboard-penjoki", teamFilter],
    queryFn: async () => {
      let q = supabase.from("penjoki").select("id", { count: "exact", head: true }).eq("aktif", true);
      q = applyScope(q as never) as typeof q;
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
  });

  const rows = pesanan ?? [];
  const selesai = rows.filter(masukRekap);
  const pendapatan = selesai.reduce((s, p) => s + p.harga, 0);
  const menunggu = rows.filter((p) => p.status === "MENUNGU").length;
  // Gaji dari fee yang tercatat di tugas masuk rekap (D5: penjoki 50% + owner 50%,
  // fee admin diisi manual owner dan TIDAK ikut potongan 50/50)
  const gajiPenjoki = selesai.reduce((s, p) => s + (p.fee_penjoki ?? 0), 0);
  const untungOwner = selesai.reduce((s, p) => s + (p.fee_owner ?? 0), 0);
  const totalFeeAdmin = selesai.reduce((s, p) => s + (p.fee_admin ?? 0), 0);

  // Rekap ringkas per tim (khusus owner, semua tim)
  const perTim = teams.map((t) => {
    const rowsTim = rows.filter((p) => p.team_id === t.id);
    const selesaiTim = rowsTim.filter(masukRekap);
    return {
      ...t,
      selesai: selesaiTim.length,
      pendapatan: selesaiTim.reduce((s, p) => s + p.harga, 0),
      gajiPenjoki: selesaiTim.reduce((s, p) => s + (p.fee_penjoki ?? 0), 0),
      untungOwner: selesaiTim.reduce((s, p) => s + (p.fee_owner ?? 0), 0),
    };
  });

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      {/* Sapaan */}
      <div className="rounded-card border border-slate-200 bg-gradient-to-r from-navy to-navy-light p-6 text-white">
        <h2 className="font-display text-xl font-extrabold sm:text-2xl">
          Halo, {isOwner ? "Owner" : "Admin"}! 👋
        </h2>
        <p className="mt-1 text-sm text-sky-100/80">
          Berikut ringkasan aktivitas{" "}
          {isOwner ? "seluruh tim bulan ini" : "tim kamu bulan ini"}.
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total Tugas Selesai"
          value={String(selesai.length)}
          sub="pembayaran + fisk beres"
          icon={<CheckCircleIcon className="h-6 w-6" />}
          accent="success"
        />
        <StatCard
          label="Total Pendapatan"
          value={rupiah(pendapatan)}
          sub="dari tugas yang masuk rekap"
          icon={<BanknotesIcon className="h-6 w-6" />}
          accent="brand"
        />
        <StatCard
          label="Penjoki Aktif"
          value={String(penjokiAktif ?? 0)}
          sub="penjoki siap menerima job"
          icon={<UserGroupIcon className="h-6 w-6" />}
          accent="navy"
        />
        <StatCard
          label="Tugas Menunggu"
          value={String(menunggu)}
          sub="perlu segera dilayani"
          icon={<ClockIcon className="h-6 w-6" />}
          accent="warning"
        />
        <StatCard
          label="Gaji Penjoki"
          value={rupiah(gajiPenjoki)}
          sub={`50% dari harga · ${selesai.length} tugas selesai`}
          icon={<WalletIcon className="h-6 w-6" />}
          accent="navy"
        />
        <StatCard
          label={isOwner ? "Untuk Agency (Owner)" : "Untuk Agency"}
          value={rupiah(untungOwner)}
          sub={
            totalFeeAdmin > 0
              ? `sisa 50% · fee admin tercatat ${rupiah(totalFeeAdmin)}`
              : "sisa 50% dari harga tugas"
          }
          icon={<CurrencyDollarIcon className="h-6 w-6" />}
          accent="success"
        />
      </div>

      {/* Filter tim (owner) */}
      {isOwner && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">
            Lihat per tim
          </p>
          <TeamTabs teams={teams} value={teamFilter} onChange={setTeamFilter} />
        </div>
      )}

      {/* Rekap per tim (owner, saat "Semua Tim") */}
      {isOwner && teamFilter === null && perTim.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-display text-base font-extrabold">Rekap per Tim</h3>
            <p className="text-xs text-text-muted">Bulan berjalan</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-bg-main text-left text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-5 py-3 font-bold">Tim</th>
                  <th className="px-5 py-3 text-right font-bold">Tugas Selesai</th>
                  <th className="px-5 py-3 text-right font-bold">Pendapatan</th>
                  <th className="px-5 py-3 text-right font-bold">Gaji Penjoki</th>
                  <th className="px-5 py-3 text-right font-bold">Untuk Agency</th>
                </tr>
              </thead>
              <tbody>
                {perTim.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 font-bold text-text-main">{t.nama}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{t.selesai}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">
                      {rupiah(t.pendapatan)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-text-secondary">
                      {rupiah(t.gajiPenjoki)}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-success">
                      {rupiah(t.untungOwner)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Aktivitas terbaru */}
      <Card>
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-display text-base font-extrabold">Aktivitas Terbaru</h3>
          <p className="text-xs text-text-muted">Pesanan terakhir yang tercatat</p>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            title="Belum ada pesanan bulan ini"
            hint="Mulai dari menu Tambah Pesanan."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.slice(0, 6).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-text-main">
                    {p.kode} · {p.customer?.nama ?? "-"}
                  </p>
                  <p className="truncate text-xs text-text-muted">
                    {p.penjoki?.nama ?? "-"} · {p.team?.nama ?? "-"} ·{" "}
                    {tanggalWaktu(p.tanggal)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-extrabold tabular-nums text-text-main">
                    {rupiah(p.harga)}
                  </span>
                  <StatusBadge status={p.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
