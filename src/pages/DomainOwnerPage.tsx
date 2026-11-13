import { useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { clientSementara, supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Card, Spinner } from "../components/ui";
import { PeriodeTabs } from "../components/PeriodeTabs";
import { rupiah, yyyyMmDd } from "../lib/format";
import { masukRekap, type Pesanan, type Profile } from "../lib/types";
import { BAGI_HASIL, alokasiFee, persen } from "../lib/fee";
import { jenisAdmin, nomorTim } from "../lib/admin";
import { geserPeriode, rentangPeriode, type Periode } from "../lib/periode";
import {
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from "../components/icons";

/** Tim yang kartu fee-nya tampil di Domain Owner. Admin 1 (tim utama) tidak ikut. */
const TIM_DI_LAPORAN = [2, 3, 4, 5] as const;

function Kotak({
  label,
  value,
  icon,
  tone = "gold",
}: {
  label: string;
  value: string;
  icon: string;
  tone?: "gold" | "green" | "blue" | "violet" | "orange" | "teal";
}) {
  const tones: Record<string, string> = {
    gold: "border-brand-border bg-brand/10 text-gold",
    green: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    blue: "border-sky-400/25 bg-sky-400/10 text-sky-300",
    violet: "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-300",
    orange: "border-orange-400/25 bg-orange-400/10 text-orange",
    teal: "border-teal-400/25 bg-teal-400/10 text-teal-300",
  };
  return (
    <div className="rounded-2xl border border-line bg-surface/80 p-4">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-extrabold ${tones[tone]}`}
        >
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

/**
 * Ringkasan owner — revisi client 6 Nov 2026 (video + voice note).
 *
 * Satu layar untuk owner, tanpa membuka ruangan admin satu per satu:
 *   • Total Transaksi & Total Pendapatan = angka header Rekap Harian Tim
 *     (akumulasi semua admin).
 *   • Fee Admin 2–5 = Fee Admin CS (22%) dari pendapatan masing-masing tim.
 *   • Fee Admin Sosmed = 6% dari total pendapatan agency.
 *   • Fee Owner = 20% dari total pendapatan agency.
 *   • Kas = 3% dari total pendapatan agency.
 *   • Admin 1 (tim utama) tidak ditampilkan — sesuai permintaan client.
 *   • Label persentase sengaja tidak ditampilkan di halaman ini.
 */
function RingkasanOwner() {
  const [periode, setPeriode] = useState<Periode>("harian");
  const [tanggal, setTanggal] = useState(yyyyMmDd(new Date()));
  const rentang = rentangPeriode(periode, tanggal);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["rekap", rentang.mulaiIso, rentang.selesaiIso],
    queryFn: async (): Promise<Pesanan[]> => {
      const { data, error } = await supabase
        .from("pesanan")
        .select("id, kode, harga, status, status_bayar, tanggal, dibuat_oleh")
        .gte("tanggal", rentang.mulaiIso)
        .lte("tanggal", rentang.selesaiIso);
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

  const rekap = useMemo(() => (rows ?? []).filter(masukRekap), [rows]);

  const totalPendapatan = rekap.reduce((s, p) => s + p.harga, 0);
  const fee = alokasiFee(totalPendapatan);

  const pendapatanPerAdmin = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of rekap) {
      map.set(p.dibuat_oleh, (map.get(p.dibuat_oleh) ?? 0) + p.harga);
    }
    return map;
  }, [rekap]);

  const adminPerTim = useMemo(() => {
    const map = new Map<number, Profile>();
    for (const a of admins ?? []) {
      // Admin 1 / tim utama tidak masuk laporan domain owner.
      if (jenisAdmin(a) === "utama") continue;
      const nomor = nomorTim(a);
      if (nomor === null || map.has(nomor)) continue;
      map.set(nomor, a);
    }
    return map;
  }, [admins]);

  const kartuAdmin = TIM_DI_LAPORAN.map((nomor) => {
    const admin = adminPerTim.get(nomor) ?? null;
    const omzet = admin ? pendapatanPerAdmin.get(admin.id) ?? 0 : 0;
    return { nomor, nilai: alokasiFee(omzet).adminCs };
  });

  const gantiTanggal = (arah: -1 | 1) =>
    setTanggal((t) => geserPeriode(periode, t, arah));

  if (isLoading) return <Spinner label="Memuat laporan owner…" />;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-400/30 text-emerald-300">
          <ShieldCheckIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-sm font-extrabold text-text-main">
            Ringkasan Owner
          </p>
          <p className="text-[11px] leading-snug text-text-secondary">
            Semua tim dalam satu layar — tanpa membuka ruangan admin satu per satu.
          </p>
        </div>
      </div>

      <PeriodeTabs value={periode} onChange={setPeriode} />

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => gantiTanggal(-1)}
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
          onClick={() => gantiTanggal(1)}
          className="rounded-full border border-line bg-surface-2 p-2 text-text-secondary hover:border-brand-border hover:text-gold"
          aria-label="Periode berikutnya"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Kotak
          label="Total Transaksi"
          value={String(rekap.length)}
          icon="#"
          tone="green"
        />
        <Kotak
          label="Total Pendapatan"
          value={rupiah(totalPendapatan)}
          icon="Rp"
          tone="gold"
        />
        <Kotak
          label={`Kas (${persen(BAGI_HASIL.kas)}%)`}
          value={rupiah(fee.kas)}
          icon="K"
          tone="teal"
        />
        {kartuAdmin.map((k) => (
          <Kotak
            key={k.nomor}
            label={`Fee Admin ${k.nomor} (${persen(BAGI_HASIL.adminCs)}%)`}
            value={rupiah(k.nilai)}
            icon={String(k.nomor)}
            tone="blue"
          />
        ))}
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

      <p className="px-1 text-center text-[10px] leading-relaxed text-text-muted">
        Data diambil dari rekap harian, mingguan, atau bulanan sesuai periode
        yang dipilih.
      </p>
    </div>
  );
}

/**
 * Domain Owner — halaman terkunci (revisi client 6 Nov 2026).
 *
 * Menu ini tampil di semua akun, tetapi isinya hanya terbuka untuk owner:
 *   • Akun owner yang sedang login → langsung masuk.
 *   • Akun admin → disuguhi halaman login username + password owner.
 *     Kredensial diverifikasi lewat client Supabase sekali pakai, sehingga
 *     sesi admin yang sedang aktif tidak ikut tergantikan.
 *   • Setelah lolos, gerbang terbuka 30 menit untuk tab tersebut
 *     (sessionStorage), agar tidak mengetik ulang setiap pindah menu.
 */

const KUNCI_GERBANG = "domain-owner-unlocked";
const DURASI_TERBUKA_MS = 30 * 60 * 1000;

interface KunciGerbang {
  sampai: number;
  uid: string;
}

function bacaKunci(uid: string | undefined): boolean {
  if (!uid || typeof window === "undefined") return false;
  try {
    const mentah = window.sessionStorage.getItem(KUNCI_GERBANG);
    if (!mentah) return false;
    const kunci = JSON.parse(mentah) as KunciGerbang;
    if (kunci.uid !== uid || !Number.isFinite(kunci.sampai)) return false;
    if (kunci.sampai <= Date.now()) {
      window.sessionStorage.removeItem(KUNCI_GERBANG);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function tulisKunci(uid: string) {
  try {
    const kunci: KunciGerbang = { sampai: Date.now() + DURASI_TERBUKA_MS, uid };
    window.sessionStorage.setItem(KUNCI_GERBANG, JSON.stringify(kunci));
  } catch {
    // sessionStorage bisa diblokir (mode privat) — abaikan, gerbang tetap jalan.
  }
}

function hapusKunci() {
  try {
    window.sessionStorage.removeItem(KUNCI_GERBANG);
  } catch {
    // abaikan
  }
}

const inputLogin =
  "w-full rounded-xl border border-line bg-surface-2 py-3 pl-11 pr-4 text-sm font-semibold text-text-main outline-none transition-all placeholder:font-medium placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand/20";

const inputKunci =
  "w-full rounded-xl border border-line bg-surface-2 py-3 pl-11 pr-11 text-sm font-semibold text-text-main outline-none transition-all placeholder:font-medium placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand/20";

/** "owner" → "owner@jokitugasaja.id"; email utuh dibiarkan apa adanya. */
function emailDariUsername(username: string, domain: string): string {
  const bersih = username.trim().toLowerCase();
  if (!bersih) return "";
  return bersih.includes("@") ? bersih : `${bersih}@${domain}`;
}

function GerbangOwner({ onBuka }: { onBuka: () => void }) {
  const { session } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [lihat, setLihat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const domain =
    session?.user.email?.split("@")[1]?.trim() || "jokitugasaja.id";

  const masuk = async (e: FormEvent) => {
    e.preventDefault();
    const email = emailDariUsername(username, domain);
    if (!email) {
      setError("Username owner wajib diisi.");
      return;
    }

    setBusy(true);
    setError(null);

    // Client terpisah: sesi admin yang aktif tidak tersentuh.
    const klien = clientSementara();

    const { data: masukData, error: err } =
      await klien.auth.signInWithPassword({ email, password });

    if (err || !masukData.user) {
      setBusy(false);
      setError(
        err?.message === "Invalid login credentials"
          ? "Username atau password owner salah."
          : `Gagal membuka: ${err?.message ?? "kredensial ditolak"}`
      );
      return;
    }

    const { data: profil } = await klien
      .from("profiles")
      .select("role")
      .eq("id", masukData.user.id)
      .maybeSingle();

    await klien.auth.signOut();

    if (profil?.role !== "OWNER") {
      setBusy(false);
      setError("Akun ini bukan owner. Hanya akun owner yang bisa membuka halaman ini.");
      return;
    }

    tulisKunci(session?.user.id ?? "");
    setPassword("");
    setBusy(false);
    onBuka();
  };

  return (
    <Card className="mx-auto max-w-md px-6 py-10 text-center">
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-brand-border bg-brand/10 text-gold">
        <LockClosedIcon className="h-9 w-9" />
      </span>
      <h2 className="mt-5 font-display text-lg font-extrabold text-text-main">
        Halaman Terkunci
      </h2>
      <p className="mx-auto mt-1.5 max-w-xs text-[12px] leading-relaxed text-text-secondary">
        Khusus owner. Masuk dengan username dan password owner untuk melihat
        laporan ini.
      </p>

      <form onSubmit={masuk} className="mt-6 space-y-3 text-left">
        <div className="relative">
          <UserCircleIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            required
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Username owner"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={inputLogin}
          />
        </div>

        <div className="relative">
          <LockClosedIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
          <input
            type={lihat ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="Password owner"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputKunci}
          />
          <button
            type="button"
            onClick={() => setLihat((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-muted hover:text-gold"
            aria-label={lihat ? "Sembunyikan password" : "Tampilkan password"}
          >
            {lihat ? <EyeIcon className="h-5 w-5" /> : <EyeSlashIcon className="h-5 w-5" />}
          </button>
        </div>

        {error && (
          <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-[12px] font-semibold text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-gradient-to-r from-[#cfa84f] via-[#e0bd68] to-[#e9ca7d] py-3 font-display text-[13px] font-extrabold tracking-[0.1em] text-[#12271f] transition-all hover:brightness-105 disabled:opacity-60"
        >
          {busy ? "MEMERIKSA…" : "MASUK"}
        </button>

        <p className="pt-1 text-center text-[10px] leading-relaxed text-text-muted">
          Sesi akun yang sedang login tidak berubah. Halaman ini hanya membuka
          laporan owner.
        </p>
      </form>
    </Card>
  );
}

export function DomainOwnerPage() {
  const { profile, session, loading } = useAuth();
  const isOwner = profile?.role === "OWNER";
  const [terbuka, setTerbuka] = useState(false);

  // Dibuka manual (state) atau masih dalam masa berlaku 30 menit (sessionStorage).
  const bolehLihat = isOwner || terbuka || bacaKunci(session?.user.id);

  const domain = typeof window === "undefined" ? "" : window.location.host;

  if (loading) return <Spinner label="Memeriksa akses…" />;

  if (!bolehLihat) {
    return <GerbangOwner onBuka={() => setTerbuka(true)} />;
  }

  const kunciLagi = () => {
    hapusKunci();
    setTerbuka(false);
  };

  return (
    <div className="space-y-4">
      <RingkasanOwner />

      <p className="px-1 text-center text-[10px] leading-relaxed text-text-muted">
        Domain aktif: <span className="font-semibold text-text-secondary">{domain}</span> ·{" "}
        <a
          href={typeof window === "undefined" ? "#" : window.location.origin}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-gold/90 hover:text-gold"
        >
          Buka domain ↗
        </a>
        {!isOwner && (
          <>
            {" · "}
            <button
              type="button"
              onClick={kunciLagi}
              className="font-semibold text-gold/90 hover:text-gold"
            >
              Kunci lagi
            </button>
          </>
        )}
      </p>
    </div>
  );
}
