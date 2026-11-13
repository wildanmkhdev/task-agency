# Revisi November 2026 — Rebuild Data + Skema Bagi Hasil Baru

Sumber keputusan: instruksi owner 9–10 Nov 2026 (WhatsApp + `data/`).
Status: **SELESAI** 10 Nov 2026 — lihat `HASIL.md` untuk bukti eksekusi.

---

## 1. Keputusan owner (final)

| # | Keputusan |
|---|---|
| K1 | Bagi hasil **dari total pendapatan**: Penjoki **49%**, Admin CS **22%**, Admin Sosmed **6%**, Owner **20%**, **Kas 3%**. Dihapus dari persentase lama (50/23/7/20). |
| K2 | **Kas 3% ditampilkan sebagai kartu sendiri, tepat di atas kartu Total Pendapatan** (urutan kartu: Total Transaksi → **Kas 3%** → Total Pendapatan → Fee Penjoki → Fee Admin CS → Fee Admin Sosmed → Fee Owner). Ikut di export PDF & Excel. |
| K3 | Rating penjoki jadi **skala 1–5** (manual, kualitas). **Rate TIDAK lagi memakai rating** — rate murni dari **volume tugas bulan berjalan**. |
| K4 | Data production dibersihkan lalu diisi ulang dari XLSX (Sep–Nov) setelah **backup**. Penjoki diganti total dari DOCX. |
| K5 | Nama penjoki di XLSX yang tidak ada di DOCX: pakai alias dulu; kalau tetap tidak ada → buat penjoki baru dengan keterangan "perlu review". |

---

## 2. Sumber data

### 2.1 XLSX `data/Data Customer Jokitugasaja_id (3).xlsx`

Kolom: `1 Tanggal | 2 Admin WA (tim) | 3 Status Gaji Penjoki | 4 Penjoki | 5 Payment Cust | 6 Gaji Penjoki 50% | 7 Status Gaji Medsos | 8 Gaji Medsos 7% | 9 Status Owner | 10 Owner 20%`

Angka acuan (WAJIB cocok setelah import):

| Sheet | Baris transaksi | Total Payment Cust |
|---|---|---|
| September | 231 | 14.153.000 |
| Oktober | 541 | 39.731.508 |
| November | 274 | 21.277.500 |
| **TOTAL (bila 3 bulan)** | **1.046** | **75.162.008** |

> **Revisi periode (10 Nov 2026):** owner memutuskan **November tidak diimpor**
> dan datanya dihapus. Importer default hanya September + Oktober
> (**772 baris · Rp53.884.508**); November hanya ikut dengan flag
> `--dengan-november`. Angka final ada di `HASIL.md`.

Aturan baca:
- Setiap sheet punya baris footer `Total Pendapatan` di kolom 1 → **skip** (kalau tidak, total dobel).
- Baris kosong / bukan `Date` di kolom 1 → skip.
- Kolom 6/8/10 (rumus 50/7/20) **tidak dipakai** — fee dihitung ulang dari kolom 5.
- Koreksi tanggal nyasar (mengikuti `scripts/koreksi-tanggal-nyasar.ts`):
  - Sheet Oktober baris 2: `2026-01-02` → `2026-10-02`
  - Sheet Oktober baris 542: `2026-11-01` → `2026-10-01`
  - Tanggal asli dicatat di `catatan` untuk audit.
- 4 baris November TIM 5 **tanpa nama penjoki** → penjoki placeholder `[TANPA PENJOKI]` di Tim 5, keterangan "perlu review". Nominal tetap masuk rekap.

### 2.2 DOCX `data/DOC-20261109-WA0186.docx`

4 tabel: **Tabel 0 = TIM 3 (13 orang)**, **Tabel 1 = TIM 4 (9)**, **Tabel 2 = TIM 5 (7)**, **Tabel 3 = TIM 2 (14)** = **43 penjoki**.
Kolom: Nama | Keahlian | Keterangan | Nomor. Tidak ada rating → `rating: null` untuk semua.
5 orang detailnya kosong di DOCX (Widya Eka Agustin, Fitrotin, Asrori, Anisa Dian Lestari, Naim Kuzaini) — tetap dibuat, field lain kosong.

---

## 3. Kontrak API baru

### 3.1 `src/lib/fee.ts`

```ts
export const BAGI_HASIL = {
  penjoki: 0.49,
  adminCs: 0.22,
  adminSosmed: 0.06,
  owner: 0.2,
  kas: 0.03,
} as const;                      // jumlah = 1.00

export interface AlokasiFee {
  penjoki: number; adminCs: number; adminSosmed: number; owner: number; kas: number;
}

// Sisa pembulatan masuk ke owner (perilaku lama dipertahankan).
export function alokasiFee(totalPendapatan: number): AlokasiFee;
export function hitungFee(harga: number): {
  feePenjoki: number; feeOwner: number; feeAdmin: number; feeSosmed: number; feeKas: number;
};
export function persen(n: number): number; // 0.49 → 49
```

Aturan: `penjoki/adminCs/adminSosmed/kas` dibulatkan masing-masing, `owner = total - lainnya`.

### 3.2 `src/lib/rate.ts`

```ts
export const TARGET_TUGAS_BULANAN = 8;
export const SKALA_RATING_MAKS = 5;

/** Rate 0–100 murni dari volume tugas bulan berjalan. */
export function hitungRate(tugasBulanIni: number): number;      // round(min(100, tugas/8*100))
export function belumAdaData(tugasBulanIni: number): boolean;   // tugas <= 0
export function labelRating(rating: number | null | undefined): string; // "4,5/5" | "Belum dinilai"
export function statusKinerja(rate: number): StatusKinerja;     // ambang TIDAK berubah
```

Ambang status tetap: ≥90 sangat, ≥70 aktif, ≥55 cukup, ≥40 kurang, <40 perhatian.
`KETERANGAN_RATE` diganti: "Rate dihitung dari jumlah tugas selesai pada periode ini (8 tugas = 100%). Rating 1–5 adalah penilaian kualitas manual, bukan bagian dari rate."

---

## 4. Pembagian tugas

| Task | Agen | Write scope | Acceptance |
|---|---|---|---|
| A. Fee 49/22/6/20/3 + kartu Kas | frontend-engineer | `src/lib/fee.ts`, `src/pages/DetailRekapPage.tsx`, `src/pages/DomainOwnerPage.tsx`, `src/pages/PesananPage.tsx`, `src/pages/TambahPesananPage.tsx`, `src/components/TambahTransaksiModal.tsx` | `pnpm exec tsc -b` lolos; `grep -rn "23%\|(50%)\|0\.23\|50%)"` di file scope = 0; kartu Kas muncul sebelum Total Pendapatan |
| B. Rate volume + rating skala 5 | frontend-engineer | `src/lib/rate.ts`, `src/lib/statistik.ts`, `src/lib/types.ts`, `prisma/schema.prisma`, `src/pages/PenjokiPage.tsx`, `src/pages/PenjokiManajemenPage.tsx`, `src/pages/PenjokiDetailPage.tsx`, `src/pages/StatistikTimPage.tsx`, `scripts/check-rate.ts`, `scripts/check-statistik.ts` | `pnpm run check:rate && pnpm run check:statistik` PASS; `tsc -b` lolos |
| C. Rebuild data | database-engineer | `scripts/penjoki-docx.py`, `prisma/penjoki-data.ts`, `scripts/rebuild-data.ts`, `scripts/verify-rebuild.ts`, `package.json` | `tsx scripts/rebuild-data.ts --dry-run` mencetak 1.046 baris & total 75.162.008 tanpa menulis DB |
| D. Eksekusi rebuild (destruktif) | orchestrator | DB production | `scripts/verify-rebuild.ts` semua PASS |
| E. Verifikasi | qa-engineer | none | `pnpm build` + `pnpm check` + smoke test UI |

### Larangan
- Jangan menyentuh `data/`, `.env`, `.env.local`, `akun_seed.txt`.
- Jangan me-revert / memformat ulang perubahan yang belum di-commit milik user (`AppLayout.tsx`, `ui.tsx`, `admin.ts`, `routes.tsx`, `PenjokiManajemenPage.tsx`, `PenjokiDetailPage.tsx`), edit seperlunya saja.
- Jangan commit / push.
- Jangan menebak persentase di label: ambil dari `BAGI_HASIL` lewat `persen()`.

---

## 5. Alias penjoki (dipakai importer, hanya jika target ada di tim yang sama)

```
kholil anwar / kholul anwar / muhammad fawaid → Kholilul Anwar
ni putu anik                                  → Ni Putu Anik Pradnyantri
ni kadek risma / ni kadek risma arisanti      → Ni Kadek Risma Arisanti
mita lusri                                    → Mita Lusari
muhamad fahmi affani / muhammad fahmi fanani  → Muhammad Fahmi Affani
alfi fitria                                   → Alfi Fitria Salsabila
anisa asni                                    → Annisa Asni
ayu hakikatul                                 → Ayu Hakikatul Maula
lilis anggreini                               → Lilis Anggreni
```
Tidak dialias (dibuat baru + "perlu review"): `ahmad abidin`, `yulia nurrahmawati`,
`rania zahrotul khumairo`, `desi safira`, `solagratia`, dan nama lain yang tidak
punya padanan persis di tim yang sama. Nama `asrori` dan `rania nuril` sudah ada
di DOCX → jangan dialias ke orang lain.

---

## 6. Rollback

Backup: `/home/wildan/backups/agency-tugas/<timestamp>.sql` (pg_dump, sebelum TRUNCATE).
Rollback = `psql "$DIRECT_URL" < <timestamp>.sql`.
