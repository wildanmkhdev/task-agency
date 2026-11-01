import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ArrowRightStartOnRectIcon,
  Bars3Icon,
  ChartBarIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  Cog6ToothIcon,
  ClipboardIcon,
  HomeIcon,
  PlusCircleIcon,
  UsersIcon,
} from "./icons";

const baseNav = [
  { to: "/", label: "Dashboard", icon: HomeIcon, end: true },
  { to: "/rekap", label: "Data Rekap Harian", icon: ClipboardIcon },
  { to: "/pesanan", label: "Daftar Pesanan", icon: ChartBarIcon },
  { to: "/pesanan/baru", label: "Tambah Pesanan", icon: PlusCircleIcon },
  { to: "/penjoki", label: "Penjoki & Rate", icon: UsersIcon, end: true },
];

/** Menu "Manajemen Penjoki" hanya untuk OWNER (CRUD penuh — add/hapus/rating/kategori). */
export function navItems(isOwner: boolean) {
  return isOwner
    ? [
        ...baseNav,
        {
          to: "/penjoki/manajemen",
          label: "Manajemen Penjoki",
          icon: Cog6ToothIcon,
        },
      ]
    : baseNav;
}

const STORAGE_KEY = "jta-sidebar-collapsed";

function SidebarContent({
  collapsed,
  onToggle,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const { profile, signOut } = useAuth();
  const isOwner = profile?.role === "OWNER";
  const initials = (profile?.nama_lengkap ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="flex h-full flex-col bg-navy text-white">
      {/* Brand */}
      <div
        className={`flex items-center gap-3 px-4 pt-6 pb-5 ${collapsed ? "justify-center px-2" : "px-5"}`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand bg-navy-light font-display text-lg font-extrabold text-brand">
          JT
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-extrabold tracking-wide">
              JOKITUGASAJA_ID
            </p>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-sky-300/80">
              CEPAT · MURAH · TERPERCAYA
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems(isOwner).map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center rounded-xl text-sm font-semibold transition-all ${
                collapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-2.5"
              } ${
                isActive
                  ? "bg-brand text-white shadow-[0_4px_14px_rgba(2,132,199,0.35)]"
                  : "text-slate-300 hover:bg-navy-light hover:text-white"
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      {/* Toggle minimize */}
      <button
        onClick={onToggle}
        title={collapsed ? "Perluas sidebar" : "Minimize sidebar"}
        className={`mx-3 mb-2 hidden items-center rounded-xl border border-white/10 py-2 text-slate-300 transition-all hover:bg-navy-light hover:text-white lg:flex ${
          collapsed ? "justify-center" : "gap-3 px-3.5"
        }`}
      >
        {collapsed ? (
          <ChevronDoubleRightIcon className="h-5 w-5" />
        ) : (
          <>
            <ChevronDoubleLeftIcon className="h-5 w-5" />
            <span className="text-xs font-bold">Minimize</span>
          </>
        )}
      </button>

      {/* User + logout */}
      <div className="border-t border-white/10 p-4">
        <div className={`flex items-center gap-3 ${collapsed ? "flex-col" : ""}`}>
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-extrabold text-white"
            title={collapsed ? profile?.nama_lengkap : undefined}
          >
            {initials}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{profile?.nama_lengkap}</p>
              <p className="truncate text-[11px] text-slate-400">
                {isOwner ? "Owner" : `Admin · ${profile?.team?.nama ?? "-"}`}
              </p>
            </div>
          )}
          <button
            onClick={() => signOut()}
            title="Keluar"
            className={`rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white ${
              collapsed ? "" : "ml-auto"
            }`}
          >
            <ArrowRightStartOnRectIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });
  const location = useLocation();
  const { profile } = useAuth();
  const isOwner = profile?.role === "OWNER";
  const initials = (profile?.nama_lengkap ?? "?").slice(0, 2).toUpperCase();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // Pilih yang paling spesifik (mis. /penjoki/manajemen menang atas /penjoki)
  const current = navItems(isOwner)
    .filter((n) =>
      n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)
    )
    .sort((a, b) => b.to.length - a.to.length)[0];

  return (
    <div className="min-h-screen bg-bg-main">
      {/* Sidebar desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden transition-all duration-200 lg:block ${
          collapsed ? "w-[76px]" : "w-64"
        }`}
      >
        <SidebarContent collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </aside>

      {/* Sidebar mobile (selalu lebar) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-text-main/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 shadow-2xl">
            <SidebarContent
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Konten */}
      <div
        className={`transition-all duration-200 ${
          collapsed ? "lg:pl-[76px]" : "lg:pl-64"
        }`}
      >
        {/* Topbar */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-lg border border-slate-200 p-2 text-text-secondary lg:hidden"
                aria-label="Buka menu"
              >
                <Bars3Icon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCollapsed((c) => !c)}
                className="hidden rounded-lg border border-slate-200 p-2 text-text-secondary transition-colors hover:bg-bg-main hover:text-text-main lg:block"
                aria-label={collapsed ? "Perluas sidebar" : "Minimize sidebar"}
                title={collapsed ? "Perluas sidebar" : "Minimize sidebar"}
              >
                <Bars3Icon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="font-display text-lg font-extrabold text-text-main sm:text-xl">
                  {current?.label ?? "Dashboard"}
                </h1>
                <p className="hidden text-xs text-text-muted sm:block">
                  Dashboard manajemen JokiTugasAja_ID
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-text-secondary sm:inline">
                {isOwner
                  ? "Owner — semua tim"
                  : `Admin · ${profile?.team?.nama ?? ""}`}
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-xs font-extrabold text-white">
                {initials}
              </span>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
