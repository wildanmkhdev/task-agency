import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Field, inputCls } from "../components/ui";

/** Halaman login Owner & Admin (email + password) */
export function LoginPage() {
  const { session, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="flex min-h-screen items-center justify-center bg-bg-main px-4">
      {/* ambient brand */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-navy/5 via-transparent to-brand/5" />

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-brand bg-navy font-display text-2xl font-extrabold text-brand shadow-lg">
            JT
          </span>
          <h1 className="mt-4 font-display text-2xl font-extrabold text-text-main">
            JOKITUGASAJA_ID
          </h1>
          <p className="mt-1 text-xs font-semibold tracking-[0.18em] text-text-muted">
            CEPAT · MURAH · TERPERCAYA
          </p>
          <p className="mt-4 text-sm text-text-secondary">
            Dashboard manajemen agency — masuk sebagai{" "}
            <strong>Owner</strong> atau <strong>Admin tim</strong>.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-card border border-slate-200 bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,0.05)]"
        >
          <div className="space-y-4">
            <Field label="Email">
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="admin.tim1@jokitugasaja.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-danger">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={busy}
            className="mt-5 w-full py-3"
          >
            {busy ? "Memeriksa…" : "Masuk"}
          </Button>

          <p className="mt-4 text-center text-xs text-text-muted">
            Akun dibuat oleh Owner. Lupa password? Hubungi Owner.
          </p>
        </form>
      </div>
    </div>
  );
}
