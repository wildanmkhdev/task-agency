import type { ReactNode } from "react";
import { Navigate, Outlet, createBrowserRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { hanyaBaca } from "./lib/admin";
import { AppLayout } from "./components/AppLayout";
import { Spinner } from "./components/ui";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { RekapHarianPage } from "./pages/RekapHarianPage";
import { DetailRekapPage } from "./pages/DetailRekapPage";
import { PesananPage } from "./pages/PesananPage";
import { TambahPesananPage } from "./pages/TambahPesananPage";
import { PenjokiPage } from "./pages/PenjokiPage";
import { PenjokiManajemenPage } from "./pages/PenjokiManajemenPage";
import { StatistikTimPage } from "./pages/StatistikTimPage";
import { PengaturanPage } from "./pages/PengaturanPage";
import { JadwalSetorPage } from "./pages/JadwalSetorPage";
import { NotifikasiPage } from "./pages/NotifikasiPage";

/** Guard: wajib login. Scoping owner/admin ditegakkan RLS di database (D1). */
function RequireAuth() {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-main">
        <Spinner label="Memuat sesi…" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

/**
 * Guard halaman tulis. Admin sosmed read-only (revisi 3 Nov 2026) dialihkan
 * ke rekap — UI dan RLS sama-sama menolak, jadi tidak ada jalan masuk.
 */
function RequireTulis({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  if (hanyaBaca(profile)) return <Navigate to="/rekap" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/rekap", element: <RekapHarianPage /> },
      { path: "/rekap/:adminId", element: <DetailRekapPage /> },
      { path: "/pesanan", element: <PesananPage /> },
      { path: "/pesanan/baru", element: <RequireTulis><TambahPesananPage /></RequireTulis> },
      { path: "/penjoki", element: <PenjokiPage /> },
      { path: "/penjoki/manajemen", element: <PenjokiManajemenPage /> },
      { path: "/statistik", element: <StatistikTimPage /> },
      { path: "/jadwal", element: <JadwalSetorPage /> },
      { path: "/notifikasi", element: <NotifikasiPage /> },
      { path: "/pengaturan", element: <PengaturanPage /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

export function AppProviders({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
