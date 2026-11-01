import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed data dasar (idempotent — aman dijalankan berulang):
 * 1. Tim 1..5
 * 2. Master jenis tugas
 * 3. 23 penjoki Tim 3/4/5 — diketik dari PDF "REKAP DATA PENJOKI JOKITUGASAJA_ID"
 *    (Tim 1 & Tim 2 menyusul dari client — Decision D7)
 */
async function main() {
  // 1. Tim
  const timNames = ["Tim 1", "Tim 2", "Tim 3", "Tim 4", "Tim 5"];
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

  // 3. Penjoki (dari PDF — nama, keahlian, rating, keterangan, no. HP)
  const existing = await prisma.penjoki.count();
  if (existing > 0) {
    console.log(`⏭ Penjoki sudah ada (${existing} baris), lewati seeding penjoki.`);
    return;
  }

  type Row = [
    nama: string,
    tim: string,
    rating: number,
    keahlian: string,
    keterangan: string,
    noHp: string
  ];

  const rows: Row[] = [
    // ---- TIM 3 ----
    ["Dara", "Tim 3", 85, "Artikel jurnal, SPSS, skripsi, laporan PKL, makalah, tugas umum", "Fast response, mampu mengerjakan lebih dari satu job sehari, terkadang kurang teliti tetapi bersedia revisi", "085862764409"],
    ["Anita", "Tim 3", 82.5, "Laporan PKL, Makalah", "Fast response dan mampu mengerjakan lebih dari satu job sehari", "089529839617"],
    ["Vina", "Tim 3", 82, "Laporan PKL, PPT, Makalah", "Fast response, teliti, tetapi waktu terbatas karena bekerja", "085642414735"],
    ["Lita", "Tim 3", 81, "Laporan PKL, PPT, Poster, Makalah", "Fast response, mampu mengerjakan lebih dari satu job, terkadang sibuk tetapi selalu menginformasikan", "085786656466"],
    ["Kak Awas", "Tim 3", 81, "Laporan PKL, Makalah", "Fast response dan aman", "089530217454"],
    ["Lika", "Tim 3", 81, "Laporan PKL, PPT, Poster, Makalah", "Fast response dan aman", "081233702401"],
    ["Eca", "Tim 3", 80, "Laporan PKL, PPT, Makalah", "Slow response karena terkadang sibuk", "085771557776"],
    ["Fadli", "Tim 3", 79, "Edit Video, Makalah", "Fast response dan pengerjaan tepat deadline", "085257135313"],
    // ---- TIM 4 ----
    ["Lilis Anggreni", "Tim 4", 85, "Tugas umum, jurnal, skripsi, proposal, Bab 4-5, olah data (EViews, SPSS, STATA, SmartPLS, NVivo), bimbingan online", "Pengerjaan cepat, tetapi membalas pesan agak lama", "081339453476"],
    ["Arisanti", "Tim 4", 90, "Laporan, makalah, artikel, PPT, revisi Word, skripsi kualitatif", "Pengerjaan cepat, kecuali saat beribadah di Bali atau ada meeting mendadak", "081949851177"],
    ["Ayu Hakikatul", "Tim 4", 85, "Makalah, artikel, esai, jurnal, skripsi, tesis, disertasi, proposal, KTI, PTK, PTS, laporan PKL/magang/KKN, PPT", "Pengerjaan cepat dan fast response", "085184741380"],
    ["Annisa", "Tim 4", 90, "Microsoft Office (Word, Excel, PowerPoint, Power BI), desain (PowerDesigner, Canva, Figma), coding (VS Code, Google Colab, JavaScript)", "Bisa mengambil job, kecuali saat ada jadwal kuliah", "081320712491"],
    ["Abdul Muhith", "Tim 4", 90, "Desain PPT, Word, artikel, makalah, laporan, proposal, editing dokumen, materi presentasi, editing video, desain, AutoCAD 2D", "Fast response", "08990478172"],
    ["Shinta Kurniawati", "Tim 4", 75, "Laporan PKL, makalah, resume, artikel ilmiah, jurnal ilmiah, skripsi", "Slow response dan jarang mengambil job karena kesibukan sebagai dosen", "082228394762"],
    ["Firsty Ayesha", "Tim 4", 73, "Tugas sekolah dan kuliah, jurnal, makalah, artikel, desain, editing video, PPT, dan lainnya", "Jarang mengambil job", "085771557776"],
    ["Alfi Fitria", "Tim 4", 70, "Laporan PKL, PPT, tugas sekolah dan kuliah", "Mengambil job saat libur kantor dan revisi belum bisa dikerjakan dengan cepat", "081315855918"],
    ["Mita", "Tim 4", 50, "PPT, laporan PKL, resume", "Sudah tidak aktif mengambil job, keluar-masuk tim, dan proses revisi cukup lama", "089699866189"],
    ["Ami", "Tim 4", 70, "PPT, laporan PKL, resume", "Jarang mengambil job, hanya saat membutuhkan, dan pengerjaan agak lama", "0895418951414"],
    // ---- TIM 5 ----
    ["Anik", "Tim 5", 85, "Tugas SMK/SMA, laporan dan PPT PKL (kecuali coding dan skripsi)", "Ketersediaan tinggi, bisa mengambil job kapan saja; saat luang mampu >5 job", "081353380035"],
    ["Radit", "Tim 5", 80, "Tugas SMK/SMA, laporan dan PPT PKL (kecuali coding dan skripsi)", "Mampu menangani banyak job", "088298466678"],
    ["Muhyi", "Tim 5", 70, "Tugas SMK/SMA, laporan dan PPT PKL, tugas pekerjaan", "Pengerjaan cukup baik, mampu menangani sekitar 2-3 job per hari", "089676669025"],
    ["Tinia", "Tim 5", 70, "Tugas SMK/SMA, laporan dan PPT PKL (kecuali coding dan skripsi)", "Mengerjakan job dengan tenggat minimal H-1; tidak menerima tenggat hitungan jam", "087846524987"],
    ["Intan", "Tim 5", 65, "Tugas SMK/SMA, laporan dan PPT PKL (kecuali coding dan skripsi)", "Pengerjaan cukup baik, keterbatasan waktu, mampu sekitar 2-3 job per hari", "088276524024"],
  ];

  for (const [nama, tim, rating, keahlian, keterangan, noHp] of rows) {
    await prisma.penjoki.create({
      data: {
        nama,
        noHp,
        teamId: teams.get(tim)!,
        ratingSkill: rating,
        keahlian: keahlian.split(",").map((k) => k.trim()).filter(Boolean),
        keterangan,
      },
    });
  }
  console.log(`✔ ${rows.length} penjoki (Tim 3/4/5 dari PDF)`);
  console.log(
    "⚠ No. HP Eca (Tim 3) & Firsty Ayesha (Tim 4) sama di PDF — verifikasi ke client (D7)."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
