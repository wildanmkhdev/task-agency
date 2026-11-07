import { Link } from "react-router-dom";
import { MENU_UTAMA } from "../components/AppLayout";
import { ChevronRightIcon, LockClosedIcon, UserIcon } from "../components/icons";
import { useAuth } from "../context/AuthContext";

/** Beranda — mengikuti mockup klien: sapaan, banner emas, 5 kartu menu. */
export function DashboardPage() {
  const { profile } = useAuth();
  const isOwner = profile?.role === "OWNER";
  const sapaan = isOwner ? "Owner" : (profile?.nama_lengkap ?? "Admin");

  return (
    <div className="space-y-4">
      {/* Sapaan */}
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-border/60 bg-gradient-to-br from-surface-3 to-navy text-gold">
          <UserIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate font-display text-xl font-extrabold leading-tight text-text-main">
            Halo, {sapaan}
          </h2>
          <p className="text-[11px] text-text-secondary">
            Selamat datang di aplikasi Jokitugasa_ID
          </p>
        </div>
      </div>

      {/* Banner emas (statis — bukan tautan/tombol) */}
      <div className="flex items-center gap-3 rounded-2xl border border-brand-border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent px-4 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-border bg-brand/15 text-base text-gold">
          👑
        </span>
        <p className="flex-1 font-display text-[13px] font-extrabold leading-snug text-gold-soft">
          Bersama kita tumbuh, menuju hasil yang lebih besar!
        </p>
      </div>

      {/* 5 menu utama — persis urutan mockup */}
      <div className="space-y-2.5">
        {MENU_UTAMA.map((m, i) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.to}
              to={m.to}
              className="card-premium group flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all hover:border-brand-border"
            >
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-border/50 bg-brand/10 text-gold">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-display text-[13px] font-extrabold text-text-main">
                  {i + 1}. {m.label}
                  {m.terkunci && (
                    <LockClosedIcon className="h-3.5 w-3.5 text-gold" />
                  )}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-text-muted">
                  {m.desc}
                </p>
              </div>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-text-muted transition-colors group-hover:text-gold" />
            </Link>
          );
        })}
      </div>

      <p className="px-1 pt-1 text-center text-[10px] italic leading-relaxed text-text-muted">
        Tetap kompak meski berjauhan, tetap solid meski hanya bertemu lewat
        layar, dan tetap semangat menjemput cuan bersama! 🚀
      </p>
    </div>
  );
}
