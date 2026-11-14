import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { kodeTransaksi, rupiah, tanggalDb, yyyyMmDd } from "../lib/format";
import { BAGI_HASIL, hitungFee, persen } from "../lib/fee";
import { invalidateTransaksi } from "../lib/invalidate";
import type { JenisTugas, Penjoki, Pesanan, Profile } from "../lib/types";
import { Button, Field, inputCls } from "./ui";

/**
 * Dialog "Tambah / Edit Transaksi" — revisi client 6 Nov 2026:
 * Simplified: input Tanggal, Penjoki (+ asal tim), Jenis Tugas (+ Custom),
 * Nominal, Rating kualitas 1–5 (opsional), dan Catatan bebas.
 * Status otomatis SELESAI + LUNAS (customer udah payment).
 * Fee dihitung otomatis 49/22/6/20 + Kas 3%.
 *
 * Bila `pesanan` diisi, dialog masuk mode edit: field di-prefill dan
 * perubahan disimpan lewat UPDATE (status/kode tidak diubah).
 */
export function TambahTransaksiModal({
  open,
  onClose,
  admin,
  tanggalAcuan,
  pesanan = null,
}: {
  open: boolean;
  onClose: () => void;
  admin: Profile;
  tanggalAcuan: string;
  pesanan?: Pesanan | null;
}) {
  const modeEdit = Boolean(pesanan);
  const qc = useQueryClient();

  const [tanggal, setTanggal] = useState(tanggalAcuan);
  const [penjokiId, setPenjokiId] = useState("");
  const [jenisId, setJenisId] = useState("");
  const [jenisCustom, setJenisCustom] = useState("");
  const [nominal, setNominal] = useState("");
  /** Rating kualitas 1–5 ("" = belum dinilai). */
  const [rating, setRating] = useState("");
  const [catatan, setCatatan] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isOwner = admin.role === "OWNER";

  // Reset/prefill form saat dialog dibuka
  useEffect(() => {
    if (open) {
      setTanggal(
        pesanan ? yyyyMmDd(new Date(pesanan.tanggal)) : tanggalAcuan
      );
      setPenjokiId(pesanan?.penjoki_id ?? "");
      setJenisId(pesanan?.jenis_tugas_id ?? "");
      setJenisCustom("");
      setNominal(pesanan ? String(pesanan.harga) : "");
      setRating(pesanan?.rating != null ? String(pesanan.rating) : "");
      setCatatan(pesanan?.catatan ?? "");
      setError(null);
    }
  }, [open, tanggalAcuan, pesanan]);

  // Semua admin boleh memilih penjoki dari tim mana pun (revisi 11 Nov 2026).
  // Tim transaksi tetap milik admin yang menginput agar rekap & fee timnya benar;
  // owner mengikuti tim penjoki yang dipilih.
  const teamId = pesanan?.team_id ?? admin.team_id ?? "";

  const { data: penjokiList } = useQuery({
    queryKey: [
      "penjoki-tambah-transaksi",
      "semua",
      pesanan ? "edit" : "baru",
    ],
    queryFn: async (): Promise<Penjoki[]> => {
      // Mode edit: ikutkan penjoki nonaktif agar transaksi lama tetap
      // menampilkan penjokinya. Mode tambah: hanya penjoki aktif.
      const base = supabase
        .from("penjoki")
        .select("id, nama, no_hp, team_id, keahlian, keterangan, aktif, team:teams(nama)");
      const { data, error } = await (pesanan ? base : base.eq("aktif", true)).order("nama");
      if (error) throw error;
      return (data ?? []) as unknown as Penjoki[];
    },
    enabled: open && Boolean(isOwner || teamId),
  });

  /** Kelompokkan pilihan penjoki per tim (optgroup) agar asal tim jelas. */
  const penjokiPerTim = useMemo(() => {
    const peta = new Map<string, Penjoki[]>();
    for (const p of penjokiList ?? []) {
      const tim = p.team?.nama ?? "Tanpa tim";
      const isi = peta.get(tim) ?? [];
      isi.push(p);
      peta.set(tim, isi);
    }
    return [...peta.entries()].sort((a, b) => a[0].localeCompare(b[0], "id"));
  }, [penjokiList]);

  const penjokiTerpilih = (penjokiList ?? []).find((p) => p.id === penjokiId);
  /** Tim transaksi mengikuti penjoki yang dipilih (penting saat owner lintas tim). */
  const teamTransaksi = isOwner
    ? (penjokiTerpilih?.team_id ?? teamId)
    : teamId;

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
      if (!teamTransaksi) throw new Error("Pilih penjoki terlebih dahulu.");
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
      // Tengah malam lokal tanpa konversi zona — lihat catatan `tanggalDb`.
      const tanggalIso = tanggalDb(tanggal);
      const ratingNum = rating === "" ? null : Number(rating);
      if (ratingNum !== null && (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5))
        throw new Error("Rating harus antara 1 sampai 5.");

      const payload = {
        team_id: teamTransaksi,
        jenis_tugas_id: finalJenisId,
        penjoki_id: penjokiId,
        harga: nominalNum,
        fee_admin: fee.feeAdmin,
        fee_owner: fee.feeOwner,
        fee_penjoki: fee.feePenjoki,
        tanggal: tanggalIso,
        rating: ratingNum,
        catatan: catatan.trim() || null,
      };

      if (pesanan) {
        // Mode edit: kode, status, dan status bayar tidak diubah.
        // Cek izin lebih awal supaya tidak "sukses palsu" (RLS menolak
        // UPDATE lintas tim dengan 0 baris tanpa error).
        if (!isOwner && pesanan.team_id !== admin.team_id) {
          throw new Error(
            "Transaksi ini milik tim lain. Admin hanya bisa mengubah transaksi timnya sendiri; hubungi owner."
          );
        }
        const { data: terupdate, error } = await supabase
          .from("pesanan")
          .update(payload)
          .eq("id", pesanan.id)
          .select("id");
        if (error) throw error;
        if (!terupdate || terupdate.length === 0) {
          throw new Error(
            "Perubahan tidak tersimpan — Anda tidak punya akses ke transaksi ini (kemungkinan milik tim lain)."
          );
        }
        return;
      }

      const { error } = await supabase.from("pesanan").insert({
        ...payload,
        kode: kodeTransaksi(),
        customer_id: null, // Customer ga perlu
        jumlah_keterangan: "1 tugas",
        status: "SELESAI", // Auto SELESAI
        status_bayar: "LUNAS", // Auto LUNAS (customer udah bayar)
        selesai_at: new Date().toISOString(),
        dibuat_oleh: admin.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      // Satu sumber daftar cache — rating penjoki ikut disegarkan supaya
      // angka rate langsung naik/turun setelah transaksi dinilai/diubah.
      invalidateTransaksi(qc);
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
              {modeEdit ? "Edit Transaksi" : "Tambah Transaksi"}
            </h2>
            <p className="text-[11px] text-text-muted">
              {modeEdit ? (
                <>Mengubah <strong className="text-text-secondary">{pesanan?.kode}</strong></>
              ) : (
                <>Tercatat atas nama <strong className="text-text-secondary">{admin.nama_lengkap}</strong></>
              )}
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
              {penjokiPerTim.map(([tim, list]) => (
                <optgroup key={tim} label={tim}>
                  {list.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama}
                    </option>
                  ))}
                </optgroup>
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

          <Field label="Rating Kualitas (1–5, opsional)">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => {
                const aktif = Number(rating) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(rating === String(n) ? "" : String(n))}
                    aria-label={`Beri rating ${n} dari 5`}
                    aria-pressed={aktif}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg leading-none transition-colors ${
                      aktif
                        ? "border-brand-border bg-brand/15 text-gold"
                        : "border-line bg-surface-2 text-text-muted hover:text-gold"
                    }`}
                  >
                    ★
                  </button>
                );
              })}
              <span className="ml-1 text-xs font-bold text-text-secondary">
                {rating === "" ? "Belum dinilai" : `${rating}/5`}
              </span>
              {rating !== "" && (
                <button
                  type="button"
                  onClick={() => setRating("")}
                  className="ml-auto text-[11px] font-semibold text-text-muted hover:text-text-main"
                >
                  Hapus
                </button>
              )}
            </div>
          </Field>

          <Field label="Catatan (opsional)">
            <textarea
              rows={2}
              placeholder="Mis. revisi cepat, customer minta format tertentu…"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className={`${inputCls} resize-y`}
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
                  <span className="text-text-secondary">Penjoki ({persen(BAGI_HASIL.penjoki)}%)</span>
                  <span className="font-bold text-text-main tabular">
                    {rupiah(hitungFee(Number(nominal)).feePenjoki)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Admin CS ({persen(BAGI_HASIL.adminCs)}%)</span>
                  <span className="font-bold text-text-main tabular">
                    {rupiah(hitungFee(Number(nominal)).feeAdmin)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Admin Sosmed ({persen(BAGI_HASIL.adminSosmed)}%)</span>
                  <span className="font-bold text-text-main tabular">
                    {rupiah(hitungFee(Number(nominal)).feeSosmed)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Owner ({persen(BAGI_HASIL.owner)}%)</span>
                  <span className="font-bold text-text-main tabular">
                    {rupiah(hitungFee(Number(nominal)).feeOwner)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Kas ({persen(BAGI_HASIL.kas)}%)</span>
                  <span className="font-bold text-text-main tabular">
                    {rupiah(hitungFee(Number(nominal)).feeKas)}
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
              {simpan.isPending
                ? "Menyimpan…"
                : modeEdit
                  ? "Perbarui"
                  : "Simpan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
