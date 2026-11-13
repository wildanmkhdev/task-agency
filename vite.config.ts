import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    /**
     * PWA — revisi 12 Nov 2026.
     *
     * Manifest & ikon sudah tersedia di `public/` (dipakai juga oleh
     * apple-touch-icon di index.html), jadi plugin hanya perlu menghasilkan
     * service worker + mendaftarkannya. `manifest: false` mencegah manifest
     * ganda.
     *
     * Yang di-precache hanya aset statis (app shell). Request data ke
     * Supabase sengaja TIDAK punya runtime-cache rule agar tidak pernah
     * menyajikan data rekap yang basi atau sesi login lama.
     */
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2}"],
        // Bundle utama ~2,3 MB (chart.js + jspdf + exceljs) — naikkan batas
        // default 2 MiB supaya app shell tetap bisa dipakai offline.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // Stylesheet Google Fonts: cepat berubah, cukup revalidate.
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // File font: immutable, aman di-cache lama.
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
