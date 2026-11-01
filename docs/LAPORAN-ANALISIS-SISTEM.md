# LAPORAN ANALISIS SISTEM — JOKITUGASAJA_ID
**Peran:** System Analyst
**Tanggal:** 1 November 2026
**Status:** Draf untuk review internal → bahan diskusi dengan client

---

## 1. Ringkasan Eksekutif

Client (**JokiTugasAja_ID** — jasa joki tugas akademik, tagline *"Cepat – Murah – Terpercaya"*) ingin membangun **web manajemen agency tugas** dengan minimal dua peran: **Owner** dan **Admin CS**, ditambah data **Penjoki** (freelancer pelaksana tugas) yang dikelompokkan per **Tim**.

Bahan yang diterima berupa **4 gambar mockup hasil AI** dan **1 PDF rekap data penjoki**. Hasil analisis: bisnis intinya sudah jelas (alur pesanan → pengerjaan → pembayaran → rekap → fee), **tetapi mockup yang dikirim client terdiri dari 3 arah desain berbeda yang saling bertabrakan** secara istilah, angka, dan model bisnis. Sebelum development, wajib ada sesi *alignment* dengan client untuk memilih desain kanonik dan mematikan rumus fee/rate.

**Estimasi kesiapan:** desain ±60% siap, spesifikasi bisnis ±40% siap. Perlu 1–2 sesi tanya jawab dengan client sebelum masuk coding.

## 1b. Decision Log (Keputusan Terkonfirmasi Client)

| # | Keputusan | Status | Tanggal |
|---|-----------|--------|---------|
| D1 | **Scoping RBAC**: Owner melihat rekap **ke-5 tim**; Admin tiap tim hanya melihat **timnya sendiri** | ✅ Konfirmasi | 1 Nov 2026 |
| D2 | Setiap tim punya **1 admin** | ✅ Konfirmasi | 1 Nov 2026 |
| D3 | **Export PDF & Excel** untuk laporan/rekap/transaksi | ✅ Konfirmasi | 1 Nov 2026 |
| D4 | Arah desain kanonik | ✅ **Putuskan**: ikuti **color palette landing page** `jokitugasaja.my.id` (light theme, navy + sky blue) — TIDAK pakai hijau-emas | 1 Nov 2026 |
| D5 | **Rumus fee per transaksi (FINAL)**: **50% Penjoki + 50% Owner** (otomatis dari harga customer) — **fee admin bukan dari split**, dihitung & **diisi manual oleh owner** per transaksi | ✅ Konfirmasi final | 1 Nov 2026 |
| D6 | Definisi & formula "fisk" + Rate Keaktifan | ⏳ Menunggu client | — |
| D7 | Data Tim 1 & Tim 2 (dari PDF) | ⏳ Menunggu client | — |
| D8 | Apakah penjoki punya login sendiri | ⏳ Menunggu client | — |
| D9 | **Sidebar bisa di-minimize** menjadi icon rail (persist di localStorage) | ✅ Konfirmasi | 1 Nov 2026 |

> **Catatan D5:** Split 50/50 = 100% harga customer → **penjoki + owner**.
> Kolom `fee_penjoki` & `fee_owner` dihitung **otomatis** saat pesanan dibuat (pembulatan ke penjoki, sisa ke owner).
> `fee_admin` **diisi manual oleh owner**: lewat form Tambah Pesanan (khusus owner) atau edit inline di kolom fee pada Daftar Pesanan; default 0 bila belum diisi.

---

## 2. Inventaris Berkas yang Dianalisis

| # | Berkas | Isi |
|---|--------|-----|
| 1 | `WhatsApp Image ... 13.46.03.jpeg` | Mockup **desktop terang (biru)** — 8 layar konsol admin |
| 2 | `WhatsApp Image ... 14.04.51.jpeg` | Mockup **aplikasi mobile gelap (hijau-emas)** — 7 layar role Owner |
| 3 | `WhatsApp Image ... 14.08.46.jpeg` | Duplikat dari #1 (desktop terang) |
| 4 | `7fd2a001-....jpeg` | Mockup **desktop gelap (hijau-emas)** — dashboard Owner+Admin |
| 5 | `REKAP DATA PENJOKI JOKITUGASAJA_ID-1 (1).pdf` | Data master penjoki: **Tim 3, Tim 4, Tim 5** (5 halaman, hal. 5 kosong) |

---

## 3. Pemahaman Domain (Bisnis)

Sistem mengelola agency jasa pengerjaan tugas akademik:

- **Customer** memesan tugas (laporan PKL, makalah, PPT, skripsi, coding, desain, dll.) lewat **Admin CS** (kemungkinan via WhatsApp — mockup mencantumkan field No. WhatsApp).
- **Admin CS** menginput pesanan, menindaklanjuti pembayaran, dan menerima **fee** dari transaksi yang ditanganinya.
- **Penjoki** mengerjakan tugas, tergabung dalam **Tim** (di mockup: Tim 1–5; di PDF baru tersedia data Tim 3–5).
- **Owner** memantau rekap tim, menerima **fee tim**, menargetkan pendapatan bulanan, dan mengatur jadwal setor.
- **Rate keaktifan** = metrik kinerja penjoki per periode (tugas selesai + pembayaran + bukti fisk), dipakai untuk laporan & rekomendasi pemindahan penjoki antar tim.

---

## 4. Interpretasi Mockup per Arah Desain

### A. Konsol Admin — Tema Terang/Biru (desktop, 8 layar)

> Sidebar: Dashboard · Data Rekap Harian · Rincian Transaksi · Penjoki & Rate · Tim · Laporan · Pengaturan. Footer sidebar menampilkan identitas login: *"Admin CS — Tim 1 - Owner"*.

| Layar | Fungsi | Catatan penting |
|-------|--------|-----------------|
| 1. Dashboard (Ringkasan) | Kartu KPI: Total Tugas Selesai, Total Pendapatan, Penjoki Aktif, Tugas Menunggu; feed "Aktivitas Terbaru" | Hanya menampilkan tugas **sudah selesai semua (pembayaran + fisk)** |
| 2. Data Rekap Harian Tim | Filter tanggal + tab per tim (Tim 1–5); tabel: Tanggal, Penjoki, Tugas, Payment Customer; tombol **+ Tambah Data** | Rekap = daftar transaksi selesai per hari |
| 3. Input Pesanan | Form: Informasi Customer (nama, WA, catatan), Jenis Tugas (dropdown), Harga Rp, Penjoki (dropdown + **Rate Keaktifan** ditampilkan), Jumlah/Keterangan | Inti alur transaksi |
| 4. Daftar Penjoki & Rate | Tab per tim; tabel penjoki + tim + rate% + badge status (Sangat Aktif / Aktif / Cukup Aktif / Kurang Aktif / Perlu Perhatian) | Rate dihitung dari tugas selesai + pembayaran + fisk dalam periode |
| 5. Rincian Transaksi | Filter rentang tanggal + tombol **Export**; tabel riwayat transaksi selesai | Export: format belum ditentukan |
| 6. Laporan Rate Keaktifan | Filter periode bulanan + tim; peringkat penjoki (jumlah tugas + rate%) | Insight: penjoki rate tinggi bisa bantu tim yang kekurangan orang |
| 7. Rekomendasi Penjoki Antar Tim | Kartu tim kekurangan orang → daftar kandidat penjoki dari tim lain + tombol **Pilih** | Setelah dipindah, sistem update tim & hitung ulang rate |
| 8. Statistik Tim | Tab Jumlah Tugas / Pendapatan / Rata-rata Rate; bar chart per tim + ringkasan periode | Total Oktober 2026 (contoh): 118 tugas, Rp 9.850.000, rata-rata rate 62% |

### B. App Owner — Mobile Gelap/Hijau-Emas (7 layar)

> Bottom nav: Beranda · Notifikasi · Akun.

| Layar | Fungsi | Catatan penting |
|-------|--------|-----------------|
| Beranda | "Halo, Owner" + menu bernomor: Data Rekap Harian Tim, Data Penjoki dan Admin, Jadwal Setor Mingguan, Domain Owner 🔒, Pengaturan Akun | Menu utama = gerbang ke 5 fitur |
| Data Rekap Harian Tim | Ringkas: Total Transaksi + Total Fee Tim (dengan delta % vs kemarin); daftar per **Admin CS** (Rina CS, Dika CS, Sari CS, ...) beserta jumlah transaksi & nominal | Rekap dihitung **per Admin CS**, bukan per tim penjoki |
| Detail Rekap Harian | Per Admin CS per hari: Total Transaksi, Total Pendapatan, **Fee Tim (Owner)**, **Fee Admin CS**; rincian transaksi (Customer, Nominal, Fee Tim) | Di sini terlihat pembagian fee — Rina CS: Rp 2.450.000 → Fee Owner Rp 490.000 (**20%**) + Fee Admin Rp 1.960.000 (**80%**). **Rumus wajib dikonfirmasi** |
| Data Penjoki dan Admin | Tab Penjoki / Admin CS; pencarian + filter; kartu statistik (Total 24, Aktif 20, Nonaktif 4); daftar dengan status aktif; tombol **+ Tambah Penjoki** | Angka 24 penjoki **tidak cocok** dengan PDF (23) dan mockup biru (8) |
| Jadwal Setor Mingguan | Kalender bulanan (highlight hari ini & tanggal setor) + daftar "Jadwal Mendatang" | Konteks: admin setor ke owner? Arah alur dana perlu dikonfirmasi |
| Domain Owner 🔒 | Halaman terkunci: "Akses Terbatas — hanya untuk owner", input **password owner** | **Isi menu setelah terbuka tidak ada di mockup (gap desain)** |
| Pengaturan Akun | Ubah Profil, Ubah Password, Notifikasi, Tampilan (mode gelap/terang), Tentang Aplikasi, Keluar | Standar |

### C. Dashboard Desktop Gelap/Hijau-Emas (Owner + Admin)

> Sidebar: Beranda · Data Tim · Input Fee · Rekap Fee · Laporan · Transaksi · Pengaturan · Keluar. Ada bottom nav versi mobile (Beranda · Tim · Fee · Laporan · Profil).

- Sapaan "Owner dan Para Admin" — satu tema untuk dua peran.
- KPI: **Total Tim 12 Orang**, **Total Fee Rp 2.560.000 (Hari Ini)**, **Total Transaksi 48 (Hari Ini)**, **Target Bulan Ini Rp 25.000.000 (progress 10%)**.
- Menu Cepat (ikon) + feed Aktivitas Terbaru (Input Fee Baru, Laporan Mingguan, Tim Baru Ditambahkan).
- **Terminologi berbeda dari mockup biru**: di sini modelnya "Fee" (Input Fee / Rekap Fee), bukan "Pesanan/Pembayaran Customer".

---

## 4b. Design System Final (dari landing page client)

Sumber: `https://www.jokitugasaja.my.id/` (diekstrak dari CSS resmi site). **Keputusan: dashboard mengikuti palette ini** — light theme, bukan hijau-emas dari mockup AI.

### Warna
| Token | Nilai | Kegunaan |
|-------|-------|----------|
| Background | `#f8fafc` (slate-50) | Background halaman |
| Surface/Card | `#ffffff` / `rgba(255,255,255,.88)` + `blur(20px)` | Kartu glassmorphism (radius 20px) |
| Border | `#e2e8f0`, hover `#cbd5e1` | Semua card, input, tabel |
| Teks utama | `#0f172a` (slate-900) | Judul & konten |
| Teks sekunder | `#475569` (slate-600) | Deskripsi |
| Teks muted | `#64748b` (slate-500) | Label, placeholder, caption |
| **Brand Navy** | `#0e294b` | Sidebar, header, aksen gelap, nomor langkah |
| **Brand Blue (PRIMARY)** | `#0284c7` | Tombol utama, link, fokus, tab aktif aksen |
| Blue hover | `#0369a1` | Hover tombol utama |
| **WA Green** | `#25d366` | CTA WhatsApp / aksi "positif" (order, selesai) |
| WA Green hover | `#16a34a` | Hover CTA |
| Success | `#10b981` / `#22c55e` | Status aktif, online badge, "lunas" |
| Warning | `#f59e0b` (+ bg `#fffbeb`/`#fef3c7`) | Rating bintang, status "cukup/tunggu" |
| Danger | `#ef4444` | Hapus, nonaktif, "perlu perhatian" |
| Info bubble | `#f0f9ff` / `#e0f2fe` / border `#bae6fd` | Icon chip biru muda |
| Aksen kuning promo | `#fde047`, highlight `#38bdf8` | Badge statistik (pakai hemat) |

### Tipografi & Bentuk
| Token | Nilai |
|-------|-------|
| Font heading | **Outfit** (600–800) |
| Font body | **Plus Jakarta Sans** (400–600) |
| Radius | pill `9999px` (tombol/tab), card `20px`, inner `12px` |
| Shadow | halus: `0 4px 16px rgba(15,23,42,.05)` |
| Pola tab/filter aktif | pill putih → aktif `bg #0f172a` teks putih |

### Penerapan di dashboard (saran mapping komponen)
- **Sidebar** navy `#0e294b` + teks putih; item aktif aksen `#0284c7`.
- **Kartu KPI** putih radius 20 + shadow halus; angka besar font Outfit.
- **Tombol utama** `#0284c7`; **tombol order/aksi selesai** `#25d366`; **ghost/secondary** putih + border slate.
- **Badge status rate**: ≥90 Sangat Aktif `#10b981` · 75–89 Aktif `#0284c7` · 60–74 Cukup Aktif `#f59e0b` · 45–59 Kurang Aktif `#f97316` · <45 Perlu Perhatian `#ef4444` (angka ambang = saran, final saat QA).
- **Badge pembayaran**: Lunas `#10b981` · Menunggu `#f59e0b` · Belum Bayar `#ef4444`.
- **Tabel**: border `#e2e8f0`, zebra `#f8fafc`, header uppercase muted.
- **Chart** (statistik tim): palet `#0e294b`, `#0284c7`, `#38bdf8`, `#25d366`, `#f59e0b`.
- **Export PDF**: header navy + logo, tabel putih; **Export Excel**: header slate, angka rupiah format `#,##0`.

---

## 5. Struktur Data PDF & Temuan Kualitas Data

PDF berisi tabel master penjoki dengan kolom: **Nama · Keahlian · Rating (0–100) · Keterangan (kualitatif) · Nomor (WhatsApp)**.

| Tim | Jumlah | Rating |
|-----|--------|--------|
| Tim 3 | 8 (Dara 85, Anita 82,5, Vina 82, Lita 81, Kak Awas 81, Lika 81, Eca 80, Fadli 79) | 79–85 |
| Tim 4 | 10 (Lilis Anggreni 85, Arisanti 90, Ayu Hakikatul 85, Annisa 90, Abdul Muhith 90, Shinta Kurniawati 75, Firsty Ayesha 73, Alfi Fitria 70, Mita 50, Ami 70) | 50–90 |
| Tim 5 | 5 (Anik 85, Radit 80, Muhyi 70, Tinia 70, Intan 65) | 65–85 |
| **Total** | **23 penjoki** | |

**Temuan kualitas data:**
1. **No. HP ganda**: `085771557776` dipakai **Eca (Tim 3)** dan **Firsty Ayesha (Tim 4)** — salah satu pasti salah, atau memang satu orang dua akun.
2. **Tim 1 & Tim 2 tidak ada datanya** — padahal mockup biru memakai filter Tim 1–5 dan menampilkan penjoki Tim 1/Tim 2 (contoh: "Andi – Tim 2"). Data mockup hanya placeholder.
3. **Rating PDF ≠ Rate Keaktifan di mockup.** PDF: angka mutu/kemampuan (0–100, bisa desimal). Mockup: % keaktifan hasil hitungan transaksi. Ini **dua metrik berbeda** — jangan dicampur.
4. **Nama berupa panggilan** (Kak Awas, Mita, Ami, Eca) — perlu kebijakan penamaan & kemungkinan duplikat nama.
5. **Kolom Keterangan** berisi catatan kualitatif penting untuk matching (ketersediaan, batasan, "kecuali coding dan skripsi", "tidak terima tenggat jam") — layak jadi field terstruktur, bukan hanya teks bebas.
6. **Desimal koma** (82,5) — perlu dinormalkan saat import.
7. Halaman 5 PDF kosong; baris Abdul Muhith terpecah antar halaman 3–4 (irrelevan untuk sistem, hanya catatan import).

---

## 6. Peran & Hak Akses (RBAC)

### ✅ Keputusan Terkonfirmasi (client)
- **Owner** → dapat melihat rekap **ke-5 tim** (view global lintas tim).
- **Admin** → setiap tim memiliki **1 admin**. Admin **HANYA** dapat melihat data timnya sendiri (terkunci untuk tim lain). Isolasi data wajib diterapkan di level query/backend, bukan hanya menyembunyikan menu di UI.
- **Export** → laporan/rekap/transaksi harus bisa diekstrak dalam format **PDF dan Excel**.

| Fitur | Owner | Admin (per Tim) | Penjoki |
|-------|:-----:|:---------------:|:-------:|
| Dashboard ringkasan | ✅ semua 5 tim (bisa drill-down per tim) | ✅ ringkasan **timnya saja** | ❌ (belum ada di mockup) |
| Input pesanan | ✅ | ✅ (timnya saja) | ❌ |
| Rekap harian / rincian transaksi | ✅ semua tim | ✅ **hanya timnya sendiri** | ❌ |
| Lihat data tim lain | ✅ | ❌ **diblokir** | ❌ |
| Kelola penjoki & tim | ✅ penuh | ❓read-only? (perlu konfirmasi) | ❌ |
| Laporan rate / statistik | ✅ lintas tim + banding antar tim | ✅ timnya saja | ❓rate diri sendiri? |
| Rekomendasi/pindah penjoki antar tim | ✅ | ❌ | ❌ |
| Fee owner, rekap fee, jadwal setor | ✅ | ❌ | ❌ |
| Domain Owner (area terkunci) | ✅ | ❌ | ❌ |
| Pengaturan akun | ✅ | ✅ | ✅ |
| Export PDF / Excel | ✅ semua data | ✅ **hanya data timnya** | ❌ |
| Kelola akun (tambah user, reset password) | ✅ | ❌ | ❌ |

### Implementasi scoping (catatan teknis)
- Setiap `Admin` terikat **satu** `team_id` (unique) — field wajib di tabel User/Profil.
- **Setiap query** rekap/pesanan/transaksi/laporan untuk role admin **harus** otomatis di-filter `WHERE team_id = :admin_team_id` di level data layer (backend), bukan mengandalkan filter UI.
- URL/IDOR aman: akses `pesanan?id=X` milik tim lain harus mengembalikan **403/404**, bukan hanya disembunyikan.
- Owner bersifat global (tanpa filter team_id) dengan opsi drill-down per tim.

> **Pertanyaan tersisa:** apakah penjoki juga dapat login? Mockup tidak menampilkan sisi aplikasi penjoki. Jika tidak, semua input dilakukan Admin CS.

---

## 7. Alur Utama (Business Flow)

### 7.1 Alur Pesanan (inti bisnis)
```
Customer hubungi Admin CS (WA)
  → Admin input Pesanan (customer, jenis tugas, harga, penjoki, catatan)
  → Status: MENUNGU → DIKERJAKAN
  → Penjoki selesai kerja → unggah bukti fisk
  → Customer bayar → Admin tandai "pembayaran masuk"
  → Tugas SELESAI (pembayaran ✅ + fisk ✅)
  → Otomatis masuk Rekap Harian tim Admin CS tersebut
```

### 7.2 Alur Fee (owner)
```
Transaksi selesai (per Admin CS, per hari)
  → Total Pendapatan
  → Fee Tim (Owner) = X%   ← RUMUS BELUM DIPASTIKAN (mockup: 20%)
  → Fee Admin CS   = Y%   ← (mockup: 80%) — konfirmasi client!
  → Rekap Fee (harian/bulanan) → Target Bulan Owner (progress bar)
  → Jadwal Setor Mingguan (kalender + pencatatan setoran)
```

### 7.3 Alur Rate Keaktifan
```
Periode (mis. Oktober 2026)
  → hitung per penjoki: tugas selesai + pembayaran + fisk
  → hasilkan Rate% → badge status (Sangat Aktif … Perlu Perhatian)
  → laporan peringkat per tim
  → tim dengan tugas menunggu & penjoki kurang
  → sistem rekomendasikan penjoki rate tinggi dari tim lain
  → owner memilih kandidat ("Pilih") → penjoki pindah tim
  → sistem update tim & hitung ulang rate
```

### 7.4 Alur Domain Owner
```
Owner buka menu Domain Owner → masukkan password owner → akses area khusus
  → ISI AREA INI TIDAK ADA DI MOCKUP (perlu brief client)
```

---

## 8. Temuan: Inkonsistensi & Gap (Prioritas)

### 🔴 Blokir (harus diselesaikan sebelum development)
1. ~~**Tiga arah desain saling bertabrakan**~~ — ✅ **SELESAI**: keputusan client — **ikuti color palette landing page** (light theme navy + sky blue, lihat §4b). Mockup hijau-emas tidak dipakai; struktur fitur mockup biru tetap jadi acuan flow.
2. **Rumus fee belum pasti** — mockup B menunjukkan 20% owner / 80% admin (dari data Rina CS), tapi angka lain (Rp 2.560.000 "Total Fee Hari Ini") tidak diverifikasi. Salah rumus = salah uang.
3. **Definisi "Rate Keaktifan" vs "fisk"** — "fisk" kemungkinan maksudnya *bukti/fisk bukti transfer*, tapi istilah tidak baku; formula rate ("tugas selesai + pembayaran + fisk") belum didefinisikan matematis.
4. **Data Tim 1 & Tim 2 hilang** — mockup memakai 5 tim, PDF hanya berisi Tim 3–5.

### 🟠 Penting (dampak fitur)
5. **Angka penjoki tidak konsisten antar mockup**: 8 (biru), 24 (mobile), 12 "orang" (desktop hijau, label "Total Tim"), 23 (PDF).
6. **Menu "Domain Owner" kosong** — hanya ada halaman password, isinya tidak didesain.
7. **Model "Input Fee" (desktop hijau)** vs **"Input Pesanan" (biru)** — apakah keduanya entitas berbeda (fee vs pesanan) atau dua nama untuk hal yang sama?
8. **Notifikasi** (bel & bottom nav) — tipe notifikasi tidak didefinisikan (tugas masuk? pembayaran? jadwal setor?).
9. ~~**Fitur Export** di Rincian Transaksi~~ — ✅ **SUDAH PUTUSKAN**: export **PDF & Excel** (scope: owner semua data, admin hanya timnya).
10. **Target Bulan Owner** (Rp 25.000.000) — siapa yang set, diubah di mana.

### 🟡 Ringan (keputusan UX)
11. Badge status rate: ambang batas persisnya (mis. ≥90 Sangat Aktif, dst.) belum baku.
12. Akses lihat nomor HP penjoki — data sensitif; perlu kebijakan (mis. hanya owner).
13. Mode gelap/terang di Pengaturan — mockup biru hanya terang, mockup hijau hanya gelap: pilih satu design system dengan 2 mode, atau dua produk terpisah.
14. Tanggal di mockup campur 2025 & 2026 — angka mockup murni placeholder.

---

## 9. Pertanyaan untuk Client (checklist)

**Desain & cakupan**
- [x] ~~Desain mana yang dipakai~~ → **palette landing page `jokitugasaja.my.id`** (light theme, navy `#0e294b` + sky blue `#0284c7`), terdokumentasi di §4b.
- [x] ~~Satu produk atau dua~~ → **web responsif satu produk** (admin & owner sama, dibedakan role).
- [ ] Apakah penjoki punya login/sendiri, atau semua dikelola Admin CS?

**Bisnis & uang**
- [ ] Rumus fee yang benar: berapa % owner dan berapa % admin CS? Berlaku per transaksi atau per omzet?
- [ ] "Fee" (desktop hijau) dan "Pesanan/Pembayaran Customer" (biru) — entitas sama atau beda?
- [ ] Alur dana "Jadwal Setor Mingguan": siapa setor ke siapa, nominal ditentukan bagaimana?
- [ ] "Target Bulan Ini" — diatur owner, otomatis dari budget, atau lainnya?
- [ ] Metode pembayaran yang dipakai (transfer bank/QRIS/dana?) dan di mana bukti disimpan?
- [ ] Apa arti pasti "fisk" dan bagaimana formula Rate Keaktifan?

**Data & operasional**
- [ ] Kirim data Tim 1 & Tim 2 (format sama dengan PDF).
- [ ] Konfirmasi no. HP ganda 085771557776 (Eca vs Firsty Ayesha) — data mana yang benar?
- [ ] "Rating" PDF (0–100) disimpan sebagai kolom terpisah dari Rate Keaktifan, benar?
- [ ] Isi menu "Domain Owner" yang terkunci.
- [ ] Jenis tugas (master dropdown) — daftar resminya & harga per jenis, atau harga bebas input?
- [x] ~~Format export transaksi~~ → **PDF & Excel** (sudah dikonfirmasi).
- [x] ~~Cakupan data admin~~ → **admin hanya lihat timnya sendiri; owner lihat ke-5 tim** (sudah dikonfirmasi).

---

## 10. Planning / Roadmap

### Fase 0 — Alignment & Spesifikasi (sebelum coding, ±3–5 hari kerja)
- Sesi tanya jawab client dengan checklist §9.
- ~~Pilih design system kanonik~~ ✅ selesai (palette landing page, §4b); rapikan istilah (kamus domain: Pesanan, Pembayaran, Fisk, Fee, Setor, Rate).
- Finalisasi formula fee & rate (tulis eksplisit, contoh hitungan nyata).
- Deliverable: dokumen spesifikasi + wireframe final + skema database awal.

### Fase 1 — Fondasi (MVP terkecil)
- Setup project, auth + RBAC (Owner, Admin CS; opsional Penjoki).
- Master data: User/Profil, Tim, Penjoki (import PDF Tim 3–5 → 23 penjoki, no. HP dinormalkan), Jenis Tugas.
- CRUD Admin CS & Penjoki (status aktif/nonaktif, pindah tim).

### Fase 2 — Inti Transaksi (bisnis jalan di sini)
- Form Input Pesanan (+ validasi: customer WA, jenis tugas, harga, penjoki).
- Status lifecycle pesanan: Menunggu → Dikerjakan → Selesai (kunci ganda: pembayaran + fisk).
- Data Rekap Harian (filter tanggal & tim) + Rincian Transaksi.
- **Export PDF & Excel** (rekap harian, rincian transaksi, laporan) — scope owner lintas tim, admin timnya saja.
- Feed Aktivitas Terbaru & dasbor ringkasan KPI.

### Fase 3 — Fee & Owner
- Kalkulasi fee owner/admin (sesuai formula final) → Rekap Fee.
- Jadwal Setor Mingguan (kalender, pencatatan, status).
- Target bulanan + progress.
- Area "Domain Owner" (is sesuai brief final).

### Fase 4 — Analitik & Rate
- Mesin Rate Keaktifan (periode, formula final) → Laporan + badge status.
- Statistik Tim (chart tugas/pendapatan/rata-rata rate).
- Rekomendasi penjoki antar tim + aksi pindah tim + hitung ulang.

### Fase 5 — Pelengkap & Rilis
- Notifikasi (definisi tipe notifikasi final).
- Mode gelap/terang, polish UI, mobile-responsif.
- Import data final client, UAT bersama client (skenario nyata 1 minggu penuh), hardening security (audit akses fee & no. HP), deployment + backup rutin.

> **Strategi rilis:** manfaatkan sifat bisnis yang berulang — target rilis Fase 2 dipakai client **live** untuk input pesanan harian sebelum fitur fee & analitik selesai (adopsi dini + feedback nyata).

---

## 11. Rekomendasi Teknis (indikatif, sesuaikan stack tim)

- **Web (responsive, PWA-capable)** — satu produk untuk admin & owner lebih murah daripada app mobile native. Jika client bersikukuh app mobile, gunakan PWA atau React Native/Expo menyusul.
- **Stack umum yang cocok:** Next.js (TypeScript) + Tailwind + PostgreSQL (Prisma/Drizzle) — cocok untuk dashboard, chart (Recharts), export (xlsx), dan auth berbasis role. Alternatif: Laravel + Inertia/Vue bila tim lebih nyaman PHP.
- **Aturan keamanan minimum:** fee & laporan keuangan hanya role owner; nomor HP penjoki disembunyikan di role admin; semua aksi fee tercatat di audit log; backup database harian.
- **Skema entitas awal:** `User(owner, admin_cs, penjoki)` · `Tim` · `Penjoki` (skill m2m, rating, keterangan, wa, status, tim_id) · `JenisTugas` · `Customer` · `Pesanan` (status, harga, fisk, bayar) · `FeeConfig` · `RekapHarian`(view/snapshot) · `Setoran` · `TargetBulan` · `RateSnapshot`(penjoki, periode, rate) · `ActivityLog`.

---

## 12. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Formula fee salah implementasi | Salah bagi uang → kepercayaan client hilang | Kunci rumus tertulis + unit test hitungan + approval client sebelum rilis Fase 3 |
| Data penjoki kotor (HP ganda, nama bebas) | Duplikat & salah matching | Skrip import tervalidasi + review client sebelum final |
| Scope creep dari 3 desain sekaligus | Terlambat & mahal | Patok design system kanonik tunggal di Fase 0 |
| Keamanan data finansial & no. HP | Kebocoran | RBAC ketat, enkripsi, audit log |
| Client belum bisa决定 desain | Development tertahan | Tawarkan opini rekomendasi (lihat §13) |

---

## 13. Rekomendasi System Analyst

1. **Produk tunggal, web responsif** — admin CS & owner pakai web yang sama dengan tampilan menyesuaikan role. Alasan: hemat biaya, sinkron data real-time, cukup untuk skala 5 tim / ±24 penjoki. App mobile native bisa menyusul bila memang dibutuhkan.
2. **Pakai design system landing page** (§4b) — struktur fitur mockup biru (8 layar) + skin light-theme navy/sky-blue dari brand. Konsistensi dengan site publik = identitas brand menyatu.
3. **Mulai dari Fase 2 setelah Fase 0** — value terbesar client ada di input pesanan + rekap harian; fee & analitik menyusul.

---

*Laporan ini disusun berdasarkan analisis langsung terhadap seluruh berkas yang tersedia. Angka-angka pada mockup diperlakukan sebagai placeholder, bukan data bisnis final.*
