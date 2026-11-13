import { PrismaClient } from "@prisma/client";
import { PENJOKI_DATA } from "./penjoki-data";

const prisma = new PrismaClient();

/**
 * Seed data dasar (idempotent — aman dijalankan berulang):
 * 1. Tim: Tim 1..5 + Sosmed (tim khusus admin sosmed, read-only lintas tim)
 * 2. Master jenis tugas
 * 3. 45 penjoki TIM 2–5 — dataset "REKAP DATA PENJOKI JOKITUGASAJA_ID"
 *    (client, 13 Nov 2026, digenerate scripts/penjoki-docx.py). TIM 1 tidak ada.
 */
async function main() {
  // 1. Tim
  const timNames = ["Tim 1", "Tim 2", "Tim 3", "Tim 4", "Tim 5", "Sosmed"];
  const teams = new Map<string, string>();
  for (const nama of timNames) {
    const t = await prisma.team.upsert({
      where: { nama },
      update: {},
      create: { nama },
    });
    teams.set(nama, t.id);
  }
  console.log(`✔ ${teams.size} tim`);

  // 2. Jenis tugas
  const jenis = [
    "Laporan PKL SMK",
    "Laporan PKL Kuliah",
    "Makalah",
    "PPT",
    "Skripsi",
    "Artikel Jurnal",
    "Poster",
    "Edit Video",
    "Tugas Coding",
    "Olah Data (SPSS/EViews)",
    "Tugas Umum",
    "Desain",
  ];
  for (const nama of jenis) {
    await prisma.jenisTugas.upsert({ where: { nama }, update: {}, create: { nama } });
  }
  console.log(`✔ ${jenis.length} jenis tugas`);

  // 3. Penjoki — dataset resmi TIM 2–5 (rekap client 4 Nov 2026).
  //    Shared dengan scripts/sync-penjoki.ts agar seed & sync tidak menyimpang.
  const existing = await prisma.penjoki.count();
  if (existing > 0) {
    console.log(`⏭ Penjoki sudah ada (${existing} baris), lewati seeding penjoki.`);
  } else {
    for (const row of PENJOKI_DATA) {
      await prisma.penjoki.create({
        data: {
          nama: row.nama,
          noHp: row.no_hp,
          teamId: teams.get(row.tim)!,
          ratingSkill: row.rating,
          keahlian: row.keahlian,
          keterangan: row.keterangan,
        },
      });
    }
    console.log(`✔ ${PENJOKI_DATA.length} penjoki (TIM 2–5 dari rekap client)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
