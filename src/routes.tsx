import type { ReactNode } from "react";
import { Navigate, Outlet, createBrowserRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
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
import { PengaturanPage } from "./pages/PengaturanPage";
import { JadwalSetorPage } from "./pages/JadwalSetorPage";
import { DomainOwnerPage } from "./pages/DomainOwnerPage";
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

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/rekap", element: <RekapHarianPage /> },
      { path: "/rekap/:adminId", element: <DetailRekapPage /> },
      { path: "/pesanan", element: <PesananPage /> },
      { path: "/pesanan/baru", element: <TambahPesananPage /> },
      { path: "/penjoki", element: <PenjokiPage /> },
      { path: "/penjoki/manajemen", element: <PenjokiManajemenPage /> },
      { path: "/jadwal", element: <JadwalSetorPage /> },
      { path: "/domain-owner", element: <DomainOwnerPage /> },
      { path: "/notifikasi", element: <NotifikasiPage /> },
      { path: "/pengaturan", element: <PengaturanPage /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

export function AppProviders({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
