import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { kodeTransaksi, rupiah } from "../lib/format";
import { hitungFee } from "../lib/fee";
import type { JenisTugas, Penjoki, Profile } from "../lib/types";
import { Button, Field, inputCls } from "./ui";

/**
 * Dialog "Tambah Transaksi" — revisi client 3 Nov 2026:
 * Simplified: cuma input Tanggal, Penjoki, Jenis Tugas (+ Custom), Nominal.
 * Status otomatis SELESAI + LUNAS (customer udah payment).
 * Fee dihitung otomatis 50/23/7/20.
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
  const [jenisCustom, setJenisCustom] = useState("");
  const [nominal, setNominal] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset form saat dialog dibuka
  useEffect(() => {
    if (open) {
      setTanggal(tanggalAcuan);
      setPenjokiId("");
      setJenisId("");
      setJenisCustom("");
      setNominal("");
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

  const simpan = useMutation({
    mutationFn: async () => {
      if (!teamId) throw new Error("Akun ini belum terhubung ke tim.");
      if (!penjokiId) throw new Error("Penjoki wajib dipilih.");
      
      // Validasi jenis tugas: pilih dari list atau custom
      let finalJenisId = jenisId;
      if (jenisId === "custom") {
        if (!jenisCustom.trim()) throw new Error("Jenis tugas custom wajib diisi.");
        // Buat jenis tugas baru on-the-fly
        const { data: newJenis, error: jenisErr } = await supabase
          .from("jenis_tugas")
          .insert({ nama: jenisCustom.trim(), aktif: true })
          .select("id")
          .single();
        if (jenisErr) throw jenisErr;
        finalJenisId = newJenis.id;
      } else if (!jenisId) {
        throw new Error("Jenis tugas wajib dipilih.");
      }

      const nominalNum = Number(nominal);
      if (!Number.isFinite(nominalNum) || nominalNum <= 0)
        throw new Error("Nominal tidak valid.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal))
        throw new Error("Tanggal tidak valid.");

      const fee = hitungFee(nominalNum);
      const tanggalIso = new Date(`${tanggal}T00:00:00`).toISOString();

      const { error } = await supabase.from("pesanan").insert({
        kode: kodeTransaksi(),
        team_id: teamId,
        customer_id: null, // Customer ga perlu
        jenis_tugas_id: finalJenisId,
        penjoki_id: penjokiId,
        harga: nominalNum,
        fee_admin: fee.feeAdmin,
        fee_owner: fee.feeOwner,
        fee_penjoki: fee.feePenjoki,
        jumlah_keterangan: "1 tugas",
        catatan: null,
        tanggal: tanggalIso,
        status: "SELESAI", // Auto SELESAI
        status_bayar: "LUNAS", // Auto LUNAS (customer udah bayar)
        selesai_at: new Date().toISOString(),
        dibuat_oleh: admin.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rekap"] });
      qc.invalidateQueries({ queryKey: ["rekap-admin"] });
      qc.invalidateQueries({ queryKey: ["rekap-admin-pembanding"] });
      qc.invalidateQueries({ queryKey: ["pesanan"] });
      qc.invalidateQueries({ queryKey: ["dashboard-pesanan"] });
      qc.invalidateQueries({ queryKey: ["penjoki-rate"] });
      qc.invalidateQueries({ queryKey: ["penjoki-tugas-bulan-ini"] });
      qc.invalidateQueries({ queryKey: ["jenis-tugas"] });
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  if (!open) return null;

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
          <Field label="Tanggal">
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className={`${inputCls} [color-scheme:dark]`}
              required
            />
          </Field>

          <Field label="Penjoki">
            <select
              value={penjokiId}
              onChange={(e) => setPenjokiId(e.target.value)}
              className={inputCls}
              required
            >
              <option value="">— Pilih penjoki —</option>
              {(penjokiList ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Jenis Tugas">
            <select
              value={jenisId}
              onChange={(e) => {
                setJenisId(e.target.value);
                if (e.target.value !== "custom") setJenisCustom("");
              }}
              className={inputCls}
              required
            >
              <option value="">— Pilih jenis —</option>
              {(jenisList ?? []).map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nama}
                </option>
              ))}
              <option value="custom">Lainnya</option>
            </select>
          </Field>

          {jenisId === "custom" && (
            <Field label="Tulis Jenis Tugas">
              <input
                type="text"
                placeholder="Tulis jenis tugas..."
                value={jenisCustom}
                onChange={(e) => setJenisCustom(e.target.value)}
                className={inputCls}
                required
              />
            </Field>
          )}

          <Field label="Nominal (Rp)">
            <input
              type="number"
              min={1}
              step="1"
              inputMode="numeric"
              placeholder="200000"
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
              className={inputCls}
              required
            />
          </Field>

          {/* Preview Fee */}
          {Number(nominal) > 0 && (
            <div className="rounded-xl border border-line bg-surface-2 p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-text-muted">
                Rincian Fee
              </p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Penjoki (50%)</span>
                  <span className="font-bold text-text-main tabular">
                    {rupiah(hitungFee(Number(nominal)).feePenjoki)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Admin CS (23%)</span>
                  <span className="font-bold text-text-main tabular">
                    {rupiah(hitungFee(Number(nominal)).feeAdmin)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Admin Sosmed (7%)</span>
                  <span className="font-bold text-text-main tabular">
                    {rupiah(hitungFee(Number(nominal)).feeSosmed)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Owner (20%)</span>
                  <span className="font-bold text-text-main tabular">
                    {rupiah(hitungFee(Number(nominal)).feeOwner)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3.5 py-3 text-[12px] font-semibold text-danger">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={simpan.isPending}
              className="flex-1"
            >
              {simpan.isPending ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
