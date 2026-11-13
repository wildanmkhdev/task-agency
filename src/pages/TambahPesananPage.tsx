import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useScope } from "../hooks/useScope";
import { kodeTransaksi, rupiah, yyyyMmDd } from "../lib/format";
import { BAGI_HASIL, hitungFee, persen } from "../lib/fee";
import type {
  Customer,
  JenisTugas,
  Penjoki,
  PesananStatus,
  Team,
} from "../lib/types";
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
  /** Status awal — sinkron dengan kategori filter di Daftar Pesanan */
  const [fStatus, setFStatus] = useState<PesananStatus>("MENUNGU");
  const [customerMode, setCustomerMode] = useState<"pilih" | "baru">("pilih");
  const [customerId, setCustomerId] = useState("");
  const [custNama, setCustNama] = useState("");
  const [custWa, setCustWa] = useState("");
  const [jenisId, setJenisId] = useState("");
  const [harga, setHarga] = useState("");
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

  const { data: customerList, isSuccess: customerLoaded } = useQuery({
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

  // Belum ada customer sama sekali → langsung arahkan ke mode "Customer baru"
  // supaya admin/owner tidak bingung melihat dropdown kosong.
  useEffect(() => {
    if (customerLoaded && (customerList?.length ?? 0) === 0)
      setCustomerMode("baru");
  }, [customerLoaded, customerList]);

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

      // Fee dibagi otomatis: penjoki 49% · admin CS 22% · sosmed 6% · owner 20% · kas 3%
      const fee = hitungFee(hargaNum);
      const { error } = await supabase.from("pesanan").insert({
        kode: kodeTransaksi(),
        team_id: scopedTeamId,
        customer_id: custId,
        jenis_tugas_id: jenisId,
        penjoki_id: penjokiId,
        harga: hargaNum,
        fee_admin: fee.feeAdmin,
        fee_owner: fee.feeOwner,
        fee_penjoki: fee.feePenjoki,
        jumlah_keterangan: jumlah.trim(),
        catatan: catatan.trim() || null,
        // Tanggal bisa lampau (backfill rekap) — dilihat semua peran dari kolom ini
        tanggal: tanggalIso,
        status: fStatus,
        // Semua transaksi yang masuk sudah dibayar customer → selalu Lunas
        status_bayar: "LUNAS",
        // Kalau langsung dinyatakan selesai, catat waktu selesai-nya juga
        ...(fStatus === "SELESAI" ? { selesai_at: new Date().toISOString() } : {}),
        dibuat_oleh: profile!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pesanan"] });
      qc.invalidateQueries({ queryKey: ["dashboard-pesanan"] });
      qc.invalidateQueries({ queryKey: ["rekap"] });
      // Customer baru ikut di-invalidate → muncul di dropdown "Customer lama"
      qc.invalidateQueries({ queryKey: ["customer-form"] });
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
              className={`${inputCls} [color-scheme:dark]`}
            />
          </Field>

          {/* Customer */}
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-muted">
              Informasi Customer
            </p>
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => setCustomerMode("pilih")}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                  customerMode === "pilih"
                    ? "border-brand bg-brand text-[#10231a]"
                    : "border-line bg-surface-2 text-text-secondary"
                }`}
              >
                Customer lama
              </button>
              <button
                type="button"
                onClick={() => setCustomerMode("baru")}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                  customerMode === "baru"
                    ? "border-brand bg-brand text-[#10231a]"
                    : "border-line bg-surface-2 text-text-secondary"
                }`}
              >
                Customer baru
              </button>
            </div>
            {customerMode === "pilih" ? (
              <>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className={inputCls}
                  disabled={(customerList?.length ?? 0) === 0}
                >
                  {(customerList?.length ?? 0) === 0 ? (
                    <option>— Belum ada customer, pilih "Customer baru" —</option>
                  ) : (
                    <>
                      <option value="">— Pilih customer —</option>
                      {customerList?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nama} ({c.no_wa})
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {(customerList?.length ?? 0) === 0 && (
                  <p className="mt-1.5 text-xs font-semibold text-text-muted">
                    Customer baru tersimpan otomatis ke tim Anda, lalu bisa dipakai
                    lagi di pesanan berikutnya.
                  </p>
                )}
              </>
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

          {/* Preview fee otomatis (49/22/6/20 + Kas 3% dari harga) */}
          {Number(harga) > 0 && (
            <div className="rounded-xl border border-brand-border bg-brand/10 px-4 py-3 text-sm">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gold">
                Pembagian Fee (otomatis)
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 tabular">
                <span className="text-text-secondary">
                  Penjoki ({persen(BAGI_HASIL.penjoki)}%):{" "}
                  <strong className="text-text-main">
                    {rupiah(hitungFee(Number(harga)).feePenjoki)}
                  </strong>
                </span>
                <span className="text-text-secondary">
                  Admin CS ({persen(BAGI_HASIL.adminCs)}%):{" "}
                  <strong className="text-text-main">
                    {rupiah(hitungFee(Number(harga)).feeAdmin)}
                  </strong>
                </span>
                <span className="text-text-secondary">
                  Admin Sosmed ({persen(BAGI_HASIL.adminSosmed)}%):{" "}
                  <strong className="text-text-main">
                    {rupiah(hitungFee(Number(harga)).feeSosmed)}
                  </strong>
                </span>
                <span className="text-text-secondary">
                  Owner ({persen(BAGI_HASIL.owner)}%):{" "}
                  <strong className="text-text-main">
                    {rupiah(hitungFee(Number(harga)).feeOwner)}
                  </strong>
                </span>
                <span className="text-text-secondary">
                  Kas ({persen(BAGI_HASIL.kas)}%):{" "}
                  <strong className="text-text-main">
                    {rupiah(hitungFee(Number(harga)).feeKas)}
                  </strong>
                </span>
              </div>
            </div>
          )}

          {/* Penjoki */}
          <Field
            label="Penjoki"
            hint={
              penjokiDipilih
                ? `Keahlian: ${(penjokiDipilih.keahlian ?? []).slice(0, 2).join(", ") || "-"}`
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

          {/* Status awal — sinkron dengan kategori filter di Daftar Pesanan */}
          <Field
            label="Status"
            hint={
              fStatus === "SELESAI"
                ? "Langsung dicatat selesai dan masuk rekap."
                : "Default: Menunggu. Bisa diubah sewaktu-waktu di Daftar Transaksi."
            }
          >
            <select
              value={fStatus}
              onChange={(e) => setFStatus(e.target.value as PesananStatus)}
              className={inputCls}
            >
              <option value="MENUNGU">Menunggu</option>
              <option value="DIKERJAKAN">Dikerjakan</option>
              <option value="SELESAI">Selesai</option>
            </select>
          </Field>

          <p className="rounded-xl border border-sky-400/25 bg-sky-400/10 px-4 py-3 text-[11px] leading-relaxed text-sky-200">
            Semua transaksi yang diinput di sini otomatis tercatat{" "}
            <strong className="text-sky-100">sudah dibayar (Lunas)</strong>.
          </p>

          {error && (
            <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-semibold text-danger">
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
