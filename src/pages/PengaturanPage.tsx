import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useScope } from "../hooks/useScope";
import { labelJabatan } from "../lib/admin";
import { Button, Card, Field, inputCls } from "../components/ui";
import { usePwaInstalled } from "../lib/pwa";
import {
  ArrowDownTrayIcon,
  ArrowRightStartOnRectIcon,
  BellIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  LockClosedIcon,
  PencilSquareIcon,
  UserIcon,
} from "../components/icons";

type Sheet = "profil" | "password" | "notifikasi" | "tampilan" | "tentang" | null;

function Row({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2/60"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-border/40 bg-surface-2 text-gold">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold text-text-main">{title}</span>
        <span className="block text-[11px] text-text-muted">{desc}</span>
      </span>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-text-muted" />
    </button>
  );
}

/** Pengaturan Akun — mengikuti mockup (profil, ubah profil/password, notifikasi, tampilan, tentang, keluar). */
export function PengaturanPage() {
  const { profile, session, signOut, refreshProfile } = useAuth();
  const { isOwner } = useScope();
  const pwaInstalled = usePwaInstalled();
  const navigate = useNavigate();

  const [sheet, setSheet] = useState<Sheet>(null);

  // Ubah profil
  const [nama, setNama] = useState(profile?.nama_lengkap ?? "");
  const [noHp, setNoHp] = useState(profile?.no_hp ?? "");
  const [profilError, setProfilError] = useState<string | null>(null);
  const [profilBusy, setProfilBusy] = useState(false);

  // Ubah password
  const [pass1, setPass1] = useState("");
  const [pass2, setPass2] = useState("");
  const [passError, setPassError] = useState<string | null>(null);
  const [passBusy, setPassBusy] = useState(false);
  const [passOk, setPassOk] = useState(false);

  // Notifikasi (preferensi lokal)
  const [notifAktif, setNotifAktif] = useState(
    () => localStorage.getItem("jta-notifikasi") !== "0"
  );

  const bukaProfil = () => {
    setNama(profile?.nama_lengkap ?? "");
    setNoHp(profile?.no_hp ?? "");
    setProfilError(null);
    setSheet("profil");
  };

  const simpanProfil = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setProfilBusy(true);
    setProfilError(null);
    const { error } = await supabase
      .from("profiles")
      .update({ nama_lengkap: nama.trim(), no_hp: noHp.trim() || null })
      .eq("id", profile.id);
    if (error) {
      setProfilError(error.message);
      setProfilBusy(false);
      return;
    }
    await refreshProfile();
    setProfilBusy(false);
    setSheet(null);
  };

  const simpanPassword = async (e: FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassOk(false);
    if (pass1.length < 6) {
      setPassError("Password minimal 6 karakter.");
      return;
    }
    if (pass1 !== pass2) {
      setPassError("Konfirmasi password tidak sama.");
      return;
    }
    setPassBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pass1 });
    setPassBusy(false);
    if (error) {
      setPassError(error.message);
      return;
    }
    setPass1("");
    setPass2("");
    setPassOk(true);
  };

  const toggleNotif = () => {
    const baru = !notifAktif;
    setNotifAktif(baru);
    localStorage.setItem("jta-notifikasi", baru ? "1" : "0");
  };

  return (
    <div className="mx-auto max-w-xl space-y-3.5">
      {/* Kartu profil */}
      <div className="card-premium flex items-center gap-3.5 rounded-2xl p-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-brand-border bg-brand/15 font-display text-base font-extrabold text-gold">
          {(profile?.nama_lengkap ?? "?").slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[15px] font-extrabold text-text-main">
            {profile?.nama_lengkap ?? "-"}
          </p>
          <p className="truncate text-[11px] text-text-muted">
            {session?.user.email ?? "-"}
          </p>
          <p className="mt-0.5 truncate text-[10px] font-semibold text-gold/90">
            {isOwner
              ? "Owner"
              : labelJabatan(profile ?? { nama_lengkap: "", team: null })}
          </p>
        </div>
        <button
          onClick={bukaProfil}
          className="rounded-lg border border-line bg-surface-2 p-2 text-text-secondary transition-colors hover:border-brand-border hover:text-gold"
          aria-label="Ubah profil"
        >
          <PencilSquareIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Menu khusus: download / pasang aplikasi */}
      <button
        onClick={() => navigate("/download")}
        className="card-premium flex w-full items-center gap-3.5 rounded-2xl border border-brand-border/50 bg-gradient-to-r from-brand/20 via-surface to-surface p-4 text-left transition-colors hover:border-brand-border"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-border/60 bg-brand/20 text-gold">
          <ArrowDownTrayIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="block text-[13px] font-extrabold text-text-main">
              Download Aplikasi
            </span>
            {pwaInstalled && (
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300">
                Terpasang
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug text-text-muted">
            {pwaInstalled
              ? "Sudah terpasang • Ketuk untuk pasang ulang atau lihat petunjuk"
              : "Pasang Jokitugas Aja di layar utama HP — tanpa buka browser"}
          </span>
        </span>
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-text-muted" />
      </button>

      {/* Menu pengaturan */}
      <Card className="divide-y divide-line-soft overflow-hidden">
        <Row
          icon={<UserIcon className="h-4 w-4" />}
          title="Ubah Profil"
          desc="Nama, nomor HP, dan informasi akun"
          onClick={bukaProfil}
        />
        <Row
          icon={<LockClosedIcon className="h-4 w-4" />}
          title="Ubah Password"
          desc="Ganti password akun Anda"
          onClick={() => {
            setPassError(null);
            setPassOk(false);
            setSheet("password");
          }}
        />
        <Row
          icon={<BellIcon className="h-4 w-4" />}
          title="Notifikasi"
          desc="Pengaturan notifikasi aplikasi"
          onClick={() => setSheet("notifikasi")}
        />
        <Row
          icon={<span className="text-sm">🌙</span>}
          title="Tampilan"
          desc="Mode gelap / terang"
          onClick={() => setSheet("tampilan")}
        />
        <Row
          icon={<InformationCircleIcon className="h-4 w-4" />}
          title="Tentang Aplikasi"
          desc="Versi dan informasi aplikasi"
          onClick={() => setSheet("tentang")}
        />
      </Card>

      {/* Keluar */}
      <button
        onClick={() => signOut()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e8626b] py-3 text-[13px] font-extrabold text-white transition-all hover:bg-[#d9535c]"
      >
        <ArrowRightStartOnRectIcon className="h-4 w-4" />
        Keluar
      </button>

      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSheet(null)}
          />
          <Card className="relative w-full max-w-md rounded-b-none p-5 sm:rounded-card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-extrabold text-text-main">
                {sheet === "profil" && "Ubah Profil"}
                {sheet === "password" && "Ubah Password"}
                {sheet === "notifikasi" && "Notifikasi"}
                {sheet === "tampilan" && "Tampilan"}
                {sheet === "tentang" && "Tentang Aplikasi"}
              </h3>
              <button
                onClick={() => setSheet(null)}
                className="rounded-lg px-2 py-1 text-sm text-text-muted hover:text-gold"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            {sheet === "profil" && (
              <form onSubmit={simpanProfil} className="space-y-3.5">
                <Field label="Nama lengkap">
                  <input
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className={inputCls}
                    placeholder="Nama lengkap"
                  />
                </Field>
                <Field label="No. HP">
                  <input
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    className={inputCls}
                    placeholder="08xx"
                  />
                </Field>
                <Field label="Email" hint="Email login tidak dapat diubah dari sini.">
                  <input
                    value={session?.user.email ?? ""}
                    disabled
                    className={`${inputCls} opacity-60`}
                  />
                </Field>
                {profilError && (
                  <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[12px] font-semibold text-danger">
                    {profilError}
                  </p>
                )}
                <Button type="submit" disabled={profilBusy} className="w-full">
                  {profilBusy ? "Menyimpan…" : "Simpan Perubahan"}
                </Button>
              </form>
            )}

            {sheet === "password" && (
              <form onSubmit={simpanPassword} className="space-y-3.5">
                <Field label="Password baru">
                  <input
                    type="password"
                    value={pass1}
                    onChange={(e) => setPass1(e.target.value)}
                    className={inputCls}
                    placeholder="Minimal 6 karakter"
                  />
                </Field>
                <Field label="Konfirmasi password">
                  <input
                    type="password"
                    value={pass2}
                    onChange={(e) => setPass2(e.target.value)}
                    className={inputCls}
                    placeholder="Ulangi password baru"
                  />
                </Field>
                {passError && (
                  <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[12px] font-semibold text-danger">
                    {passError}
                  </p>
                )}
                {passOk && (
                  <p className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-[12px] font-semibold text-emerald-300">
                    Password berhasil diperbarui.
                  </p>
                )}
                <Button type="submit" disabled={passBusy} className="w-full">
                  {passBusy ? "Menyimpan…" : "Simpan Password"}
                </Button>
              </form>
            )}

            {sheet === "notifikasi" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3">
                  <div>
                    <p className="text-[13px] font-bold text-text-main">
                      Notifikasi aplikasi
                    </p>
                    <p className="text-[11px] text-text-muted">
                      Tampilkan pemberitahuan aktivitas transaksi.
                    </p>
                  </div>
                  <button
                    onClick={toggleNotif}
                    role="switch"
                    aria-checked={notifAktif}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      notifAktif ? "bg-brand" : "bg-surface-3"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                        notifAktif ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-text-muted">
                  Preferensi ini tersimpan di perangkat ini. Notifikasi push
                  browser belum diaktifkan.
                </p>
              </div>
            )}

            {sheet === "tampilan" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-brand-border bg-brand/10 px-4 py-3">
                  <div>
                    <p className="text-[13px] font-bold text-text-main">Mode Gelap</p>
                    <p className="text-[11px] text-text-muted">
                      Aktif — mengikuti desain resmi aplikasi.
                    </p>
                  </div>
                  <span className="rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-extrabold text-[#10231a]">
                    AKTIF
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-text-muted">
                  Mode terang belum tersedia pada versi ini.
                </p>
              </div>
            )}

            {sheet === "tentang" && (
              <div className="space-y-2 text-[12px] leading-relaxed text-text-secondary">
                <p className="font-display text-sm font-extrabold text-text-main">
                  JokiTugasAja_ID
                </p>
                <p>Versi 1.0.0 · Dashboard manajemen agency.</p>
                <p>
                  Aplikasi internal untuk mengelola penjoki, admin, transaksi,
                  rekap harian, dan pembagian fee tim.
                </p>
                <p className="text-[11px] text-text-muted">
                  © {new Date().getFullYear()} JokiTugasAja_ID. Cepat · Murah ·
                  Terpercaya.
                </p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
