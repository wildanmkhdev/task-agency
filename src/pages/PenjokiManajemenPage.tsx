import { useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useScope } from "../hooks/useScope";
import { useAuth } from "../context/AuthContext";
import { awalBulanIni, yyyyMmDd } from "../lib/format";
import type { Penjoki as PenjokiRow, Profile } from "../lib/types";
import {
  jenisAdmin,
  keteranganJabatan,
  labelJabatan,
  namaLengkapAdmin,
  urutkanAdmin,
} from "../lib/admin";
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
import {
  ChevronRightIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "../components/icons";

type Tab = "penjoki" | "admin";

/**
 * Data Penjoki dan Admin (revisi client):
 * - Tab: Penjoki | Admin
 * - Penjoki: Nama, Tim, Rate, Keahlian, Tugas bulan ini, Status
 * - Admin: nama + jabatan di bawahnya (tanpa angka urut)
 * - Akun penjoki nanti hanya untuk melihat rate.
 */
export function PenjokiManajemenPage() {
  const { profile, isOwner, teams, teamFilter, setTeamFilter, scopedTeamId, applyScope } =
    useScope();
  const { profile: me } = useAuth();
  const qc = useQueryClient();
  const formRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<Tab>("penjoki");

  // Filter
  const [cari, setCari] = useState("");
  const [statusFilter, setStatusFilter] = useState<"semua" | "aktif" | "nonaktif">("semua");
  const [filterOpen, setFilterOpen] = useState(false);

  // Form tambah/edit
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fNama, setFNama] = useState("");
  const [fWa, setFWa] = useState("");
  const [fTim, setFTim] = useState("");
  const [fRating, setFRating] = useState("");
  const [fKeahlian, setFKeahlian] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [fKeterangan, setFKeterangan] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Dialog hapus
  const [hapusTarget, setHapusTarget] = useState<PenjokiRow | null>(null);
  const [hapusError, setHapusError] = useState<string | null>(null);

  // ---- Data ----
  const { data: penjoki, isLoading } = useQuery({
    queryKey: ["penjoki-manajemen", scopedTeamId],
    queryFn: async (): Promise<PenjokiRow[]> => {
      let q = supabase.from("penjoki").select("*, team:teams(nama)").order("nama");
      q = applyScope(q as never) as typeof q;
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Tugas bulan ini per penjoki (revisi: kolom "Tugas bulan ini")
  const { data: tugasBulanIni } = useQuery({
    queryKey: ["penjoki-tugas-bulan-ini"],
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await supabase
        .from("pesanan")
        .select("penjoki_id, tanggal")
        .gte("tanggal", awalBulanIni());
      if (error) throw error;
      const m = new Map<string, number>();
      for (const r of data ?? []) m.set(r.penjoki_id, (m.get(r.penjoki_id) ?? 0) + 1);
      return m;
    },
  });

  // Daftar admin (owner = semua, admin = dirinya sendiri via RLS)
  const { data: admins } = useQuery({
    queryKey: ["admins-data-tim"],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, team_id, nama_lengkap, no_hp, aktif, team:teams(nama)")
        .eq("role", "ADMIN");
      if (error) throw error;
      return (data ?? []) as unknown as Profile[];
    },
  });

  const semuaPenjoki = penjoki ?? [];

  // ---- Turunan ----
  const kategoriList = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of semuaPenjoki)
      for (const k of p.keahlian ?? []) m.set(k, (m.get(k) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [semuaPenjoki]);

  const stats = useMemo(() => {
    const aktif = semuaPenjoki.filter((p) => p.aktif).length;
    return {
      aktif,
      nonaktif: semuaPenjoki.length - aktif,
      jenis: kategoriList.length,
    };
  }, [semuaPenjoki, kategoriList]);

  const editing = semuaPenjoki.find((p) => p.id === editingId) ?? null;

  const daftarAdmin = useMemo(() => {
    const base = urutkanAdmin(admins ?? []);
    return isOwner ? base : base.filter((a) => a.id === me?.id);
  }, [admins, isOwner, me?.id]);

  const list = semuaPenjoki.filter((p) => {
    if (cari && !p.nama.toLowerCase().includes(cari.toLowerCase())) return false;
    if (statusFilter === "aktif" && !p.aktif) return false;
    if (statusFilter === "nonaktif" && p.aktif) return false;
    return true;
  });

  // ---- Mutasi ----
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["penjoki-manajemen"] });
    qc.invalidateQueries({ queryKey: ["penjoki"] });
    qc.invalidateQueries({ queryKey: ["penjoki-tugas-bulan-ini"] });
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFNama("");
    setFWa("");
    setFTim("");
    setFRating("");
    setFKeahlian([]);
    setTagInput("");
    setFKeterangan("");
    setFormError(null);
  };

  const bukaTambah = () => {
    resetForm();
    setShowForm(true);
    setFTim(scopedTeamId ?? teams[0]?.id ?? "");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const mulaiEdit = (p: PenjokiRow) => {
    resetForm();
    setEditingId(p.id);
    setFNama(p.nama);
    setFWa(p.no_hp ?? "");
    setFTim(p.team_id);
    setFRating(p.rating_skill != null ? String(p.rating_skill) : "");
    setFKeahlian(p.keahlian ?? []);
    setFKeterangan(p.keterangan ?? "");
    setShowForm(true);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const simpan = useMutation({
    mutationFn: async () => {
      const nama = fNama.trim();
      if (!nama) throw new Error("Nama wajib diisi.");
      const timFinal = isOwner ? fTim : (profile?.team_id ?? "");
      if (!timFinal) throw new Error("Tim wajib dipilih.");
      let rating: number | null = null;
      if (fRating.trim()) {
        rating = Number(fRating);
        if (!Number.isFinite(rating) || rating < 0 || rating > 100)
          throw new Error("Rate harus antara 0–100.");
      }
      const payload = {
        nama,
        no_hp: fWa.trim() || null,
        team_id: timFinal,
        rating_skill: rating,
        keahlian: fKeahlian,
        keterangan: fKeterangan.trim() || null,
      };
      const { error } = editingId
        ? await supabase.from("penjoki").update(payload).eq("id", editingId)
        : await supabase.from("penjoki").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      resetForm();
      invalidate();
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
    onSettled: () => invalidate(),
  });

  const hapus = useMutation({
    mutationFn: async (p: PenjokiRow) => {
      const { error } = await supabase.from("penjoki").delete().eq("id", p.id);
      if (error) {
        if (error.code === "23503")
          throw new Error(
            "Penjoki masih punya riwayat pesanan sehingga tidak bisa dihapus permanen. Gunakan Nonaktifkan sebagai gantinya."
          );
        throw error;
      }
    },
    onSuccess: () => {
      setHapusTarget(null);
      setHapusError(null);
      invalidate();
    },
    onError: (e) => setHapusError((e as Error).message),
  });

  // ---- Kategori (tag input) ----
  const addTag = (raw: string) => {
    const t = raw.trim().replace(/,+$/, "");
    if (!t) return;
    if (fKeahlian.some((k) => k.toLowerCase() === t.toLowerCase())) {
      setTagInput("");
      return;
    }
    setFKeahlian([...fKeahlian, t]);
    setTagInput("");
  };
  const removeTag = (k: string) => setFKeahlian((cur) => cur.filter((x) => x !== k));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    simpan.mutate();
  };

  const saranKategori = kategoriList
    .filter(([k]) => !fKeahlian.some((x) => x.toLowerCase() === k.toLowerCase()))
    .slice(0, 8);

  if (isLoading) return <Spinner label="Memuat data tim…" />;

  return (
    <div className="space-y-4">
      {/* Tabs — Penjoki | Admin CS */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setTab("penjoki")}
          className={`rounded-full py-2.5 text-[13px] font-bold transition-all ${
            tab === "penjoki"
              ? "bg-brand text-[#10231a] shadow-[0_8px_20px_-12px_rgba(217,180,95,0.9)]"
              : "border border-line bg-surface-2 text-text-secondary hover:border-brand-border"
          }`}
        >
          Penjoki
        </button>
        <button
          onClick={() => setTab("admin")}
          className={`rounded-full py-2.5 text-[13px] font-bold transition-all ${
            tab === "admin"
              ? "bg-brand text-[#10231a] shadow-[0_8px_20px_-12px_rgba(217,180,95,0.9)]"
              : "border border-line bg-surface-2 text-text-secondary hover:border-brand-border"
          }`}
        >
          Admin CS
        </button>
      </div>

      {tab === "penjoki" ? (
        <>
          {/* Pencarian + filter (mockup) */}
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
            <div className="relative">
              <button
                onClick={() => setFilterOpen((v) => !v)}
                className={`rounded-xl border p-2.5 transition-colors ${
                  statusFilter !== "semua" || (isOwner && teamFilter)
                    ? "border-brand-border bg-brand/15 text-gold"
                    : "border-line bg-surface-2 text-text-secondary hover:text-gold"
                }`}
                aria-label="Filter"
              >
                <FunnelIcon className="h-4.5 w-4.5" />
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full z-20 mt-1.5 w-44 overflow-hidden rounded-xl border border-line bg-surface-2 shadow-xl">
                  <p className="px-3.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-text-muted">
                    Status
                  </p>
                  {(
                    [
                      ["semua", "Semua"],
                      ["aktif", "Aktif"],
                      ["nonaktif", "Nonaktif"],
                    ] as const
                  ).map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => setStatusFilter(v)}
                      className={`block w-full px-3.5 py-2 text-left text-xs font-bold ${
                        statusFilter === v
                          ? "bg-brand/15 text-gold"
                          : "text-text-secondary hover:bg-surface-3"
                      }`}
                    >
                      {l}
                    </button>
                  ))}

                  {isOwner && teams.length > 0 && (
                    <>
                      <p className="border-t border-line-soft px-3.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-text-muted">
                        Tim
                      </p>
                      <button
                        onClick={() => setTeamFilter(null)}
                        className={`block w-full px-3.5 py-2 text-left text-xs font-bold ${
                          !teamFilter
                            ? "bg-brand/15 text-gold"
                            : "text-text-secondary hover:bg-surface-3"
                        }`}
                      >
                        Semua Tim
                      </button>
                      {teams.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTeamFilter(t.id)}
                          className={`block w-full px-3.5 py-2 text-left text-xs font-bold ${
                            teamFilter === t.id
                              ? "bg-brand/15 text-gold"
                              : "text-text-secondary hover:bg-surface-3"
                          }`}
                        >
                          {t.nama}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="hidden shrink-0 sm:block">
              <Button variant="primary" onClick={bukaTambah}>
                <PlusIcon className="h-4 w-4" />
                Tambah Penjoki
              </Button>
            </div>
          </div>

          {/* Statistik ringkas (mockup: Total Penjoki / Aktif / Nonaktif) */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="card-premium rounded-2xl px-3 py-3.5 text-center sm:text-left">
              <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                Total Penjoki
              </p>
              <p className="mt-1.5 font-display text-xl font-extrabold text-text-main tabular">
                {semuaPenjoki.length}
              </p>
            </div>
            <div className="card-premium rounded-2xl border-emerald-400/25 px-3 py-3.5 text-center sm:text-left">
              <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                Aktif
              </p>
              <p className="mt-1.5 font-display text-xl font-extrabold text-emerald-300 tabular">
                {stats.aktif}
              </p>
            </div>
            <div className="card-premium rounded-2xl border-red-400/20 px-3 py-3.5 text-center sm:text-left">
              <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                Nonaktif
              </p>
              <p className="mt-1.5 font-display text-xl font-extrabold text-danger tabular">
                {stats.nonaktif}
              </p>
            </div>
          </div>

          {/* Filter tim lengkap (desktop) */}
          <div className="hidden sm:block">
            {isOwner ? (
              <TeamTabs teams={teams} value={teamFilter} onChange={setTeamFilter} />
            ) : (
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-border bg-brand/10 px-3 py-1 text-[11px] font-bold text-gold">
                📌 {teams.find((t) => t.id === profile?.team_id)?.nama ?? "Tim saya"}
              </span>
            )}
          </div>

          {/* Form tambah / edit */}
          {showForm && (
            <div ref={formRef} className="scroll-mt-24">
              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    {editingId ? "Edit Penjoki" : "Tambah Penjoki Baru"}
                  </p>
                  <Button variant="ghost" onClick={resetForm}>
                    Batal
                  </Button>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nama">
                      <input
                        value={fNama}
                        onChange={(e) => setFNama(e.target.value)}
                        className={inputCls}
                        placeholder="Nama penjoki"
                      />
                    </Field>
                    <Field label="No. WhatsApp">
                      <input
                        value={fWa}
                        onChange={(e) => setFWa(e.target.value)}
                        className={inputCls}
                        placeholder="08xx"
                      />
                    </Field>
                    <Field
                      label="Tim"
                      hint={isOwner ? undefined : "Admin hanya bisa mengelola timnya sendiri."}
                    >
                      <select
                        value={fTim}
                        onChange={(e) => setFTim(e.target.value)}
                        disabled={!isOwner}
                        className={inputCls}
                      >
                        {!isOwner && profile?.team_id && (
                          <option value={profile.team_id}>
                            {teams.find((t) => t.id === profile.team_id)?.nama ?? "Tim saya"}
                          </option>
                        )}
                        {isOwner && <option value="">— Pilih tim —</option>}
                        {isOwner &&
                          teams.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.nama}
                            </option>
                          ))}
                      </select>
                    </Field>
                    <Field label="Rate (0–100)" hint="Kosongkan bila belum tahu.">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={fRating}
                        onChange={(e) => setFRating(e.target.value)}
                        className={inputCls}
                        placeholder="85"
                      />
                    </Field>
                  </div>

                  <Field label="Keahlian" hint="Tekan Enter atau klik + untuk menambah.">
                    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface-2 p-2.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                      {fKeahlian.map((k) => (
                        <span
                          key={k}
                          className="inline-flex items-center gap-1 rounded-full border border-brand-border bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-gold"
                        >
                          {k}
                          <button
                            type="button"
                            onClick={() => removeTag(k)}
                            className="rounded-full p-0.5 hover:bg-brand hover:text-[#10231a]"
                            aria-label={`Hapus keahlian ${k}`}
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        list="saran-kategori-manajemen"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            addTag(tagInput);
                          }
                        }}
                        placeholder={
                          fKeahlian.length === 0 ? "Laporan PKL, PPT, Makalah…" : "Tambah…"
                        }
                        className="min-w-32 flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-text-muted"
                      />
                      <button
                        type="button"
                        onClick={() => addTag(tagInput)}
                        className="rounded-lg bg-brand p-1.5 text-[#10231a] transition-colors hover:bg-brand-hover"
                        aria-label="Tambah keahlian"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                      <datalist id="saran-kategori-manajemen">
                        {kategoriList.map(([k]) => (
                          <option key={k} value={k} />
                        ))}
                      </datalist>
                    </div>
                    {saranKategori.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-text-muted">Saran:</span>
                        {saranKategori.map(([k, n]) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => addTag(k)}
                            className="rounded-full border border-dashed border-line px-2 py-0.5 text-[11px] font-semibold text-text-secondary transition-colors hover:border-brand hover:text-gold"
                          >
                            + {k} <span className="text-text-muted">({n})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </Field>

                  <Field label="Keterangan" hint="Ketersediaan, kelebihan, batasan, dll.">
                    <textarea
                      rows={2}
                      value={fKeterangan}
                      onChange={(e) => setFKeterangan(e.target.value)}
                      className={`${inputCls} resize-y`}
                      placeholder="Fast response, teliti, hanya menerima tenggat H-1…"
                    />
                  </Field>

                  {formError && (
                    <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-semibold text-danger">
                      {formError}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={simpan.isPending}
                      className="w-full sm:w-auto"
                    >
                      {simpan.isPending
                        ? "Menyimpan…"
                        : editingId
                          ? "Simpan Perubahan"
                          : "Simpan Penjoki"}
                    </Button>
                    {editing && (
                      <>
                        <Button
                          variant="ghost"
                          onClick={() => toggleAktif.mutate(editing)}
                        >
                          {editing.aktif ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => {
                            setHapusTarget(editing);
                            setHapusError(null);
                          }}
                        >
                          <TrashIcon className="h-4 w-4" />
                          Hapus
                        </Button>
                      </>
                    )}
                  </div>
                </form>
              </Card>
            </div>
          )}

          {/* Tabel penjoki (desktop) */}
          <Card className="hidden overflow-hidden sm:block">
            {list.length === 0 ? (
              <EmptyState
                title="Tidak ada penjoki"
                hint="Ubah filter, atau tambah penjoki baru."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-surface-2/60 text-left text-[10px] uppercase tracking-wider text-text-muted">
                      <th className="px-4 py-3 font-bold">Nama</th>
                      <th className="px-4 py-3 font-bold">Tim</th>
                      <th className="px-4 py-3 font-bold">Rate</th>
                      <th className="px-4 py-3 font-bold">Keahlian</th>
                      <th className="px-4 py-3 text-center font-bold">Tugas bulan ini</th>
                      <th className="px-4 py-3 font-bold">Status</th>
                      <th className="px-4 py-3 text-right font-bold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-line-soft last:border-0 hover:bg-surface-2/50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-border/60 bg-brand/10 text-xs font-extrabold text-gold">
                              {p.nama.slice(0, 2).toUpperCase()}
                            </span>
                            <div>
                              <p className="font-bold text-text-main">{p.nama}</p>
                              {p.no_hp && (
                                <p className="text-[11px] text-text-muted">{p.no_hp}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs font-bold text-text-secondary">
                          {p.team?.nama ?? "-"}
                        </td>
                        <td className="px-4 py-3">
                          <RateBadge rate={p.rating_skill} />
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className="flex flex-wrap items-center gap-1"
                            title={(p.keahlian ?? []).join(", ")}
                          >
                            {(p.keahlian ?? []).length === 0 ? (
                              <span className="text-xs text-text-muted">—</span>
                            ) : (
                              <>
                                {(p.keahlian ?? []).slice(0, 3).map((k) => (
                                  <span
                                    key={k}
                                    className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-text-secondary"
                                  >
                                    {k}
                                  </span>
                                ))}
                                {(p.keahlian ?? []).length > 3 && (
                                  <span className="rounded-full border border-brand-border bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-gold">
                                    +{(p.keahlian ?? []).length - 3}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-text-main tabular">
                          {tugasBulanIni?.get(p.id) ?? 0}
                        </td>
                        <td className="px-4 py-3">
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
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <Button variant="ghost" onClick={() => mulaiEdit(p)}>
                              <PencilSquareIcon className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" onClick={() => toggleAktif.mutate(p)}>
                              {p.aktif ? "Nonaktifkan" : "Aktifkan"}
                            </Button>
                            <Button
                              variant="danger"
                              onClick={() => {
                                setHapusTarget(p);
                                setHapusError(null);
                              }}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Daftar penjoki (mobile) — mengikuti mockup */}
          <div className="space-y-2 pb-16 sm:hidden">
            {list.length === 0 ? (
              <Card>
                <EmptyState
                  title="Tidak ada penjoki"
                  hint="Ubah filter, atau tambah penjoki baru."
                />
              </Card>
            ) : (
              list.map((p) => (
                <button
                  key={p.id}
                  onClick={() => mulaiEdit(p)}
                  className="card-premium flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:border-brand-border"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-border/60 bg-brand/10 text-[11px] font-extrabold text-gold">
                    {p.nama.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold text-text-main">
                      {p.nama}
                    </span>
                    <span className="block truncate text-[11px] text-text-muted">
                      {p.team?.nama ?? "-"} · Rate {p.rating_skill ?? "—"}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                      p.aktif
                        ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                        : "border-red-400/25 bg-red-400/10 text-danger"
                    }`}
                  >
                    {p.aktif ? "Aktif" : "Nonaktif"}
                  </span>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-text-muted" />
                </button>
              ))
            )}
          </div>

          {/* Tombol tambah mengambang (mobile) */}
          {!showForm && (
            <button
              onClick={bukaTambah}
              className="fixed bottom-24 right-4 z-20 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#cfa84f] via-[#e0bd68] to-[#e9ca7d] px-4 py-3 text-[12px] font-extrabold text-[#12271f] shadow-[0_14px_30px_-12px_rgba(217,180,95,0.9)] sm:hidden"
            >
              <PlusIcon className="h-4 w-4" />
              Tambah Penjoki
            </button>
          )}

          {toggleAktif.isError && (
            <p className="text-sm font-semibold text-danger">
              Gagal menyimpan status: {(toggleAktif.error as Error).message}
            </p>
          )}
        </>
      ) : (
        /* ---------- TAB ADMIN ---------- */
        <div className="space-y-2">
          <p className="px-1 text-[11px] text-text-muted">
            Jabatan tampil di bawah nama admin. Klik untuk membuka ruangan admin
            (pendapatan & rincian per admin).
          </p>

          {daftarAdmin.length === 0 ? (
            <Card>
              <EmptyState
                title="Belum ada admin"
                hint="Akun admin dibuat oleh owner."
              />
            </Card>
          ) : (
            daftarAdmin.map((a) => {
              const sosmed = jenisAdmin(a) === "sosmed";
              return (
                <Link
                  key={a.id}
                  to={`/rekap/${a.id}?tanggal=${yyyyMmDd(new Date())}`}
                  className="group flex items-center gap-3 rounded-2xl border border-line bg-surface/80 px-4 py-3.5 transition-all hover:border-brand-border hover:bg-surface-2"
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                      sosmed
                        ? "border border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-300"
                        : "border border-brand-border/60 bg-brand/10 text-gold"
                    }`}
                  >
                    {namaLengkapAdmin(a).slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-text-main">
                      {namaLengkapAdmin(a)}
                    </p>
                    <p className="text-[11px] font-semibold text-gold/90">
                      {labelJabatan(a)}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-text-muted">
                      {keteranganJabatan(a)}
                    </p>
                    {a.no_hp && (
                      <p className="mt-0.5 text-[11px] text-text-muted">{a.no_hp}</p>
                    )}
                  </div>
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 shrink-0 text-text-muted transition-colors group-hover:text-gold"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                  >
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </Link>
              );
            })
          )}
        </div>
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
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-400/30 bg-red-400/10 text-danger">
                <TrashIcon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-base font-extrabold">Hapus Penjoki?</h3>
                <p className="text-xs text-text-muted">
                  {hapusTarget.nama} · {hapusTarget.team?.nama ?? "-"}
                </p>
              </div>
            </div>

            <p className="text-sm text-text-secondary">
              Data akan dihapus <strong>permanen</strong>. Jumlah tugas terkait:{" "}
              <strong>{tugasBulanIni?.get(hapusTarget.id) ?? 0}</strong>.
              {hapusTarget.aktif &&
                (tugasBulanIni?.get(hapusTarget.id) ?? 0) === 0 &&
                " Pastikan penjoki benar-benar sudah tidak dipakai."}
            </p>

            {hapusError && (
              <p className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-semibold text-danger">
                {hapusError}
              </p>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setHapusTarget(null);
                  setHapusError(null);
                }}
              >
                Batal
              </Button>
              {(tugasBulanIni?.get(hapusTarget.id) ?? 0) === 0 ? (
                <Button
                  variant="danger"
                  disabled={hapus.isPending}
                  onClick={() => hapus.mutate(hapusTarget)}
                >
                  {hapus.isPending ? "Menghapus…" : "Hapus Permanen"}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  disabled={hapusTarget.aktif || toggleAktif.isPending}
                  onClick={() => toggleAktif.mutate(hapusTarget)}
                >
                  Nonaktifkan Saja
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
