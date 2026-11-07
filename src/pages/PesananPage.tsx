import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useScope } from "../hooks/useScope";
import { useAuth } from "../context/AuthContext";
import { hanyaBaca } from "../lib/admin";
import { namaCustomerTampil, rupiah, tanggalPendek, yyyyMmDd } from "../lib/format";
import type { Pesanan } from "../lib/types";
import { hitungFee } from "../lib/fee";
import { ExportButtons, type ExportColumn } from "../components/ExportButtons";
import { Button, Card, EmptyState, Spinner, StatusBadge, TeamTabs } from "../components/ui";
import { TambahTransaksiModal } from "../components/TambahTransaksiModal";
import { PeriodeTabs } from "../components/PeriodeTabs";
import { geserPeriode, rentangPeriode, type Periode } from "../lib/periode";
import { timTampil } from "../lib/teams";

const PESANAN_SELECT =
  "id, kode, harga, fee_admin, fee_owner, fee_penjoki, status, status_bayar, tanggal, jumlah_keterangan, team_id, customer:customers(nama), penjoki:penjoki(nama), jenis_tugas:jenis_tugas(nama), team:teams(nama)";

/**
 * Daftar Transaksi (revisi 6 Nov 2026).
 * - Filter periode Harian/Mingguan/Bulanan + navigasi tanggal (seperti
 *   Data Rekap Tim) digabung dengan filter tim.
 * - Filter tim berfungsi untuk SEMUA role: Owner, admin CS, dan sosmed.
 *   RLS SELECT mengizinkan pembacaan lintas tim; filter hanya memilih
 *   tim mana yang ditampilkan (admin tetap hanya bisa menulis timnya).
 * - Tombol aksi (Kerjakan/Selesai/Edit/Hapus) hanya muncul untuk transaksi
 *   milik tim admin yang sedang login. Owner tetap bisa semua tim.
 * - Label import tidak lagi ditampilkan (data customer sudah dibersihkan).
 */
export function PesananPage() {
  const { isOwner, teams, teamFilter, setTeamFilter, applyScope } = useScope();
  const { profile } = useAuth();
  const readOnly = hanyaBaca(profile);
  const qc = useQueryClient();

  // Filter periode (Harian/Mingguan/Bulanan) — sama seperti Data Rekap Tim.
  const [periode, setPeriode] = useState<Periode>("bulanan");
  const [tanggal, setTanggal] = useState(yyyyMmDd(new Date()));
  const tanggalDisentuh = useRef(false);
  const tanggalDefaultDipakai = useRef(false);
  const rentang = rentangPeriode(periode, tanggal);

  // Saat pertama dibuka, arahkan ke periode yang benar-benar berisi data
  // (transaksi terakhir yang tidak melewati hari ini) agar tabel tidak kosong.
  const { data: tanggalTerakhir } = useQuery({
    queryKey: ["pesanan-tanggal-terakhir"],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("pesanan")
        .select("tanggal")
        .lte("tanggal", new Date().toISOString())
        .order("tanggal", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data?.tanggal as string | undefined) ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (tanggalDisentuh.current || tanggalDefaultDipakai.current || !tanggalTerakhir) return;
    tanggalDefaultDipakai.current = true;
    setTanggal(yyyyMmDd(new Date(tanggalTerakhir)));
  }, [tanggalTerakhir]);

  const pindahPeriode = (arah: 1 | -1) => {
    tanggalDisentuh.current = true;
    setTanggal(geserPeriode(periode, tanggal, arah));
  };

  const pilihTanggal = (nilai: string) => {
    tanggalDisentuh.current = true;
    setTanggal(nilai || yyyyMmDd(new Date()));
  };

  const [editTarget, setEditTarget] = useState<Pesanan | null>(null);
  const [hapusTarget, setHapusTarget] = useState<Pesanan | null>(null);
  const [hapusError, setHapusError] = useState<string | null>(null);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["pesanan", teamFilter, rentang.mulaiIso, rentang.selesaiIso],
    queryFn: async (): Promise<Pesanan[]> => {
      let q = supabase
        .from("pesanan")
        .select(PESANAN_SELECT)
        .gte("tanggal", rentang.mulaiIso)
        .lte("tanggal", rentang.selesaiIso)
        .order("tanggal", { ascending: false })
        .limit(1000);
      q = applyScope(q as never) as typeof q;
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Pesanan[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["pesanan"] });
    qc.invalidateQueries({ queryKey: ["dashboard-pesanan"] });
    qc.invalidateQueries({ queryKey: ["rekap"] });
    qc.invalidateQueries({ queryKey: ["rekap-admin"] });
    qc.invalidateQueries({ queryKey: ["penjoki-rate"] });
  };

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
    onSettled: invalidate,
  });

  const hapus = useMutation({
    mutationFn: async (p: Pesanan) => {
      const { error } = await supabase.from("pesanan").delete().eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setHapusTarget(null);
      setHapusError(null);
      invalidate();
    },
    onError: (e) => setHapusError((e as Error).message),
  });

  const list = rows ?? [];

  /** Admin hanya boleh mengelola transaksi timnya sendiri; owner semua tim. */
  const bisaKelola = (p: Pesanan) =>
    !readOnly && (isOwner || p.team_id === profile?.team_id);

  const exportColumns: ExportColumn[] = [
    { key: "kode", label: "Kode" },
    { key: "tanggal", label: "Tanggal", render: (r) => tanggalPendek(String(r.tanggal)) },
    { key: "customer", label: "Customer", render: (r) => String(r.customer) },
    { key: "jenis", label: "Jenis Tugas", render: (r) => String(r.jenis) },
    { key: "penjoki", label: "Penjoki", render: (r) => String(r.penjoki) },
    { key: "tim", label: "Tim", render: (r: Record<string, unknown>) => String(r.tim) },
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
      customer: namaCustomerTampil(p.customer?.nama),
      jenis: p.jenis_tugas?.nama ?? "-",
      penjoki: p.penjoki?.nama ?? "-",
      tim: p.team?.nama ?? "-",
      harga: p.harga,
      fee_penjoki: fee.feePenjoki,
      fee_admin: fee.feeAdmin,
      fee_sosmed: fee.feeSosmed,
      fee_owner: fee.feeOwner,
      status: p.status,
    };
  });

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-extrabold text-text-main">
          Transaksi
        </h2>
        <ExportButtons
          title="Daftar Transaksi"
          filename="daftar-transaksi"
          columns={exportColumns}
          rows={exportRows}
        />
      </div>

      <PeriodeTabs value={periode} onChange={setPeriode} />

      {/* Navigasi tanggal acuan periode */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => pindahPeriode(-1)}
          className="rounded-full border border-line bg-surface-2 p-2 text-text-secondary hover:border-brand-border hover:text-gold"
          aria-label="Periode sebelumnya"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <label className="relative flex items-center gap-2 rounded-full border border-brand-border bg-surface-2 px-4 py-2 text-xs font-bold text-gold-soft">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-gold" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <rect x="3" y="5" width="18" height="16" rx="2.5" />
            <path d="M8 3v4M16 3v4M3 10h18" />
          </svg>
          <span>{rentang.label}</span>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => pilihTanggal(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Pilih tanggal acuan"
          />
        </label>
        <button
          onClick={() => pindahPeriode(1)}
          className="rounded-full border border-line bg-surface-2 p-2 text-text-secondary hover:border-brand-border hover:text-gold"
          aria-label="Periode berikutnya"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </div>

      <TeamTabs teams={timTampil(teams)} value={teamFilter} onChange={setTeamFilter} />

      <Card className="overflow-hidden">
        {list.length === 0 ? (
          <EmptyState
            title="Tidak ada transaksi"
            hint="Tidak ada data pada periode/tim ini. Geser tanggal atau ubah filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2/60 text-left text-[10px] uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-3 font-bold">Kode</th>
                  <th className="px-4 py-3 font-bold">Penjoki</th>
                  <th className="px-4 py-3 font-bold">Tim</th>
                  <th className="px-4 py-3 text-right font-bold">Harga</th>
                  <th className="px-4 py-3 text-right font-bold">Fee Penjoki</th>
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
                        <p className="font-semibold text-text-main">{p.penjoki?.nama ?? "-"}</p>
                        <p className="text-[11px] text-text-muted">
                          {p.jenis_tugas?.nama ?? "-"} · {p.jumlah_keterangan}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-text-secondary">
                        {p.team?.nama ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-gold-soft tabular">
                        {rupiah(p.harga)}
                        {!isOwner && (
                          <>
                            <p className="mt-0.5 text-[10px] font-medium text-text-muted">
                              CS {rupiah(fee.feeAdmin)} · Sosmed {rupiah(fee.feeSosmed)}
                            </p>
                            <p className="text-[10px] font-medium text-text-muted">
                              Owner {rupiah(fee.feeOwner)}
                            </p>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-text-main tabular">
                        {rupiah(fee.feePenjoki)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      {!readOnly && (
                        <td className="px-4 py-3 text-right">
                          {bisaKelola(p) && (
                            <div className="flex flex-wrap justify-end gap-1.5">
                              {p.status === "MENUNGU" && (
                                <Button
                                  variant="primary"
                                  className="px-3 py-1.5 text-xs"
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
                                  className="px-3 py-1.5 text-xs"
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
                              <Button
                                variant="ghost"
                                className="px-3 py-1.5 text-xs"
                                title="Edit transaksi"
                                onClick={() => setEditTarget(p)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="danger"
                                className="px-3 py-1.5 text-xs"
                                title="Hapus transaksi"
                                onClick={() => {
                                  setHapusTarget(p);
                                  setHapusError(null);
                                }}
                              >
                                Hapus
                              </Button>
                            </div>
                          )}
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

      {update.isError && (
        <p className="text-sm font-semibold text-danger">
          Gagal menyimpan: {(update.error as Error).message}
        </p>
      )}

      {/* Dialog edit */}
      {profile && (
        <TambahTransaksiModal
          open={Boolean(editTarget)}
          onClose={() => setEditTarget(null)}
          admin={profile}
          tanggalAcuan={editTarget ? editTarget.tanggal.slice(0, 10) : ""}
          pesanan={editTarget}
        />
      )}

      {/* Dialog hapus */}
      {hapusTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setHapusTarget(null);
              setHapusError(null);
            }}
          />
          <Card className="relative w-full max-w-md p-6">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-400/30 bg-red-400/10 text-lg text-danger">
                !
              </span>
              <div>
                <h3 className="font-display text-base font-extrabold">Hapus Transaksi?</h3>
                <p className="text-xs text-text-muted">
                  {hapusTarget.kode} · {hapusTarget.penjoki?.nama ?? "-"}
                </p>
              </div>
            </div>

            <p className="text-sm text-text-secondary">
              Transaksi <strong>{rupiah(hapusTarget.harga)}</strong> akan dihapus{" "}
              <strong>permanen</strong> dan tidak lagi masuk rekap maupun statistik.
            </p>

            {hapusError && (
              <p className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-semibold text-danger">
                {hapusError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setHapusTarget(null);
                  setHapusError(null);
                }}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                disabled={hapus.isPending}
                onClick={() => hapus.mutate(hapusTarget)}
              >
                {hapus.isPending ? "Menghapus…" : "Hapus Permanen"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
