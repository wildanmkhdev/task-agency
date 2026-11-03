import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { rupiah, yyyyMmDd } from "../lib/format";
import { masukRekap, type Pesanan, type Profile } from "../lib/types";
import {
  jenisAdmin,
  namaLengkapAdmin,
  urutkanAdmin,
} from "../lib/admin";
import {
  geserPeriode,
  labelPembanding,
  rentangPeriode,
  type Periode,
} from "../lib/periode";
import { PeriodeTabs } from "../components/PeriodeTabs";
import { Card, EmptyState, Spinner } from "../components/ui";

const PESANAN_SELECT =
  "id, harga, status, status_bayar, tanggal, dibuat_oleh, penjoki:penjoki(nama), jenis_tugas:jenis_tugas(nama)";

function persenPerubahan(now: number, prev: number): number | null {
  if (!prev) return null;
  return ((now - prev) / prev) * 100;
}

function Trend({ value, periode }: { value: number | null; periode: Periode }) {
  if (value === null)
    return (
      <span className="text-[11px] font-semibold text-text-muted">
        — {labelPembanding(periode)}
      </span>
    );
  const naik = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold ${
        naik ? "text-emerald-300" : "text-danger"
      }`}
    >
      {naik ? "↑" : "↓"} {Math.abs(value).toFixed(0)}% {labelPembanding(periode)}
    </span>
  );
}

/**
 * Data Rekap Tim — revisi client 3 Nov 2026:
 * - Periode Harian / Mingguan / Bulanan.
 * - Semua admin: bisa melihat rekap admin lain (read-only).
 * - Tombol "Tambah Transaksi" hanya muncul di ruangan sendiri.
 * - Admin Sosmed: read-only semua, tidak bisa tambah transaksi.
 * - Owner: lihat semua & input pesanan lewat menu "Input Fee".
 */
export function RekapHarianPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [periode, setPeriode] = useState<Periode>("harian");
  const [tanggal, setTanggal] = useState(yyyyMmDd(new Date()));

  const rentang = rentangPeriode(periode, tanggal);
  const sosmed = profile ? jenisAdmin(profile) === "sosmed" : false;

  const { data: rowsPeriode, isLoading } = useQuery({
    queryKey: ["rekap", rentang.mulaiIso, rentang.selesaiIso],
    queryFn: async (): Promise<Pesanan[]> => {
      const { data, error } = await supabase
        .from("pesanan")
        .select(PESANAN_SELECT)
        .gte("tanggal", rentang.mulaiIso)
        .lte("tanggal", rentang.selesaiIso)
        .order("tanggal", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Pesanan[];
    },
  });

  const { data: rowsSebelumnya } = useQuery({
    queryKey: ["rekap", rentang.sebelumnya.mulaiIso, rentang.sebelumnya.selesaiIso],
    queryFn: async (): Promise<Pesanan[]> => {
      const { data, error } = await supabase
        .from("pesanan")
        .select(PESANAN_SELECT)
        .gte("tanggal", rentang.sebelumnya.mulaiIso)
        .lte("tanggal", rentang.sebelumnya.selesaiIso);
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

  const rekap = (rowsPeriode ?? []).filter(masukRekap);
  const rekapSebelumnya = (rowsSebelumnya ?? []).filter(masukRekap);

  // Semua admin lihat total pendapatan semua transaksi (sama seperti owner/sosmed).
  const lihatSemua = true;
  const dalamScope = (rows: Pesanan[]) =>
    lihatSemua ? rows : rows.filter((p) => p.dibuat_oleh === profile?.id);

  const rekapScope = dalamScope(rekap);
  const rekapScopeSebelumnya = dalamScope(rekapSebelumnya);

  const totalPendapatan = rekapScope.reduce((s, p) => s + p.harga, 0);
  const totalPendapatanSebelumnya = rekapScopeSebelumnya.reduce((s, p) => s + p.harga, 0);

  const daftarAdmin = useMemo(() => {
    const base = urutkanAdmin(admins ?? []);
    // Semua admin melihat daftar semua admin (read-only untuk yang bukan miliknya).
    const terlihat = base;
    return terlihat.map((a) => {
      /**
       * Baris milik admin sosmed = akumulasi SEMUA tim (permintaan client),
       * supaya angka di daftar sama dengan angka di ruangannya.
       */
      const gabungan = sosmed && a.id === profile?.id;
      const milik = gabungan ? rekap : rekap.filter((p) => p.dibuat_oleh === a.id);
      return {
        admin: a,
        jumlah: milik.length,
        pendapatan: milik.reduce((s, p) => s + p.harga, 0),
        gabungan,
      };
    });
  }, [admins, sosmed, profile?.id, rekap]);

  if (isLoading) return <Spinner label="Memuat rekap…" />;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Periode */}
      <PeriodeTabs value={periode} onChange={setPeriode} />

      {/* Navigasi tanggal */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setTanggal(geserPeriode(periode, tanggal, -1))}
          className="rounded-full border border-line bg-surface-2 p-2 text-text-secondary hover:border-brand-border hover:text-gold"
          aria-label="Periode sebelumnya"
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
          <span>{rentang.label}</span>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value || yyyyMmDd(new Date()))}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Pilih tanggal acuan"
          />
        </label>
        <button
          onClick={() => setTanggal(geserPeriode(periode, tanggal, 1))}
          className="rounded-full border border-line bg-surface-2 p-2 text-text-secondary hover:border-brand-border hover:text-gold"
          aria-label="Periode berikutnya"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </div>

      {sosmed && (
        <p className="rounded-2xl border border-fuchsia-400/25 bg-fuchsia-400/10 px-4 py-2.5 text-[11px] font-semibold text-fuchsia-300">
          Mode <strong>hanya lihat</strong> — kamu dapat memantau pemasukan semua
          tim, tetapi tidak dapat menambah atau mengubah transaksi.
        </p>
      )}

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
            <Trend
              value={persenPerubahan(totalPendapatan, totalPendapatanSebelumnya)}
              periode={periode}
            />
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
            <Trend
              value={persenPerubahan(rekapScope.length, rekapScopeSebelumnya.length)}
              periode={periode}
            />
          </div>
        </div>
      </div>

      {/* Rekap per admin */}
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <h3 className="font-display text-sm font-extrabold text-text-main">
            Rekap per Admin
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
            {daftarAdmin.map(({ admin, jumlah, pendapatan, gabungan }) => {
              const nama = namaLengkapAdmin(admin);
              return (
                <button
                  key={admin.id}
                  onClick={() =>
                    navigate(
                      `/rekap/${admin.id}?tanggal=${tanggal}&periode=${periode}`
                    )
                  }
                  className="group flex w-full items-center gap-3 rounded-2xl border border-line bg-surface/80 px-4 py-3 text-left transition-all hover:border-brand-border hover:bg-surface-2"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-border/60 bg-brand/10 text-xs font-extrabold text-gold">
                    {nama.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-text-main">{nama}</p>
                    <p className="text-[11px] text-text-muted">
                      {jumlah} Transaksi
                      {gabungan && (
                        <span className="ml-1.5 rounded-full border border-fuchsia-400/25 bg-fuchsia-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-fuchsia-300">
                          semua tim
                        </span>
                      )}
                    </p>
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
