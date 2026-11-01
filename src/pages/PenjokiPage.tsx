import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useScope } from "../hooks/useScope";
import { awalBulanIni } from "../lib/format";
import type { Pesanan, Penjoki as PenjokiRow } from "../lib/types";
import {
  Button,
  Card,
  EmptyState,
  Field,
  RateBadge,
  Spinner,
  TeamTabs,
  inputCls,
} from "../components/ui";

/**
 * Daftar Penjoki & Rate Keaktifan (mockup biru layar 4 & 6).
 * RATE_PROVISIONAL: formula sementara = tugas selesai (selesai+bayar+fisk)
 * dibanding total pesanan bulan berjalan. Formula final menunggu keputusan D6.
 */
export function PenjokiPage() {
  const { isOwner, teams, teamFilter, setTeamFilter, applyScope } = useScope();
  const qc = useQueryClient();
  const [cari, setCari] = useState("");

  // Form tambah (owner only)
  const [showForm, setShowForm] = useState(false);
  const [fNama, setFNama] = useState("");
  const [fWa, setFWa] = useState("");
  const [fTim, setFTim] = useState("");
  const [fRating, setFRating] = useState("");
  const [fKeahlian, setFKeahlian] = useState("");
  const [fKeterangan, setFKeterangan] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

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
    queryFn: async (): Promise<Pick<Pesanan, "penjoki_id" | "status" | "dibayar" | "fisk">[]> => {
      let q = supabase
        .from("pesanan")
        .select("penjoki_id, status, dibayar, fisk")
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
      if (p.status === "SELESAI" && p.dibayar && p.fisk) cur.selesai += 1;
      m.set(p.penjoki_id, cur);
    }
    return m;
  }, [pesananBulanIni]);

  const rateOf = (id: string): number | null => {
    const s = rateMap.get(id);
    if (!s || s.total === 0) return null;
    return Math.round((s.selesai / s.total) * 100);
  };

  const tambah = useMutation({
    mutationFn: async () => {
      if (!fNama.trim() || !fTim) throw new Error("Nama & tim wajib diisi.");
      const { error } = await supabase.from("penjoki").insert({
        nama: fNama.trim(),
        no_hp: fWa.trim() || null,
        team_id: fTim,
        rating_skill: fRating ? Number(fRating) : null,
        keahlian: fKeahlian
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        keterangan: fKeterangan.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["penjoki"] });
      setShowForm(false);
      setFNama("");
      setFWa("");
      setFRating("");
      setFKeahlian("");
      setFKeterangan("");
      setFormError(null);
    },
    onError: (e) => setFormError((e as Error).message),
  });

  const toggleAktif = useMutation({
    mutationFn: async (p: PenjokiRow) => {
      const { error } = await supabase
        .from("penjoki")
        .update({ aktif: !p.aktif })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["penjoki"] }),
  });

  if (isLoading) return <Spinner />;

  const list = (penjoki ?? []).filter((p) =>
    cari ? p.nama.toLowerCase().includes(cari.toLowerCase()) : true
  );

  return (
    <div className="space-y-5">
      <p className="max-w-2xl text-sm text-text-secondary">
        Lihat daftar penjoki, tim, dan tingkat keaktifannya.{" "}
        <strong>Rate</strong> dihitung dari tugas yang selesai (pembayaran + fisk) pada
        bulan berjalan — formula final menyusul konfirmasi client.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          placeholder="Cari nama penjoki…"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          className={`${inputCls} w-full max-w-xs`}
        />
        {isOwner && (
          <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Tutup Form" : "+ Tambah Penjoki"}
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="p-5">
          <p className="mb-4 text-xs font-bold uppercase tracking-wide text-text-muted">
            Tambah Penjoki Baru
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama">
              <input value={fNama} onChange={(e) => setFNama(e.target.value)} className={inputCls} placeholder="Nama penjoki" />
            </Field>
            <Field label="No. WhatsApp">
              <input value={fWa} onChange={(e) => setFWa(e.target.value)} className={inputCls} placeholder="08xx" />
            </Field>
            <Field label="Tim">
              <select value={fTim} onChange={(e) => setFTim(e.target.value)} className={inputCls}>
                <option value="">— Pilih tim —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nama}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Rating Skill (0–100)">
              <input type="number" min={0} max={100} value={fRating} onChange={(e) => setFRating(e.target.value)} className={inputCls} placeholder="85" />
            </Field>
            <Field label="Keahlian" hint="Pisahkan dengan koma">
              <input value={fKeahlian} onChange={(e) => setFKeahlian(e.target.value)} className={inputCls} placeholder="Laporan PKL, PPT, Makalah" />
            </Field>
            <Field label="Keterangan">
              <input value={fKeterangan} onChange={(e) => setFKeterangan(e.target.value)} className={inputCls} placeholder="Fast response, teliti…" />
            </Field>
          </div>
          {formError && (
            <p className="mt-3 text-sm font-semibold text-danger">{formError}</p>
          )}
          <Button
            variant="success"
            className="mt-4"
            disabled={tambah.isPending}
            onClick={() => tambah.mutate()}
          >
            {tambah.isPending ? "Menyimpan…" : "Simpan Penjoki"}
          </Button>
        </Card>
      )}

      {isOwner && <TeamTabs teams={teams} value={teamFilter} onChange={setTeamFilter} />}

      <Card className="overflow-hidden">
        {list.length === 0 ? (
          <EmptyState title="Tidak ada penjoki" hint="Ubah filter atau tambah penjoki baru." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-bg-main text-left text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-5 py-3 font-bold">Nama Penjoki</th>
                  {isOwner && <th className="px-5 py-3 font-bold">Tim</th>}
                  <th className="px-5 py-3 font-bold">Keahlian</th>
                  <th className="px-5 py-3 text-center font-bold">Rating Skill</th>
                  <th className="px-5 py-3 text-center font-bold">Tugas (bln ini)</th>
                  <th className="px-5 py-3 text-center font-bold">Rate</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  {isOwner && <th className="px-5 py-3 text-right font-bold">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const stat = rateMap.get(p.id);
                  const rate = rateOf(p.id);
                  return (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-bg-main">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-xs font-extrabold text-white">
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
                        <td className="px-5 py-3 text-xs font-bold text-text-secondary">
                          {p.team?.nama ?? "-"}
                        </td>
                      )}
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(p.keahlian ?? []).slice(0, 3).map((k) => (
                            <span
                              key={k}
                              className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-text-secondary"
                            >
                              {k}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center font-bold tabular-nums">
                        {p.rating_skill ?? "-"}
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
                              ? "border-emerald-200 bg-emerald-50 text-success"
                              : "border-red-200 bg-red-50 text-danger"
                          }`}
                        >
                          {p.aktif ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      {isOwner && (
                        <td className="px-5 py-3 text-right">
                          <Button variant="ghost" onClick={() => toggleAktif.mutate(p)}>
                            {p.aktif ? "Nonaktifkan" : "Aktifkan"}
                          </Button>
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

      <p className="text-xs text-text-muted">
        💡 Penjoki dengan rate tinggi bisa dipertimbangkan untuk membantu tim yang
        kekurangan tenaga (rekomendasi antar tim — pengembangan Fase 4).
      </p>
    </div>
  );
}
