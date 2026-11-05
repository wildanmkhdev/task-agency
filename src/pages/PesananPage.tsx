import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useScope } from "../hooks/useScope";
import { useAuth } from "../context/AuthContext";
import { hanyaBaca } from "../lib/admin";
import { rupiah, tanggalPendek } from "../lib/format";
import type { Pesanan, PesananStatus } from "../lib/types";
import { hitungFee } from "../lib/fee";
import { ExportButtons, type ExportColumn } from "../components/ExportButtons";
import { Button, Card, EmptyState, Spinner, StatusBadge, TeamTabs } from "../components/ui";

const PESANAN_SELECT =
  "id, kode, harga, fee_admin, fee_owner, fee_penjoki, status, status_bayar, tanggal, jumlah_keterangan, team_id, customer:customers(nama), penjoki:penjoki(nama), jenis_tugas:jenis_tugas(nama), team:teams(nama)";

const FILTERS: { key: "SEMUA" | PesananStatus; label: string }[] = [
  { key: "SEMUA", label: "Semua" },
  { key: "MENUNGU", label: "Menunggu" },
  { key: "DIKERJAKAN", label: "Dikerjakan" },
  { key: "SELESAI", label: "Selesai" },
];

/** Daftar Transaksi + kendali lifecycle (scoping via RLS). */
export function PesananPage() {
  const { isOwner, teams, teamFilter, setTeamFilter, applyScope } = useScope();
  const { profile } = useAuth();
  const readOnly = hanyaBaca(profile);
  const [statusFilter, setStatusFilter] = useState<"SEMUA" | PesananStatus>("SEMUA");
  const qc = useQueryClient();

  const { data: rows, isLoading } = useQuery({
    queryKey: ["pesanan", teamFilter],
    queryFn: async (): Promise<Pesanan[]> => {
      let q = supabase
        .from("pesanan")
        .select(PESANAN_SELECT)
        .order("tanggal", { ascending: false })
        .limit(200);
      q = applyScope(q as never) as typeof q;
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Pesanan[];
    },
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<Pesanan, "status" | "selesai_at">>;
    }) => {
      const { error } = await supabase.from("pesanan").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["pesanan"] });
      qc.invalidateQueries({ queryKey: ["dashboard-pesanan"] });
      qc.invalidateQueries({ queryKey: ["rekap"] });
      qc.invalidateQueries({ queryKey: ["rekap-admin"] });
      qc.invalidateQueries({ queryKey: ["penjoki-rate"] });
    },
  });

  const list = (rows ?? []).filter(
    (p) => statusFilter === "SEMUA" || p.status === statusFilter
  );

  const exportColumns: ExportColumn[] = [
    { key: "kode", label: "Kode" },
    { key: "tanggal", label: "Tanggal", render: (r) => tanggalPendek(String(r.tanggal)) },
    { key: "customer", label: "Customer", render: (r) => String(r.customer) },
    { key: "jenis", label: "Jenis Tugas", render: (r) => String(r.jenis) },
    { key: "penjoki", label: "Penjoki", render: (r) => String(r.penjoki) },
    ...(isOwner || readOnly
      ? [{ key: "tim", label: "Tim", render: (r: Record<string, unknown>) => String(r.tim) }]
      : []),
    { key: "harga", label: "Payment Customer", currency: true },
    { key: "fee_penjoki", label: "Fee Penjoki (50%)", currency: true },
    { key: "fee_admin", label: "Fee Admin CS (23%)", currency: true },
    { key: "fee_sosmed", label: "Fee Admin Sosmed (7%)", currency: true },
    { key: "fee_owner", label: "Fee Owner (20%)", currency: true },
    { key: "status", label: "Status", render: (r) => String(r.status) },
  ];

  const exportRows = list.map((p) => {
    const fee = hitungFee(p.harga);
    return {
      kode: p.kode,
      tanggal: p.tanggal,
      customer: p.customer?.nama ?? "-",
      jenis: p.jenis_tugas?.nama ?? "-",
      penjoki: p.penjoki?.nama ?? "-",
      tim: p.team?.nama ?? "-",
      harga: p.harga,
      fee_penjoki: fee.feePenjoki,
      fee_admin: fee.feeAdmin,
      fee_sosmed: fee.feeSosmed,
      fee_owner: fee.feeOwner,
      status: FILTERS.find((f) => f.key === p.status)?.label ?? p.status,
    };
  });

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all ${
                statusFilter === f.key
                  ? "border-brand bg-brand text-[#10231a]"
                  : "border-line bg-surface-2 text-text-secondary hover:border-brand-border"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <ExportButtons
          title="Daftar Transaksi"
          filename="daftar-transaksi"
          columns={exportColumns}
          rows={exportRows}
        />
      </div>

      {(isOwner || readOnly) && (
        <TeamTabs teams={teams} value={teamFilter} onChange={setTeamFilter} />
      )}

      <Card className="hidden overflow-hidden sm:block">
        {list.length === 0 ? (
          <EmptyState title="Tidak ada transaksi" hint="Ubah filter atau input transaksi baru." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2/60 text-left text-[10px] uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-3 font-bold">Kode</th>
                  <th className="px-4 py-3 font-bold">Customer / Tugas</th>
                  <th className="px-4 py-3 font-bold">Penjoki</th>
                  {(isOwner || readOnly) && <th className="px-4 py-3 font-bold">Tim</th>}
                  <th className="px-4 py-3 text-right font-bold">Harga</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  {!readOnly && <th className="px-4 py-3 text-right font-bold">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const fee = hitungFee(p.harga);
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-line-soft last:border-0 hover:bg-surface-2/50"
                    >
                      <td className="px-4 py-3">
                        <p className="font-bold text-text-main">{p.kode}</p>
                        <p className="text-[11px] text-text-muted">{tanggalPendek(p.tanggal)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-text-main">{p.customer?.nama ?? "-"}</p>
                        <p className="text-[11px] text-text-muted">
                          {p.jenis_tugas?.nama ?? "-"} · {p.jumlah_keterangan}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{p.penjoki?.nama ?? "-"}</td>
                      {(isOwner || readOnly) && (
                        <td className="px-4 py-3 text-xs font-bold text-text-secondary">
                          {p.team?.nama ?? "-"}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right font-extrabold text-gold-soft tabular">
                        {rupiah(p.harga)}
                        {!isOwner && (
                          <>
                            <p className="mt-0.5 text-[10px] font-medium text-text-muted">
                              Penjoki {rupiah(fee.feePenjoki)} · CS {rupiah(fee.feeAdmin)}
                            </p>
                            <p className="text-[10px] font-medium text-text-muted">
                              Sosmed {rupiah(fee.feeSosmed)} · Owner {rupiah(fee.feeOwner)}
                            </p>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      {!readOnly && (
                        <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          {!readOnly && p.status === "MENUNGU" && (
                            <Button
                              variant="primary"
                              onClick={() =>
                                update.mutate({ id: p.id, patch: { status: "DIKERJAKAN" } })
                              }
                            >
                              Kerjakan
                            </Button>
                          )}
                          {!readOnly && p.status === "DIKERJAKAN" && (
                            <Button
                              variant="success"
                              title="Tandai selesai (masuk rekap)"
                              onClick={() =>
                                update.mutate({
                                  id: p.id,
                                  patch: {
                                    status: "SELESAI",
                                    selesai_at: new Date().toISOString(),
                                  },
                                })
                              }
                            >
                              Selesai
                            </Button>
                          )}
                        </div>
                      </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Kartu transaksi (mobile) */}
      <div className="space-y-2.5 sm:hidden">
        {list.length === 0 ? (
          <Card>
            <EmptyState
              title="Tidak ada transaksi"
              hint={
                readOnly
                  ? "Ubah filter untuk melihat transaksi lain."
                  : "Ubah filter atau input transaksi baru."
              }
            />
          </Card>
        ) : (
          list.map((p) => {
            const fee = hitungFee(p.harga);
            return (
              <div key={p.id} className="card-premium rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-extrabold text-text-main">
                      {p.kode}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      {tanggalPendek(p.tanggal)}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>

                <div className="mt-2.5 space-y-0.5">
                  <p className="truncate text-[13px] font-bold text-text-main">
                    {p.customer?.nama ?? "-"}
                  </p>
                  <p className="truncate text-[11px] text-text-muted">
                    {p.jenis_tugas?.nama ?? "-"} · {p.jumlah_keterangan}
                  </p>
                  <p className="truncate text-[11px] text-text-muted">
                    {p.penjoki?.nama ?? "-"} · {p.team?.nama ?? "-"}
                  </p>
                </div>

                <div className="mt-2.5 flex items-end justify-between gap-2">
                  <div>
                    <p className="font-display text-base font-extrabold text-gold-soft tabular">
                      {rupiah(p.harga)}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      Penjoki {rupiah(fee.feePenjoki)} · CS {rupiah(fee.feeAdmin)}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      Sosmed {rupiah(fee.feeSosmed)} · Owner {rupiah(fee.feeOwner)}
                    </p>
                  </div>
                </div>

                {!readOnly && (
                  <div className="mt-3 flex gap-2">
                    {p.status === "MENUNGU" && (
                      <Button
                        variant="primary"
                        className="flex-1"
                        onClick={() =>
                          update.mutate({ id: p.id, patch: { status: "DIKERJAKAN" } })
                        }
                      >
                        Kerjakan
                      </Button>
                    )}
                    {p.status === "DIKERJAKAN" && (
                      <Button
                        variant="success"
                        className="flex-1"
                        onClick={() =>
                          update.mutate({
                            id: p.id,
                            patch: { status: "SELESAI", selesai_at: new Date().toISOString() },
                          })
                        }
                      >
                        Selesai
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {update.isError && (
        <p className="text-sm font-semibold text-danger">
          Gagal menyimpan: {(update.error as Error).message}
        </p>
      )}
    </div>
  );
}
