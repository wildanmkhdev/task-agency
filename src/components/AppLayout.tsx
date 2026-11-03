import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { hanyaBaca } from "../lib/admin";
import logoMark from "../assets/logo-mark.png";
import {
  ArrowLeftIcon,
  ArrowRightStartOnRectIcon,
  ArrowsRightLeftIcon,
  Bars3Icon,
  BellIcon,
  CalendarIcon,
  ChartPieIcon,
  ChevronRightIcon,
  ClipboardIcon,
  Cog6ToothIcon,
  HomeIcon,
  LockClosedIcon,
  PlusCircleIcon,
  UserCircleIcon,
  UsersIcon,
  XMarkIcon,
} from "./icons";

export interface MenuItem {
  to: string;
  label: string;
  desc?: string;
  icon: typeof HomeIcon;
  ownerOnly?: boolean;
}

/** Menu utama — persis mengikuti mockup klien (beranda 5 kartu). */
export const MENU_UTAMA: MenuItem[] = [
  {
    to: "/rekap",
    label: "Data Rekap Harian Tim",
    desc: "Rekap aktivitas dan pendapatan harian.",
    icon: ClipboardIcon,
  },
  {
    to: "/penjoki/manajemen",
    label: "Data Penjoki dan Admin",
    desc: "Data anggota tim dan admin.",
    icon: UsersIcon,
  },
  {
    to: "/jadwal",
    label: "Jadwal Setor Mingguan",
    desc: "Jadwal dan pencatatan setoran mingguan.",
    icon: CalendarIcon,
  },
  {
    to: "/domain-owner",
    label: "Domain Owner",
    desc: "Menu khusus owner dengan akses terbatas.",
    icon: LockClosedIcon,
    ownerOnly: true,
  },
  {
    to: "/pengaturan",
    label: "Pengaturan Akun",
    desc: "Pengaturan akun pengguna.",
    icon: Cog6ToothIcon,
  },
];

/** Menu operasional (tidak tampil di beranda, tetap dapat diakses lewat drawer/sidebar). */
const MENU_OPERASIONAL: MenuItem[] = [
  { to: "/pesanan/baru", label: "Input Fee", icon: PlusCircleIcon },
  { to: "/pesanan", label: "Transaksi", icon: ArrowsRightLeftIcon },
  { to: "/penjoki", label: "Laporan", icon: ChartPieIcon },
];

/** Item yang butuh izin tulis — disembunyikan untuk peran read-only (sosmed). */
const MENU_TULIS = new Set(["/pesanan/baru"]);

/**
 * Menu operasional sesuai hak akses.
 * Admin sosmed bersifat read-only (revisi 3 Nov 2026) → tidak melihat
 * "Input Fee" karena memang tidak boleh menambah transaksi.
 */
function menuOperasionalSesuaiAkses(readOnly: boolean): MenuItem[] {
  return readOnly
    ? MENU_OPERASIONAL.filter((m) => !MENU_TULIS.has(m.to))
    : MENU_OPERASIONAL;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${compact ? "justify-center" : ""}`}>
      <img
        src={logoMark}
        alt="Logo Jokitugasa_ID"
        className="h-10 w-auto shrink-0"
        draggable={false}
      />
      {!compact && (
        <div className="min-w-0">
          <p className="truncate font-display text-[13px] font-extrabold tracking-[0.06em] text-gold-soft">
            JOKITUGASAJA_ID
          </p>
          <p className="text-[8px] font-semibold tracking-[0.22em] text-text-muted">
            CEPAT · MURAH · TERPERCAYA
          </p>
        </div>
      )}
    </div>
  );
}

function NavRow({
  item,
  active,
  onNavigate,
  showDesc = false,
}: {
  item: MenuItem;
  active: boolean;
  onNavigate?: () => void;
  showDesc?: boolean;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
        active
          ? "bg-gradient-to-r from-brand/20 to-transparent text-gold shadow-[inset_2px_0_0_0_#e6c473]"
          : "text-text-secondary hover:bg-surface-2 hover:text-gold-soft"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="flex-1">
        <span className="block">{item.label}</span>
        {showDesc && item.desc && (
          <span className="mt-0.5 block text-[10px] font-medium leading-snug text-text-muted">
            {item.desc}
          </span>
        )}
      </span>
    </NavLink>
  );
}

function DrawerContent({ onNavigate }: { onNavigate: () => void }) {
  const { profile, signOut } = useAuth();
  const { pathname } = useLocation();
  const readOnly = hanyaBaca(profile);
  const menuOps = menuOperasionalSesuaiAkses(readOnly);
  const activeTo = activePath(pathname, [...MENU_UTAMA, ...menuOps]);

  return (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className="flex items-center justify-between px-5 pb-4 pt-6">
        <Brand />
        <button
          onClick={onNavigate}
          className="rounded-lg p-1.5 text-text-muted hover:text-gold"
          aria-label="Tutup menu"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
          Menu
        </p>
        {MENU_UTAMA.map((m) => (
          <NavRow
            key={m.to}
            item={m}
            active={activeTo === m.to}
            onNavigate={onNavigate}
            showDesc
          />
        ))}

        <p className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
          Operasional
        </p>
        {menuOps.map((m) => (
          <NavRow key={m.to} item={m} active={activeTo === m.to} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="border-t border-line/70 p-4">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-border bg-brand/15 text-xs font-extrabold text-gold">
            {(profile?.nama_lengkap ?? "?").slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-text-main">
              {profile?.nama_lengkap}
            </p>
            <p className="truncate text-[11px] text-text-muted">
              {profile?.role === "OWNER"
                ? "Owner"
                : `Admin · ${profile?.team?.nama ?? "-"}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-text-secondary transition-all hover:bg-red-400/10 hover:text-danger"
        >
          <ArrowRightStartOnRectIcon className="h-5 w-5" />
          Keluar
        </button>
      </div>
    </div>
  );
}

function activePath(pathname: string, items: { to: string }[]): string | null {
  const matches = items
    .filter(
      (i) => pathname === i.to || (i.to !== "/" && pathname.startsWith(`${i.to}/`))
    )
    .sort((a, b) => b.to.length - a.to.length);
  return matches[0]?.to ?? null;
}

/** Judul halaman untuk header mobile & topbar desktop. */
function judulHalaman(pathname: string): string {
  if (pathname === "/") return "Beranda";
  if (pathname === "/rekap") return "Data Rekap Harian Tim";
  if (pathname.startsWith("/rekap/")) return "Detail Rekap Harian";
  if (pathname === "/penjoki/manajemen") return "Data Penjoki dan Admin";
  if (pathname === "/jadwal") return "Jadwal Setor Mingguan";
  if (pathname === "/domain-owner") return "Domain Owner";
  if (pathname === "/pengaturan") return "Pengaturan Akun";
  if (pathname === "/notifikasi") return "Notifikasi";
  if (pathname === "/pesanan") return "Transaksi";
  if (pathname === "/pesanan/baru") return "Input Fee";
  if (pathname === "/penjoki") return "Laporan";
  const all = [...MENU_UTAMA, ...MENU_OPERASIONAL];
  const found = all.find((m) => pathname.startsWith(m.to));
  return found?.label ?? "Beranda";
}

const STORAGE_KEY = "jta-sidebar-collapsed";

export function AppLayout({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isOwner = profile?.role === "OWNER";
  const readOnly = hanyaBaca(profile);
  const menuOps = menuOperasionalSesuaiAkses(readOnly);
  const initials = (profile?.nama_lengkap ?? "?").slice(0, 2).toUpperCase();
  const isHome = pathname === "/";
  const title = judulHalaman(pathname);
  const activeTo = activePath(pathname, [...MENU_UTAMA, ...menuOps]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    setDrawerOpen(false);
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="app-canvas min-h-screen">
      {/* Sidebar desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden transition-all duration-200 lg:block ${
          collapsed ? "w-[76px]" : "w-[252px]"
        }`}
      >
        <div className="flex h-full flex-col border-r border-line/70 bg-navy text-white">
          <div className={`flex items-center pb-4 pt-5 ${collapsed ? "justify-center px-2" : "px-5"}`}>
            <Brand compact={collapsed} />
          </div>

          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
            {!collapsed && (
              <p className="px-3 pb-1 pt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-text-muted">
                Menu
              </p>
            )}
            {MENU_UTAMA.map((m) => {
              const Icon = m.icon;
              const active = activeTo === m.to;
              return (
                <NavLink
                  key={m.to}
                  to={m.to}
                  title={collapsed ? m.label : undefined}
                  className={`flex items-center rounded-xl text-[13px] font-semibold transition-all ${
                    collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
                  } ${
                    active
                      ? "bg-gradient-to-r from-brand/20 to-transparent text-gold shadow-[inset_2px_0_0_0_#e6c473]"
                      : "text-text-secondary hover:bg-surface-2 hover:text-gold-soft"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && m.label}
                </NavLink>
              );
            })}

            {!collapsed && (
              <p className="px-3 pb-1 pt-4 text-[9px] font-bold uppercase tracking-[0.2em] text-text-muted">
                Operasional
              </p>
            )}
            {menuOps.map((m) => {
              const Icon = m.icon;
              const active = activeTo === m.to;
              return (
                <NavLink
                  key={m.to}
                  to={m.to}
                  title={collapsed ? m.label : undefined}
                  className={`flex items-center rounded-xl text-[13px] font-semibold transition-all ${
                    collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
                  } ${
                    active
                      ? "bg-gradient-to-r from-brand/20 to-transparent text-gold shadow-[inset_2px_0_0_0_#e6c473]"
                      : "text-text-secondary hover:bg-surface-2 hover:text-gold-soft"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && m.label}
                </NavLink>
              );
            })}
          </nav>

          <button
            onClick={() => setCollapsed((c) => !c)}
            className={`mx-3 mb-2 rounded-xl border border-line py-2 text-[11px] font-bold text-text-muted transition-all hover:border-brand-border hover:text-gold ${
              collapsed ? "px-0" : "px-3 text-left"
            }`}
          >
            {collapsed ? "»" : "« Minimize"}
          </button>

          <div className="border-t border-line/70 p-3">
            <div className={`flex items-center gap-2.5 ${collapsed ? "flex-col" : ""}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-border bg-brand/15 text-[11px] font-extrabold text-gold">
                {initials}
              </span>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-text-main">
                    {profile?.nama_lengkap}
                  </p>
                  <p className="truncate text-[10px] text-text-muted">
                    {isOwner ? "Owner" : `Admin · ${profile?.team?.nama ?? "-"}`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Konten */}
      <div className={`transition-all duration-200 ${collapsed ? "lg:pl-[76px]" : "lg:pl-[252px]"}`}>
        {/* Header mobile */}
        <header className="sticky top-0 z-20 border-b border-line/60 bg-bg-main/85 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              {isHome ? (
                <Brand />
              ) : (
                <>
                  <button
                    onClick={() =>
                      window.history.length > 1 ? navigate(-1) : navigate("/")
                    }
                    className="rounded-lg p-1.5 text-text-secondary"
                    aria-label="Kembali"
                  >
                    <ArrowLeftIcon className="h-5 w-5" />
                  </button>
                  <h1 className="truncate font-display text-[15px] font-extrabold text-text-main">
                    {title}
                  </h1>
                </>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <Link
                to="/notifikasi"
                className="relative rounded-xl border border-line bg-surface-2 p-2 text-text-secondary"
                aria-label="Notifikasi"
              >
                <BellIcon className="h-5 w-5" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-bg-main" />
              </Link>
              <button
                onClick={() => setDrawerOpen(true)}
                className="rounded-xl border border-line bg-surface-2 p-2 text-text-secondary"
                aria-label="Buka menu"
              >
                <Bars3Icon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Topbar desktop */}
        <header className="sticky top-0 z-20 hidden border-b border-line/60 bg-bg-main/85 backdrop-blur-xl lg:block">
          <div className="flex items-center justify-between gap-3 px-8 py-3">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="rounded-lg border border-line bg-surface-2 p-2 text-text-secondary transition-colors hover:text-gold"
                aria-label="Beranda"
              >
                <HomeIcon className="h-4 w-4" />
              </Link>
              <div>
                <h1 className="font-display text-lg font-extrabold text-text-main">
                  {title}
                </h1>
                <p className="text-[11px] text-text-muted">
                  Dashboard manajemen JokiTugasAja_ID
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                to="/notifikasi"
                className="relative rounded-xl border border-line bg-surface-2 p-2 text-text-secondary transition-colors hover:border-brand-border hover:text-gold"
                aria-label="Notifikasi"
              >
                <BellIcon className="h-5 w-5" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-bg-main" />
              </Link>
              <Link
                to="/pengaturan"
                className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-2.5 py-1.5 hover:border-brand-border"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-border bg-brand/15 text-[11px] font-extrabold text-gold">
                  {initials}
                </span>
                <div className="text-left">
                  <p className="text-[11px] font-bold text-text-main">
                    {isOwner ? "Owner" : profile?.nama_lengkap}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    {isOwner
                      ? "Semua tim"
                      : readOnly
                        ? "Admin Sosmed · hanya lihat"
                        : (profile?.team?.nama ?? "Admin")}
                  </p>
                </div>
                <ChevronRightIcon className="h-3.5 w-3.5 text-text-muted" />
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl px-4 py-4 pb-32 sm:px-6 lg:max-w-6xl lg:px-8 lg:py-6 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Bottom nav mobile — 3 item sesuai mockup */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-navy pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {[
            { to: "/", icon: HomeIcon, label: "Beranda", end: true },
            { to: "/notifikasi", icon: BellIcon, label: "Notifikasi", end: false },
            { to: "/pengaturan", icon: UserCircleIcon, label: "Akun", end: false },
          ].map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-w-20 flex-col items-center gap-1 rounded-lg px-3 py-1 text-[10px] font-bold ${
                  isActive ? "text-gold" : "text-text-muted"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Drawer kanan */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 right-0 w-[290px] shadow-2xl">
            <DrawerContent onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}
    </div>
  );
}
