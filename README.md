# task-agency

Dashboard manajemen agency **JokiTugasAja_ID** (jasa joki tugas) — React 19 + TanStack Query + Supabase + Prisma.

> Dokumentasi analisis & keputusan bisnis: [`docs/LAPORAN-ANALISIS-SISTEM.md`](docs/LAPORAN-ANALISIS-SISTEM.md)

## Stack

| Lapisan | Teknologi |
|---------|-----------|
| Frontend | React 19 · Vite · TypeScript · Tailwind CSS v4 · React Router v7 |
| Data fetching | TanStack Query v5 |
| Backend/DB | Supabase (PostgreSQL + Auth) |
| ORM/Migrasi | Prisma (schema + migrasi + seed) |
| Export | jsPDF (PDF) · ExcelJS (Excel) |
| Deploy | Vercel (SPA) |

## Keputusan Kunci (client)

- **D1 — Scoping RBAC**: Owner melihat rekap **ke-5 tim**; Admin **hanya timnya sendiri**. Ditegakkan oleh **Row Level Security di database**, bukan cuma UI.
- **D2 — 1 admin per tim** (terikat `team_id`).
- **D3 — Export PDF & Excel** tersedia di Rekap Harian & Daftar Pesanan.
- **D4 — Design system** mengikuti palette landing page `jokitugasaja.my.id` (light theme, navy `#0e294b` + sky blue `#0284c7`).

## Menjalankan Proyek

```bash
# 1. Install dependency
pnpm install

# 2. Salin environment & isi nilai Supabase (sudah diisi sekali via CLI)
cp .env.example .env

# 3. Migrasi database (butuh DATABASE_URL Supabase)
pnpm db:deploy

# 4. Seed data (tim, jenis tugas, 45 penjoki Tim 2–5 dari rekap DOCX)
pnpm db:seed

# 5. Seed akun login → password dicetak + disimpan di akun_seed.txt
pnpm db:seed:auth

# 6. Jalankan dev server
pnpm dev
```

## Akun Login (hasil seed)

| Peran | Email | Catatan |
|-------|-------|---------|
| Owner | `owner@jokitugasaja.id` | Lihat semua tim, fee & pengaturan |
| Admin | `admin.tim1@…` s/d `admin.tim5@…` | Hanya lihat timnya sendiri |

Password acak ada di `akun_seed.txt` (gitignored). **Ganti setelah login pertama.**

## Struktur

```
prisma/
  schema.prisma        # teams, profiles, jenis_tugas, customers, penjoki, pesanan
  migrations/          # termasuk RLS policies (D1) + trigger auto-profile
  seed.ts              # data dasar + 45 penjoki dari rekap DOCX
scripts/
  seed-auth.ts         # buat akun OWNER + 5 ADMIN via service role
  generate-icons.py    # render ulang favicon + ikon PWA dari src/assets/logo-mark.png
src/
  components/          # AppLayout (sidebar navy), UI kit, Export PDF/Excel, ikon
  context/             # AuthContext (session + profile + role)
  hooks/               # useScope (scoping owner/admin)
  lib/                 # supabase client, tipe DB, format rupiah/tanggal
  pages/               # Login, Dashboard, Rekap Harian, Pesanan, Tambah, Penjoki
  routes.tsx           # router + guard autentikasi
```

## Keamanan

- **RLS**: setiap tabel di-enable; admin hanya `team_id = miliknya`, owner semua (lihat `prisma/migrations/*/migration.sql`).
- Anti-escalan: admin **tidak bisa** mengubah `role`/`team_id` miliknya sendiri via API client.
- `.env` & `akun_seed.txt` tidak di-commit. Jangan pernah menaruh `SERVICE_ROLE_KEY` di Vercel.
- Nomor HP penjoki/customer hanya tampil di lingkup yang berwenang (RLS).

## Statistik Tim

Halaman `/statistik` menampilkan nilai langsung pada batang grafik serta legend warna dan nilai tiap tim di bawahnya, tanpa perlu hover. Label masuk ke dalam batang jika cukup lebar; pada batang pendek, label tampil tepat di sampingnya agar tetap terbaca. Nilai mengikuti tab **Transaksi**, **Pendapatan** (rupiah penuh), atau **Rata-rata Rate** (persen) dan bulan yang dipilih. Nilai nol tetap tampil; rate yang belum terukur ditampilkan sebagai `—`.

## Perintah Berguna

```bash
pnpm db:migrate      # buat migrasi baru (lihat catatan di bawah)
pnpm db:deploy       # terapkan migrasi ke Supabase
pnpm db:seed         # seed data (idempotent)
pnpm db:seed:auth    # seed akun login
pnpm db:cek-excel    # cocokkan DB vs file Excel (baris, grand total, subtotal fee)
pnpm build           # build produksi (tsc + vite)
```

## Sinkronisasi Data Excel

File sumber ada di `data/*.xlsx` (customer/transaksi) dan `data/*.docx` (rekap penjoki). Alur rebuild penuh:

```bash
pnpm db:backup            # backup logis seluruh tabel ke ~/backups/agency-tugas/
pnpm db:rebuild --yes     # hapus pesanan/customer/penjoki lama, impor Sep+Okt + 45 penjoki DOCX
pnpm db:verify            # invarian: total, fee, status, relasi, penjoki
pnpm db:cek-excel         # cocokkan baris & total DB vs file Excel
```

Catatan:

- **Data November 2026 dibersihkan** atas permintaan owner (14 Nov 2026). Importer default
  hanya Sep+Okt; jalankan `--dengan-november` bila ingin mengimpor sheet November lagi.
- Sheet **"Copy of November"** adalah arsip dan **tidak diimpor** (isinya bisa dobel).
- Grand total **Oktober** di file Excel masih memakai formula lama `=SUM(E3:E538)`, sehingga
  melewatkan baris 2 (transaksi pertama) dan baris 539–542 (4 baris terakhir, Tim 4).
  Jumlah seluruh baris = **Rp39.731.500**; footer Excel = **Rp39.355.500**.
  Rekap aplikasi **memasukkan baris 2** (Rp88.000) karena tanggalnya sudah dibetulkan owner
  (14 Nov 2026), dan tetap mengecualikan 4 baris terakhir Tim 4 (Rp288.000) lewat
  `KODE_DI_LUAR_REKAP`. Total rekap Oktober = **Rp39.443.500** (537 baris).
  Perbaiki formula Excel + kosongkan daftar itu bila ingin memakai total baris penuh.
- Grand total data aktif (Sep–Okt 2026) = **772 baris · Rp53.884.500**
  (rekap aplikasi: **768 baris · Rp53.596.500**).
- Semua angka rekap dihitung dari transaksi berstatus **SELESAI + LUNAS**.

> **Catatan Prisma + Supabase**: `prisma migrate dev` memakai *shadow database* yang tidak punya schema `auth`. Untuk migrasi yang menyentuh `auth` (trigger, RLS), edit SQL manual di folder migrasi lalu jalankan **`pnpm db:deploy`**.

## Roadmap (lihat laporan analisis)

- **Fase 3** — Fee owner/admin, Rekap Fee, Jadwal Setor Mingguan, Target bulanan
- **Fase 4** — Formula final Rate Keaktifan, Statistik Tim (chart), Rekomendasi pindah penjoki antar tim
- **Fase 5** — Notifikasi, dark mode, UAT client

Item yang masih menunggu konfirmasi client: rumus fee %, definisi "fisk", formula rate final, data Tim 1 & 2, login penjoki (D5–D8 di laporan).
