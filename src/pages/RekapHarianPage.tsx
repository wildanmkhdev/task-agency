import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useScope } from "../hooks/useScope";
import { rupiah, tanggalPendek, yyyyMmDd } from "../lib/format";
import { masukRekap, type Pesanan } from "../lib/types";
import { ExportButtons, type ExportColumn } from "../components/ExportButtons";
import { Card, EmptyState, Spinner, StatusBadge, TeamTabs, inputCls } from "../components/ui";

const PESANAN_SELECT =
  "id, kode, harga, status, dibayar, fisk, tanggal, jumlah_keterangan, team_id, customer:customers(nama), penjoki:penjoki(nama), jenis_tugas:jenis_tugas(nama), team:teams(nama)";

/**
 * Data Rekap Harian Tim (mockup biru layar 2).
 * Aturan rekap: hanya tugas SELESAI + pembayaran + fisk yang masuk.
 * Scope: admin = timnya sendiri; owner = semua tim / drill-down per tim.
 */
export function RekapHarianPage() {
  const { isOwner, teams, teamFilter, setTeamFilter, applyScope } = useScope();
  const [tanggal, setTanggal] = useState(yyyyMmDd(new Date()));

  const { data: rows, isLoading } = useQuery({
    queryKey: ["rekap", tanggal, teamFilter],
    queryFn: async (): Promise<Pesanan[]> => {
      const start = new Date(`${tanggal}T00:00:00`);
      const end = new Date(`${tanggal}T23:59:59.999`);
      let q = supabase
        .from("pesanan")
        .select(PESANAN_SELECT)
        .gte("tanggal", start.toISOString())
        .lte("tanggal", end.toISOString())
        .order("tanggal", { ascending: true });
      q = applyScope(q as never) as typeof q;
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Pesanan[];
    },
  });

  // Aturan rekap resmi: hanya yang sudah selesai semua (pembayaran + fisk)
  const rekap = (rows ?? []).filter(masukRekap);
  const total = rekap.reduce((s, p) => s + p.harga, 0);

  const exportColumns: ExportColumn[] = [
    { key: "no", label: "No", render: (r) => String(r.no) },
    { key: "tanggal", label: "Tanggal", render: (r) => tanggalPendek(String(r.tanggal)) },
    { key: "penjoki", label: "Penjoki", render: (r) => String(r.penjoki) },
    { key: "customer", label: "Customer", render: (r) => String(r.customer) },
    { key: "jenis", label: "Jenis Tugas", render: (r) => String(r.jenis) },
    { key: "harga", label: "Payment Customer", currency: true },
    { key: "status", label: "Status", render: (r) => String(r.status) },
  ];

  const exportRows = rekap.map((p, i) => ({
    no: i + 1,
    tanggal: p.tanggal,
    penjoki: p.penjoki?.nama ?? "-",
    customer: p.customer?.nama ?? "-",
    jenis: p.jenis_tugas?.nama ?? "-",
    harga: p.harga,
    status: "Selesai",
  }));

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-5">
      <p className="max-w-2xl text-sm text-text-secondary">
        Hanya tugas yang sudah <strong>selesai semua</strong> (pembayaran + fisk beres)
        yang masuk ke rekap harian.
      </p>

      {/* Kontrol: tanggal + filter tim + export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          className={`${inputCls} w-auto`}
        />
        <ExportButtons
          title={`Rekap Harian — ${tanggalPendek(new Date(`${tanggal}T00:00:00`))}`}
          filename={`rekap-harian-${tanggal}`}
          columns={exportColumns}
          rows={exportRows}
        />
      </div>

      {isOwner && (
        <TeamTabs teams={teams} value={teamFilter} onChange={setTeamFilter} />
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="font-display text-base font-extrabold">Data Rekap Harian Tim</h3>
            <p className="text-xs text-text-muted">
              {tanggalPendek(new Date(`${tanggal}T00:00:00`))} · {rekap.length} data
            </p>
          </div>
          <p className="text-sm font-extrabold text-text-main">
            Total: <span className="tabular-nums">{rupiah(total)}</span>
          </p>
        </div>

        {rekap.length === 0 ? (
          <EmptyState
            title="Belum ada tugas masuk rekap"
            hint="Pesanan baru masuk rekap setelah status SELESAI + dibayar + fisk beres."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-bg-main text-left text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-5 py-3 font-bold">No</th>
                  <th className="px-5 py-3 font-bold">Tanggal</th>
                  <th className="px-5 py-3 font-bold">Penjoki</th>
                  <th className="px-5 py-3 font-bold">Customer</th>
                  <th className="px-5 py-3 font-bold">Tugas</th>
                  {isOwner && <th className="px-5 py-3 font-bold">Tim</th>}
                  <th className="px-5 py-3 text-right font-bold">Payment Customer</th>
                </tr>
              </thead>
              <tbody>
                {rekap.map((p, i) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-bg-main">
                    <td className="px-5 py-3 tabular-nums text-text-muted">{i + 1}</td>
                    <td className="px-5 py-3">{tanggalPendek(p.tanggal)}</td>
                    <td className="px-5 py-3 font-bold text-text-main">
                      {p.penjoki?.nama ?? "-"}
                    </td>
                    <td className="px-5 py-3">{p.customer?.nama ?? "-"}</td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-text-main">{p.jenis_tugas?.nama ?? "-"}</p>
                      <p className="text-xs text-text-muted">{p.jumlah_keterangan}</p>
                    </td>
                    {isOwner && (
                      <td className="px-5 py-3">
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-bold text-text-secondary">
                          {p.team?.nama ?? "-"}
                        </span>
                      </td>
                    )}
                    <td className="px-5 py-3 text-right font-extrabold tabular-nums">
                      {rupiah(p.harga)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Ringkasan status (transparansi aturan rekap) */}
      <Card className="px-5 py-4">
        <p className="text-xs text-text-muted">
          Catatan: {rows!.length} pesanan tercatat pada tanggal ini; {rekap.length} di
          antaranya memenuhi syarat rekap (selesai + dibayar + fisk). Sisanya{" "}
          <StatusBadge status="MENUNGU" /> / <StatusBadge status="DIKERJAKAN" /> belum
          masuk rekap.
        </p>
      </Card>
    </div>
  );
}
