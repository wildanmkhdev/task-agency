import type { ReactNode } from "react";
import type { PesananStatus } from "../lib/types";
import { gayaStatus } from "../lib/rate";

/** Kartu KPI — hijau gelap bertingkat + aksen emas (mockup JOKITUGASAJA_ID) */
export function StatCard({
  label,
  value,
  sub,
  icon,
  accent = "brand",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ReactNode;
  accent?: "brand" | "navy" | "success" | "warning" | "violet";
}) {
  const accents: Record<string, string> = {
    brand: "bg-brand/15 text-gold border-brand-border",
    navy: "bg-emerald-400/10 text-emerald-300 border-emerald-400/25",
    success: "bg-emerald-400/10 text-emerald-300 border-emerald-400/25",
    warning: "bg-amber-400/10 text-amber-300 border-amber-400/25",
    violet: "bg-fuchsia-400/10 text-fuchsia-300 border-fuchsia-400/25",
  };
  return (
    <div className="card-premium rounded-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            {label}
          </p>
          <p className="mt-2 truncate font-display text-2xl font-extrabold text-text-main">
            {value}
          </p>
          {sub && <p className="mt-1 text-xs text-text-secondary">{sub}</p>}
        </div>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${accents[accent]}`}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

const statusStyle: Record<PesananStatus, string> = {
  MENUNGU: "bg-warning-soft text-warning border-warning-border",
  DIKERJAKAN: "bg-brand-soft text-gold border-brand-border",
  SELESAI: "bg-emerald-400/10 text-emerald-300 border-emerald-400/25",
  BATAL: "bg-red-400/10 text-danger border-red-400/25",
};

const statusLabel: Record<PesananStatus, string> = {
  MENUNGU: "Menunggu",
  DIKERJAKAN: "Dikerjakan",
  SELESAI: "Selesai",
  BATAL: "Batal",
};

export function StatusBadge({ status }: { status: PesananStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusStyle[status]}`}
    >
      {statusLabel[status]}
    </span>
  );
}

/** Badge Rate Keaktifan — ambang saran per §4b (final saat QA client) */
export function RateBadge({ rate }: { rate: number | null }) {
  if (rate === null) {
    return (
      <span className="inline-flex items-center rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-xs font-bold text-text-muted">
        —
      </span>
    );
  }
  let cls = "bg-emerald-400/10 text-emerald-300 border-emerald-400/25";
  if (rate < 45) cls = "bg-red-400/10 text-danger border-red-400/25";
  else if (rate < 60) cls = "bg-orange-400/10 text-orange border-orange-400/25";
  else if (rate < 75) cls = "bg-warning-soft text-warning border-warning-border";
  else if (rate < 90) cls = "bg-brand-soft text-gold border-brand-border";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${cls}`}
    >
      {rate}%
    </span>
  );
}

/** Bar rate dengan warna mengikuti status kinerja. */
/** Bar rate tipis dengan tick marks + titik di ujung, mengikuti mockup "ui rate". */
export function RateBar({
  rate,
  className = "",
  full = false,
  skala = 100,
}: {
  rate: number;
  className?: string;
  /** true = memenuhi lebar induk (dipakai di halaman detail). */
  full?: boolean;
  /** Skala maksimum: 100 (persen) atau 5 (bintang). */
  skala?: number;
}) {
  const width = Math.max(0, Math.min(100, (rate / skala) * 100));
  const g = gayaStatus(rate);
  return (
    <div
      className={`relative h-1.5 ${
        full ? "w-full" : "w-20"
      } overflow-hidden rounded-full bg-surface-3 ${className}`}
    >
      <div
        className={`h-full rounded-full bg-gradient-to-r ${g.bar}`}
        style={{ width: `${width}%` }}
      />
      {/* tick marks tiap 10% */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent 0, transparent calc(10% - 1px), rgba(255,255,255,0.18) calc(10% - 1px), rgba(255,255,255,0.18) 10%)",
        }}
      />
      {width > 0 && (
        <span
          aria-hidden
          className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface ${g.dot}`}
          style={{ left: `${width}%` }}
        />
      )}
    </div>
  );
}

/**
 * Badge status kinerja: Sangat Aktif / Aktif / Cukup Aktif / Kurang Aktif / Perlu Perhatian.
 * `kosong` dipakai bila penjoki belum punya data sama sekali — jangan menilai
 * yang belum diukur.
 */
export function StatusKinerjaBadge({
  rate,
  kosong = false,
}: {
  rate: number;
  kosong?: boolean;
}) {
  if (kosong) {
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-bold text-text-muted">
        Belum ada data
      </span>
    );
  }
  const g = gayaStatus(rate);
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-bold ${g.badge}`}
    >
      {g.label}
    </span>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card-premium rounded-card ${className}`}>{children}</div>
  );
}

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
  title,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "success" | "ghost" | "danger";
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  const variants: Record<string, string> = {
    primary:
      "bg-brand text-[#10231a] hover:bg-brand-hover border-brand shadow-[0_6px_20px_-8px_rgba(217,180,95,0.7)]",
    success: "bg-wa text-[#062316] hover:bg-wa-dark border-wa-dark",
    ghost:
      "bg-surface-2 text-text-main border-line hover:bg-surface-3 hover:border-brand-border",
    danger: "bg-surface-2 text-danger border-red-400/30 hover:bg-red-400/10",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/** Tab pill — aktif = emas */
export function TeamTabs({
  teams,
  value,
  onChange,
  allowAll = true,
  allLabel = "Semua Tim",
}: {
  teams: { id: string; nama: string }[];
  value: string | null;
  onChange: (v: string | null) => void;
  allowAll?: boolean;
  allLabel?: string;
}) {
  const items = allowAll ? [{ id: "", nama: allLabel }, ...teams] : teams;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {items.map((t) => {
        const id = t.id || null;
        const active = value === id || (value === null && id === null);
        return (
          <button
            key={t.id || "all"}
            onClick={() => onChange(id)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all ${
              active
                ? "border-brand bg-brand text-[#10231a]"
                : "border-line bg-surface-2 text-text-secondary hover:border-brand-border hover:text-text-main"
            }`}
          >
            {t.nama}
          </button>
        );
      })}
    </div>
  );
}

export function Spinner({ label = "Memuat data…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-text-muted">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-brand" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-14 text-center">
      <p className="text-sm font-bold text-text-secondary">{title}</p>
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

/** Field input seragam */
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wide text-text-muted">
        {label}
      </span>
      {children}
      {hint && <span className="text-xs text-text-muted">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-text-main outline-none transition-all placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand/20";
