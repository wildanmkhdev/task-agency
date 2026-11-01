import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useScope } from "../hooks/useScope";
import { kodeTransaksi, rupiah, yyyyMmDd } from "../lib/format";
import { hitungFee } from "../lib/fee";
import type { Customer, JenisTugas, Penjoki, Team } from "../lib/types";
import { Button, Card, Field, Spinner, inputCls } from "../components/ui";

/**
 * Form Tambah Pesanan (mockup biru layar 3).
 * - Admin: tim terkunci = timnya sendiri.
 * - Owner: memilih tim untuk pesanan ini.
 * - Tanggal bisa dipilih (boleh lampau) — untuk input ulang / rekap telat.
 *   Disimpan ke kolom `tanggal` yang sama → terlihat identik di Rekap
 *   Harian & Daftar Pesanan untuk owner maupun semua admin (satu data).
 */
export function TambahPesananPage() {
  const { profile } = useAuth();
  const { isOwner, teams, applyScope } = useScope();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [teamId, setTeamId] = useState<string>(
    !isOwner ? (profile?.team_id ?? "") : (teams[0]?.id ?? "")
  );
  /** Tanggal pesanan — default hari ini, boleh dipilih lampau (backfill rekap) */
  const [tanggal, setTanggal] = useState<string>(yyyyMmDd(new Date()));
  const [customerMode, setCustomerMode] = useState<"pilih" | "baru">("pilih");
  const [customerId, setCustomerId] = useState("");
  const [custNama, setCustNama] = useState("");
  const [custWa, setCustWa] = useState("");
  const [jenisId, setJenisId] = useState("");
  const [harga, setHarga] = useState("");
  /** Fee admin — diisi manual oleh OWNER (D5), bukan formula */
  const [feeAdminManual, setFeeAdminManual] = useState("");
  const [penjokiId, setPenjokiId] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [catatan, setCatatan] = useState("");
  const [error, setError] = useState<string | null>(null);

  const scopedTeamId = !isOwner ? (profile?.team_id ?? null) : teamId || null;

  const { data: jenisTugas, isLoading: loadingJenis } = useQuery({
    queryKey: ["jenis-tugas"],
    queryFn: async (): Promise<JenisTugas[]> => {
      const { data, error } = await supabase
        .from("jenis_tugas")
        .select("*")
        .eq("aktif", true)
        .order("nama");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: penjokiList, isLoading: loadingPenjoki } = useQuery({
    queryKey: ["penjoki-form", scopedTeamId],
    queryFn: async (): Promise<Penjoki[]> => {
      let q = supabase
        .from("penjoki")
        .select("*")
        .eq("aktif", true)
        .order("nama");
      q = applyScope(q as never) as typeof q;
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(scopedTeamId),
  });

  const { data: customerList } = useQuery({
    queryKey: ["customer-form", scopedTeamId],
    queryFn: async (): Promise<Customer[]> => {
      let q = supabase.from("customers").select("*").order("nama").limit(100);
      q = applyScope(q as never) as typeof q;
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(scopedTeamId),
  });

  const simpan = useMutation({
    mutationFn: async () => {
      if (!scopedTeamId) throw new Error("Tim belum dipilih.");
      if (!jenisId) throw new Error("Jenis tugas wajib dipilih.");
      if (!penjokiId) throw new Error("Penjoki wajib dipilih.");
      const hargaNum = Number(harga);
      if (!Number.isFinite(hargaNum) || hargaNum <= 0) throw new Error("Harga tidak valid.");
      if (!jumlah.trim()) throw new Error("Jumlah/keterangan wajib diisi.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new Error("Tanggal tidak valid.");
      // Tengah malam waktu lokal → konsisten dengan filter Rekap Harian (lihat catatan TZ)
      const tanggalIso = new Date(`${tanggal}T00:00:00`).toISOString();

      // Customer: pilih existing atau buat baru
      let custId = customerId;
      if (customerMode === "baru") {
        if (!custNama.trim() || !custWa.trim())
          throw new Error("Nama & WhatsApp customer wajib diisi.");
        const { data: cust, error: custErr } = await supabase
          .from("customers")
          .insert({ nama: custNama.trim(), no_wa: custWa.trim(), team_id: scopedTeamId })
          .select("id")
          .single();
        if (custErr) throw custErr;
        custId = cust.id;
      } else {
        if (!custId) throw new Error("Customer wajib dipilih.");
      }

      // Fee admin manual (khusus owner, D5) — validasi angka
      let feeAdminManualNum = 0;
      if (isOwner && feeAdminManual.trim()) {
        feeAdminManualNum = Number(feeAdminManual);
        if (!Number.isFinite(feeAdminManualNum) || feeAdminManualNum < 0)
          throw new Error("Fee admin tidak valid (harus angka ≥ 0).");
        if (feeAdminManualNum > hargaNum)
          throw new Error("Fee admin melebihi harga customer.");
      }

      const { feeOwner, feePenjoki } = hitungFee(hargaNum);
      const { error } = await supabase.from("pesanan").insert({
        kode: kodeTransaksi(),
        team_id: scopedTeamId,
        customer_id: custId,
        jenis_tugas_id: jenisId,
        penjoki_id: penjokiId,
        harga: hargaNum,
        // D5 final: penjoki 50% + owner 50% (otomatis); fee admin = manual owner
        fee_admin: feeAdminManualNum,
        fee_owner: feeOwner,
        fee_penjoki: feePenjoki,
        jumlah_keterangan: jumlah.trim(),
        catatan: catatan.trim() || null,
        // Tanggal bisa lampau (backfill rekap) — dilihat semua peran dari kolom ini
        tanggal: tanggalIso,
        status: "MENUNGU",
        dibuat_oleh: profile!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pesanan"] });
      qc.invalidateQueries({ queryKey: ["dashboard-pesanan"] });
      qc.invalidateQueries({ queryKey: ["rekap"] });
      navigate("/pesanan");
    },
    onError: (e) => setError((e as Error).message),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    simpan.mutate();
  };

  if (loadingJenis || loadingPenjoki) return <Spinner label="Memuat form…" />;

  const penjokiDipilih = penjokiList?.find((p) => p.id === penjokiId);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-border bg-brand-soft text-lg">
            📝
          </span>
          <div>
            <h2 className="font-display text-lg font-extrabold">Tambah Pesanan</h2>
            <p className="text-xs text-text-muted">
              Pastikan semua data diisi dengan benar.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Tim (owner only) */}
          {isOwner && (
            <Field label="Tim">
              <select
                value={teamId}
                onChange={(e) => {
                  setTeamId(e.target.value);
                  setCustomerId("");
                  setPenjokiId("");
                }}
                className={inputCls}
              >
                {teams.map((t: Team) => (
                  <option key={t.id} value={t.id}>
                    {t.nama}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {/* Tanggal pesanan — boleh lampau untuk input/rekap ulang */}
          <Field
            label="Tanggal Pesanan"
            hint="Boleh pilih tanggal lampau — data langsung masuk rekap hari itu (terlihat sama untuk owner & admin)."
          >
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className={inputCls}
            />
          </Field>

          {/* Customer */}
          <div className="rounded-xl border border-slate-200 bg-bg-main p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-muted">
              Informasi Customer
            </p>
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => setCustomerMode("pilih")}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                  customerMode === "pilih"
                    ? "border-text-main bg-text-main text-white"
                    : "border-slate-200 bg-white text-text-secondary"
                }`}
              >
                Customer lama
              </button>
              <button
                type="button"
                onClick={() => setCustomerMode("baru")}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                  customerMode === "baru"
                    ? "border-text-main bg-text-main text-white"
                    : "border-slate-200 bg-white text-text-secondary"
                }`}
              >
                Customer baru
              </button>
            </div>
            {customerMode === "pilih" ? (
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className={inputCls}
              >
                <option value="">— Pilih customer —</option>
                {customerList?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nama} ({c.no_wa})
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  placeholder="Nama customer"
                  value={custNama}
                  onChange={(e) => setCustNama(e.target.value)}
                  className={inputCls}
                />
                <input
                  placeholder="No. WhatsApp"
                  value={custWa}
                  onChange={(e) => setCustWa(e.target.value)}
                  className={inputCls}
                />
              </div>
            )}
          </div>

          {/* Jenis + harga */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jenis Tugas">
              <select
                value={jenisId}
                onChange={(e) => setJenisId(e.target.value)}
                className={inputCls}
              >
                <option value="">— Pilih jenis —</option>
                {jenisTugas?.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nama}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Harga (Rp)">
              <input
                type="number"
                min={0}
                placeholder="200000"
                value={harga}
                onChange={(e) => setHarga(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          {/* Preview fee otomatis (D5: 50% penjoki + 50% owner) */}
          {Number(harga) > 0 && (
            <div className="rounded-xl border border-brand-border bg-brand-soft px-4 py-3 text-sm">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-brand">
                Pembagian Fee (otomatis)
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 tabular-nums">
                <span className="text-text-secondary">
                  Penjoki (50%):{" "}
                  <strong className="text-text-main">
                    {rupiah(hitungFee(Number(harga)).feePenjoki)}
                  </strong>
                </span>
                <span className="text-text-secondary">
                  Owner (50%):{" "}
                  <strong className="text-text-main">
                    {rupiah(hitungFee(Number(harga)).feeOwner)}
                  </strong>
                </span>
              </div>
            </div>
          )}

          {/* Fee admin manual — hanya owner yang mengisi (D5) */}
          {isOwner && (
            <Field
              label="Fee Admin (Rp) — isi manual"
              hint="Owner menghitung sendiri; kosongkan bila tidak ada. Tidak ikut hitungan 50/50."
            >
              <input
                type="number"
                min={0}
                placeholder="0"
                value={feeAdminManual}
                onChange={(e) => setFeeAdminManual(e.target.value)}
                className={inputCls}
              />
            </Field>
          )}

          {/* Penjoki */}
          <Field
            label="Penjoki"
            hint={
              penjokiDipilih
                ? `Rating skill: ${penjokiDipilih.rating_skill ?? "-"}`
                : "Pilih penjoki sesuai keahlian & ketersediaan."
            }
          >
            <select
              value={penjokiId}
              onChange={(e) => setPenjokiId(e.target.value)}
              className={inputCls}
            >
              <option value="">— Pilih penjoki —</option>
              {penjokiList?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama} — {p.keahlian?.slice(0, 2).join(", ") ?? "-"}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Jumlah / Keterangan">
            <input
              placeholder="Contoh: 1 laporan PKL, 12 halaman"
              value={jumlah}
              onChange={(e) => setJumlah(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Catatan (opsional)">
            <input
              placeholder="Contoh: deadline 3 hari, minta hasil rapi"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className={inputCls}
            />
          </Field>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-danger">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" disabled={simpan.isPending} className="w-full py-3">
            {simpan.isPending ? "Menyimpan…" : "Simpan Pesanan"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
