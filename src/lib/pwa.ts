import { useSyncExternalStore } from "react";

/**
 * Helper pasang aplikasi (PWA).
 *
 * Browser Chromium (Chrome/Edge/Android) memicu `beforeinstallprompt`.
 * Event itu harus ditangkap SEDINI MUNGKIN dan di-preventDefault, lalu
 * disimpan agar tombol "Download & Pasang" bisa memanggil prompt bawaan
 * browser. iOS Safari tidak punya event ini — di sana ditampilkan langkah
 * manual "Bagikan → Tambahkan ke Layar Utama".
 *
 * Catatan produk (13 Nov 2026): pop-up otomatis dihapus karena mengganggu
 * dan tidak selalu muncul. Pemasangan kini lewat menu "Download Aplikasi"
 * di Pengaturan Akun.
 */

const INSTALLED_KEY = "jokitugas:pwa-installed";

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt: () => Promise<void>;
}

type Listener = () => void;
const listeners = new Set<Listener>();
let deferredPrompt: BeforeInstallPromptEvent | null = null;

function emit(): void {
  for (const listener of listeners) listener();
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage bisa diblokir (mode privat) — abaikan, fitur tetap jalan.
  }
}

/** Sedang dibuka sebagai aplikasi terpasang (bukan tab browser)? */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    iosStandalone
  );
}

export function isInstalled(): boolean {
  return isStandalone() || safeGet(INSTALLED_KEY) === "1";
}
export function resetInstalled(): void {
  try {
    localStorage.removeItem(INSTALLED_KEY);
  } catch {
    // abaikan bila localStorage tidak tersedia
  }
  emit();
}


export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function hasInstallPrompt(): boolean {
  return deferredPrompt !== null;
}

/**
 * Tampilkan dialog instal bawaan browser.
 *
 * Prompt dibatasi 4 detik: sebagian WebView tidak pernah menyelesaikan
 * `prompt()` / `userChoice`, dan tombol tidak boleh macet selamanya.
 */
export async function promptPwaInstall(): Promise<
  "accepted" | "dismissed" | "unavailable"
> {
  const event = deferredPrompt;
  if (!event) return "unavailable";

  const selesai = (outcome: "accepted" | "dismissed") => {
    // Event instal hanya bisa dipakai sekali.
    deferredPrompt = null;
    emit();
    return outcome;
  };

  const hasil = await Promise.race([
    (async () => {
      await event.prompt();
      const choice = await event.userChoice;
      return choice.outcome;
    })().catch(() => null),
    new Promise<null>((resolve) => {
      window.setTimeout(() => resolve(null), 4000);
    }),
  ]);

  return selesai(hasil === "accepted" ? "accepted" : "dismissed");
}

export function subscribePwa(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** True bila browser siap menampilkan dialog instal bawaan. */
export function usePwaInstallAvailable(): boolean {
  return useSyncExternalStore(subscribePwa, hasInstallPrompt, () => false);
}

/** True bila aplikasi sudah terpasang / dibuka dalam mode standalone. */
export function usePwaInstalled(): boolean {
  return useSyncExternalStore(subscribePwa, isInstalled, () => false);
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Cegah mini-infobar default; instalasi lewat tombol di menu Download.
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    safeSet(INSTALLED_KEY, "1");
    emit();
  });
}
