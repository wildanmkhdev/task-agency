import { useMemo, useRef, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useScope } from "../hooks/useScope";
import type { Penjoki as PenjokiRow } from "../lib/types";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Spinner,
  StatCard,
  TeamTabs,
  inputCls,
} from "../components/ui";
import {
  CheckCircleIcon,
  PencilSquareIcon,
  PlusIcon,
  StarIcon,
  TagIcon,
  TrashIcon,
  UsersIcon,
  XMarkIcon,
} from "../components/icons";

/**
 * Manajemen Penjoki — KHUSUS OWNER (menu sidebar khusus).
 * Fitur: tambah, edit, hapus (permanen), nonaktifkan, rating skill,
 * kategori/keahlian (chips + rename massal), keterangan, filter tim & kategori.
 *
 * Enforce: guard `isOwner` di bawah + RLS database (hapus = hanya owner).
 * Hapus permanen diblokir bila penjoki punya riwayat pesanan (FK RESTRICT) —
 * disarankan pakai Nonaktifkan.
 */
export function PenjokiManajemenPage() {
  const { isOwner, teams, teamFilter, setTeamFilter } = useScope();
  const qc = useQueryClient();
  const formRef = useRef<HTMLDivElement>(null);

  // Filter
  const [cari, setCari] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

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
    queryKey: ["penjoki-manajemen", teamFilter],
    queryFn: async (): Promise<PenjokiRow[]> => {
      let q = supabase.from("penjoki").select("*, team:teams(nama)").order("nama");
      if (teamFilter) q = q.eq("team_id", teamFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Jumlah pesanan per penjoki (untuk pengaman hapus — lihat catatan FK)
  const { data: pesananCounts } = useQuery({
    queryKey: ["penjoki-pesanan-count"],
    queryFn: async (): Promise<Map<string, number>> => {
      // NOTE: PostgREST membatasi baris per request (default 1000 di Supabase);
      // bila riwayat pesanan sudah besar, ganti dengan RPC agregat di server.
      const { data, error } = await supabase.from("pesanan").select("penjoki_id");
      if (error) throw error;
      const m = new Map<string, number>();
      for (const r of data ?? []) m.set(r.penjoki_id, (m.get(r.penjoki_id) ?? 0) + 1);
      return m;
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
    const terisi = semuaPenjoki.filter((p) => p.rating_skill != null);
    const avg =
      terisi.length > 0
        ? Math.round(
            (terisi.reduce((s, p) => s + (p.rating_skill ?? 0), 0) / terisi.length) * 10
          ) / 10
        : null;
    return { aktif, avg };
  }, [semuaPenjoki]);

  const list = semuaPenjoki.filter((p) => {
    if (cari && !p.nama.toLowerCase().includes(cari.toLowerCase())) return false;
    if (
      kategoriFilter &&
      !(p.keahlian ?? []).some((k) => k.toLowerCase() === kategoriFilter.toLowerCase())
    )
      return false;
    return true;
  });

  // ---- Mutasi ----
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["penjoki-manajemen"] });
    qc.invalidateQueries({ queryKey: ["penjoki"] });
    qc.invalidateQueries({ queryKey: ["penjoki-pesanan-count"] });
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
    setFTim(teams[0]?.id ?? "");
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
      if (!fTim) throw new Error("Tim wajib dipilih.");
      let rating: number | null = null;
      if (fRating.trim()) {
        rating = Number(fRating);
        if (!Number.isFinite(rating) || rating < 0 || rating > 100)
          throw new Error("Rating skill harus antara 0–100.");
      }
      const payload = {
        nama,
        no_hp: fWa.trim() || null,
        team_id: fTim,
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
        // FK RESTRICT: penjoki masih punya riwayat pesanan
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

  const renameKategori = useMutation({
    mutationFn: async () => {
      const asal = kategoriFilter;
      const baru = renameValue.trim();
      if (!asal) throw new Error("Pilih kategori dulu.");
      if (!baru) throw new Error("Nama kategori baru wajib diisi.");
      if (baru.toLowerCase() === asal.toLowerCase())
        throw new Error("Nama baru sama dengan kategori asal.");
      const target = semuaPenjoki.filter((p) =>
        (p.keahlian ?? []).some((k) => k.toLowerCase() === asal.toLowerCase())
      );
      if (target.length === 0) throw new Error("Tidak ada penjoki dengan kategori ini.");
      const results = await Promise.all(
        target.map((p) => {
          const keahlian = (p.keahlian ?? []).map((k) =>
            k.toLowerCase() === asal.toLowerCase() ? baru : k
          );
          return supabase.from("penjoki").update({ keahlian }).eq("id", p.id);
        })
      );
      const gagal = results.find((r) => r.error);
      if (gagal) throw new Error(gagal.error?.message ?? "Gagal rename kategori.");
    },
    onSuccess: () => {
      setKategoriFilter(null);
      setRenameValue("");
      setRenameError(null);
      invalidate();
    },
    onError: (e) => setRenameError((e as Error).message),
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

  // Guard: halaman ini khusus owner (RLS juga membatasi di database)
  if (!isOwner) return <Navigate to="/penjoki" replace />;
  if (isLoading) return <Spinner label="Memuat data penjoki…" />;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    simpan.mutate();
  };

  const saranKategori = kategoriList
    .filter(
      ([k]) => !fKeahlian.some((x) => x.toLowerCase() === k.toLowerCase())
    )
    .slice(0, 8);

  return (
    <div className="space-y-5">
      {/* Header + aksi utama */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-text-secondary">
          Kelola data penjoki: <strong>tambah, edit, hapus, rating, kategori</strong>,
          dan keterangan. Menu ini <strong>khusus Owner</strong> — admin tim hanya bisa
          melihat di halaman Penjoki &amp; Rate.
        </p>
        <Button variant="primary" onClick={bukaTambah}>
          <PlusIcon className="h-4 w-4" />
          Tambah Penjoki
        </Button>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Penjoki"
          value={String(semuaPenjoki.length)}
          sub={`${stats.aktif} aktif · ${semuaPenjoki.length - stats.aktif} nonaktif`}
          icon={<UsersIcon className="h-6 w-6" />}
          accent="navy"
        />
        <StatCard
          label="Penjoki Aktif"
          value={String(stats.aktif)}
          sub="siap menerima job"
          icon={<CheckCircleIcon className="h-6 w-6" />}
          accent="success"
        />
        <StatCard
          label="Rata-rata Rating"
          value={stats.avg != null ? String(stats.avg) : "—"}
          sub="rating skill 0–100"
          icon={<StarIcon className="h-6 w-6" />}
          accent="brand"
        />
        <StatCard
          label="Kategori Keahlian"
          value={String(kategoriList.length)}
          sub="kategori unik terdaftar"
          icon={<TagIcon className="h-6 w-6" />}
          accent="warning"
        />
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
                <Field label="Tim">
                  <select
                    value={fTim}
                    onChange={(e) => setFTim(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">— Pilih tim —</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nama}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Rating Skill (0–100)" hint="Kosongkan bila belum tahu.">
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

              {/* Kategori / keahlian — chip input */}
              <Field label="Kategori / Keahlian" hint="Tekan Enter atau klik + untuk menambah.">
                <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                  {fKeahlian.map((k) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1 rounded-full border border-brand-border bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand"
                    >
                      {k}
                      <button
                        type="button"
                        onClick={() => removeTag(k)}
                        className="rounded-full p-0.5 hover:bg-brand hover:text-white"
                        aria-label={`Hapus kategori ${k}`}
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
                    className="rounded-lg bg-brand p-1.5 text-white transition-colors hover:bg-brand-hover"
                    aria-label="Tambah kategori"
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
                        className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[11px] font-semibold text-text-secondary transition-colors hover:border-brand hover:text-brand"
                      >
                        + {k} <span className="text-text-muted">({n})</span>
                      </button>
                    ))}
                  </div>
                )}
              </Field>

              <Field
                label="Keterangan"
                hint="Ketersediaan, kelebihan, batasan, dll. — tampil di tabel."
              >
                <textarea
                  rows={2}
                  value={fKeterangan}
                  onChange={(e) => setFKeterangan(e.target.value)}
                  className={`${inputCls} resize-y`}
                  placeholder="Fast response, teliti, hanya menerima tenggat H-1…"
                />
              </Field>

              {formError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-danger">
                  {formError}
                </p>
              )}

              <Button
                type="submit"
                variant="success"
                disabled={simpan.isPending}
                className="w-full sm:w-auto"
              >
                {simpan.isPending
                  ? "Menyimpan…"
                  : editingId
                    ? "Simpan Perubahan"
                    : "Simpan Penjoki"}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* Panel kategori + rename massal */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <TagIcon className="h-5 w-5 text-brand" />
          <div>
            <h3 className="font-display text-sm font-extrabold text-text-main">
              Kategori Keahlian
            </h3>
            <p className="text-xs text-text-muted">
              Klik untuk filter — {kategoriList.length} kategori unik
            </p>
          </div>
        </div>

        {kategoriList.length === 0 ? (
          <EmptyState title="Belum ada kategori" hint="Tambahkan saat membuat/edit penjoki." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {kategoriList.map(([k, n]) => {
              const active = kategoriFilter === k;
              return (
                <button
                  key={k}
                  onClick={() => {
                    setKategoriFilter(active ? null : k);
                    setRenameValue(active ? "" : k);
                    setRenameError(null);
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-bold transition-all ${
                    active
                      ? "border-brand bg-brand text-white"
                      : "border-slate-200 bg-white text-text-secondary hover:border-brand hover:text-brand"
                  }`}
                >
                  {k} <span className={active ? "text-sky-100" : "text-text-muted"}>×{n}</span>
                </button>
              );
            })}
          </div>
        )}

        {kategoriFilter && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-bg-main p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">
              Rename kategori “{kategoriFilter}” di semua penjoki
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className={`${inputCls} w-full max-w-xs`}
                placeholder="Nama kategori baru"
              />
              <Button
                variant="primary"
                disabled={renameKategori.isPending}
                onClick={() => renameKategori.mutate()}
              >
                {renameKategori.isPending ? "Mengganti…" : "Ganti Nama"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setKategoriFilter(null);
                  setRenameValue("");
                  setRenameError(null);
                }}
              >
                Batal
              </Button>
            </div>
            {(renameError || renameKategori.isError) && (
              <p className="mt-2 text-sm font-semibold text-danger">
                {renameError ??
                  (renameKategori.error as Error | null)?.message ??
                  "Gagal rename."}
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Filter tim + cari */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TeamTabs teams={teams} value={teamFilter} onChange={setTeamFilter} />
        <input
          placeholder="Cari nama penjoki…"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          className={`${inputCls} w-full max-w-xs`}
        />
      </div>

      {/* Tabel */}
      <Card className="overflow-hidden">
        {list.length === 0 ? (
          <EmptyState
            title="Tidak ada penjoki"
            hint="Ubah filter, atau tambah penjoki baru."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-bg-main text-left text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-5 py-3 font-bold">Nama Penjoki</th>
                  <th className="px-5 py-3 font-bold">Tim</th>
                  <th className="px-5 py-3 font-bold">Kategori</th>
                  <th className="px-5 py-3 text-center font-bold">Rating</th>
                  <th className="px-5 py-3 font-bold">Keterangan</th>
                  <th className="px-5 py-3 text-center font-bold">Pesanan</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 text-right font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-bg-main"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-extrabold text-white">
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
                    <td className="px-5 py-3 text-xs font-bold text-text-secondary">
                      {p.team?.nama ?? "-"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex max-w-56 flex-wrap gap-1">
                        {(p.keahlian ?? []).length === 0 ? (
                          <span className="text-xs text-text-muted">—</span>
                        ) : (
                          (p.keahlian ?? []).map((k) => (
                            <span
                              key={k}
                              className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-text-secondary"
                            >
                              {k}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center gap-1 font-bold tabular-nums text-text-main">
                        <StarIcon className="h-4 w-4 text-warning" />
                        {p.rating_skill ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <p
                        className="max-w-52 truncate text-xs text-text-secondary"
                        title={p.keterangan ?? ""}
                      >
                        {p.keterangan ?? "—"}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-center font-semibold tabular-nums">
                      {pesananCounts?.get(p.id) ?? 0}
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
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => mulaiEdit(p)}>
                          <PencilSquareIcon className="h-4 w-4" />
                          Edit
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

      {toggleAktif.isError && (
        <p className="text-sm font-semibold text-danger">
          Gagal menyimpan status: {(toggleAktif.error as Error).message}
        </p>
      )}

      {/* Dialog hapus */}
      {hapusTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-text-main/60"
            onClick={() => {
              setHapusTarget(null);
              setHapusError(null);
            }}
          />
          <Card className="relative w-full max-w-md p-6">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-danger">
                <TrashIcon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-base font-extrabold">
                  Hapus Penjoki?
                </h3>
                <p className="text-xs text-text-muted">
                  {hapusTarget.nama} · {hapusTarget.team?.nama ?? "-"}
                </p>
              </div>
            </div>

            <p className="text-sm text-text-secondary">
              Data akan dihapus <strong>permanen</strong>. Jumlah pesanan terkait:{" "}
              <strong>{pesananCounts?.get(hapusTarget.id) ?? 0}</strong>.
              {hapusTarget.aktif &&
                (pesananCounts?.get(hapusTarget.id) ?? 0) === 0 &&
                " Pastikan penjoki benar-benar sudah tidak dipakai."}
            </p>

            {hapusError && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-danger">
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
              {(pesananCounts?.get(hapusTarget.id) ?? 0) === 0 ? (
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
