# Audit Sinkronisasi Web vs Sheet — 14 Nov 2026

Sumber: `data/Data Customer Jokitugasaja_id (4).xlsx` (sheet September, Oktober, November)
vs database Supabase yang dipakai web (`tabel pesanan`), plus aturan tampilan di
`src/lib/types.ts` dan `src/lib/fee.ts`.

Status: **read-only**, tidak ada data yang diubah.

---

## 1. Ringkasan

Data September & Oktober yang tersimpan di database **identik dengan sheet**:
jumlah baris, tanggal, tim, dan Payment Cust semuanya cocok 100%.

Yang membuat web terlihat "tidak sinkron" dengan sheet ada 5 hal:

| # | Temuan | Dampak |
|---|--------|--------|
| 1 | **Data November tidak ada di web** (0 baris vs 353 baris di sheet) | Transaksi 1–13 Nov, termasuk data 13 Nov (kemarin), tidak muncul sama sekali |
| 2 | **5 baris Oktober dikecualikan dari rekap**, tetapi tetap tampil di halaman Transaksi | Transaksi = 541 baris / Rp39.731.500; Rekap & Statistik = 536 baris / Rp39.355.500 |
| 3 | **Fee Penjoki 49%** di web vs **50%** di sheet | Web sudah benar (1% masuk Kas); formula sheet perlu diperbarui, selisih Rp538.845 |
| 4 | **Kolom Status Gaji di sheet tidak diimpor** | 55 baris yang di sheet belum TRUE tetap dianggap LUNAS di web |
| 5 | **17 grup transaksi duplikat persis** di sheet (ikut masuk web) | Potensi dobel Rp768.000, perlu keputusan owner |

Halaman yang default-nya kosong hari ini: **Data Rekap Harian** (default
harian = 14 Nov), **Domain Owner** (harian = 14 Nov), **Statistik Tim**
(bulanan = November). Hanya **Transaksi** yang otomatis lompat ke tanggal data
terakhir (31 Okt).

---

## 2. Angka per bulan

| Bulan | Sheet (baris / total) | Database | Halaman Rekap + Statistik | Halaman Transaksi |
|---|---|---|---|---|
| September | 231 / Rp14.153.000 | 231 / Rp14.153.000 | 231 / Rp14.153.000 | 231 / Rp14.153.000 |
| Oktober | 541 / Rp39.731.500<br>(footer Excel Rp39.355.500) | 541 / Rp39.731.500 | **536 / Rp39.355.500** | **541 / Rp39.731.500** |
| November | 353 / Rp27.857.500 | **0 / Rp0** | 0 / Rp0 | 0 / Rp0 |
| **Total** | **1.125 / Rp81.742.000** | 772 / Rp53.884.500 | 767 / Rp53.508.500 | 772 / Rp53.884.500 |

Rincian November yang hilang (per hari, dari sheet):

| Tanggal | Transaksi | Nominal |
|---|---|---|
| 01 Nov | 38 | Rp2.739.000 |
| 02 Nov | 27 | Rp1.777.000 |
| 03 Nov | 40 | Rp2.670.000 |
| 04 Nov | 28 | Rp1.688.000 |
| 05 Nov | 24 | Rp1.903.500 |
| 06 Nov | 23 | Rp1.931.000 |
| 07 Nov | 19 | Rp1.513.500 |
| 08 Nov | 17 | Rp1.156.500 |
| 09 Nov | 38 | Rp3.344.500 |
| 10 Nov | 28 | Rp3.163.000 |
| 11 Nov | 18 | Rp1.550.000 |
| 12 Nov | 33 | Rp2.857.000 |
| **13 Nov (kemarin)** | **20** | **Rp1.564.500** |

---

## 3. Penyebab per temuan

### 3.1 November tidak ada

`scripts/rebuild-data.ts` mengimpor **September + Oktober saja** secara default.
November hanya ikut bila dijalankan dengan `--dengan-november`. Data November
dihapus 14 Nov 2026 pukul 01:12 atas permintaan owner (lihat catatan sesi).

Akibatnya tanggal terakhir di database = **31 Okt 2026**, sehingga:
- halaman dengan periode harian (14 Nov) kosong;
- Statistik Tim bulan November kosong;
- transaksi 13 Nov tidak terlihat.

### 3.2 Lima baris Oktober di luar rekap

`src/lib/types.ts` → `KODE_DI_LUAR_REKAP` + `masukRekap()` mengecualikan 5 baris
agar total Oktober sama dengan footer Excel (`=SUM(E3:E538)`):

| Kode | Tanggal | Tim | Penjoki | Nominal |
|---|---|---|---|---|
| TRX-OKT26-0002 | 01 Okt | Tim 3 | Anita Sari | Rp88.000 |
| TRX-OKT26-0539 | 31 Okt | Tim 4 | Lilis Anggreni | Rp80.000 |
| TRX-OKT26-0540 | 31 Okt | Tim 4 | Ayu Hakikatul Maula | Rp28.000 |
| TRX-OKT26-0541 | 31 Okt | Tim 4 | Ayu Hakikatul Maula | Rp80.000 |
| TRX-OKT26-0542 | 31 Okt | Tim 4 | Ayu Hakikatul Maula | Rp100.000 |
| **Total** | | | | **Rp376.000** |

Dampak per tim di Oktober:

| Tim | Semua transaksi | Masuk rekap | Yang dikecualikan |
|---|---|---|---|
| Tim 2 | 152 / Rp10.613.000 | 152 / Rp10.613.000 | 0 / Rp0 |
| Tim 3 | 248 / Rp19.226.000 | 247 / Rp19.138.000 | 1 / Rp88.000 |
| Tim 4 | 58 / Rp3.149.500 | 54 / Rp2.861.500 | 4 / Rp288.000 |
| Tim 5 | 83 / Rp6.743.000 | 83 / Rp6.743.000 | 0 / Rp0 |
| **Total** | **541 / Rp39.731.500** | **536 / Rp39.355.500** | **5 / Rp376.000** |

`masukRekap()` dipakai di Rekap Harian, Detail Rekap, Domain Owner, dan
Statistik — **tetapi tidak di halaman Transaksi**. Jadi satu database
menghasilkan dua angka berbeda di web.

Catatan khusus "4 baris terakhir Tim 4": keempatnya adalah **baris 539–542**
sheet Oktober (31 Okt, Tim 4, total Rp288.000) — persis 4 dari 5 baris yang
dilewati formula footer `SUM(E3:E538)`. Datanya valid: ada di database, tidak
duplikat, status gaji penjoki/sosmed/owner di sheet semuanya TRUE, dan
masing-masing hanya muncul satu kali. Jadi "masalahnya" bukan isi baris,
melainkan formula total Excel yang berhenti di baris 538.

### 3.3 Fee per transaksi

| Penerima | Sheet | Web (`BAGI_HASIL`) | Selisih |
|---|---|---|---|
| Penjoki | 50% = Rp26.942.250 | 49% = Rp26.403.405 | **−Rp538.845** |
| Admin CS | — (tidak ada di sheet) | 22% = Rp11.854.590 | baru |
| Admin Sosmed | 7% = Rp3.771.915 | 6% = Rp3.233.070 | −Rp538.845 |
| Owner | 20% = Rp10.776.900 | 20% = Rp10.776.900 | Rp0 |
| Kas | — | 3% = Rp1.616.535 | baru |

Perubahan 49/22/6/20/3 adalah keputusan owner 9–10 Nov 2026 (K1 di
`docs/revisi-nov-2026/PLAN.md`) dan **dikonfirmasi ulang oleh owner 14 Nov 2026**:
fee penjoki 49% karena 1% dipindahkan ke Kas.

Bukti konsistensi (total Sep+Okt Rp53.884.500):

| Penerima | Lama | Baru | Selisih → Kas |
|---|---|---|---|
| Penjoki | 50% | 49% | Rp538.845 |
| Admin CS | 23% | 22% | Rp538.845 |
| Admin Sosmed | 7% | 6% | Rp538.845 |
| Owner | 20% | 20% | — |
| Kas | — | 3% | **Rp1.616.535** |

Rp538.845 × 3 = Rp1.616.535 = persis Kas 3%. Jadi **web sudah benar**; yang
outdated adalah formula sheet (`Gaji Penjoki =E*50%`, `Gaji Medsos =E*7%`)
karena belum memuat kolom Kas dan Admin CS. Selama sheet belum diperbarui,
setiap baris akan terlihat beda 1% saat dibandingkan.

### 3.4 Status gaji tidak diimpor

Sheet punya 3 kolom status yang tidak ada di database:

- Status Gaji Penjoki (kolom C)
- Status Gaji Admin Sosmed (kolom G)
- Status Owner (kolom I)

| Bulan | Status Gaji Penjoki ≠ TRUE | Payment | Gaji Penjoki (50%) |
|---|---|---|---|
| September | 15 baris | Rp1.130.000 | Rp565.000 |
| Oktober | 40 baris (24 FALSE + 16 kosong) | Rp3.016.500 | Rp1.508.250 |
| **Total** | **55 baris** | **Rp4.146.500** | **Rp2.073.250** |

Konsentrasi Oktober: **38 dari 40 baris ada di Tim 5** (16 kosong + 22 FALSE),
sisanya 2 baris Tim 3 (Rania Nuril: TRX-OKT26-0369 dan TRX-OKT26-0383).
Artinya kolom status gaji Tim 5 di sheet memang belum diisi, bukan masalah
acak di semua tim.

Semua 772 baris di web berstatus **SELESAI + LUNAS**, jadi web tidak bisa
menunjukkan mana gaji penjoki yang belum dibayar menurut sheet.

### 3.5 Duplikat persis

17 grup (34 baris) dengan kombinasi **tanggal + tim + penjoki + nominal** yang
sama persis. Bisa jadi memang dua pesanan berbeda, bisa juga dobel input.

| Tanggal | Tim | Penjoki | Nominal | Kode |
|---|---|---|---|---|
| 08 Sep | Tim 3 | Lika | Rp42.000 | SEP26-0014 + 0016 |
| 19 Sep | Tim 2 | Wildan Mukhaladun | Rp25.000 | SEP26-0089 + 0090 |
| 22 Sep | Tim 5 | Ni Putu Anik Pradnyantri | Rp60.000 | SEP26-0126 + 0127 |
| 25 Sep | Tim 2 | Zulfa Jalila | Rp35.000 | SEP26-0157 + 0158 |
| 03 Okt | Tim 3 | Lika | Rp35.000 | OKT26-0035 + 0036 |
| 04 Okt | Tim 2 | Zulfa Jalila | Rp30.000 | OKT26-0044 + 0045 |
| 07 Okt | Tim 4 | Ni Kadek Risma Arisanti | Rp40.000 | OKT26-0137 + 0138 |
| 07 Okt | Tim 4 | Alfi Fitria Salsabila | Rp30.000 | OKT26-0141 + 0142 |
| 11 Okt | Tim 2 | Kholilul Anwar | Rp120.000 | OKT26-0230 + 0231 |
| 12 Okt | Tim 3 | Jessiana Olita | Rp40.000 | OKT26-0250 + 0251 |
| 15 Okt | Tim 3 | Rania Nuril | Rp35.000 | OKT26-0321 + 0323 |
| 19 Okt | Tim 2 | Muhammad Fahmi Affani | Rp35.000 | OKT26-0374 + 0375 |
| 21 Okt | Tim 5 | M. Radit Apriansyah | Rp20.000 | OKT26-0422 + 0423 |
| 24 Okt | Tim 3 | Surty Septriana | Rp25.000 | OKT26-0460 + 0462 |
| 27 Okt | Tim 3 | Surty Septriana | Rp60.000 | OKT26-0487 + 0490 |
| 27 Okt | Tim 3 | Surty Septriana | Rp32.000 | OKT26-0489 + 0494 |
| 29 Okt | Tim 3 | Anita Sari | Rp104.000 | OKT26-0521 + 0522 |

Nilai satu salinan duplikat = **Rp768.000**.

---

## 4. Yang sudah cocok (tidak perlu diubah)

- Jumlah baris Sep (231) dan Okt (541) di database = sheet.
- Nominal **Payment Cust** semua baris = sheet (selisih Rp0).
- Tanggal transaksi semua baris = sheet (setelah koreksi tanggal sebelumnya).
- Tim semua baris = kolom "Admin WA" di sheet.
- Fee Owner 20% = sheet.
- Alias nama penjoki konsisten dengan keputusan sebelumnya
  (76× Ni Putu Anik, 9× Ayu Hakikatul, 3× Lilis Anggreini, 1× Muhammad fawaid
  → Kholilul Anwar). Tidak ada baris tanpa penjoki untuk Sep/Okt.

---

## 5. Rekomendasi

### Prioritas 1 — kembalikan data November

Ini yang paling mungkin dirasakan sebagai "data kemarin tidak sinkron".
Perintah (destruktif, wajib backup dulu):

```bash
pnpm db:backup
npx tsx scripts/rebuild-data.ts --yes --dengan-november
npx tsx scripts/verify-rebuild.ts
npx tsx scripts/cek-angka-excel.ts --dengan-november
```

Hasil yang diharapkan: 1.125 baris · Rp81.742.000 (Sep 231, Okt 541, Nov 353).
Setelah itu halaman harian 13 Nov dan Statistik November kembali terisi.

### Prioritas 2 — samakan aturan halaman Transaksi dengan rekap

Pilih salah satu:

- **A. Tandai, jangan sembunyikan** — beri badge "Di luar rekap" pada 5 baris
  dan tampilkan ringkasan "541 baris · Rp39.731.500 (536 baris masuk rekap ·
  Rp39.355.500)". Histori tetap utuh, angka tidak mengejutkan.
- **B. Filter `masukRekap` juga di halaman Transaksi** — angka langsung sama,
  tetapi 5 transaksi tidak lagi terlihat di daftar.
- **C. Perbaiki formula Excel** (SUM sampai baris terakhir) lalu kosongkan
  `KODE_DI_LUAR_REKAP` — total berubah menjadi Rp39.731.500 dan semua halaman
  memakai 541 baris.

### Prioritas 3 — perbarui formula sheet (web sudah benar)

Owner sudah mengonfirmasi **49% final** (1% pindah ke Kas). Tindakan ada di
file Excel client, bukan di aplikasi:

- `Gaji Penjoki` → `=E*49%`
- `Gaji Admin Medsos` → `=E*6%`
- tambah kolom/baris **Admin CS 22%**
- tambah baris **Kas 3%**

Dengan begitu sheet dan web menghasilkan angka fee yang sama per transaksi.
Total Payment tidak berubah.

### Prioritas 4 — impor status gaji (opsional)

Tambahkan kolom `status_gaji_penjoki`, `status_gaji_sosmed`, `status_owner`
ke `pesanan`, isi dari kolom C/G/I sheet, lalu tampilkan di Transaksi/Detail.
Tanpa ini, web tidak akan pernah sama dengan sheet untuk urusan status
pembayaran fee internal.

### Prioritas 5 — review duplikat

Konfirmasi ke owner apakah 17 grup di atas memang pesanan terpisah. Kalau
dobel, hapus satu salinan per grup (Rp768.000) dan sesuaikan acuan total.

---

## 6. Catatan teknis

- Semua nomor dihitung dari `pesanan.harga` (Payment Cust), bukan fee.
- `masukRekap()` = `SELESAI` + `LUNAS` + tidak ada di `KODE_DI_LUAR_REKAP`.
- 100% baris saat ini `SELESAI` + `LUNAS` (772/772).
- Tidak ada transaksi manual di luar pola `TRX-<SHEET>-<baris>`.
- Backup terakhir: `~/backups/agency-tugas/data-2026-11-13T18-10-42.json`.

---

## 7. Tindak lanjut 14 Nov 2026 (sudah dieksekusi)

Berdasarkan data terbaru `data/Data Customer Jokitugasaja_id (5).xlsx`:

1. **Rebuild ulang Sep+Okt** (November tetap tidak diimpor). Backup sebelum eksekusi:
   `~/backups/agency-tugas/data-2026-11-14T07-16-02.json`.
2. **Koreksi nama client**: `Desy Windayani` → **`Dyora Windayani`**. File terbaru
   sudah memakai "Dyora Windayani" (3 transaksi). Hasil: 45 penjoki, **0** bertanda
   "perlu review", tidak ada lagi "Desy" di data aktif.
3. **Transaksi pertama Oktober dimasukkan ke rekap**: `TRX-OKT26-0002`
   (Anita Sari, 1 Okt, Rp88.000) tanggalnya sudah benar. `KODE_DI_LUAR_REKAP`
   tinggal 4 kode (4 baris terakhir Tim 4, Rp288.000).
4. Angka rekap baru:
   - September: 231 baris · Rp14.153.000
   - Oktober: **537 baris · Rp39.443.500** (footer Excel Rp39.355.500 + Rp88.000)
   - Total rekap Sep+Okt: **768 baris · Rp53.596.500** (database tetap 772 baris /
     Rp53.884.500).

### Verifikasi setelah rebuild

- `verify-rebuild.ts`: semua invarian lolos (772 baris · Rp53.884.500 · 45 penjoki ·
  0 perlu review).
- `cek-angka-excel.ts`: baris & nominal Sep/Okt cocok 100%; aplikasi Oktober
  **537 baris · Rp39.443.500** (4 baris dikecualikan · Rp288.000).
- `pnpm check`: semua cek lolos.
- `pnpm build`: sukses.
- Deploy production: https://task-agency.vercel.app (bundle `index-Z4hAkIAi.js`;
  sudah diverifikasi hanya memuat 4 kode exclusion, `TRX-OKT26-0002` tidak lagi
  dikecualikan).
