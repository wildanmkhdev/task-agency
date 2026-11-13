import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import logoMark from "../assets/logo-mark.png";
import { Card } from "../components/ui";
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ShareIcon,
} from "../components/icons";
import {
  isIosDevice,
  promptPwaInstall,
  resetInstalled,
  usePwaInstallAvailable,
  usePwaInstalled,
} from "../lib/pwa";

/**
 * Halaman "Download Aplikasi" — pengganti pop-up yang dulu muncul sendiri.
 *
 * Semua akun bisa membukanya dari Pengaturan Akun. Tombol utamanya memanggil
 * dialog instal bawaan browser (Chrome/Edge/Android). Untuk iOS dan browser
 * yang tidak punya dialog bawaan, ditampilkan langkah manual.
 */

function Langkah({
  nomor,
  children,
}: {
  nomor: number;
  children: ReactNode;
}) {
  return (
    <li className="flex items-start gap-2.5 text-[12px] leading-relaxed text-text-muted">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] font-bold text-gold">
        {nomor}
      </span>
      <span>{children}</span>
    </li>
  );
}

export function DownloadAplikasiPage() {
  const installAvailable = usePwaInstallAvailable();
  const installed = usePwaInstalled();
  const ios = isIosDevice();
  const [busy, setBusy] = useState(false);
  const [berhasil, setBerhasil] = useState(false);
  const [tampilkanPanduan, setTampilkanPanduan] = useState(false);
  const [pesanInfo, setPesanInfo] = useState<string | null>(null);

  const pasang = async () => {
    setBusy(true);
    setPesanInfo(null);
    try {
      if (installAvailable) {
        const hasil = await promptPwaInstall();
        if (hasil === "accepted") {
          setBerhasil(true);
        } else if (hasil === "dismissed") {
          setPesanInfo("Pemasangan dibatalkan di browser.");
        }
      } else {
        // Dialog otomatis browser tidak aktif (misal di iOS Safari, atau sudah pernah terpasang di Chrome)
        resetInstalled();
        setTampilkanPanduan(true);
        setPesanInfo(
          ios
            ? "Untuk iOS Safari, gunakan menu Bagikan di bawah layar."
            : "Gunakan menu ⋮ di kanan atas browser untuk memasang aplikasi."
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-3.5">
      {/* Kartu utama */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-b from-brand/15 to-transparent p-5">
          <div className="flex items-center gap-3">
            <img
              src={logoMark}
              alt=""
              className="h-14 w-14 rounded-2xl border border-brand-border/50 bg-surface-2 object-contain p-2"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gold/80">
                Aplikasi Jokitugas Aja
              </p>
              <h2 className="font-display text-lg font-extrabold leading-tight text-text-main">
                Download Aplikasi
              </h2>
              <p className="text-[11px] text-text-muted">
                Pasang di layar utama HP / komputer
              </p>
            </div>
          </div>

          <p className="mt-3 text-[12px] leading-relaxed text-text-muted">
            Akses lebih cepat tanpa buka browser dan tanpa ketik alamat web.
            Cukup ketuk ikonnya di layar HP. Gratis, ringan, dan tidak perlu
            download dari Play Store.
          </p>

          {(installed || berhasil) && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3">
              <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              <div>
                <p className="text-[12px] font-extrabold text-emerald-300">
                  Aplikasi sudah terpasang di perangkat ini
                </p>
                <p className="text-[11px] leading-relaxed text-text-muted">
                  Ikon Jokitugas Aja ada di layar utama perangkat ini. Jika belum muncul,
                  terhapus, atau ingin dipasang ulang, Anda tetap bisa memasangnya kembali lewat tombol di bawah.
                </p>
              </div>
            </div>
          )}

          {/* Tombol CTA Download / Pasang selalu tersedia */}
          <button
            type="button"
            onClick={pasang}
            disabled={busy}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-gold to-[#d9b24c] py-3.5 text-[13px] font-extrabold text-navy shadow-sm transition-all hover:brightness-105 disabled:opacity-60"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {busy
              ? "Membuka dialog…"
              : installed || berhasil
                ? "Pasang Ulang / Download Aplikasi"
                : "Download & Pasang Sekarang"}
          </button>

          {pesanInfo ? (
            <p className="mt-2 text-center text-[11px] font-medium text-gold">
              {pesanInfo}
            </p>
          ) : installAvailable ? (
            <p className="mt-2 text-center text-[10px] text-text-muted">
              Browser akan menampilkan dialog konfirmasi — ketuk “Instal”.
            </p>
          ) : (
            <p className="mt-2 text-center text-[10px] text-text-muted">
              {ios
                ? "Di iOS: ketuk tombol di atas atau ikuti panduan Bagikan Safari di bawah."
                : "Bisa juga dipasang lewat menu titik tiga (⋮) browser di kanan atas."}
            </p>
          )}

          {/* Panduan langkah manual */}
          {(tampilkanPanduan || !installAvailable || installed) && (
            ios ? (
              <div className="mt-4 space-y-2.5 rounded-xl border border-line bg-surface-2/60 p-3.5">
                <p className="text-[11px] font-bold text-text-main">
                  Cara pasang di iPhone / iPad (Safari):
                </p>
                <ol className="space-y-2">
                  <Langkah nomor={1}>
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      Ketuk ikon Bagikan
                      <ShareIcon className="h-3.5 w-3.5 text-gold" />
                      di bawah layar Safari.
                    </span>
                  </Langkah>
                  <Langkah nomor={2}>Pilih “Tambahkan ke Layar Utama”.</Langkah>
                  <Langkah nomor={3}>
                    Ketuk “Tambah” — ikon aplikasi muncul di layar HP.
                  </Langkah>
                </ol>
                <p className="text-[10px] text-text-muted/80">
                  Gunakan Safari. Browser lain di iPhone tidak menyediakan menu
                  “Tambahkan ke Layar Utama”.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-2.5 rounded-xl border border-line bg-surface-2/60 p-3.5">
                <p className="text-[11px] font-bold text-text-main">
                  Cara pasang lewat menu browser (Chrome / Android / Komputer):
                </p>
                <ul className="space-y-1.5 text-[12px] leading-relaxed text-text-muted">
                  <li>
                    •{" "}
                    <span className="font-semibold text-text-main">
                      Chrome di Android:
                    </span>{" "}
                    menu ⋮ → “Instal aplikasi” / “Tambahkan ke layar utama”.
                  </li>
                  <li>
                    •{" "}
                    <span className="font-semibold text-text-main">
                      Chrome di komputer:
                    </span>{" "}
                    klik ikon instal di kanan address bar, lalu “Instal”.
                  </li>
                </ul>
              </div>
            )
          )}
        </div>
      </Card>

      {/* Penjelasan: bukan file APK */}
      <Card className="p-4">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-gold/80">
          Tidak perlu file APK
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-text-muted">
          Aplikasi ini dipasang langsung dari browser, jadi tidak ada file
          unduhan dan tidak muncul peringatan “sumber tidak dikenal”. Hasilnya
          sama: ikon Jokitugas Aja di layar utama, bisa dibuka seperti aplikasi
          biasa.
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-text-muted">
          Aplikasi tetap otomatis diperbarui setiap ada perubahan dari admin —
          tidak perlu download ulang.
        </p>
      </Card>

      {/* Aksi lanjutan */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          to="/"
          className="flex flex-1 items-center justify-center rounded-xl border border-line bg-surface-2 py-3 text-[12px] font-bold text-text-main transition-colors hover:bg-surface-3"
        >
          Kembali ke Beranda
        </Link>
        <Link
          to="/pengaturan"
          className="flex flex-1 items-center justify-center rounded-xl border border-line bg-surface-2 py-3 text-[12px] font-bold text-text-main transition-colors hover:bg-surface-3"
        >
          Pengaturan Akun
        </Link>
      </div>

      <p className="pb-2 text-center text-[10px] text-text-muted/70">
        Butuh bantuan memasang? Hubungi admin.
      </p>
    </div>
  );
}
