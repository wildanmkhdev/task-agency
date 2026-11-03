# Test Scenario - Data Penjoki CRUD Permission

## ✅ Requirements
1. ❌ Hide Sosmed dari filter tim
2. ✅ Admin bisa lihat semua penjoki (read-only cross-team)
3. ✅ Admin hanya bisa CRUD penjoki di timnya sendiri
4. ✅ Owner bisa CRUD semua penjoki
5. ❌ Hide tab "Admin" (TBD - clarify with user)

## Test Cases

### Test 1: Owner Login
- Login sebagai: `owner@jokitugasaja.id`
- Halaman: Data Penjoki dan Admin
- Expected:
  - ✅ Lihat semua 24 penjoki (Tim 1: 1, Tim 3: 8, Tim 4: 10, Tim 5: 5)
  - ✅ Filter tim: Semua, Tim 1, Tim 2, Tim 3, Tim 4, Tim 5 (NO Sosmed)
  - ✅ Tombol "Tambah Penjoki" visible
  - ✅ Semua penjoki ada tombol Edit/Hapus/Toggle Aktif

### Test 2: Admin Tim 2 Login
- Login sebagai admin Tim 2 (cari di akun_seed.txt)
- Halaman: Data Penjoki dan Admin
- Expected:
  - ✅ Lihat semua 24 penjoki (lintas tim)
  - ✅ Filter tim: Semua, Tim 1, Tim 2, Tim 3, Tim 4, Tim 5 (NO Sosmed)
  - ✅ Tombol "Tambah Penjoki" visible (karena bisa tambah di timnya)
  - ❌ Penjoki Tim 1/3/4/5: TIDAK ada tombol edit/hapus, tampil "Tim lain"
  - ✅ Penjoki Tim 2 (0 penjoki saat ini): jika ada, ada tombol Edit/Hapus
  - ✅ Klik "Tambah Penjoki" → form muncul, Tim dropdown disabled = Tim 2

### Test 3: Admin Tim 3 Login
- Login sebagai admin Tim 3
- Expected:
  - ✅ Lihat semua 24 penjoki
  - ❌ Penjoki Tim 1/2/4/5: tampil "Tim lain"
  - ✅ Penjoki Tim 3 (8 penjoki): ada tombol Edit/Hapus/Toggle
  - ✅ Bisa tambah/edit/hapus penjoki Tim 3 aja

### Test 4: Admin Sosmed Login
- Login sebagai admin Sosmed (Rania)
- Expected:
  - ✅ Lihat semua 24 penjoki
  - ❌ TIDAK ada tombol "Tambah Penjoki"
  - ❌ SEMUA penjoki tampil "Tim lain" (read-only total)
  - ❌ Tidak bisa edit/hapus apapun

## Data Saat Ini
- Tim 1: 1 penjoki
- Tim 2: 0 penjoki (admin bisa tambah)
- Tim 3: 8 penjoki
- Tim 4: 10 penjoki
- Tim 5: 5 penjoki
- Sosmed: 0 penjoki (hidden dari filter)

## Verification
- [ ] Owner: full CRUD semua tim
- [ ] Admin Tim 2: lihat semua, edit cuma Tim 2
- [ ] Admin Tim 3: lihat semua, edit cuma Tim 3
- [ ] Sosmed: lihat semua, edit none
- [ ] Filter tim: Sosmed hidden
- [ ] Stats: update sesuai filter
