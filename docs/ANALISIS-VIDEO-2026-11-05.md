# ANALISIS VIDEO — REVISI 3 (5 Nov 2026)

**Peran:** Video Analyst / System Analyst
**Tanggal analisis:** 5 November 2026
**Sumber:** 5 video WhatsApp di `revsi baru/` (total 7:07)
**Objek pembanding kode:** repository `agency-tugas` (working tree, commit terakhir `5e2196c` + perubahan belum di-commit)
**Metode:** ekstraksi frame 1 fps, kompensasi gerak kamera (phase correlation), deteksi perubahan konten, pembacaan visual per frame, analisis aktivitas audio, lalu pencocokan ke source code.

---

## 0. Ringkasan Eksekutif

Video-video ini adalah **demo alur aplikasi mobile** (`task-agency.vercel.app`) dari sudut pandang **Naim CS (Admin Tim 2)**, ditambah **satu video pembanding** yang merekam layar laptop berisi panel **"8. Statistik Tim"** dari aplikasi/mockup acuan.

**Yang berjalan baik (terverifikasi):** alur Beranda → Rekap Harian → Detail Rekap per admin → Data Penjoki & Admin → Jadwal Setor → Pengaturan → Transaksi → Laporan semuanya konsisten, pembagian fee 50/23/7/20 tampil benar, mode read-only ("Hanya lihat", "Tim lain") bekerja, dan tampilan khusus Admin Sosmed (2 kartu saja) sudah sesuai aturan bisnis.

**4 temuan yang perlu diperbaiki:**

| # | Temuan | Tingkat | Bukti video |
|---|---|---|---|
| A1 | Semua penjoki tanpa data tampil **42% "Kurang Aktif"** — nilai default, bukan pengukuran | **Tinggi** | v5 00:00–00:12, v1 00:32–00:59 |
| A2 | `lihatSemua = true` masih hardcoded di rekap — semua admin melihat total seluruh agency | **Tinggi (risiko data)** | v1 00:04–00:08 |
| A3 | Label "Total Tugas Selesai" sebenarnya menghitung **transaksi** selesai+lunas | Sedang | v1 00:04–00:08 |
| A4 | FAB "+ Tambah Penjoki" **menutupi badge status** kartu terakhir | Sedang | v5 00:08–00:12 |

**1 gap fitur:** aplikasi acuan punya halaman **Statistik Tim** (chart per tim + ringkasan + delta), sedangkan build kita belum punya route-nya.

---

## 1. Metode & Keterbatasan (jujur di depan)

| Aspek | Status | Keterangan |
|---|---|---|
| Analisis visual | ✅ Selesai | 427 frame @1 fps dianalisis; 208 keyframe; 40 contact sheet dibaca manual |
| Analisis gerakan | ✅ Selesai | Perpindahan kamera dipisahkan dari perubahan konten via phase correlation (lihat §3) |
| Analisis teks di layar | ✅ Selesai | Seluruh teks UI dibaca langsung dari frame resolusi asli (bukan OCR otomatis) |
| **Transkripsi audio** | ❌ **Gagal** | Unduhan model Whisper hanya **~1,2 KB/s** (HuggingFace ter-throttle). Model terkecil pun tidak selesai. **Isi ucapan presenter tidak diketahui.** |
| Analisis aktivitas audio | ✅ Selesai (pengganti) | Deteksi bicara/jeda berbasis level sinyal (lihat §4) |
| Validasi angka vs database | ❌ Tidak bisa | Video hanya menampilkan kondisi 0 transaksi; tidak ada data produksi |

**Konsekuensi:** setiap kesimpulan tentang *maksud* narator tidak bisa saya klaim. Yang saya laporkan hanya yang **terlihat di layar** dan **terdengar polanya** (ada/tidak ada suara).

Cara menutup gap ini (opsional, 1 perintah):

```bash
cd /tmp/opencode && ./wvenv/bin/python asr.py
```

Script `asr.py` sudah siap (faster-whisper 1.2.1 terinstal di `/tmp/opencode/wvenv`); hanya butuh jaringan normal untuk mengunduh model `small` (~460 MB).

---

## 2. Inventaris Video

| ID | File | Durasi | Resolusi | FPS | Ukuran | Isi |
|---|---|---|---|---|---|---|
| V1 | `WhatsApp Video 2026-11-05 at 21.17.10.mp4` | 2:12 | 576×1024 | 30 | 11,4 MB | Tur aplikasi lengkap dari Beranda |
| V2 | `WhatsApp Video 2026-11-05 at 21.19.45.mp4` | 1:49 | 576×1024 | 30 | 9,4 MB | Detail Rekap Harian + empty state transaksi |
| V3 | `WhatsApp Video 2026-11-05 at 21.23.00.mp4` | 1:32 | 576×1024 | 30 | 9,2 MB | **Layar laptop** — panel "8. Statistik Tim" (acuan) |
| V4 | `WhatsApp Video 2026-11-05 at 21.25.19.mp4` | 1:19 | 576×1024 | 30 | 9,1 MB | Jadwal Setor, Pengaturan, Drawer, Transaksi, Laporan |
| V5 | `WhatsApp Video 2026-11-05 at 21.28.32.mp4` | 0:13 | 576×1024 | 30 | 2,1 MB | Filter Tim 2 → 12 penjoki, semua 42% |

> `WhatsApp Video 2026-11-05 at 21.28.32 (1).mp4` **identik** dengan V5 (durasi & ukuran byte sama persis) → duplikat, dilewati.

---

## 3. Analisis Gerakan (kamera & gesture)

Rekaman adalah **handheld portrait** (ponsel direkam sambil dipegang), bukan screen recording digital. Karena itu saya pisahkan dua jenis gerak:

**a. Goyangan kamera (bukan bagian aplikasi)**

| Video | Median pergeseran/frame | Puncak | Catatan |
|---|---|---|---|
| V1 | 7,9 px | 112 px | goyangan tangan tinggi di 00:03–00:24 |
| V2 | 5,6 px | 81 px | stabil setelah 00:40 |
| V3 | 4,1 px | 65 px | kamera diarahkan ke laptop, ada refocus/moire |
| V4 | 6,1 px | 174 px | hentakan besar saat pindah halaman di 00:27–00:40 |
| V5 | 5,3 px | 58 px | cukup stabil |

Artinya: **kualitas bukti visual menurun pada momen goyangan tinggi** — beberapa frame di V1 00:03–00:24 dan V4 00:38 blur. Saya tidak memakai frame blur sebagai dasar temuan.

**b. Interaksi pada layar (gesture yang terbaca)**

| Momen | Jenis gerakan | Dampak di layar |
|---|---|---|
| V1 00:04 | tap kartu "1. Data Rekap Harian Tim" | pindah halaman |
| V1 00:10 | tap "Naim CS" | buka Detail Rekap |
| V1 00:19 | tap admin lain (Widya CS) | buka mode "Hanya lihat" |
| V1 00:22 | tap "Rania soemed" | tampilan sosmed (2 kartu) |
| V1 00:32–00:59 | scroll vertikal cepat berulang | daftar penjoki panjang (≈36 baris) |
| V1 00:45 | tap kartu penjoki | buka form Edit |
| V1 00:48–00:51 | scroll form | field di bawah lipatan |
| V1 01:02 | tap toggle "Admin CS" | ganti tab |
| V2 00:34–01:07 | scroll pelan + tahan | membaca kartu fee |
| V3 sepanjang | kamera digeser + jari menunjuk chart | menegaskan angka per tim |
| V4 00:12 | tap menu "Jadwal Setor Mingguan" | kalender + jadwal |
| V4 00:29 | tap "Pengaturan Akun" | profil & menu |
| V4 00:41 | tap hamburger | drawer MENU |
| V4 00:50 / 00:55 | tap "Transaksi" / "Laporan" | 2 halaman operasional |
| V5 00:02 & 00:06 | tap chip "Tim 2" | counter berubah 36 → 12 |

**Pola perilaku penguji:** narator menguji **izin akses** (buka ruangan admin lain, cek tombol tambah hilang) dan **konsistensi angka** (counter vs filter tim). Ini sinyal bahwa fokus revisi kali ini adalah *kebenaran data & hak akses*, bukan tampilan.

---

## 4. Analisis Audio

Transkripsi gagal (§1), tetapi aktivitas suara bisa diukur:

| Video | Durasi | Hening (>0,5 s) | Estimasi bicara | Rasio bicara |
|---|---|---|---|---|
| V1 | 132 s | 38,0 s | ~94 s | 71% |
| V2 | 109 s | 27,8 s | ~81 s | 74% |
| V3 | 92 s | 22,0 s | ~70 s | 76% |
| V4 | 79 s | 36,1 s | ~42 s | 53% |
| V5 | 13 s | 3,7 s | ~9 s | 69% |

**Interpretasi:** pola jeda 0,8–3,1 detik yang teratur dan rata-rata level −26 dB / puncak −5,9 dB menunjukkan **satu orang berbicara langsung (voice-over)**, bukan musik latar. V4 paling banyak jeda → bagian yang paling banyak *melihat* dibanding menjelaskan (wajar: halaman statis seperti Pengaturan & Laporan).

---

## 5. Timeline Terperinci

### V1 — 21.17.10 (2:12) · Tur utama

| Waktu | Layar | Teks/konten yang tampil | Catatan |
|---|---|---|---|
| 00:00–00:03 | Beranda | "Halo, Naim CS", "Selamat datang di aplikasi Jokitugas_ID"; banner "Bersama kita tumbuh, menuju hasil yang lebih besar!"; 4 menu: 1. Data Rekap Harian Tim, 2. Data Penjoki dan Admin, 3. Jadwal Setor Mingguan, 4. Pengaturan Akun; footer quote | Bottom nav terpotong bingkai kamera (bukan bug) |
| 00:04–00:09 | Data Rekap Harian Tim | Tab Harian/Mingguan/Bulanan; "Kamis, 5 November 2026"; **TOTAL PENDAPATAN Rp 0**; **TOTAL TUGAS SELESAI 0**; "— dari kemarin"; "Rekap per Admin / Klik nama untuk detail"; baris: Naim CS (Admin Tim 2), Widya CS (Tim 3), Vivi CS (Tim 4), Annisa CS (Tim 5), Rania soemed | 5 baris = 5 admin (Dea/Admin Utama disembunyikan sesuai commit `35eaf1d`) |
| 00:10–00:13 | Detail Rekap Harian (Naim CS) | 6 kartu: TOTAL TRANSAKSI 0 · TOTAL PENDAPATAN Rp 0 · FEE PENJOKI (50%) Rp 0 · FEE ADMIN CS (23%) Rp 0 · FEE ADMIN SOSMED (7%) Rp 0 · FEE OWNER (20%) Rp 0; "Rincian Transaksi — 0 transaksi · Kamis, 5 November 2026"; tombol "+ Tambah Transaksi" | Tombol tambah muncul karena ini ruangan sendiri |
| 00:16–00:19 | Detail Rekap (Widya CS) | Badge **"Hanya lihat"**; kartu fee lengkap | Read-only lintas tim bekerja |
| 00:22 | Detail Rekap (Rania soemed) | **Hanya 2 kartu**: TOTAL PENDAPATAN + FEE ADMIN SOSMED (7%); tanpa "Rincian Transaksi"; "Hanya lihat" | Sesuai aturan sosmed — **bukan bug** |
| 00:24–00:29 | Kembali ke Rekap → Beranda | — | — |
| 00:32–00:35 | Data Penjoki dan Admin | Chip tim: Tim 2 / Tim 3 / Tim 4 / Tim 5; kartu: Abdul Muhith 63% "Cukup Aktif", Affina Intan Permata 57%, Akmal Falasifa 42% "Kurang Aktif", Alamu Huda 42% | Badge **"Tim lain"** untuk penjoki di luar tim admin |
| 00:38 | idem (scroll atas) | **AKTIF 36 · NONAKTIF 0** | — |
| 00:40–00:44 | idem | Alfi Fitria 49%, Anita Sari 58%, Anton Azni 43%, Annisa Nurpatiana, Ayu Hakikatul 59%, Dara Hayuning Priati; semua "X tugas" = 0 | — |
| 00:45–00:51 | Modal EDIT PENJOKI | NAMA "Akmal Falasifa"; NO. WHATSAPP 085233953004; TIM "Tim 2"; hint "Admin hanya bisa mengelola timnya sendiri."; **RATING ULASAN (%)** placeholder "Contoh: 85"; helper "Rate dihitung dari rating ulasan dan jumlah tugas selesai dalam periode ini."; **KEAHLIAN** chip: Laporan kegiatan, Skripsi/proposal (PBA), Skripsi Bab IV–V & analisis kuantitatif, Makalah, Review jurnal, PPT, Esai ilmiah, Artikel dari skripsi/tesis, Modul ajar/RPP, Desain grafis; "Tambah…"; "Saran: …" | Field "Simpan" ada di bawah lipatan (tidak terlihat di frame, bukan berarti tidak ada) |
| 00:53–00:59 | Daftar penjoki (scroll) | — | — |
| 01:02–01:07 | Toggle **Penjoki / Admin CS** | Admin CS: Dea (Admin Tim Utama), Naim CS (Tim 2), Widya CS (Tim 3), Vivi CS (Tim 4), Annisa CS (Tim 5), Rania soemed (Sekretaris dan Admin Soemed) + nomor HP; keterangan "Informasi seluruh admin, termasuk Admin Tim Utama dan Admin Soemed." | — |
| 01:08–01:22 | Kembali Beranda, scroll | — | Halaman tidak berubah selama ~1 menit terakhir |

### V2 — 21.19.45 (1:49) · Fokus Detail Rekap

| Waktu | Layar | Konten | Catatan |
|---|---|---|---|
| 00:00–00:09 | Beranda | idem V1 | — |
| 00:11–00:31 | Beranda (diam, kamera bergerak) | — | Bagian penjelasan lisan |
| 00:31–00:34 | Data Rekap Harian Tim | idem | — |
| 00:36–01:07 | Detail Rekap Harian (Naim CS) | 6 kartu fee; scroll naik-turun lambat; tombol "+ Tambah Transaksi" | Fokus pembacaan kartu fee |
| 00:86 (1:26) | Rincian Transaksi | "0 transaksi · Kamis, 5 November 2026"; **"Belum ada transaksi"** + "Klik 'Tambah Transaksi' untuk mencatat transaksi pertama." | Empty state tampil benar |
| 01:29–01:47 | idem | — | — |

### V3 — 21.23.00 (1:32) · **Layar laptop (acuan)**

Bukan aplikasi kita. Ponsel merekam layar laptop; terlihat moiré, bezel, dan refleksi.

| Waktu | Konten |
|---|---|
| 00:00–00:20 | Panel **"8. Statistik Tim"**: judul "Statistik Tim", subjudul "Perbandingan jumlah tugas, pendapatan, dan rata-rata rate."; tab **Jumlah Tugas / Pendapatan / Rata-rata Rate**; chart "Jumlah Tugas Selesai per Tim (Oktober 2026)": Tim 1 = 28, Tim 2 = 32, Tim 3 = 26, Tim 4 = 18, Tim 5 = 14; **Ringkasan**: Total Tugas Selesai **118** (+12% dari bulan lalu), Total Pendapatan **Rp 9.850.000** (+18%), Rata-rata Rate Tim **62%** (+7%) |
| 00:00 | Banner info: *"Rate dihitung dari jumlah tugas yang selesai + pembayaran + fisk dalam periode tertentu."* |
| 00:00–01:30 | Kartu atas: **"Hendra · Tim 2 · Naim CS · 60% · Cukup Aktif"** (bar oranye) |
| 00:22, 00:64, 00:87 | Perubahan besar = kamera digeser/di-refocus, bukan navigasi |

**Kenapa saya nilai ini aplikasi acuan, bukan build kita:**
1. Tidak ada route statistik di `src/routes.tsx` (hanya 10 route, tanpa `/statistik`).
2. Palet berbeda: terang + aksen biru navy; aplikasi kita hijau gelap + emas.
3. Teks formula berbeda: acuan "…+ pembayaran + fisk…" vs kode kita `KETERANGAN_RATE` = "Rate dihitung dari rating ulasan dan jumlah tugas selesai dalam periode ini."
4. Penomoran "8." khas slide/mockup berurutan.

**Konsistensi internal acuan:** 28+32+26+18+14 = **118** ✔ cocok dengan ringkasan. Jadi angka acuan valid.

### V4 — 21.25.19 (1:19) · Halaman pendukung

| Waktu | Layar | Konten |
|---|---|---|
| 00:00–00:11 | Beranda | idem |
| 00:12–00:14 | **Jadwal Setor Mingguan** | Kartu "Jadwal Setor Mingguan — Pastikan setoran sesuai dengan tanggal yang telah ditentukan."; kalender **November 2026**, tanggal 5 ditandai; legenda **Hari Ini / Tanggal setor**; **Jadwal Mendatang**: Senin, 9 November 2026 — Setor Mingguan; Senin, 16 November 2026 — Setor Mingguan |
| 00:15–00:28 | Beranda | — |
| 00:29–00:35 | **Pengaturan Akun** | Profil: Naim CS, `admin.tim2@jokitugasaja.id`, "Admin Tim 2"; menu: Ubah Profil, Ubah Password, Notifikasi, **Tampilan (Mode gelap/terang)**, Tentang Aplikasi; tombol merah **Keluar** |
| 00:38–00:40 | Beranda | — |
| 00:41–00:49 | **Drawer MENU** | MENU: Data Rekap Harian Tim, Data Penjoki dan Admin, Jadwal Setor Mingguan, Pengaturan Akun; **OPERASIONAL**: Transaksi, Laporan; footer profil Naim CS |
| 00:50–00:52 | **Transaksi** | Tab **Semua / Menunggu / Dikerjakan / Selesai**; tombol **Export PDF** & **Export Excel**; empty state "Tidak ada transaksi — Ubah filter atau input transaksi baru." |
| 00:55–01:07 | **Laporan** | Keterangan "Laporan kinerja penjoki: daftar penjoki, tim, dan tingkat keaktifannya. Untuk mengubah data penjoki, buka menu Data Penjoki dan Admin (terkunci ke tim Anda)."; search "Cari nama penjoki…"; tombol **Kelola**; kartu: Akmal Falasifa (42%, "Kurang Aktif", "Tugas: 0 bulan ini"), Alamu Huda (42%), Desi Amalia (42%), Desy Windayani, …, Mita Lusari, Muhammad Fahmi Affani — masing-masing dengan chip keahlian & badge **"Aktif"** |
| 01:10–01:18 | Beranda | — |

### V5 — 21.28.32 (0:13) · Bukti filter tim

| Waktu | Konten |
|---|---|
| 00:00–00:06 | Data Penjoki dan Admin, chip **Tim 2** aktif → **TOTAL PENJOKI 12 · AKTIF 12 · NONAKTIF 0**; kartu: Akmal Falasifa 42% "0 tugas", Alamu Huda 42% "0 tugas", Desi Amalia 42% |
| 00:08–00:12 | Desy Windayani 42% "0 tugas"; FAB **"+ Tambah Penjoki"** menimpa badge "Kurang Aktif" kartu terakhir |

---

## 6. Temuan & Kaitan ke Kode

### A1 — Semua penjoki tanpa data tampil "42% — Kurang Aktif" 🔴 **Tinggi**

**Bukti video:** V5 (seluruh 13 detik): 12 penjoki Tim 2, **semuanya persis 42%**, semuanya "0 tugas". V1 00:32–00:44: 42% muncul berulang pada penjoki yang berbeda.

**Kode:**
```ts
// src/lib/rate.ts:27-35
export function hitungRate(rating, tugasBulanIni) {
  const skorTugas = clamp((tugas / TARGET_TUGAS_BULANAN) * 100); // 0 tugas → 0
  const skorUlasan = rating == null ? ULASAN_NETRAL : clamp(rating); // null → 60
  return Math.round(0.7 * skorUlasan + 0.3 * skorTugas); // 0.7*60 + 0 = 42
}
// src/lib/rate.ts:37-43 → 42 ≥ 40 → "kurang" → "Kurang Aktif"
```

**Diagnosis:** 42% bukan hasil pengukuran — itu **nilai fallback matematis** untuk entri kosong (rating null + 0 tugas). Komentar di file menyatakan niatnya "supaya status tidak langsung jatuh", tetapi hasil akhirnya tetap jatuh ke **"Kurang Aktif"**, satu tingkat di atas "Perlu Perhatian".

**Dampak bisnis:** penjoki baru yang belum pernah diberi tugas langsung dicap "Kurang Aktif" di halaman Laporan — berpotensi jadi dasar evaluasi/peringatan yang tidak adil, dan membuat kolom rate tidak informatif (semua angka sama).

**Kenapa ini bukan sekadar kosmetik:** status ini tampil di dua tempat (Data Penjoki & Laporan) dan dipakai admin untuk menilai orang.

**Rekomendasi (pilih satu, saya sarankan #1):**
1. Tambahkan status eksplisit "Belum ada data" saat `rating == null && tugas === 0` — jangan tampilkan angka.
2. Tetap tampilkan 42% tetapi ubah label statusnya jadi netral ("Belum dinilai"), bukan "Kurang Aktif".
3. Naikkan `ULASAN_NETRAL`/ubah bobot — **tidak disarankan**, hanya menggeser ambang tanpa memperbaiki makna.

---

### A2 — `lihatSemua = true` hardcoded di Rekap Harian 🔴 **Tinggi (risiko data)**

**Bukti video:** V1 00:04–00:08 — akun **Admin Tim 2** melihat kartu "TOTAL PENDAPATAN" untuk periode hari itu. Video tidak bisa membuktikan kebocoran (semua angka 0), tetapi kodenya jelas.

**Kode:**
```ts
// src/pages/RekapHarianPage.tsx:110-116
// Semua admin lihat total pendapatan semua transaksi (sama seperti owner/sosmed).
const lihatSemua = true;
const dalamScope = (rows) => lihatSemua ? rows : rows.filter(p => p.dibuat_oleh === profile?.id);
```

**Diagnosis:** scoping data dimatikan oleh **satu konstanta**, bukan oleh peran. Ini pola "flag demo yang tertinggal". Komentar menyebut ini permintaan client, tetapi implementasinya membuka total **untuk semua peran**, termasuk admin CS yang seharusnya terkurung di timnya (bandingkan `useScope.ts` dan RLS).

**Dampak:** (a) angka "Rekap per Admin" bisa tidak cocok dengan isi ruangan masing-masing; (b) jika RLS ketat sementara UI longgar, muncul error/0 tak terjelaskan; (c) jika RLS longgar, ini **kebocoran pendapatan lintas tim**.

**Rekomendasi:** ganti dengan aturan eksplisit berbasis peran (`isOwner || isSosmed`), dan untuk admin CS pakai `scope` dari `useScope()`. Kalau memang client minta "semua admin lihat total agency", jadikan **setting per-anon** yang terdokumentasi, bukan literal `true`.

---

### A3 — "Total Tugas Selesai" sebenarnya menghitung transaksi 🟠 **Sedang**

**Bukti video:** V1 00:04–00:08: "TOTAL TUGAS SELESAI **0**" berdampingan dengan "TOTAL PENDAPATAN Rp 0".

**Kode:**
```tsx
// src/pages/RekapHarianPage.tsx:225-229
<p>Total Tugas Selesai</p>
<p>{rekapScope.length}</p>   // = jumlah baris pesanan
```
```ts
// src/lib/types.ts:78-80
export function masukRekap(p) {
  return p.status === "SELESAI" && p.status_bayar === "LUNAS";
}
```

**Diagnosis:** nilainya = jumlah **transaksi** (pesanan) yang selesai & lunas. Satu pesanan bisa berisi beberapa tugas (ada `jumlah_keterangan`), jadi "tugas" ≠ "transaksi". Di halaman Detail, metrik yang sama diberi nama **"Total Transaksi"** — dua nama untuk satu angka.

**Rekomendasi:** samakan istilah dengan halaman Detail ("Total Transaksi Selesai"), atau bila memang ingin menghitung tugas, jumlahkan `jumlah_keterangan`.

---

### A4 — FAB "+ Tambah Penjoki" menutupi badge status 🟠 **Sedang**

**Bukti video:** V5 00:08–00:12 — tombol oranye menimpa badge "Kurang Aktif" pada kartu Desy Windayani (paling jelas di frame terakhir). V4 01:07 area yang sama.

**Kode:**
```tsx
// src/pages/PenjokiManajemenPage.tsx:774  — daftar mobile
<div className="space-y-2 pb-16 sm:hidden">
// src/pages/PenjokiManajemenPage.tsx:849  — FAB
<button className="fixed bottom-24 right-4 z-20 ... sm:hidden">
```

**Diagnosis:** padding bawah daftar (`pb-16` = 64px) lebih kecil dari ruang yang ditempati FAB (bottom 96px + tinggi ±44px). Kartu terakhir selalu bisa tergeser ke bawah FAB, dan badge kanan-bawah adalah area yang paling sering tertutup.

**Rekomendasi:** `pb-32`/`pb-36` pada container daftar, dan tambahkan `pb-[env(safe-area-inset-bottom)]` agar aman di perangkat dengan home indicator.

---

### A5 — Dua label saling bertentangan dalam satu kartu 🟡 **Rendah–Sedang**

**Bukti video:** V4 00:55–01:07 dan V5 — setiap kartu menampilkan badge hijau **"Aktif"** (kanan atas) *dan* badge oranye **"Kurang Aktif"** (kanan bawah) sekaligus.

**Kode:** `PenjokiManajemenPage.tsx:833-841` (badge akun `p.aktif`) + `StatusKinerjaBadge` (kinerja).

**Diagnosis:** dua konsep berbeda (status akun vs kinerja) memakai kata yang sama-sama mengandung "Aktif", tanpa penanda konteks. Terbaca seperti kontradiksi.

**Rekomendasi:** beri prefiks ("Akun: Aktif" / "Kinerja: Kurang Aktif"), atau ubah badge akun menjadi titik indikator + tooltip.

---

### A6 — Filter "Tim 1" disembunyikan tetapi datanya tetap dihitung 🟡 **Rendah (laten)**

**Kode:**
```tsx
// src/pages/PenjokiManajemenPage.tsx:397 & 465 — chip tim
teams.filter(t => !t.nama.toLowerCase().includes('sosmed') && !t.nama.toLowerCase().includes('tim 1'))
// :74-82 — query tetap mengambil SEMUA penjoki
.from("penjoki").select("*, team:teams(nama)")
// :148-156 — counter memakai `list`
```

**Diagnosis:** Tim 1 tidak bisa difilter, tapi jika ada penjoki Tim 1 di database, mereka **muncul di "Semua Tim"** dan **ikut dihitung** pada TOTAL PENJOKI/AKTIF. Saat ini aman karena seed tidak memuat Tim 1 (`prisma/penjoki-data.ts:5`), jadi ini bug laten.

**Bukti konsistensi angka:** V1 (Semua Tim) = **36**; V5 (Tim 2) = **12**. Counter memang mengikuti filter — perilaku ini **benar**.

**Rekomendasi:** tambahkan exclusion Tim 1 di query (sumber kebenaran tunggal), jangan hanya di UI. Efek samping: filter yang sama juga dipakai halaman Laporan dengan aturan berbeda (`PenjokiPage.tsx:128` hanya menyaring `sosmed`) → satukan ke satu helper.

---

### A7 — Belum ada `manifest` / `theme-color` 🟡 **Rendah**

**Bukti:** seluruh video dijalankan di **browser** (`task-agency.vercel.app` + address bar), bukan mode standalone.

**Kode:** `index.html` hanya punya `<meta name="viewport">`; tidak ada `manifest`, `theme-color`, atau meta iOS.

**Rekomendasi:** tambahkan manifest + `theme-color: #0f2a20` + `display: standalone` → demo ke client terasa seperti aplikasi, dan status bar tidak kontras.

---

## 7. Gap Fitur vs Aplikasi Acuan (dari V3)

| Fitur acuan | Isi | Status di repo kita |
|---|---|---|
| Halaman **Statistik Tim** | Perbandingan per tim: chart batang jumlah tugas, tab Pendapatan & Rata-rata Rate, Ringkasan (total tugas, total pendapatan, rata-rata rate) + delta % vs bulan lalu | ❌ Tidak ada route (`src/routes.tsx:47-65`) |
| Kartu ringkas orang | "Hendra · Tim 2 · Naim CS · 60% · Cukup Aktif" dengan bar progres | ✅ Ekuivalen ada di kartu penjoki kita |
| Banner penjelasan formula rate | "…+ pembayaran + fisk…" | ⚠️ Ada, tetapi **rumusnya berbeda** (kita: 70% ulasan + 30% volume) |

**Dua hal yang harus diklarifikasi ke client sebelum implementasi:**

1. **Rumus rate final mana?** Acuan menyebut "tugas selesai + pembayaran + fisk"; kode kita 70/30 ulasan+volume. Ini bukan beda kosmetik — mengubah rumus akan mengubah semua status kinerja.
2. **Tim 1 ditampilkan atau disembunyikan?** Acuan masih menampilkan Tim 1 (28 tugas) di chart; repo kita justru menyembunyikan Tim 1 dari daftar & filter. Kalau halaman statistik dibuat, keputusan ini harus konsisten.
3. Typo di teks acuan: **"fisk"** (kemungkinan "fiskal" / "fisik") — jangan ikut disalin.

---

## 8. Yang Sudah Benar — Jangan Diubah

Terverifikasi dari video **dan** kode; kalau ada refactor, ini yang harus dijaga:

| Perilaku | Bukti video | Kode |
|---|---|---|
| Admin Sosmed hanya melihat 2 kartu (Total Pendapatan + Fee Admin Sosmed) tanpa Rincian Transaksi | V1 00:22 | `DetailRekapPage.tsx:534-576` |
| Admin lain read-only ("Hanya lihat") & tanpa tombol tambah | V1 00:19, 00:22 | `DetailRekapPage.tsx:126-135` |
| Penjoki tim lain diberi badge "Tim lain" & tidak bisa dibuka | V1 00:32 | `PenjokiManajemenPage.tsx:833` |
| Pembagian fee 50 / 23 / 7 / 20 dari total pendapatan | V1 00:10, V2 seluruh | `src/lib/fee.ts:14-19` |
| Empty state transaksi + filter status | V2 01:26, V4 00:50 | `DetailRekapPage.tsx:631-637` |
| Counter penjoki mengikuti filter tim (36 → 12) | V1 00:38 vs V5 00:00 | `PenjokiManajemenPage.tsx:148-156` |
| Kalender setor + "Jadwal Mendatang" | V4 00:12 | `JadwalSetorPage.tsx` |
| Drawer MENU + grup OPERASIONAL (Transaksi, Laporan) | V4 00:41 | `AppLayout.tsx:54, 473-475` |
| Bottom nav 3 item: Beranda / Notifikasi / Akun | V5 00:12 | `AppLayout.tsx:473-475` |

---

## 9. Prioritas Perbaikan

| Prioritas | Item | Estimasi | Risiko bila dibiarkan |
|---|---|---|---|
| **P0** | A2 — ganti `lihatSemua` hardcoded dengan aturan peran | 1–2 jam | Kebocoran data pendapatan / perilaku tak terduga di produksi |
| **P0** | A1 — status "Belum ada data" untuk penjoki tanpa data | 2–3 jam + test | Evaluasi penjoki tidak adil; rate tidak informatif |
| **P1** | A3 — satukan istilah "Tugas" vs "Transaksi" | 1 jam | Salah tafsir laporan oleh client |
| **P1** | A4 — padding bawah daftar vs FAB | 10 menit | Info penting tertutup di perangkat nyata |
| **P2** | A5 — perjelas label "Aktif" vs "Kurang Aktif" | 30 menit | Kebingungan saat membaca kinerja |
| **P2** | A6 — exclusion Tim 1 dipusatkan di query | 30 menit | Angka counter bisa meleset saat data Tim 1 masuk |
| **P3** | A7 — manifest + theme-color | 20 menit | Demo terasa seperti situs, bukan aplikasi |
| **P3** | Statistik Tim (gap V3) | **butuh klarifikasi dulu** | Fitur acuan hilang dari perbandingan |

---

## 10. Pertanyaan Terbuka (butuh jawaban client)

1. **Rumus rate final**: 70% ulasan + 30% volume (kode) atau "tugas selesai + pembayaran + fisk" (acuan)?
2. **Tim 1**: disembunyikan total, atau ditampilkan hanya di statistik?
3. **Statistik Tim**: masuk scope revisi ini atau revisi berikutnya? Kalau ya, sumber angkanya dari `pesanan` (status SELESAI + LUNAS) atau termasuk yang belum lunas?
4. **`lihatSemua`**: benar client minta semua admin melihat total agency, atau ini hanya kebutuhan demo?
5. **Ucapan narator** — belum bisa saya akses; kalau ada poin lisan yang tidak tampak di layar (mis. "warnanya kurang", "tombol ini pindah"), tolong konfirmasi atau jalankan transkripsi ulang saat jaringan normal.

---

## 11. Lampiran — Artefak & Cara Reproduksi

| Artefak | Lokasi |
|---|---|
| Frame 1 fps per video | `/tmp/opencode/frames/v1..v5/` (427 file) |
| Timeline per detik (shake, shift, change) | `/tmp/opencode/work/v*_timeline.json` |
| Contact sheet berlabel timestamp | `/tmp/opencode/work/v*_s*.jpg` (40 file) |
| Script analisis gerak | `/tmp/opencode/analyze2.py`, `/tmp/opencode/resheet.py` |
| Script ASR (siap pakai) | `/tmp/opencode/asr.py` |

**Reproduksi:**

```bash
# 1. frame 1 fps
ffmpeg -i "video.mp4" -vf fps=1 -q:v 3 frames/f%03d.jpg
# 2. analisis gerak + keyframe + contact sheet
python3 /tmp/opencode/analyze2.py && python3 /tmp/opencode/resheet.py
# 3. transkripsi (butuh jaringan untuk unduh model)
/tmp/opencode/wvenv/bin/python /tmp/opencode/asr.py
```

---

*Catatan integritas: setiap klaim visual di dokumen ini bersumber dari frame yang benar-benar dibaca; setiap klaim kode menyertakan `file:line` yang benar-benar diperiksa. Bagian audio **tidak** diklaim sebagai transkripsi. Dua dugaan awal saya (badge "Kurang Aktif" ganda, tombol "Kelola" per kartu) **dibatalkan setelah verifikasi frame resolusi penuh** — keduanya bukan bug.*
