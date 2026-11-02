import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui";
import {
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from "../components/icons";

const inputKunci =
  "w-full rounded-xl border border-line bg-surface-2 py-3 pl-11 pr-11 text-sm font-semibold text-text-main outline-none transition-all placeholder:font-medium placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand/20";

/** Domain Owner — halaman terkunci; password diverifikasi ulang ke Supabase. */
export function DomainOwnerPage() {
  const { profile, session } = useAuth();
  const isOwner = profile?.role === "OWNER";
  const [terbuka, setTerbuka] = useState(false);
  const [password, setPassword] = useState("");
  const [lihat, setLihat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const domain = typeof window === "undefined" ? "" : window.location.host;

  const buka = async (e: FormEvent) => {
    e.preventDefault();
    if (!session?.user.email) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password,
    });
    if (err) {
      setError(
        err.message === "Invalid login credentials"
          ? "Password owner salah."
          : `Gagal membuka: ${err.message}`
      );
      setBusy(false);
      return;
    }
    setPassword("");
    setTerbuka(true);
    setBusy(false);
  };

  if (!isOwner) {
    return (
      <Card className="mx-auto max-w-md px-6 py-12 text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-brand-border bg-brand/10 text-gold">
          <LockClosedIcon className="h-9 w-9" />
        </span>
        <h2 className="mt-5 font-display text-lg font-extrabold text-text-main">
          Akses Terbatas
        </h2>
        <p className="mt-2 text-[12px] leading-relaxed text-text-secondary">
          Menu ini hanya untuk owner. Silakan hubungi owner bila membutuhkan
          akses.
        </p>
      </Card>
    );
  }

  if (!terbuka) {
    return (
      <Card className="mx-auto max-w-md px-6 py-10 text-center">
        <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-brand-border bg-brand/10 text-gold">
          <LockClosedIcon className="h-10 w-10" />
        </span>
        <h2 className="mt-6 font-display text-lg font-extrabold text-text-main">
          Akses Terbatas
        </h2>
        <p className="mx-auto mt-1.5 max-w-xs text-[12px] leading-relaxed text-text-secondary">
          Menu ini hanya untuk owner. Masukkan password untuk melanjutkan.
        </p>

        <form onSubmit={buka} className="mt-6 space-y-3 text-left">
          <div className="relative">
            <LockClosedIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
            <input
              type={lihat ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="Masukkan password owner"
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
        </form>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/30 text-emerald-300">
          <ShieldCheckIcon className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display text-sm font-extrabold text-text-main">
            Akses Owner Terbuka
          </p>
          <p className="text-[11px] text-text-secondary">
            Kelola domain dan status aplikasi dari sini.
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-3.5">
          <h3 className="font-display text-sm font-extrabold text-text-main">
            Informasi Domain
          </h3>
        </div>
        <dl className="divide-y divide-line-soft text-sm">
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <dt className="text-text-muted">Domain aktif</dt>
            <dd className="truncate font-semibold text-text-main">{domain}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <dt className="text-text-muted">Status</dt>
            <dd className="flex items-center gap-1.5 font-semibold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Online
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <dt className="text-text-muted">Protokol</dt>
            <dd className="font-semibold text-text-main">
              {typeof window === "undefined" ? "https" : window.location.protocol.replace(":", "")}
            </dd>
          </div>
        </dl>
      </Card>

      <a
        href={typeof window === "undefined" ? "#" : window.location.origin}
        target="_blank"
        rel="noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-border bg-brand/10 py-3 text-[13px] font-bold text-gold transition-colors hover:bg-brand/15"
      >
        Buka domain di tab baru ↗
      </a>

      <p className="px-1 text-center text-[10px] leading-relaxed text-text-muted">
        Perubahan domain, DNS, dan sertifikat dilakukan lewat dashboard penyedia
        hosting (Vercel). Halaman ini hanya menampilkan status domain aplikasi.
      </p>
    </div>
  );
}
