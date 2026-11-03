import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { kodeTransaksi, rupiah, yyyyMmDd } from "../lib/format";
import { hitungFee } from "../lib/fee";
import type {
  Customer,
  JenisTugas,
  Penjoki,
  PesananStatus,
  Profile,
  StatusBayar,
} from "../lib/types";
import { Button, Field, inputCls } from "./ui";

/**
 * Dialog "Tambah Transaksi" — revisi client 3 Nov 2026:
 * "disamping tulisan rincian transaksi tambahkan fitur tambah transaksi,
 *  nanti itu ditulis custom sama adminnya."
 *
 * Hanya tersedia untuk pemilik ruangan (admin yang login) dan tidak untuk
 * admin sosmed (read-only). Fee dihitung otomatis 50/23/7/20.
 */
export function TambahTransaksiModal({
  open,
  onClose,
  admin,
  tanggalAcuan,
}: {
  open: boolean;
  onClose: () => void;
  admin: Profile;
  tanggalAcuan: string;
}) {
  const qc = useQueryClient();

  const [tanggal, setTanggal] = useState(tanggalAcuan);
  const [penjokiId, setPenjokiId] = useState("");
  const [jenisId, setJenisId] = useState("");
  const [harga, setHarga] = useState("");
  const [jumlah, setJumlah] = useState("1 tugas");
  const [catatan, setCatatan] = useState("");
  const [status, setStatus] = useState<PesananStatus>("SELESAI");
  const [statusBayar, setStatusBayar] = useState<StatusBayar>("LUNAS");
  const [customerMode, setCustomerMode] = useState<"pilih" | "baru">("pilih");
  const [customerId, setCustomerId] = useState("");
  const [custNama, setCustNama] = useState("");
  const [custWa, setCustWa] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Sinkronkan tanggal acuan saat dialog dibuka.
  useEffect(() => {
    if (open) {
      setTanggal(tanggalAcuan);
      setError(null);
    }
  }, [open, tanggalAcuan]);

  const teamId = admin.team_id ?? "";

  const { data: penjokiList } = useQuery({
    queryKey: ["penjoki-tambah-transaksi", teamId],
    queryFn: async (): Promise<Penjoki[]> => {
      const { data, error } = await supabase
        .from("penjoki")
        .select("id, nama, no_hp, team_id, keahlian, keterangan, aktif")
        .eq("team_id", teamId)
        .eq("aktif", true)
        .order("nama");
      if (error) throw error;
      return (data ?? []) as unknown as Penjoki[];
    },
    enabled: open && Boolean(teamId),
  });

  const { data: jenisList } = useQuery({
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
    enabled: open,
  });

  const { data: customerList, isSuccess: customerLoaded } = useQuery({
    queryKey: ["customer-tambah-transaksi", teamId],
    queryFn: async (): Promise<Customer[]> => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("team_id", teamId)
        .order("nama")
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: open && Boolean(teamId),
  });

  useEffect(() => {
    if (open && customerLoaded && (customerList?.length ?? 0) === 0) {
      setCustomerMode("baru");
    }
  }, [open, customerLoaded, customerList]);

  const reset = () => {
    setPenjokiId("");
    setJenisId("");
    setHarga("");
    setJumlah("1 tugas");
    setCatatan("");
    setStatus("SELESAI");
    setStatusBayar("LUNAS");
    setCustomerMode("pilih");
    setCustomerId("");
    setCustNama("");
    setCustWa("");
    setError(null);
  };

  const simpan = useMutation({
    mutationFn: async () => {
      if (!teamId) throw new Error("Akun ini belum terhubung ke tim.");
      if (!penjokiId) throw new Error("Penjoki wajib dipilih.");
      if (!jenisId) throw new Error("Jenis tugas wajib dipilih.");
      const nominal = Number(harga);
      if (!Number.isFinite(nominal) || nominal <= 0)
        throw new Error("Nominal tidak valid.");
      if (!jumlah.trim()) throw new Error("Keterangan wajib diisi.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal))
        throw new Error("Tanggal tidak valid.");

      // Customer: pilih yang ada, atau buat baru (kolom customer_id NOT NULL).
      let custId = customerId;
      if (customerMode === "baru") {
        if (!custNama.trim() || !custWa.trim())
          throw new Error("Nama & WhatsApp customer wajib diisi.");
        const { data: cust, error: custErr } = await supabase
          .from("customers")
          .insert({
            nama: custNama.trim(),
            no_wa: custWa.trim(),
            team_id: teamId,
          })
          .select("id")
          .single();
        if (custErr) throw custErr;
        custId = cust.id;
      } else if (!custId) {
        throw new Error("Customer wajib dipilih.");
      }

      const fee = hitungFee(nominal);
      const tanggalIso = new Date(`${tanggal}T00:00:00`).toISOString();

      const { error } = await supabase.from("pesanan").insert({
        kode: kodeTransaksi(),
        team_id: teamId,
        customer_id: custId,
        jenis_tugas_id: jenisId,
        penjoki_id: penjokiId,
        harga: nominal,
        fee_admin: fee.feeAdmin,
        fee_owner: fee.feeOwner,
        fee_penjoki: fee.feePenjoki,
        jumlah_keterangan: jumlah.trim(),
        catatan: catatan.trim() || null,
        tanggal: tanggalIso,
        status,
        status_bayar: statusBayar,
        ...(status === "SELESAI" ? { selesai_at: new Date().toISOString() } : {}),
        dibuat_oleh: admin.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rekap"] });
      qc.invalidateQueries({ queryKey: ["rekap-admin"] });
      qc.invalidateQueries({ queryKey: ["pesanan"] });
      qc.invalidateQueries({ queryKey: ["dashboard-pesanan"] });
      qc.invalidateQueries({ queryKey: ["penjoki-rate"] });
      qc.invalidateQueries({ queryKey: ["penjoki-tugas-bulan-ini"] });
      qc.invalidateQueries({ queryKey: ["customer-form"] });
      qc.invalidateQueries({ queryKey: ["customer-tambah-transaksi"] });
      reset();
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  if (!open) return null;

  const nominalNum = Number(harga);
  const fee = nominalNum > 0 ? hitungFee(nominalNum) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Tambah transaksi"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-extrabold text-text-main">
              Tambah Transaksi
            </h2>
            <p className="text-[11px] text-text-muted">
              Tercatat atas nama <strong className="text-text-secondary">{admin.nama_lengkap}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-line bg-surface-2 p-1.5 text-text-muted hover:text-text-main"
            aria-label="Tutup"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            simpan.mutate();
          }}
          className="space-y-3.5"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tanggal">
              <input
                type="date"
                value={yyyyMmDd(new Date(tanggal))}
                onChange={(e) => setTanggal(e.target.value)}
                className={`${inputCls} [color-scheme:dark]`}
              />
            </Field>
            <Field label="Nominal (Rp)">
              <input
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="200000"
                value={harga}
                onChange={(e) => setHarga(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Penjoki">
            <select
              value={penjokiId}
              onChange={(e) => setPenjokiId(e.target.value)}
              className={inputCls}
            >
              <option value="">— Pilih penjoki —</option>
              {(penjokiList ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama}
                  {p.no_hp ? ` — ${p.no_hp}` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Jenis Tugas">
            <select
              value={jenisId}
              onChange={(e) => setJenisId(e.target.value)}
              className={inputCls}
            >
              <option value="">— Pilih jenis —</option>
              {(jenisList ?? []).map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nama}
                </option>
              ))}
            </select>
          </Field>

          {/* Customer */}
          <div className="rounded-xl border border-line bg-surface-2 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                Customer
              </p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setCustomerMode("pilih")}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                    customerMode === "pilih"
                      ? "border-brand bg-brand text-[#10231a]"
                      : "border-line bg-surface-2 text-text-secondary"
                  }`}
                >
                  Lama
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode("baru")}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                    customerMode === "baru"
                      ? "border-brand bg-brand text-[#10231a]"
                      : "border-line bg-surface-2 text-text-secondary"
                  }`}
                >
                  Baru
                </button>
              </div>
            </div>
            {customerMode === "pilih" ? (
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className={inputCls}
                disabled={(customerList?.length ?? 0) === 0}
              >
                {(customerList?.length ?? 0) === 0 ? (
                  <option>— Belum ada customer —</option>
                ) : (
                  <>
                    <option value="">— Pilih customer —</option>
                    {(customerList ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nama} ({c.no_wa})
                      </option>
                    ))}
                  </>
                )}
              </select>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
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

          <Field label="Keterangan">
            <input
              placeholder="Contoh: 1 laporan PKL"
              value={jumlah}
              onChange={(e) => setJumlah(e.target.value)}
              className={inputCls}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Status Tugas">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PesananStatus)}
                className={inputCls}
              >
                <option value="SELESAI">Selesai</option>
                <option value="DIKERJAKAN">Dikerjakan</option>
                <option value="MENUNGU">Menunggu</option>
                <option value="BATAL">Batal</option>
              </select>
            </Field>
            <Field label="Status Bayar">
              <select
                value={statusBayar}
                onChange={(e) => setStatusBayar(e.target.value as StatusBayar)}
                className={inputCls}
              >
                <option value="LUNAS">Lunas</option>
                <option value="CICIL">Cicil</option>
                <option value="BELUM">Belum Bayar</option>
              </select>
            </Field>
          </div>

          <input
            placeholder="Catatan (opsional)"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            className={inputCls}
          />

          {fee && (
            <div className="rounded-xl border border-brand-border bg-brand/10 px-3.5 py-2.5 text-[11px] tabular">
              <p className="mb-1 font-bold uppercase tracking-wide text-gold">
                Fee otomatis
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-text-secondary">
                <span>Penjoki 50%: <strong className="text-text-main">{rupiah(fee.feePenjoki)}</strong></span>
                <span>Admin CS 23%: <strong className="text-text-main">{rupiah(fee.feeAdmin)}</strong></span>
                <span>Sosmed 7%: <strong className="text-text-main">{rupiah(fee.feeSosmed)}</strong></span>
                <span>Owner 20%: <strong className="text-text-main">{rupiah(fee.feeOwner)}</strong></span>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3.5 py-2.5 text-xs font-semibold text-danger">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" onClick={onClose} className="flex-1">
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={simpan.isPending} className="flex-1">
              {simpan.isPending ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
