import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useScope } from "../hooks/useScope";
import { awalBulanIni } from "../lib/format";
import type { Pesanan, Penjoki as PenjokiRow } from "../lib/types";
import {
  Button,
  Card,
  EmptyState,
  RateBadge,
  Spinner,
  TeamTabs,
  inputCls,
} from "../components/ui";
import { MagnifyingGlassIcon } from "../components/icons";

/**
 * Laporan rate keaktifan penjoki (tampilan-saja).
 * CRUD penuh ada di menu "Data Penjoki dan Admin" (/penjoki/manajemen).
 * RATE_PROVISIONAL: formula sementara = tugas selesai + lunas
 * dibanding total pesanan bulan berjalan. Formula final menunggu keputusan D6.
 */
export function PenjokiPage() {
  const { isOwner, teams, teamFilter, setTeamFilter, applyScope } = useScope();
  const navigate = useNavigate();
  const [cari, setCari] = useState("");

  const { data: penjoki, isLoading } = useQuery({
    queryKey: ["penjoki", teamFilter],
    queryFn: async (): Promise<PenjokiRow[]> => {
      let q = supabase.from("penjoki").select("*, team:teams(nama)").order("nama");
      q = applyScope(q as never) as typeof q;
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Pesanan bulan berjalan (untuk hitung rate)
  const { data: pesananBulanIni } = useQuery({
    queryKey: ["penjoki-rate", teamFilter],
    queryFn: async (): Promise<Pick<Pesanan, "penjoki_id" | "status" | "status_bayar">[]> => {
      let q = supabase
        .from("pesanan")
        .select("penjoki_id, status, status_bayar")
        .gte("tanggal", awalBulanIni());
      q = applyScope(q as never) as typeof q;
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const rateMap = useMemo(() => {
    const m = new Map<string, { selesai: number; total: number }>();
    for (const p of pesananBulanIni ?? []) {
      if (p.status === "BATAL") continue;
      const cur = m.get(p.penjoki_id) ?? { selesai: 0, total: 0 };
      cur.total += 1;
      if (p.status === "SELESAI" && p.status_bayar === "LUNAS") cur.selesai += 1;
      m.set(p.penjoki_id, cur);
    }
    return m;
  }, [pesananBulanIni]);

  const rateOf = (id: string): number | null => {
    const s = rateMap.get(id);
    if (!s || s.total === 0) return null;
    return Math.round((s.selesai / s.total) * 100);
  };

  if (isLoading) return <Spinner />;

  const list = (penjoki ?? []).filter((p) =>
    cari ? p.nama.toLowerCase().includes(cari.toLowerCase()) : true
  );

  return (
    <div className="space-y-4">
      <p className="rounded-2xl border border-brand-border/50 bg-brand/5 px-4 py-3 text-[11px] leading-relaxed text-text-secondary">
        Laporan kinerja penjoki: daftar penjoki, tim, dan tingkat keaktifannya.{" "}
        <strong className="text-text-main">Rate</strong> dihitung dari tugas yang
        selesai + lunas pada bulan berjalan. Untuk mengubah data penjoki, buka
        menu <strong className="text-text-main">Data Penjoki dan Admin</strong>
        {!isOwner && " (terkunci ke tim Anda)"}.
      </p>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            placeholder="Cari nama penjoki…"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            className={`${inputCls} pl-10`}
          />
        </div>
        <Button
          variant="primary"
          onClick={() => navigate("/penjoki/manajemen")}
          className="shrink-0"
        >
          Kelola
        </Button>
      </div>

      {isOwner && <TeamTabs teams={teams} value={teamFilter} onChange={setTeamFilter} />}

      {/* Kartu penjoki (mobile) */}
      <div className="space-y-2 sm:hidden">
        {list.length === 0 ? (
          <Card>
            <EmptyState
              title="Tidak ada penjoki"
              hint="Ubah filter atau tambah penjoki baru."
            />
          </Card>
        ) : (
          list.map((p) => {
            const stat = rateMap.get(p.id);
            return (
              <div key={p.id} className="card-premium rounded-2xl px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-border/60 bg-brand/10 text-[11px] font-extrabold text-gold">
                    {p.nama.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-text-main">
                      {p.nama}
                    </p>
                    <p className="truncate text-[11px] text-text-muted">
                      {p.team?.nama ?? "-"}
                      {p.no_hp ? ` · ${p.no_hp}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                      p.aktif
                        ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                        : "border-red-400/25 bg-red-400/10 text-danger"
                    }`}
                  >
                    {p.aktif ? "Aktif" : "Nonaktif"}
                  </span>
                </div>

                {(p.keahlian ?? []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(p.keahlian ?? []).slice(0, 3).map((k) => (
                      <span
                        key={k}
                        className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-text-secondary"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line-soft pt-2.5">
                  <p className="text-[10px] text-text-muted">
                    Tugas {stat ? `${stat.selesai}/${stat.total}` : "0"}
                  </p>
                  <RateBadge rate={rateOf(p.id)} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Tabel penjoki (desktop) */}
      <Card className="hidden overflow-hidden sm:block">
        {list.length === 0 ? (
          <EmptyState title="Tidak ada penjoki" hint="Ubah filter atau tambah penjoki baru." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2/60 text-left text-[10px] uppercase tracking-wider text-text-muted">
                  <th className="px-5 py-3 font-bold">Nama Penjoki</th>
                  {isOwner && <th className="px-5 py-3 font-bold">Tim</th>}
                  <th className="px-5 py-3 font-bold">Keahlian</th>
                  <th className="px-5 py-3 text-center font-bold">Tugas (bln ini)</th>
                  <th className="px-5 py-3 text-center font-bold">Rate</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const stat = rateMap.get(p.id);
                  const rate = rateOf(p.id);
                  return (
                    <tr key={p.id} className="border-b border-line-soft last:border-0 hover:bg-surface-2/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-border/60 bg-brand/10 text-xs font-extrabold text-gold">
                            {p.nama.slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <p className="font-bold text-text-main">{p.nama}</p>
                            {p.no_hp && (
                              <p className="text-xs text-text-muted">{p.no_hp}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      {isOwner && (
                        <td className="whitespace-nowrap px-5 py-3 text-xs font-bold text-text-secondary">
                          {p.team?.nama ?? "-"}
                        </td>
                      )}
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(p.keahlian ?? []).slice(0, 3).map((k) => (
                            <span
                              key={k}
                              className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-text-secondary"
                            >
                              {k}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center tabular-nums">
                        {stat ? `${stat.selesai}/${stat.total}` : "0"}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <RateBadge rate={rate} />
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                            p.aktif
                              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                              : "border-red-400/25 bg-red-400/10 text-danger"
                          }`}
                        >
                          {p.aktif ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-[10px] leading-relaxed text-text-muted">
        💡 Penjoki dengan rate tinggi bisa dipertimbangkan untuk membantu tim yang
        kekurangan tenaga (rekomendasi antar tim — pengembangan Fase 4).
      </p>
    </div>
  );
}
