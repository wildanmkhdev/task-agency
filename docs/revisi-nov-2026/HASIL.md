# HASIL Eksekusi — 10 Nov 2026

## 1. Skema bagi hasil

| Penerima | Lama | Baru |
|---|---|---|
| Penjoki | 50% | **49%** |
| Admin CS | 23% | **22%** |
| Admin Sosmed | 7% | **6%** |
| Owner | 20% | **20%** |
| Kas | — | **3%** |

Dihitung dari total pendapatan, sisa pembulatan ke Owner.
Kartu **Kas 3%** muncul tepat di atas **Total Pendapatan** di Detail Rekap (admin & sosmed),
Domain Owner, rincian fee per transaksi, serta export PDF & Excel.

Alokasi total **Rp53.884.508** (September + Oktober saja):

| Penerima | Nominal |
|---|---|
| Penjoki 49% | Rp26.403.409 |
| Admin CS 22% | Rp11.854.592 |
| Admin Sosmed 6% | Rp3.233.070 |
| Owner 20% | Rp10.776.902 |
| Kas 3% | Rp1.616.535 |
| **Jumlah** | **Rp53.884.508** |

## 2. Rate penjoki

- Rate = **volume tugas bulan berjalan** (8 tugas = 100%), cap 100.
- Rating ulasan = **skala 1–5** manual, hanya info kualitas (`4,5/5` / `Belum dinilai`).
- Ambang status tidak berubah: ≥90 Sangat Aktif · ≥70 Aktif · ≥55 Cukup · ≥40 Kurang · <40 Perhatian.

## 3. Data

### Keputusan periode

**November tidak diimpor dan datanya sudah dihapus** (permintaan owner 10 Nov 2026).
Importer default hanya membaca September + Oktober; November hanya ikut bila
dijalankan dengan flag `--dengan-november`.

### Kondisi final database

| Bulan | Baris | Total |
|---|---|---|
| September 2026 | 231 | Rp14.153.000 |
| Oktober 2026 | 541 | Rp39.731.508 |
| **Total** | **772** | **Rp53.884.508** |

- Semua pesanan berstatus **SELESAI** dan **LUNAS**.
- Penjoki: **47** = 44 dari DOCX + 3 nama baru bertanda "Perlu review".
- 0 pesanan tanpa nama penjoki (placeholder `[TANPA PENJOKI]` ikut terhapus karena
  satu-satunya pemakaiannya ada di data November).
- 2 tanggal nyasar dikoreksi (Oktober baris 2 & 542), tanggal asli disimpan di `catatan`.
- Sebaran: Tim 2 = 16 penjoki · Tim 3 = 14 · Tim 4 = 9 · Tim 5 = 8.

Nama baru (perlu review owner): Ahmad Abidin (T2), Rania Zahrotul Khumairo (T2),
Solagratia (T3). Dua nama lain (Desi Safira, Yulia Nurrahmawati) tidak punya
transaksi Sep/Okt sehingga langsung dihapus.

### Backup

| Kapan | File | Isi |
|---|---|---|
| Sebelum rebuild (data lama) | `/home/wildan/backups/agency-tugas/data-2026-11-10T16-33-52.json` | 985 baris |
| Setelah selesai (kondisi final) | `/home/wildan/backups/agency-tugas/data-2026-11-10T16-43-37.json` | 892 baris |

## 4. Verifikasi

```
pnpm exec tsc -b                 → LOLOS
pnpm run check:rate              → SEMUA CEK LOLOS
pnpm run check:statistik         → SEMUA CEK LOLOS
pnpm build                       → sukses
npx tsx scripts/verify-rebuild   → SEMUA INVARIAN LOLOS (21 assert)
```

`verify-rebuild` mengunci: 2 bulan terisi, 772 baris, Rp53.884.508, alokasi fee
balance, Kas 3% = Rp1.616.535, semua SELESAI+LUNAS, tanpa relasi yatim, tanpa
kode ganda, 47 penjoki, 3 penjoki perlu review, 0 pesanan tanpa penjoki.

## 5. Rollback

```
# kembali ke data lama (sebelum rebuild)
npx tsx scripts/restore-data.ts /home/wildan/backups/agency-tugas/data-2026-11-10T16-33-52.json --yes
```

## 6. Perintah operasional

```
python3 scripts/penjoki-docx.py                     # regenerate seed penjoki dari DOCX
npx tsx scripts/backup-data.ts                      # backup JSON 6 tabel
npx tsx scripts/rebuild-data.ts --dry-run           # simulasi Sep + Okt
npx tsx scripts/rebuild-data.ts --yes               # eksekusi Sep + Okt
npx tsx scripts/rebuild-data.ts --yes --dengan-november  # ikutkan November
npx tsx scripts/verify-rebuild.ts                   # cek invarian
```
