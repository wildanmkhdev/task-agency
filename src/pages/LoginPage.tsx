import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { EyeIcon, EyeSlashIcon, LockClosedIcon, UserIcon } from "../components/icons";
import logoMark from "../assets/logo-mark.png";

const inputLogin =
  "w-full rounded-xl border border-transparent bg-[#eef2ed] py-2.5 pl-11 pr-11 text-sm font-semibold text-[#10271f] outline-none transition-all placeholder:font-medium placeholder:text-[#8b9a93] focus:border-brand focus:ring-2 focus:ring-brand/30";

/** Login — mengikuti mockup: logo, sapaan, kartu emas, input putih, CTA emas. */
export function LoginPage() {
  const { session, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lihat, setLihat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && session) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await signIn(email.trim(), password);
    if (err) setError(err);
    setBusy(false);
  };

  return (
    <div className="app-canvas relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      {/* Ornamen emas sudut — tipis, hanya di tepi seperti mockup */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-56 -top-56 h-[30rem] w-[30rem] rounded-full border-[26px] border-brand/10" />
        <div className="absolute -right-64 -bottom-72 h-[38rem] w-[38rem] rounded-full border-[26px] border-brand/10" />
        <div className="absolute -left-10 top-24 h-64 w-64 rounded-full border border-brand/10" />
        <div className="absolute left-0 top-1/3 h-px w-40 -rotate-12 bg-gradient-to-r from-transparent via-brand/30 to-transparent" />
        <div className="absolute bottom-1/4 right-0 h-px w-40 rotate-12 bg-gradient-to-r from-transparent via-brand/25 to-transparent" />
      </div>

      <div className="relative w-full max-w-[430px]">
        {/* Logo & brand */}
        <div className="flex flex-col items-center text-center">
          <img
            src={logoMark}
            alt="Logo Jokitugasa_ID"
            className="h-[72px] w-auto"
            draggable={false}
          />
          <p className="mt-2 font-display text-[24px] font-extrabold tracking-[0.06em] text-[#e8f1ea]">
            JOKITUGASAJA_ID
          </p>
          <p className="mt-1 text-[10px] font-bold tracking-[0.34em] text-text-secondary">
            CEPAT · MURAH · TERPERCAYA
          </p>

          <h1 className="mt-5 font-display text-[21px] font-extrabold leading-tight text-text-main">
            Halo, Owner dan Para Admin Hebat! 👋
          </h1>
          <p className="mt-1.5 text-[13px] text-text-secondary">
            Selamat datang kembali, para pejuang cuan yang luar biasa!
          </p>
        </div>

        {/* Kartu sapaan bergaris emas */}
        <div className="mt-4 rounded-2xl border border-brand-border/80 bg-navy/40 px-4 py-4">
          <div className="flex items-center justify-center gap-2 text-gold">
            <span className="text-base">👥</span>
            <p className="font-display text-[13px] font-extrabold">Untuk Para Admin</p>
          </div>
          <p className="mt-1.5 text-center text-[12px] leading-relaxed text-text-secondary">
            Kepada seluruh admin yang berdedikasi, bertanggung jawab, dan
            profesional, selamat bertugas! Semoga semua urusan lancar dan target
            tercapai.
          </p>

          <div className="my-3.5 h-px w-full bg-line/80" />

          <div className="flex items-center justify-center gap-2 text-gold">
            <span className="text-base">👑</span>
            <p className="font-display text-[13px] font-extrabold">
              Khusus Owner Kebanggaan Kita
            </p>
          </div>
          <p className="mt-1.5 text-center text-[12px] leading-relaxed text-text-secondary">
            Sosok gagah, berwibawa, visioner, dan katanya sih paling ganteng di
            antara para pejuang cuan online! 😎🔥
          </p>
        </div>

        <p className="mx-auto mt-4 max-w-[360px] text-center text-[12px] leading-relaxed text-text-secondary">
          Tetap kompak meski berjauhan, tetap solid meski hanya bertemu lewat
          layar, dan tetap semangat menjemput cuan bersama! 🚀
        </p>

        <div className="mx-auto my-4 h-px w-40 bg-gradient-to-r from-transparent via-brand to-transparent" />

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-3.5">
          <div>
            <label
              htmlFor="login-username"
              className="mb-1.5 block text-[13px] font-bold text-text-main"
            >
              Username
            </label>
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5d7a6c]" />
              <input
                id="login-username"
                type="email"
                required
                autoComplete="email"
                placeholder="Masukkan username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputLogin}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-1.5 block text-[13px] font-bold text-text-main"
            >
              Password
            </label>
            <div className="relative">
              <LockClosedIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5d7a6c]" />
              <input
                id="login-password"
                type={lihat ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputLogin}
              />
              <button
                type="button"
                onClick={() => setLihat((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#5d7a6c] hover:text-[#10271f]"
                aria-label={lihat ? "Sembunyikan password" : "Tampilkan password"}
              >
                {lihat ? (
                  <EyeIcon className="h-5 w-5" />
                ) : (
                  <EyeSlashIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-[12px] font-semibold text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#cfa84f] via-[#e0bd68] to-[#e9ca7d] py-3 font-display text-[13px] font-extrabold tracking-[0.12em] text-[#12271f] shadow-[0_14px_30px_-16px_rgba(217,180,95,0.9)] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "MEMERIKSA…" : "MASUK KE APLIKASI"}
            <span aria-hidden>→</span>
          </button>
        </form>

        <div className="mt-7 flex items-center gap-3">
          <span className="h-px flex-1 bg-line/70" />
          <p className="text-center text-[10px] leading-relaxed text-text-muted">
            Khusus tim internal • Kelola bisnis dengan kompak dan transparan
          </p>
          <span className="h-px flex-1 bg-line/70" />
        </div>
      </div>
    </div>
  );
}
