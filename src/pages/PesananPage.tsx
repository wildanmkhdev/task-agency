import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useScope } from "../hooks/useScope";
import { useAuth } from "../context/AuthContext";
import { hanyaBaca } from "../lib/admin";
import { namaCustomerTampil, rupiah, tanggalPendek, yyyyMmDd } from "../lib/format";
import type { Pesanan } from "../lib/types";
import { BAGI_HASIL, hitungFee, persen } from "../lib/fee";
import { ExportButtons, type ExportColumn } from "../components/ExportButtons";
import { Button, Card, EmptyState, Spinner, StatusBadge, TeamTabs } from "../components/ui";
import { TambahTransaksiModal } from "../components/TambahTransaksiModal";
import { PeriodeTabs } from "../components/PeriodeTabs";
import { geserPeriode, rentangPeriode, type Periode } from "../lib/periode";
import { timTampil } from "../lib/teams";
import { belumAdaData, formatRate, ratePenjoki } from "../lib/rate";
import { invalidateTransaksi } from "../lib/invalidate";
import { urutkanTransaksi } from "../lib/urutan";

const PESANAN_SELECT =
  "id, kode, harga, fee_admin, fee_owner, fee_penjoki, status, status_bayar, tanggal, jumlah_keterangan, catatan, rating, team_id, penjoki_id, customer:customers(nama), penjoki:penjoki(id, nama, rating_skill), jenis_tugas:jenis_tugas(nama), team:teams(nama)";

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
        .limit(1000);
      q = applyScope(q as never) as typeof q;
      // Urutan tunggal aplikasi — lihat src/lib/urutan.ts
      const { data, error } = await urutkanTransaksi(q);
      if (error) throw error;
      return (data ?? []) as unknown as Pesanan[];
    },
  });

  const invalidate = () => invalidateTransaksi(qc);

  const update = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<Pesanan, "status" | "selesai_at">>;
    }) => {
      const { data: terupdate, error } = await supabase
        .from("pesanan")
        .update(patch)
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!terupdate || terupdate.length === 0) {
        throw new Error(
          "Tidak ada perubahan — transaksi ini bukan milik tim Anda atau Anda tidak punya akses."
        );
      }
    },
    onSettled: invalidate,
  });

  const hapus = useMutation({
    mutationFn: async (p: Pesanan) => {
      const { data: terhapus, error } = await supabase
        .from("pesanan")
        .delete()
        .eq("id", p.id)
        .select("id");
      if (error) throw error;
      if (!terhapus || terhapus.length === 0) {
        throw new Error(
          "Transaksi tidak terhapus — bukan milik tim Anda atau Anda tidak punya akses."
        );
      }
    },
    onSuccess: () => {
      setHapusTarget(null);
      setHapusError(null);
      invalidate();
    },
    onError: (e) => setHapusError((e as Error).message),
  });

  const list = rows ?? [];

  /**
   * Rate penjoki AKUMULASI — sumbernya sama dengan Data Penjoki/Admin:
   * rata-rata seluruh `pesanan.rating` milik penjoki, dengan fallback
   * `penjoki.rating_skill` (rating kualitas dari rekap DOCX).
   *
   * Sebelumnya kolom ini menghitung per bulan, sehingga penjoki yang sama
   * bisa menampilkan angka berbeda di bulan berbeda dan tidak pernah
   * "menumpuk". Sekarang satu angka per penjoki, konsisten di semua halaman.
   */
  const { data: ratingAkumulasi } = useQuery({
    queryKey: ["rate-penjoki-akumulasi"],
    staleTime: 60_000,
    queryFn: async (): Promise<Map<string, number[]>> => {
      const { data, error } = await supabase
        .from("pesanan")
        .select("penjoki_id, rating, status")
        .not("rating", "is", null)
        .limit(5000);
      if (error) throw error;

      const peta = new Map<string, number[]>();
      for (const r of data ?? []) {
        if (r.status === "BATAL") continue;
        const nilai = Number(r.rating);
        if (!Number.isFinite(nilai) || nilai < 1 || nilai > 5) continue;
        const daftar = peta.get(r.penjoki_id) ?? [];
        daftar.push(nilai);
        peta.set(r.penjoki_id, daftar);
      }
      return peta;
    },
  });

  /** Rate akumulasi penjoki untuk satu baris transaksi. */
  const rateBaris = (p: Pesanan) => {
    const nilai = ratingAkumulasi?.get(p.penjoki_id) ?? [];
    const fallback = p.penjoki?.rating_skill ?? null;
    return {
      rate: ratePenjoki(nilai, fallback),
      kosong: belumAdaData(nilai, fallback),
      /** Belum ada rating transaksi → angka berasal dari rating kualitas. */
      pakaiKualitas: nilai.length === 0 && fallback != null,
    };
  };

  /** Admin hanya boleh mengelola transaksi timnya sendiri; owner semua tim. */
  const bisaKelola = (p: Pesanan) =>
    !readOnly && (isOwner || p.team_id === profile?.team_id);

  const exportColumns: ExportColumn[] = [
    { key: "no", label: "No" },
    { key: "tanggal", label: "Tanggal", render: (r) => tanggalPendek(String(r.tanggal)) },
    { key: "kode", label: "Kode" },
    { key: "customer", label: "Customer", render: (r) => String(r.customer) },
    { key: "jenis", label: "Jenis Tugas", render: (r) => String(r.jenis) },
    { key: "penjoki", label: "Penjoki", render: (r) => String(r.penjoki) },
    { key: "tim", label: "Tim", render: (r: Record<string, unknown>) => String(r.tim) },
    { key: "harga", label: "Payment Customer", currency: true },
    { key: "fee_penjoki", label: `Fee Penjoki (${persen(BAGI_HASIL.penjoki)}%)`, currency: true },
    { key: "fee_admin", label: `Fee Admin CS (${persen(BAGI_HASIL.adminCs)}%)`, currency: true },
    { key: "fee_sosmed", label: `Fee Admin Sosmed (${persen(BAGI_HASIL.adminSosmed)}%)`, currency: true },
    { key: "fee_owner", label: `Fee Owner (${persen(BAGI_HASIL.owner)}%)`, currency: true },
    { key: "fee_kas", label: `Kas (${persen(BAGI_HASIL.kas)}%)`, currency: true },
    { key: "rating", label: "Rating Transaksi (1–5)", render: (r) => (r.rating == null ? "-" : String(r.rating)) },
    { key: "rate_penjoki", label: "Rate Penjoki (1–5)", render: (r) => String(r.rate_penjoki ?? "-") },
    { key: "catatan", label: "Catatan", render: (r) => String(r.catatan ?? "") },
    { key: "status", label: "Status", render: (r) => String(r.status) },
  ];

  const exportRows = list.map((p, idx) => {
    const fee = hitungFee(p.harga);
    const rate = rateBaris(p);
    return {
      no: idx + 1,
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
      fee_kas: fee.feeKas,
      rating: p.rating,
      rate_penjoki: rate.kosong ? "-" : formatRate(rate.rate),
      catatan: p.catatan,
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
          <div>
            {/* Indikator geser horizontal pada layar HP / tablet */}
            <div className="flex items-center justify-between border-b border-line/60 bg-surface-2/40 px-3.5 py-2 text-[11px] text-text-muted sm:hidden">
              <span className="flex items-center gap-1.5 font-semibold text-text-main">
                <svg className="h-3.5 w-3.5 text-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
                Tabel Transaksi
              </span>
              <span className="font-medium text-gold">← Geser ke kanan untuk rincian & aksi →</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-xs">
                <thead>
                  <tr className="border-b border-line bg-surface-2/80 text-[10px] uppercase tracking-wider text-text-muted">
                    {/* No — kolom paling kiri, sticky */}
                    <th className="sticky left-0 z-20 bg-surface-2 px-3 py-2.5 font-bold border-r border-line shadow-[3px_0_6px_-2px_rgba(0,0,0,0.35)] w-12 text-center">
                      No
                    </th>
                    <th className="px-3.5 py-2.5 font-bold">Tanggal</th>
                    <th className="px-3.5 py-2.5 font-bold">Penjoki</th>
                    <th className="px-3.5 py-2.5 font-bold">Rate Penjoki</th>
                    <th className="px-3.5 py-2.5 font-bold">Tim</th>
                    <th className="px-3.5 py-2.5 text-right font-bold">Payment</th>
                    <th className="px-3.5 py-2.5 text-right font-bold">Fee Penjoki</th>
                    <th className="px-3.5 py-2.5 font-bold">Status</th>
                    {!readOnly && <th className="px-3.5 py-2.5 text-right font-bold">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {list.map((p, idx) => {
                    const fee = hitungFee(p.harga);
                    const rate = rateBaris(p);
                    return (
                      <tr
                        key={p.id}
                        className="transition-colors hover:bg-surface-2/40"
                      >
                        {/* No — sticky kiri, nomor murni */}
                        <td className="sticky left-0 z-10 bg-surface px-3 py-2.5 whitespace-nowrap border-r border-line shadow-[3px_0_6px_-2px_rgba(0,0,0,0.35)] text-center">
                          <span className="font-display font-bold text-text-main text-[12px] tabular">{idx + 1}</span>
                        </td>

                        {/* Tanggal */}
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <p className="font-semibold text-text-main text-[12px]">{tanggalPendek(p.tanggal)}</p>
                          <p className="text-[10px] text-text-muted font-mono">{p.kode}</p>
                        </td>

                        {/* Penjoki */}
                        <td className="px-3.5 py-2.5">
                          <p className="font-semibold text-text-main whitespace-nowrap text-[12px]">
                            {p.penjoki?.nama ?? "-"}
                          </p>
                          <p className="text-[10px] text-text-muted whitespace-nowrap">
                            {p.jenis_tugas?.nama ?? "-"} · {p.jumlah_keterangan}
                          </p>
                          {p.catatan?.trim() && (
                            <p className="mt-0.5 max-w-[200px] truncate text-[10px] italic text-text-muted/80">
                              “{p.catatan.trim()}”
                            </p>
                          )}
                        </td>

                        {/* Rate Penjoki */}
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          {rate.kosong ? (
                            <span className="text-xs text-text-muted">—</span>
                          ) : (
                            <div className="inline-flex flex-col">
                              <span className="inline-flex items-center gap-1 rounded-full border border-brand-border/60 bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-gold">
                                ★ {formatRate(rate.rate)}
                                <span className="text-[9px] font-semibold text-text-muted">/5</span>
                              </span>
                              <span className="mt-0.5 text-[9px] text-text-muted">
                                {rate.pakaiKualitas
                                  ? "rating kualitas"
                                  : p.rating != null
                                    ? `transaksi ★ ${p.rating}`
                                    : "rata-rata bulan"}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Tim */}
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <span className="rounded-md border border-brand-border/40 bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-gold">
                            {p.team?.nama ?? "-"}
                          </span>
                        </td>

                        {/* Payment Customer */}
                        <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                          <p className="font-display font-extrabold text-gold-soft tabular text-[12px]">
                            {rupiah(p.harga)}
                          </p>
                          {!isOwner && (
                            <div className="mt-0.5 text-[9px] text-text-muted space-y-0.5">
                              <p>CS {rupiah(fee.feeAdmin)} · Sos {rupiah(fee.feeSosmed)}</p>
                              <p>Owner {rupiah(fee.feeOwner)} · Kas {rupiah(fee.feeKas)}</p>
                            </div>
                          )}
                        </td>

                        {/* Fee Penjoki */}
                        <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                          <p className="font-display font-bold text-emerald-400 tabular text-[12px]">
                            {rupiah(fee.feePenjoki)}
                          </p>
                          <p className="text-[9px] text-text-muted">
                            ({persen(BAGI_HASIL.penjoki)}%)
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <StatusBadge status={p.status} />
                        </td>

                        {/* Tombol Aksi */}
                        {!readOnly && (
                          <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                            {bisaKelola(p) && (
                              <div className="inline-flex items-center justify-end gap-1">
                                {p.status === "MENUNGU" && (
                                  <Button
                                    variant="primary"
                                    className="px-2.5 py-1 text-[11px] font-bold"
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
                                    className="px-2.5 py-1 text-[11px] font-bold"
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
                                  className="px-2.5 py-1 text-[11px] font-bold"
                                  title="Edit transaksi"
                                  onClick={() => setEditTarget(p)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="danger"
                                  className="px-2.5 py-1 text-[11px] font-bold"
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
