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

# 4. Seed data (tim, jenis tugas, 23 penjoki Tim 3/4/5 dari PDF)
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
  seed.ts              # data dasar + 23 penjoki dari PDF
scripts/
  seed-auth.ts         # buat akun OWNER + 5 ADMIN via service role
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

## Perintah Berguna

```bash
pnpm db:migrate      # buat migrasi baru (lihat catatan di bawah)
pnpm db:deploy       # terapkan migrasi ke Supabase
pnpm db:seed         # seed data (idempotent)
pnpm db:seed:auth    # seed akun login
pnpm build           # build produksi (tsc + vite)
```

> **Catatan Prisma + Supabase**: `prisma migrate dev` memakai *shadow database* yang tidak punya schema `auth`. Untuk migrasi yang menyentuh `auth` (trigger, RLS), edit SQL manual di folder migrasi lalu jalankan **`pnpm db:deploy`**.

## Roadmap (lihat laporan analisis)

- **Fase 3** — Fee owner/admin, Rekap Fee, Jadwal Setor Mingguan, Target bulanan
- **Fase 4** — Formula final Rate Keaktifan, Statistik Tim (chart), Rekomendasi pindah penjoki antar tim
- **Fase 5** — Notifikasi, dark mode, UAT client

Item yang masih menunggu konfirmasi client: rumus fee %, definisi "fisk", formula rate final, data Tim 1 & 2, login penjoki (D5–D8 di laporan).
