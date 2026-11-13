# Test Scenario - Data Penjoki CRUD Permission

## ✅ Requirements
1. Hide Tim 1 dan Sosmed dari filter penjoki.
2. ✅ Admin bisa lihat semua penjoki (read-only cross-team)
3. ✅ Admin hanya bisa CRUD penjoki di timnya sendiri
4. ✅ Owner bisa CRUD semua penjoki
5. Tab Admin CS menampilkan seluruh admin (termasuk Tim 1 dan Sosmed) untuk owner maupun admin.
6. Daftar Admin CS hanya informasi: tanpa panah, tautan, atau navigasi ke rekap harian.

## Test Cases

### Test 1: Owner Login
- Login sebagai: `owner@jokitugasaja.id`
- Halaman: Data Penjoki dan Admin
- Expected:
  - ✅ Lihat semua 24 penjoki (Tim 1: 1, Tim 3: 8, Tim 4: 10, Tim 5: 5)
  - Filter tim: Semua, Tim 2, Tim 3, Tim 4, Tim 5 (tanpa Tim 1 dan Sosmed).
  - ✅ Tombol "Tambah Penjoki" visible
  - ✅ Semua penjoki ada tombol Edit/Hapus/Toggle Aktif

### Test 2: Admin Tim 2 Login
- Login sebagai admin Tim 2 (cari di akun_seed.txt)
- Halaman: Data Penjoki dan Admin
- Expected:
  - ✅ Lihat semua 24 penjoki (lintas tim)
  - Filter tim: Semua, Tim 2, Tim 3, Tim 4, Tim 5 (tanpa Tim 1 dan Sosmed).
  - ✅ Tombol "Tambah Penjoki" visible (karena bisa tambah di timnya)
  - ❌ Penjoki Tim 1/3/4/5: TIDAK ada tombol edit/hapus; tersedia tombol "Lihat" (desktop) atau kartu yang bisa diklik (mobile) menuju detail baca-saja.
  - ✅ Penjoki Tim 2 (0 penjoki saat ini): jika ada, ada tombol Edit/Hapus
  - ✅ Klik "Tambah Penjoki" → form muncul, Tim dropdown disabled = Tim 2

### Test 3: Admin Tim 3 Login
- Login sebagai admin Tim 3
- Expected:
  - ✅ Lihat semua 24 penjoki
  - ❌ Penjoki Tim 1/2/4/5: hanya tombol "Lihat" / kartu menuju detail baca-saja.
  - ✅ Penjoki Tim 3 (8 penjoki): ada tombol Edit/Hapus/Toggle
  - ✅ Bisa tambah/edit/hapus penjoki Tim 3 aja

### Test 4: Admin Sosmed Login
- Login sebagai admin Sosmed (Rania)
- Expected:
  - ✅ Lihat semua 24 penjoki
  - ❌ TIDAK ada tombol "Tambah Penjoki"
  - ❌ SEMUA penjoki hanya punya aksi "Lihat" (read-only total)
  - ❌ Tidak bisa edit/hapus apapun

### Test 5: Informasi Admin CS (Owner dan Admin)
- Login sebagai owner, lalu ulangi dengan admin Tim 2.
- Buka Data Penjoki dan Admin, pilih tab Admin CS.
- Expected:
  - Dea, Naim CS, Widya CS, Vivi CS, Annisa CS, dan Rania sosmed tampil.
  - Nama, jabatan, keterangan, serta nomor HP yang tersedia tetap terlihat.
  - Tim 1 dan Sosmed tetap muncul di informasi admin walaupun disembunyikan dari filter penjoki.
  - Tidak ada panah, tautan, atau tombol navigasi pada kartu admin.
  - Klik nama admin tidak mengubah halaman menjadi rekap harian.

### Test 6: Detail Penjoki Tim Lain (read-only)
- Login sebagai admin Tim 2 (atau admin Sosmed), lalu buka Data Penjoki dan Admin.
- Pilih filter Tim 3 (tim lain), klik "Lihat" pada salah satu penjoki (desktop) atau klik kartunya (mobile).
- Expected:
  - URL berpindah ke `/penjoki/manajemen/<id>` dan judul halaman menjadi "Detail Penjoki".
  - Tampil: nama, no. WhatsApp, tim, admin penanggung jawab, status akun, rating ulasan, tugas bulan ini, rate + status kinerja, keahlian, dan keterangan.
  - Badge "Hanya lihat" tampil; tidak ada tombol Simpan/Nonaktifkan/Hapus.
  - Kartu penjoki tim sendiri tetap membuka form edit inline (tidak berpindah halaman).
  - Penjoki tanpa data (rating kosong & 0 tugas) menampilkan "Belum ada data", bukan angka rate.
  - Owner tetap mendapat aksi Edit/Nonaktifkan/Hapus di daftar.

## Data Saat Ini
- Tim 1: 1 penjoki
- Tim 2: 0 penjoki (admin bisa tambah)
- Tim 3: 8 penjoki
- Tim 4: 10 penjoki
- Tim 5: 5 penjoki
- Sosmed: 0 penjoki (hidden dari filter)

## Verification (2026-11-04)
- [ ] Owner: full CRUD semua tim
- [ ] Admin Tim 2: lihat semua, edit cuma Tim 2
- [ ] Admin Tim 3: lihat semua, edit cuma Tim 3
- [ ] Sosmed: lihat semua, edit none
- [x] Filter tim: hanya Semua dan Tim 2-5, tanpa Tim 1 maupun Sosmed.
- [x] Statistik Total Penjoki dan baris tabel mengikuti filter, termasuk hasil kosong Tim 2.
- [x] Owner dan admin Tim 2: keenam admin termasuk Tim 1 dan Sosmed tampil.
- [x] Daftar Admin CS tanpa tautan/panah; klik nama tidak berpindah ke rekap.
- [x] Vercel production `READY`; owner, admin Tim 2, dan Sosmed pada https://task-agency.vercel.app melihat daftar Admin CS lengkap dan noninteraktif.
- [x] Tampilan owner desktop dan admin mobile diperiksa dengan screenshot.
- [x] `pnpm build` lulus TypeScript dan Vite; warning ukuran bundle tetap ada.

Checklist CRUD di atas tetap belum dicentang karena tidak ada uji mutasi/RLS pada sesi perbaikan tampilan ini.

## Verification (2026-11-08) — Detail Penjoki
- [x] `pnpm build` lulus TypeScript dan Vite.
- [x] Admin Tim 2 membuka penjoki Tim 3 via "Lihat" (desktop) → `/penjoki/manajemen/<id>`, konten lengkap, tanpa tombol tulis.
- [x] Admin Tim 2 mengetuk kartu penjoki tim lain (mobile) → halaman detail; kartu tim sendiri tetap membuka form edit inline.
- [x] Admin Sosmed melihat kolom Aksi berisi "Lihat" dan dapat membuka detail (read-only).
- [x] Owner tetap melihat aksi Edit/Nonaktifkan/Hapus.
- [x] Penjoki tanpa data (Dafa) menampilkan "Belum ada data" tanpa error.
- [x] RLS `penjoki_select`, `pesanan_select_all`, dan `profiles_select_all` = `USING (true)`, sehingga query detail lintas tim lolos tanpa membuka jalur tulis.
