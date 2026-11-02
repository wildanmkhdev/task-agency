import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useScope } from "../hooks/useScope";
import { useAuth } from "../context/AuthContext";
import { rupiah, tanggalPanjang, yyyyMmDd } from "../lib/format";
import { masukRekap, type Pesanan, type Profile } from "../lib/types";
import { jenisAdmin, namaLengkapAdmin, urutkanAdmin } from "../lib/admin";
import { Card, EmptyState, Spinner } from "../components/ui";

const PESANAN_SELECT =
  "id, harga, status, status_bayar, tanggal, dibuat_oleh, penjoki:penjoki(nama), jenis_tugas:jenis_tugas(nama)";

function geserTanggal(tanggal: string, hari: number): string {
  const d = new Date(`${tanggal}T00:00:00`);
  d.setDate(d.getDate() + hari);
  return yyyyMmDd(d);
}

function persenPerubahan(now: number, prev: number): number | null {
  if (!prev) return null;
  return ((now - prev) / prev) * 100;
}

function Trend({ value }: { value: number | null }) {
  if (value === null)
    return <span className="text-[11px] font-semibold text-text-muted">— dari kemarin</span>;
  const naik = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold ${
        naik ? "text-emerald-300" : "text-danger"
      }`}
    >
      {naik ? "↑" : "↓"} {Math.abs(value).toFixed(0)}% dari kemarin
    </span>
  );
}

/**
 * Data Rekap Harian Tim — revisi client:
 * - Lingkaran/card tetap, "Total Transaksi" → "Total Pendapatan"
 * - % naik/turun dibanding pendapatan kemarin (reset 00.00 / 24 jam)
 * - Tombol "Lihat Detail Rekap" dihapus → klik nama admin langsung ke detail
 * - Nama tanpa suffix "cs"; admin sosmed paling bawah.
 */
export function RekapHarianPage() {
  const { isOwner } = useScope();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [tanggal, setTanggal] = useState(yyyyMmDd(new Date()));
  const kemarin = geserTanggal(tanggal, -1);

  const { data: rowsHariIni, isLoading } = useQuery({
    queryKey: ["rekap", tanggal],
    queryFn: async (): Promise<Pesanan[]> => {
      const { data, error } = await supabase
        .from("pesanan")
        .select(PESANAN_SELECT)
        .gte("tanggal", new Date(`${tanggal}T00:00:00`).toISOString())
        .lte("tanggal", new Date(`${tanggal}T23:59:59.999`).toISOString())
        .order("tanggal", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Pesanan[];
    },
  });

  const { data: rowsKemarin } = useQuery({
    queryKey: ["rekap", kemarin],
    queryFn: async (): Promise<Pesanan[]> => {
      const { data, error } = await supabase
        .from("pesanan")
        .select(PESANAN_SELECT)
        .gte("tanggal", new Date(`${kemarin}T00:00:00`).toISOString())
        .lte("tanggal", new Date(`${kemarin}T23:59:59.999`).toISOString());
      if (error) throw error;
      return (data ?? []) as unknown as Pesanan[];
    },
  });

  const { data: admins } = useQuery({
    queryKey: ["admins"],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, team_id, nama_lengkap, no_hp, aktif, team:teams(nama)")
        .eq("role", "ADMIN");
      if (error) throw error;
      return (data ?? []) as unknown as Profile[];
    },
  });

  const rekapHariIni = (rowsHariIni ?? []).filter(masukRekap);
  const rekapKemarin = (rowsKemarin ?? []).filter(masukRekap);

  // Owner & admin sosmed melihat total agency; admin CS melihat miliknya sendiri.
  const lihatSemua =
    isOwner || (profile ? jenisAdmin(profile) === "sosmed" : false);
  const dalamScope = (rows: Pesanan[]) =>
    lihatSemua ? rows : rows.filter((p) => p.dibuat_oleh === profile?.id);

  const rekapScope = dalamScope(rekapHariIni);
  const rekapScopeKemarin = dalamScope(rekapKemarin);

  const totalPendapatan = rekapScope.reduce((s, p) => s + p.harga, 0);
  const totalPendapatanKemarin = rekapScopeKemarin.reduce((s, p) => s + p.harga, 0);

  const daftarAdmin = useMemo(() => {
    const base = urutkanAdmin(admins ?? []);
    // Admin biasa hanya melihat dirinya sendiri (RLS juga membatasi).
    const terlihat = isOwner
      ? base
      : base.filter((a) => a.id === profile?.id);
    return terlihat.map((a) => {
      const milik = rekapHariIni.filter((p) => p.dibuat_oleh === a.id);
      return {
        admin: a,
        jumlah: milik.length,
        pendapatan: milik.reduce((s, p) => s + p.harga, 0),
      };
    });
  }, [admins, isOwner, profile?.id, rekapHariIni]);

  if (isLoading) return <Spinner label="Memuat rekap harian…" />;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Navigasi tanggal */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setTanggal(geserTanggal(tanggal, -1))}
          className="rounded-full border border-line bg-surface-2 p-2 text-text-secondary hover:border-brand-border hover:text-gold"
          aria-label="Hari sebelumnya"
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
          <span>{tanggalPanjang(`${tanggal}T00:00:00`)}</span>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Pilih tanggal"
          />
        </label>
        <button
          onClick={() => setTanggal(geserTanggal(tanggal, 1))}
          className="rounded-full border border-line bg-surface-2 p-2 text-text-secondary hover:border-brand-border hover:text-gold"
          aria-label="Hari berikutnya"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </div>

      {/* 2 kotak utama */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-premium rounded-card p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-border bg-brand/15 text-gold">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="12" cy="12" r="8" />
                <path d="M12 7v10M9.5 14.5c.6.8 1.5 1.2 2.5 1.2 1.4 0 2.4-.7 2.4-1.8 0-1-.7-1.5-2.4-1.9-1.7-.4-2.4-.9-2.4-1.9 0-1.1 1-1.8 2.4-1.8 1 0 1.9.4 2.5 1.2" />
              </svg>
            </span>
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted sm:text-[11px]">
              Total Pendapatan
            </p>
          </div>
          <p className="mt-3 font-display text-xl font-extrabold text-gold-soft tabular sm:text-2xl">
            {rupiah(totalPendapatan)}
          </p>
          <div className="mt-1">
            <Trend value={persenPerubahan(totalPendapatan, totalPendapatanKemarin)} />
          </div>
        </div>

        <div className="card-premium rounded-card p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path d="M9 11.5 11.5 14 16 9.5" />
                <circle cx="12" cy="12" r="8" />
              </svg>
            </span>
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted sm:text-[11px]">
              Total Tugas Selesai
            </p>
          </div>
          <p className="mt-3 font-display text-xl font-extrabold text-text-main tabular sm:text-2xl">
            {rekapScope.length}
          </p>
          <div className="mt-1">
            <Trend value={persenPerubahan(rekapScope.length, rekapScopeKemarin.length)} />
          </div>
        </div>
      </div>

      {/* Rekap per admin */}
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <h3 className="font-display text-sm font-extrabold text-text-main">
            Rekap per Admin CS
          </h3>
          <span className="text-[11px] font-semibold text-text-muted">
            Klik nama untuk detail
          </span>
        </div>

        {daftarAdmin.length === 0 ? (
          <Card>
            <EmptyState
              title="Belum ada admin"
              hint="Data admin akan tampil di sini setelah akun dibuat."
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {daftarAdmin.map(({ admin, jumlah, pendapatan }) => {
              const nama = namaLengkapAdmin(admin);
              return (
                <button
                  key={admin.id}
                  onClick={() => navigate(`/rekap/${admin.id}?tanggal=${tanggal}`)}
                  className="group flex w-full items-center gap-3 rounded-2xl border border-line bg-surface/80 px-4 py-3 text-left transition-all hover:border-brand-border hover:bg-surface-2"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-border/60 bg-brand/10 text-xs font-extrabold text-gold">
                    {nama.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-text-main">{nama}</p>
                    <p className="text-[11px] text-text-muted">{jumlah} Transaksi</p>
                  </div>
                  <span className="shrink-0 text-sm font-extrabold text-gold-soft tabular">
                    {rupiah(pendapatan)}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 shrink-0 text-text-muted transition-colors group-hover:text-gold"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                  >
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
