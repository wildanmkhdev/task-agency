import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { rupiah, tanggalPanjang, tanggalPendek, yyyyMmDd } from "../lib/format";
import { masukRekap, type Pesanan, type Profile } from "../lib/types";
import { alokasiFee, BAGI_HASIL, persen } from "../lib/fee";
import { jenisAdmin, keteranganJabatan, labelJabatan, namaLengkapAdmin } from "../lib/admin";
import { Card, EmptyState, Spinner } from "../components/ui";

interface RincianRow {
  id: string;
  penjoki: string;
  jenis: string;
  nominal: number;
}

function Kotak({
  label,
  value,
  icon,
  tone = "gold",
}: {
  label: string;
  value: string;
  icon: string;
  tone?: "gold" | "green" | "blue" | "violet" | "orange";
}) {
  const tones: Record<string, string> = {
    gold: "border-brand-border bg-brand/10 text-gold",
    green: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    blue: "border-sky-400/25 bg-sky-400/10 text-sky-300",
    violet: "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-300",
    orange: "border-orange-400/25 bg-orange-400/10 text-orange",
  };
  return (
    <div className="rounded-2xl border border-line bg-surface/80 p-4">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm ${tones[tone]}`}>
          {icon}
        </span>
        <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-text-muted">
          {label}
        </p>
      </div>
      <p className="mt-2.5 font-display text-[15px] font-extrabold leading-tight text-text-main tabular">
        {value}
      </p>
    </div>
  );
}

/** Detail Rekap Harian per admin — "ruangan" masing-masing admin. */
export function DetailRekapPage() {
  const { adminId = "" } = useParams();
  const [params] = useSearchParams();
  const { profile } = useAuth();
  const tanggal = params.get("tanggal") ?? yyyyMmDd(new Date());

  const { data: admin, isLoading: loadingAdmin } = useQuery({
    queryKey: ["admin-detail", adminId],
    queryFn: async (): Promise<Profile | null> => {
      if (profile?.id === adminId) return profile;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, team_id, nama_lengkap, no_hp, aktif, team:teams(nama)")
        .eq("id", adminId)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Profile) ?? null;
    },
    enabled: Boolean(adminId),
  });

  const sosmed = admin ? jenisAdmin(admin) === "sosmed" : false;

  const { data: rows, isLoading } = useQuery({
    queryKey: ["rekap-admin", adminId, tanggal, sosmed],
    queryFn: async (): Promise<Pesanan[]> => {
      let q = supabase
        .from("pesanan")
        .select(
          "id, harga, status, status_bayar, tanggal, dibuat_oleh, jumlah_keterangan, penjoki:penjoki(nama), jenis_tugas:jenis_tugas(nama)"
        )
        .gte("tanggal", new Date(`${tanggal}T00:00:00`).toISOString())
        .lte("tanggal", new Date(`${tanggal}T23:59:59.999`).toISOString());
      // Admin CS/utama: pendapatan milik sendiri. Admin sosmed: total pendapatan
      // seluruh tim, karena fee 7% dihitung dari pendapatan agency.
      if (!sosmed) q = q.eq("dibuat_oleh", adminId);
      const { data, error } = await q.order("tanggal", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Pesanan[];
    },
    // Tunggu data admin agar tahu apakah ini ruangan sosmed.
    enabled: Boolean(adminId) && Boolean(admin),
  });

  const rekap = (rows ?? []).filter(masukRekap);
  const totalPendapatan = rekap.reduce((s, p) => s + p.harga, 0);
  const fee = alokasiFee(totalPendapatan);

  const rincian: RincianRow[] = useMemo(
    () =>
      rekap.map((p) => ({
        id: p.id,
        penjoki: p.penjoki?.nama ?? "-",
        jenis: p.jenis_tugas?.nama ?? "-",
        nominal: p.harga,
      })),
    [rekap]
  );

  if (loadingAdmin || isLoading) return <Spinner label="Memuat detail rekap…" />;

  if (!admin) {
    return (
      <Card>
        <EmptyState
          title="Admin tidak ditemukan"
          hint="Data admin ini tidak tersedia untuk akun kamu."
        />
      </Card>
    );
  }

  const nama = namaLengkapAdmin(admin);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Profil admin */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/80 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-border/60 bg-brand/10 text-sm font-extrabold text-gold">
            {nama.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-text-main">{nama}</p>
            <p className="text-[11px] text-text-muted">{labelJabatan(admin)}</p>
            <p className="mt-0.5 text-[10px] leading-snug text-text-muted/80">
              {keteranganJabatan(admin)}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-border/50 bg-brand/10 px-3 py-1 text-[11px] font-bold text-gold-soft">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <rect x="3" y="5" width="18" height="16" rx="2.5" />
            <path d="M8 3v4M16 3v4M3 10h18" />
          </svg>
          {tanggalPanjang(`${tanggal}T00:00:00`)}
        </span>
      </div>

      {/* Kotak ringkasan */}
      {sosmed ? (
        <div className="grid grid-cols-2 gap-3">
          <Kotak label="Total Pendapatan" value={rupiah(totalPendapatan)} icon="Rp" tone="gold" />
          <Kotak label="Fee Admin Sosmed" value={rupiah(fee.adminSosmed)} icon="%" tone="violet" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Kotak label="Total Transaksi" value={String(rekap.length)} icon="#" tone="green" />
          <Kotak label="Total Pendapatan" value={rupiah(totalPendapatan)} icon="Rp" tone="gold" />
          <Kotak
            label={`Fee Penjoki (${persen(BAGI_HASIL.penjoki)}%)`}
            value={rupiah(fee.penjoki)}
            icon="P"
            tone="blue"
          />
          <Kotak
            label={`Fee Admin CS (${persen(BAGI_HASIL.adminCs)}%)`}
            value={rupiah(fee.adminCs)}
            icon="C"
            tone="green"
          />
          <Kotak
            label={`Fee Admin Sosmed (${persen(BAGI_HASIL.adminSosmed)}%)`}
            value={rupiah(fee.adminSosmed)}
            icon="S"
            tone="violet"
          />
          <Kotak
            label={`Fee Owner (${persen(BAGI_HASIL.owner)}%)`}
            value={rupiah(fee.owner)}
            icon="O"
            tone="orange"
          />
        </div>
      )}

      {/* Rincian transaksi — hanya untuk admin CS / tim */}
      {!sosmed && (
        <Card className="overflow-hidden">
          <div className="border-b border-line px-5 py-3.5">
            <h3 className="font-display text-sm font-extrabold text-text-main">
              Rincian Transaksi
            </h3>
            <p className="text-[11px] text-text-muted">
              {tanggalPendek(`${tanggal}T00:00:00`)} · {rekap.length} transaksi
            </p>
          </div>

          {rincian.length === 0 ? (
            <EmptyState
              title="Belum ada transaksi"
              hint="Transaksi yang selesai + lunas akan tampil di sini."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2/60 text-left text-[10px] uppercase tracking-wider text-text-muted">
                    <th className="px-4 py-2.5 font-bold">No</th>
                    <th className="px-4 py-2.5 font-bold">Penjoki</th>
                    <th className="px-4 py-2.5 font-bold">Jenis Tugas</th>
                    <th className="px-4 py-2.5 text-right font-bold">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {rincian.map((r, i) => (
                    <tr key={r.id} className="border-b border-line-soft last:border-0 hover:bg-surface-2/50">
                      <td className="px-4 py-2.5 tabular text-text-muted">{i + 1}</td>
                      <td className="px-4 py-2.5 font-bold text-text-main">{r.penjoki}</td>
                      <td className="px-4 py-2.5 text-text-secondary">{r.jenis}</td>
                      <td className="px-4 py-2.5 text-right font-extrabold text-gold-soft tabular">
                        {rupiah(r.nominal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
