/**
 * Verifikasi hasil rebuild data (September + Oktober 2026).
 *
 *   npx tsx scripts/verify-rebuild.ts
 *
 * Read-only. Gagal (exit 1) bila ada satu pun invarian di bawah tidak terpenuhi.
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BAGI_HASIL, alokasiFee } from "../src/lib/fee";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

let gagal = 0;
const rp = (n: number | bigint) => `Rp${Number(n).toLocaleString("id-ID")}`;

function cek(nama: string, aktual: unknown, harap: unknown) {
  const ok = JSON.stringify(String(aktual)) === JSON.stringify(String(harap));
  if (!ok) gagal++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${nama} → ${aktual}` +
      (ok ? "" : ` (harap ${harap})`)
  );
}

function loadEnv(): void {
  for (const nama of [".env", ".env.local"]) {
    const file = path.join(__dirname, "..", nama);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  }
}

// Owner 14 Nov 2026: data November dibersihkan — cukup September + Oktober.
const ACUAN_BULAN = [
  { bulan: "2026-09", baris: 231, total: 14_153_000 },
  { bulan: "2026-10", baris: 541, total: 39_731_500 },
];

/** Total acuan seluruh periode. */
const TOTAL_BARIS = 772;
const TOTAL_HARGA = 53_884_500;
/** Penjoki: 45 dari DOCX + 1 nama baru bertanda perlu review. */
const TOTAL_PENJOKI = 46;

async function main(): Promise<void> {
  loadEnv();

  // 1. Total & per bulan
  const perBulan = await prisma.$queryRaw<
    { bulan: string; baris: bigint; total: bigint }[]
  >`select to_char(tanggal, 'YYYY-MM') as bulan, count(*)::bigint as baris,
           coalesce(sum(harga), 0)::bigint as total
      from pesanan group by 1 order by 1`;

  cek("jumlah bulan terisi", perBulan.length, ACUAN_BULAN.length);
  for (const acuan of ACUAN_BULAN) {
    const row = perBulan.find((r) => r.bulan === acuan.bulan);
    cek(`${acuan.bulan} baris`, Number(row?.baris ?? 0), acuan.baris);
    cek(`${acuan.bulan} total`, rp(row?.total ?? 0), rp(acuan.total));
  }

  const total = await prisma.pesanan.aggregate({
    _count: { _all: true },
    _sum: { harga: true },
  });
  cek("total baris", total._count._all, TOTAL_BARIS);
  cek("total pendapatan", rp(total._sum.harga ?? 0), rp(TOTAL_HARGA));

  // 2. Fee per transaksi tersimpan sesuai 49/22/20 (dibulatkan per baris)
  const fee = await prisma.pesanan.aggregate({
    _sum: { feePenjoki: true, feeAdmin: true, feeOwner: true },
  });
  const feeHarap = await prisma.$queryRaw<
    { penjoki: bigint; admin: bigint; owner: bigint }[]
  >`select coalesce(sum(round(harga * 0.49)), 0)::bigint as penjoki,
           coalesce(sum(round(harga * 0.22)), 0)::bigint as admin,
           coalesce(sum(round(harga * 0.20)), 0)::bigint as owner
      from pesanan`;
  const h = feeHarap[0];
  cek("fee penjoki (49%)", rp(fee._sum.feePenjoki ?? 0), rp(h.penjoki));
  cek("fee admin CS (22%)", rp(fee._sum.feeAdmin ?? 0), rp(h.admin));
  cek("fee owner (20%)", rp(fee._sum.feeOwner ?? 0), rp(h.owner));

  // 3. Alokasi fee dari total pendapatan harus balance
  const alokasi = alokasiFee(TOTAL_HARGA);
  const jumlahAlokasi = Object.values(alokasi).reduce((a, b) => a + b, 0);
  cek("alokasi fee balance", jumlahAlokasi, TOTAL_HARGA);
  cek("kas 3%", rp(alokasi.kas), rp(Math.round(TOTAL_HARGA * BAGI_HASIL.kas)));

  // 4. Status: semua SELESAI + LUNAS
  const status = await prisma.$queryRaw<
    { status: string; status_bayar: string; n: bigint }[]
  >`select status::text, status_bayar::text, count(*)::bigint as n
      from pesanan group by 1, 2`;
  cek("kombinasi status", status.length, 1);
  cek("status pesanan", status[0]?.status, "SELESAI");
  cek("status bayar", status[0]?.status_bayar, "LUNAS");

  // 5. Tidak ada data yatim & kode ganda
  const yatim = await prisma.$queryRaw<{ n: bigint }[]>`
    select count(*)::bigint as n from pesanan p
     where not exists (select 1 from penjoki j where j.id = p.penjoki_id)
        or not exists (select 1 from customers c where c.id = p.customer_id)
        or not exists (select 1 from teams t where t.id = p.team_id)
        or not exists (select 1 from jenis_tugas jt where jt.id = p.jenis_tugas_id)`;
  cek("pesanan tanpa relasi valid", Number(yatim[0]?.n ?? 0), 0);

  const kodeGanda = await prisma.$queryRaw<{ n: bigint }[]>`
    select count(*)::bigint as n from (
      select kode from pesanan group by kode having count(*) > 1
    ) s`;
  cek("kode transaksi ganda", Number(kodeGanda[0]?.n ?? 0), 0);

  // 6. Master penjoki
  const penjoki = await prisma.penjoki.count();
  cek("jumlah penjoki", penjoki, TOTAL_PENJOKI);

  const penjokiGanda = await prisma.$queryRaw<{ n: bigint }[]>`
    select count(*)::bigint as n from (
      select team_id, lower(nama) from penjoki
       group by 1, 2 having count(*) > 1
    ) s`;
  cek("penjoki ganda dalam satu tim", Number(penjokiGanda[0]?.n ?? 0), 0);

  const perTim = await prisma.$queryRaw<
    { tim: string; penjoki: bigint; pesanan: bigint }[]
  >`select t.nama as tim,
           count(distinct pj.id)::bigint as penjoki,
           count(distinct p.id)::bigint as pesanan
      from teams t
      left join penjoki pj on pj.team_id = t.id
      left join pesanan p on p.team_id = t.id
     group by t.nama order by t.nama`;
  for (const t of perTim) {
    console.log(`      ${t.tim}: ${t.penjoki} penjoki · ${t.pesanan} pesanan`);
  }

  const placeholder = await prisma.$queryRaw<{ n: bigint }[]>`
    select count(*)::bigint as n from pesanan p
      join penjoki j on j.id = p.penjoki_id
     where j.nama = '[TANPA PENJOKI]'`;
  cek("pesanan tanpa nama penjoki (placeholder)", Number(placeholder[0]?.n ?? 0), 0);

  const perluReview = await prisma.penjoki.count({
    where: { keterangan: { contains: "Perlu review" } },
  });
  cek("penjoki bertanda perlu review", perluReview, 1);

  console.log(
    gagal === 0
      ? "\n✅ SEMUA INVARIAN LOLOS"
      : `\n❌ ${gagal} INVARIAN GAGAL`
  );
  if (gagal > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
