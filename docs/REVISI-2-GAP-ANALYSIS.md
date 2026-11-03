# ANALISIS REVISI 2 — JokiTugasAja_ID

**Peran:** System Analyst
**Tanggal analisis:** 3 November 2026
**Sumber:** 31 voice note WhatsApp (`.ogg`, 2 Nov 2026) + 2 screen recording WhatsApp + 4 gambar mockup
**Objek pembanding:** repository `agency-tugas` (commit terakhir `a2eb5c4`)
**Transkrip lengkap:** [`REVISI-2-TRANSKRIP.md`](./REVISI-2-TRANSKRIP.md)

---

## 1. Ringkasan Eksekutif

Revisi 2 pada dasarnya **bukan redesign**, melainkan **koreksi model bisnis dan aturan akses** pada layar *Detail Rekap Harian*.

Inti perubahan dibanding Revisi 1:

| Aspek | Revisi 1 (D5 lama) | **Revisi 2 (final)** |
|---|---|---|
| Pembagian fee | 50% Penjoki + 50% Owner; fee admin manual | **50% Penjoki + 23% Admin CS + 7% Admin Sosmed + 20% Owner**, semuanya dihitung dari **Total Pendapatan** (bukan per transaksi) |
| Dasar perhitungan | per transaksi (harga) | **per total pendapatan harian** per admin |
| Peran baru | Owner + Admin | Owner + **Admin CS (5 tim)** + **Admin Sosmed** |
| Rincian transaksi | ada kolom Fee Tim | **No · Penjoki · Jenis Tugas · Nominal** (Fee Tim dihapus) + tombol **Tambah Transaksi** |
| Hak tulis | admin bebas | **hanya di "ruangan" akun sendiri**; admin lain & sosmed read-only |

**Skor implementasi (per 3 Nov 2026):**

- ✅ **Sesuai:** 8 dari 16 requirement
- ⚠️ **Sebagian:** 3 requirement (logika ada, tapi terblokir di lapisan data)
- ❌ **Belum:** 5 requirement

**Temuan kritis (blocker):** logika "Admin Sosmed melihat total agency" **tidak akan jalan di production** karena kebijakan **Row Level Security** saat ini mengunci setiap ADMIN ke `team_id`-nya sendiri, dan admin tidak boleh membaca profil admin lain. Ini bukan bug UI — ini bug model data/peran.

---

## 2. Daftar Requirement Revisi 2

Dinotasikan `R01`–`R16`, diurutkan sesuai urutan rekaman.

| ID | Requirement (kutipan client) | Sumber |
|---|---|---|
| R01 | Total Transaksi otomatis mengikuti jumlah rincian transaksi | 00.48.31 |
| R02 | Kartu-kartu fee memakai **persentase** | 00.48.47 |
| R03 | Rincian transaksi = **No, Nama Penjoki, Jenis Tugas, Nominal**; kolom "Fee Tim" **dihapus** | 00.54.06 |
| R04 | Tambahkan fitur **"Tambah Transaksi"** di samping judul *Rincian Transaksi*, diisi custom oleh admin | 00.57.35 |
| R05 | Data transaksi otomatis tercatat atas **akun admin yang login** | 01.00.03–01.00.24 |
| R06 | Kartu 2: **Total Pendapatan** = total semua nominal (otomatis) | 01.01.25 |
| R07 | Kartu 3: **Fee Owner = 20%** × Total Pendapatan | 01.04.10 |
| R08 | Kartu 4: **Fee Admin CS = 23%** × Total Pendapatan | 01.05.14 |
| R09 | Kartu 5: **Fee Admin Sosmed = 7%** × Total Pendapatan | 01.08.25, 01.11.08 |
| R10 | Kartu 6: **Fee Penjoki = 50%** × Total Pendapatan | 01.08.49 |
| R11 | **Admin Sosmed**: Total Pendapatan = akumulasi **semua admin/tim**, bukan per akun | 01.20.04, 01.21.51 |
| R12 | Login per akun; tombol **Tambah Transaksi hanya muncul di akun sendiri**; melihat akun lain read-only | 01.22.49, 01.23.18, 01.23.35 |
| R13 | **Admin Sosmed tidak bisa menambah** rincian sama sekali — hanya melihat | 01.24.01, 01.25.08 |
| R14 | **Hapus metrik "Rating Skill"** — cukup "Rate" | 01.48.17, 01.51.33 |
| R15 | **Nomor HP penjoki** tampil di bawah nama penjoki | 01.53.42 |
| R16 | Ambil daftar nama penjoki & admin dari data tertulis (gambar/chat) | 01.58.46 |

Requirement pendukung dari screen recording (chat 3 Nov 2026):

| ID | Requirement | Status |
|---|---|---|
| R17 | Struktur grid & branding dipertahankan; total transaksi dirapikan di bawah nominal | ✅ |
| R18 | Pembatasan akun ditegakkan saat login (bukan hanya sembunyikan menu) | ⚠️ |
| R19 | Nama & branding "JOKITUGASAJA_ID" tetap | ✅ |

---

## 3. Gap Analysis per Requirement

### Legenda
✅ Sesuai · ⚠️ Sebagian · ❌ Belum

| ID | Status | Bukti / Lokasi | Catatan |
|---|:---:|---|---|
| R01 | ✅ | `DetailRekapPage.tsx` — `Total Transaksi` = `rekap.length` | Angka mengikuti baris rincian |
| R02 | ✅ | `fee.ts` `BAGI_HASIL` + label `(${persen(...)}%)` | 50/23/7/20 |
| R03 | ✅ | `DetailRekapPage.tsx` tabel: `No, Penjoki, Jenis Tugas, Nominal` | Tidak ada kolom Fee Tim |
| R04 | ❌ | Tidak ada tombol/route | Hanya form penuh `/pesanan/baru` via sidebar "Input Fee" |
| R05 | ✅ | `TambahPesananPage.tsx` → `dibuat_oleh: profile!.id`; RLS `pesanan_insert` mewajibkan `dibuat_oleh = auth.uid()` | Terjamin di DB |
| R06 | ✅ | `totalPendapatan = rekap.reduce((s,p) => s + p.harga, 0)` | |
| R07 | ✅ | `BAGI_HASIL.owner = 0.2` | |
| R08 | ✅ | `BAGI_HASIL.adminCs = 0.23` | |
| R09 | ✅ | `BAGI_HASIL.adminSosmed = 0.07` | Hanya tampil di rekap, tidak disimpan per transaksi |
| R10 | ✅ | `BAGI_HASIL.penjoki = 0.5` | |
| R11 | ⚠️ | Logika ada: `DetailRekapPage` (cabang `sosmed`) & `RekapHarianPage` (`lihatSemua`) | **Diblokir RLS** — lihat §4.1 |
| R12 | ❌ | Tidak ada tombol tambah & tidak ada gate `adminId === profile.id` | RLS melindungi insert, tapi UI belum mengekspresikan aturan |
| R13 | ❌ | Tidak ada pengecualian sosmed | Belum diimplementasikan |
| R14 | ❌ | `PenjokiPage.tsx` kolom **"Rating Skill"** masih ada; `PenjokiManajemenPage.tsx` form `rating_skill` masih ada; skema `ratingSkill` masih ada | Lihat §4.3 |
| R15 | ✅ | `PenjokiPage.tsx` (mobile & desktop) + `PenjokiManajemenPage.tsx` — `{p.no_hp}` di bawah nama | |
| R16 | ⚠️ | `admin.ts` memetakan nama/jabatan, tapi **bergantung pada string "rania"** | Perlu klarifikasi |

---

## 4. Temuan Kritis

### 4.1 🔴 Admin Sosmed tidak akan bisa melihat data semua tim

**Klaim client (R11):** "untuk yang Rania Sosmed ini total pendapatannya dari semua tim … masuk ke sini semua."

**Kondisi sekarang:**

```sql
-- pesanan_select
USING (public.is_owner() OR team_id = public.app_team_id())

-- profiles_select
USING (id = auth.uid() OR public.is_owner())
```

Kode `DetailRekapPage.tsx` sudah menulis:

```ts
if (!sosmed) q = q.eq("dibuat_oleh", adminId);
// sosmed → tanpa filter = ambil semua
```

…tetapi karena RLS membatasi `team_id`, query "tanpa filter" itu **tetap hanya mengembalikan data tim si sosmed**. Hasilnya: angka Total Pendapatan agency akan **terlihat kecil** dan tidak error — jenis bug paling berbahaya karena tampak normal.

Ditambah lagi `profiles_select` hanya mengizinkan admin melihat **dirinya sendiri**, sehingga daftar "Rekap per Admin CS" untuk sosmed **hanya berisi 1 baris (dirinya)**, padahal client ingin bisa melihat semua admin (read-only, R12).

**Yang dibutuhkan:** peran eksplisit `ADMIN_SOSMED` (enum) **atau** flag `akses_global boolean` pada `profiles`, plus policy turunan:

```sql
CREATE POLICY pesanan_select ON public.pesanan FOR SELECT TO authenticated
  USING (public.is_owner() OR public.has_global_read() OR team_id = public.app_team_id());

CREATE POLICY profiles_select_anggota ON public.profiles FOR SELECT TO authenticated
  USING (public.is_owner() OR public.has_global_read() OR id = auth.uid());
```

### 4.2 🟠 "Admin Sosmed" & "Admin Utama" tidak ada di model data

Saat ini `jenisAdmin()` menebak peran dari **nama**:

```ts
if (norm(p.nama_lengkap).includes("rania")) return "sosmed";
if (tim === "tim 1") return "utama";
```

Konsekuensi:
- Ganti nama admin → peran berubah. Rapuh.
- `seed-auth.ts` membuat admin bernama **"Admin Tim 1..5"**, bukan nama asli; tim yang ada hanya **Tim 1–5** (tidak ada Tim Sosmed / Tim Utama).
- Data nama asli (Naim, Widya, Rania, dst.) hanya disebut di chat — **tidak ada di kode/migrasi**.

**Rekomendasi:** tambah kolom `jabatan` (enum: `OWNER`, `ADMIN_UTAMA`, `ADMIN_CS`, `ADMIN_SOSMED`) + `akses_global` di `profiles`, lalu hapus heuristik nama.

### 4.3 🟠 "Rating Skill" masih hidup di 4 tempat

| Lokasi | Isi |
|---|---|
| `prisma/schema.prisma` | `ratingSkill Float?` |
| `prisma/seed.ts` | rating dari PDF di-import |
| `PenjokiPage.tsx` | kolom **Rating Skill** di tabel desktop |
| `PenjokiManajemenPage.tsx` | input form + `RateBadge rate={p.rating_skill}` |

Yang terakhir paling problematik: **kolom "Rate" di Manajemen Penjoki menampilkan Rating Skill**, bukan rate keaktifan. Setelah R14 diterapkan, kolom itu harus dihitung dari transaksi (seperti `rateOf()` di `PenjokiPage`), atau dihapus jika formulanya belum final (D6).

**Catatan:** kolom DB sebaiknya **tidak langsung di-drop** (data historis). Cukup sembunyikan dari UI, lalu drop di migrasi terpisah setelah konfirmasi client.

### 4.4 🟠 Rincian transaksi & "Tambah Transaksi" belum ada jalur cepat

Client ingin menambah transaksi **langsung dari layar detail**, bukan lewat sidebar. Kebutuhan minimal tombol tersebut:

- Input: nama penjoki (dropdown), jenis tugas (dropdown), nominal, tanggal, status bayar
- Customer: perlu keputusan — wajib pilih/buat, atau boleh dikosongkan?
- Setelah simpan: langsung masuk tabel rincian **tanpa reload**, dan kartu Total Pendapatan + 4 kartu fee ikut ter-update

Form `/pesanan/baru` saat ini mewajibkan customer (`customer_id` NOT NULL) + `jumlah_keterangan`. Untuk tombol cepat, field ini kemungkinan perlu dibuat opsional atau diisi otomatis.

### 4.5 🟡 Akses ke "ruangan" admin lain tidak memberi respons 403

`DetailRekapPage` membuka `/rekap/:adminId` untuk siapa pun yang login. Admin yang mencoba membuka admin lain akan mendapat **tabel kosong**, bukan pesan "tidak berhak". Secara keamanan aman (RLS), tetapi UX menyesatkan dan menyulitkan audit.

---

## 5. Matriks Kesesuaian Layar

### Detail Rekap Harian (layar utama revisi 2)

| Elemen | Diminta | Ada? |
|---|:---:|:---:|
| Kartu Total Transaksi | ✅ | ✅ |
| Kartu Total Pendapatan | ✅ | ✅ |
| Kartu Fee Penjoki 50% | ✅ | ✅ |
| Kartu Fee Admin CS 23% | ✅ | ✅ |
| Kartu Fee Admin Sosmed 7% | ✅ | ✅ |
| Kartu Fee Owner 20% | ✅ | ✅ |
| Tabel No / Penjoki / Jenis / Nominal | ✅ | ✅ |
| Tombol "Tambah Transaksi" | ✅ | ❌ |
| Tombol hanya di akun sendiri | ✅ | ❌ |
| Sosmed: total agency + fee 7% saja | ✅ | ⚠️ |
| Sosmed: read-only | ✅ | ❌ |
| Admin lain: read-only | ✅ | ❌ |

### Data Penjoki

| Elemen | Diminta | Ada? |
|---|:---:|:---:|
| Hapus "Rating Skill" | ✅ | ❌ |
| Sisa "Rate" saja | ✅ | ⚠️ (rate di Manajemen = rating_skill) |
| No. HP di bawah nama | ✅ | ✅ |

---

## 6. Rekomendasi & Urutan Pengerjaan

### Prioritas 0 — Blocker data (harus duluan)
1. **Migrasi peran:** tambah `jabatan` + `akses_global` di `profiles`; isi data 6 admin (5 CS + 1 sosmed) + owner.
2. **Perbarui RLS:** policy `SELECT` untuk `pesanan` dan `profiles` agar `akses_global` bisa membaca lintas tim (read-only).
3. **Hapus heuristik nama** di `admin.ts`, ganti baca kolom `jabatan`.

> Tanpa P0, R11 dan R12 tidak mungkin benar walaupun UI-nya "kelihatan jalan".

### Prioritas 1 — Fitur inti revisi 2
4. **Tombol "Tambah Transaksi"** di header Rincian Transaksi + dialog form ringkas → invalidasi query rekap.
5. **Gate akses:** tampilkan tombol hanya jika `adminId === profile.id && jabatan !== ADMIN_SOSMED`; selain itu badge "Hanya lihat".
6. **Sosmed:** sembunyikan seluruh aksi tulis; daftar admin tetap tampil read-only.

### Prioritas 2 — Pembersihan metrik
7. Sembunyikan "Rating Skill" dari `PenjokiPage` & `PenjokiManajemenPage`; hitung ulang kolom "Rate" dari transaksi.
8. Simpan `rating_skill` di DB untuk arsip, jangan di-drop sebelum client setuju.

### Prioritas 3 — UX & konsistensi
9. `DetailRekapPage`: tampilkan empty-state "Kamu tidak punya akses ke ruangan admin ini" untuk kasus 403.
10. Samakan label kartu dengan istilah client: **"Total Transaksi"** (bukan "Total Tugas Selesai") pada layar detail.

---

## 7. Hal yang Perlu Dikonfirmasi ke Client

1. **R16** — "ambil dari tulisan penjoki sama admin" maksudnya: daftar nama final penjoki & admin dikirim dalam bentuk apa? (Excel/gambar/teks)
2. Apakah **Admin Utama** (Tim 1) punya hak sama dengan Admin CS, atau boleh melihat semua tim?
3. Apakah **Admin Sosmed** boleh mengubah data apa pun, atau benar-benar **read-only total**?
4. Fee dihitung dari **total pendapatan harian** atau **bulanan**? Saat ini layar bersifat harian.
5. Bila "Tambah Transaksi" cepat dipakai, apakah **customer wajib** diisi?
6. Transaksi yang ditambah manual: default status **LUNAS** atau mengikuti pilihan admin?
7. Pembulatan rupiah: saat ini sisa pembulatan masuk ke **Owner**. Setuju?

---

## 8. Kesimpulan

Revisi 2 sudah **sekitar 60% terpasang**, dan bagian yang paling terlihat (angka fee 50/23/7/20 serta tabel rincian) sudah benar. Namun **tiga hal belum aman**:

1. **RLS memblokir** fitur utama Admin Sosmed → angka agency akan salah tanpa error.
2. **Tidak ada tombol Tambah Transaksi** dan **tidak ada pembatasan tulis per akun**.
3. **Rating Skill belum dihapus**, bahkan dipakai sebagai "Rate" di satu layar.

Ketiganya harus diselesaikan sebelum revisi 2 dinyatakan selesai. Estimasi: **P0 ±1 hari**, **P1 ±1–2 hari**, **P2 ±0,5 hari**.

---

*Dokumen ini disusun dari transkrip otomatis 31 voice note dan pembacaan langsung kode sumber. Angka persentase diverifikasi ulang terhadap `src/lib/fee.ts` dan RLS di `prisma/migrations/20261101114210_init_rls/migration.sql`.*
