import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useScope } from "../hooks/useScope";
import { rupiah, tanggalPendek } from "../lib/format";
import type { Pesanan, PesananStatus } from "../lib/types";
import { ExportButtons, type ExportColumn } from "../components/ExportButtons";
import {
  Button,
  Card,
  EmptyState,
  Spinner,
  StatusBadge,
  TeamTabs,
} from "../components/ui";

const PESANAN_SELECT =
  "id, kode, harga, status, dibayar, fisk, tanggal, jumlah_keterangan, team_id, customer:customers(nama), penjoki:penjoki(nama), jenis_tugas:jenis_tugas(nama), team:teams(nama)";

const FILTERS: { key: "SEMUA" | PesananStatus; label: string }[] = [
  { key: "SEMUA", label: "Semua" },
  { key: "MENUNGU", label: "Menunggu" },
  { key: "DIKERJAKAN", label: "Dikerjakan" },
  { key: "SELESAI", label: "Selesai" },
  { key: "BATAL", label: "Batal" },
];

/** Daftar Pesanan + kendali lifecycle (D1 scoping berlaku via RLS) */
export function PesananPage() {
  const { isOwner, teams, teamFilter, setTeamFilter, applyScope } = useScope();
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
      patch: Partial<Pick<Pesanan, "status" | "dibayar" | "fisk" | "selesai_at">>;
    }) => {
      const { error } = await supabase.from("pesanan").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["pesanan"] });
      qc.invalidateQueries({ queryKey: ["dashboard-pesanan"] });
      qc.invalidateQueries({ queryKey: ["rekap"] });
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
    ...(isOwner ? [{ key: "tim", label: "Tim", render: (r: Record<string, unknown>) => String(r.tim) }] : []),
    { key: "harga", label: "Payment Customer", currency: true },
    { key: "status", label: "Status", render: (r) => String(r.status) },
  ];

  const exportRows = list.map((p) => ({
    kode: p.kode,
    tanggal: p.tanggal,
    customer: p.customer?.nama ?? "-",
    jenis: p.jenis_tugas?.nama ?? "-",
    penjoki: p.penjoki?.nama ?? "-",
    tim: p.team?.nama ?? "-",
    harga: p.harga,
    status: FILTERS.find((f) => f.key === p.status)?.label ?? p.status,
  }));

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all ${
                statusFilter === f.key
                  ? "border-text-main bg-text-main text-white"
                  : "border-slate-200 bg-white text-text-secondary hover:border-slate-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <ExportButtons
          title="Daftar Pesanan"
          filename="daftar-pesanan"
          columns={exportColumns}
          rows={exportRows}
        />
      </div>

      {isOwner && <TeamTabs teams={teams} value={teamFilter} onChange={setTeamFilter} />}

      <Card className="overflow-hidden">
        {list.length === 0 ? (
          <EmptyState title="Tidak ada pesanan" hint="Ubah filter atau tambah pesanan baru." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-bg-main text-left text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3 font-bold">Kode</th>
                  <th className="px-4 py-3 font-bold">Customer / Tugas</th>
                  <th className="px-4 py-3 font-bold">Penjoki</th>
                  {isOwner && <th className="px-4 py-3 font-bold">Tim</th>}
                  <th className="px-4 py-3 text-right font-bold">Harga</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Bayar</th>
                  <th className="px-4 py-3 font-bold">Fisk</th>
                  <th className="px-4 py-3 text-right font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const canSelesai = p.dibayar && p.fisk;
                  return (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-bg-main">
                      <td className="px-4 py-3">
                        <p className="font-bold text-text-main">{p.kode}</p>
                        <p className="text-xs text-text-muted">{tanggalPendek(p.tanggal)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-text-main">{p.customer?.nama ?? "-"}</p>
                        <p className="text-xs text-text-muted">
                          {p.jenis_tugas?.nama ?? "-"} · {p.jumlah_keterangan}
                        </p>
                      </td>
                      <td className="px-4 py-3">{p.penjoki?.nama ?? "-"}</td>
                      {isOwner && (
                        <td className="px-4 py-3 text-xs font-bold text-text-secondary">
                          {p.team?.nama ?? "-"}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right font-extrabold tabular-nums">
                        {rupiah(p.harga)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3">
                        <ToggleChip
                          checked={p.dibayar}
                          onClick={() =>
                            update.mutate({ id: p.id, patch: { dibayar: !p.dibayar } })
                          }
                          label={p.dibayar ? "Lunas" : "Belum"}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <ToggleChip
                          checked={p.fisk}
                          onClick={() => update.mutate({ id: p.id, patch: { fisk: !p.fisk } })}
                          label={p.fisk ? "Ada" : "Belum"}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {p.status === "MENUNGU" && (
                            <Button
                              variant="primary"
                              onClick={() =>
                                update.mutate({
                                  id: p.id,
                                  patch: { status: "DIKERJAKAN" },
                                })
                              }
                            >
                              Kerjakan
                            </Button>
                          )}
                          {p.status === "DIKERJAKAN" && (
                            <Button
                              variant="success"
                              disabled={!canSelesai}
                              title={
                                canSelesai
                                  ? "Tandai selesai"
                                  : "Butuh pembayaran + fisk beres dulu"
                              }
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
                          {(p.status === "MENUNGU" || p.status === "DIKERJAKAN") && (
                            <Button
                              variant="danger"
                              onClick={() =>
                                update.mutate({ id: p.id, patch: { status: "BATAL" } })
                              }
                            >
                              Batal
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {update.isError && (
        <p className="text-sm font-semibold text-danger">
          Gagal menyimpan: {(update.error as Error).message}
        </p>
      )}
    </div>
  );
}

function ToggleChip({
  checked,
  onClick,
  label,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 text-xs font-bold transition-all ${
        checked
          ? "border-emerald-200 bg-emerald-50 text-success"
          : "border-red-200 bg-red-50 text-danger"
      }`}
    >
      {label}
    </button>
  );
}
