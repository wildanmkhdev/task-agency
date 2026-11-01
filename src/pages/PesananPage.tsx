import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useScope } from "../hooks/useScope";
import { rupiah, tanggalPendek } from "../lib/format";
import type { Pesanan, PesananStatus, StatusBayar } from "../lib/types";
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
  "id, kode, harga, fee_admin, fee_owner, fee_penjoki, status, status_bayar, tanggal, jumlah_keterangan, team_id, customer:customers(nama), penjoki:penjoki(nama), jenis_tugas:jenis_tugas(nama), team:teams(nama)";

const FILTERS: { key: "SEMUA" | PesananStatus; label: string }[] = [
  { key: "SEMUA", label: "Semua" },
  { key: "MENUNGU", label: "Menunggu" },
  { key: "DIKERJAKAN", label: "Dikerjakan" },
  { key: "SELESAI", label: "Selesai" },
  { key: "BATAL", label: "Batal" },
];

/** Opsi dropdown status pembayaran (menggantikan toggle dibayar + fisk) */
const OpsiBayar: { value: StatusBayar; label: string }[] = [
  { value: "BELUM", label: "Belum Bayar" },
  { value: "CICIL", label: "Cicil" },
  { value: "LUNAS", label: "Lunas" },
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
      patch: Partial<
        Pick<Pesanan, "status" | "status_bayar" | "selesai_at" | "fee_admin">
      >;
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
    { key: "fee_penjoki", label: "Fee Penjoki (50%)", currency: true },
    { key: "fee_owner", label: "Fee Owner (50%)", currency: true },
    { key: "fee_admin", label: "Fee Admin (manual)", currency: true },
    { key: "status", label: "Status", render: (r) => String(r.status) },
    { key: "status_bayar", label: "Status Bayar", render: (r) => String(r.status_bayar) },
  ];

  const exportRows = list.map((p) => ({
    kode: p.kode,
    tanggal: p.tanggal,
    customer: p.customer?.nama ?? "-",
    jenis: p.jenis_tugas?.nama ?? "-",
    penjoki: p.penjoki?.nama ?? "-",
    tim: p.team?.nama ?? "-",
    harga: p.harga,
    fee_admin: p.fee_admin,
    fee_owner: p.fee_owner,
    fee_penjoki: p.fee_penjoki,
    status: FILTERS.find((f) => f.key === p.status)?.label ?? p.status,
    status_bayar: OpsiBayar.find((o) => o.value === p.status_bayar)?.label ?? p.status_bayar,
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
                  <th className="px-4 py-3 text-right font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
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
                        <p className="mt-0.5 text-[11px] font-medium text-text-muted">
                          Penjoki {rupiah(p.fee_penjoki)} · Owner {rupiah(p.fee_owner)}
                        </p>
                        {isOwner ? (
                          <span
                            className="mt-1 flex items-center justify-end gap-1 text-[11px] font-medium text-text-muted"
                            title="Fee admin — diisi manual oleh owner (D5)"
                          >
                            Admin
                            <input
                              type="number"
                              min={0}
                              defaultValue={p.fee_admin || ""}
                              placeholder="0"
                              onBlur={(e) => {
                                const raw = e.target.value.trim();
                                const v = raw === "" ? 0 : Number(raw);
                                if (Number.isFinite(v) && v >= 0 && v !== p.fee_admin)
                                  update.mutate({
                                    id: p.id,
                                    patch: { fee_admin: v },
                                  });
                              }}
                              className="w-24 rounded-md border border-slate-200 px-1.5 py-0.5 text-right text-[11px] font-bold tabular-nums text-text-main outline-none focus:border-brand"
                            />
                          </span>
                        ) : (
                          p.fee_admin > 0 && (
                            <p className="mt-0.5 text-[11px] font-medium text-text-muted">
                              Admin {rupiah(p.fee_admin)}
                            </p>
                          )
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={p.status_bayar}
                          onChange={(e) =>
                            update.mutate({
                              id: p.id,
                              patch: { status_bayar: e.target.value as StatusBayar },
                            })
                          }
                          className={`rounded-lg border px-2 py-1 text-xs font-bold outline-none transition-colors ${
                            p.status_bayar === "LUNAS"
                              ? "border-emerald-200 bg-emerald-50 text-success"
                              : p.status_bayar === "CICIL"
                                ? "border-amber-200 bg-amber-50 text-warning"
                                : "border-red-200 bg-red-50 text-danger"
                          }`}
                          title={
                            p.status === "SELESAI" && p.status_bayar !== "LUNAS"
                              ? "Selesai tapi belum lunas — belum masuk rekap"
                              : "Status pembayaran customer"
                          }
                        >
                          {OpsiBayar.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        {p.status === "SELESAI" && p.status_bayar !== "LUNAS" && (
                          <p className="mt-1 text-[11px] font-semibold text-warning">
                            belum masuk rekap
                          </p>
                        )}
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
                              title="Tandai selesai (masuk rekap bila sudah Lunas)"
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
                ))}
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


