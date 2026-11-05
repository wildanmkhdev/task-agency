/**
 * Dataset resmi penjoki — "REKAP DATA PENJOKI JOKITUGASAJA_ID".
 *
 * Sumber: kiriman client 4 Nov 2026 (TIM 2, TIM 3, TIM 4, TIM 5).
 * TIM 1 tidak disertakan pada rekap sehingga tidak disentuh oleh sync.
 *
 * Catatan:
 * - `rating` adalah rating ulasan dari client. `null` berarti client belum
 *   memberi angka (TIM 2 dan Annisa Asni). Formula rate memakai nilai netral 60.
 * - `no_hp` disimpan apa adanya seperti di rekap. Normalisasi dilakukan saat sync.
 */
export interface PenjokiSeed {
  nama: string;
  tim: "Tim 2" | "Tim 3" | "Tim 4" | "Tim 5";
  rating: number | null;
  keahlian: string[];
  keterangan: string;
  no_hp: string;
}

const KEAHLIAN_TIM5 = [
  "Tugas SMK/SMA",
  "Laporan PKL",
  "PPT PKL",
  "Tugas umum (kecuali coding & skripsi)",
];

export const PENJOKI_DATA: PenjokiSeed[] = [
  // ============================ TIM 2 ============================
  {
    nama: "Desi Amalia",
    tim: "Tim 2",
    rating: null,
    keahlian: ["Laporan PKL", "PPT", "Makalah", "Artikel", "Tugas sekolah"],
    keterangan:
      "Tugas sekolah menyesuaikan jenis pekerjaan. Deadline minimal 1 hari.",
    no_hp: "083161222712",
  },
  {
    nama: "Zulfa Jalila",
    tim: "Tim 2",
    rating: null,
    keahlian: ["Laporan PKL", "PPT", "Makalah", "Tugas sekolah"],
    keterangan: "Deadline 1–2 hari.",
    no_hp: "085942949179",
  },
  {
    nama: "Nur Safira",
    tim: "Tim 2",
    rating: null,
    keahlian: [
      "Laporan PKL",
      "Tugas sekolah",
      "Tugas CPNS",
      "Tugas kuliah S1",
      "Skripsi kualitatif",
      "Tesis pendidikan & penelitian kualitatif",
    ],
    keterangan:
      "Pengerjaan pukul 18.30–21.30. Pekerjaan setelah jam tersebut masuk pengerjaan hari berikutnya. Jumat tersedia dari pagi hingga malam. Deadline 1–2 hari. Tidak menerima job urgent.",
    no_hp: "085646049741",
  },
  {
    nama: "Desy Windayani",
    tim: "Tim 2",
    rating: null,
    keahlian: [
      "Laporan PKL",
      "PPT",
      "Makalah",
      "Skripsi kuantitatif & kualitatif",
      "Praktikum",
      "Artikel",
      "Tugas sekolah",
      "CV",
      "Portofolio",
      "Tugas kuliah",
      "Tesis",
      "Tugas tulis tangan",
    ],
    keterangan:
      "Pengerjaan fleksibel, tetapi lebih sering malam hari. Deadline minimal 1 hari. Bisa menerima job urgent. Instruksi pekerjaan harus jelas.",
    no_hp: "089526405861",
  },
  {
    nama: "Mita Lusari",
    tim: "Tim 2",
    rating: null,
    keahlian: [
      "Laporan PKL",
      "PPT",
      "Makalah",
      "Skripsi kualitatif",
      "Artikel",
      "Tugas sekolah",
      "Esai",
    ],
    keterangan: "Waktu pengerjaan fleksibel, bisa kapan saja.",
    no_hp: "085727446324",
  },
  {
    nama: "Akmal Falasifa",
    tim: "Tim 2",
    rating: null,
    keahlian: [
      "Laporan kegiatan",
      "Skripsi proposal (PBA)",
      "Skripsi Bab IV–V & analisis kuantitatif",
      "Makalah",
      "Review jurnal",
      "PPT",
      "Esai ilmiah",
      "Artikel dari skripsi/tesis",
      "Modul ajar/RPP",
      "Desain grafis",
    ],
    keterangan:
      "Poin 1 dan 4: deadline minimal 1 hari. Poin 2, 3, dan 5: waktu pengerjaan perlu dinegosiasikan terlebih dahulu.",
    no_hp: "085233953004",
  },
  {
    nama: "Riski",
    tim: "Tim 2",
    rating: null,
    keahlian: ["Berbagai tugas (selain skripsi ke atas, selama ada contoh)"],
    keterangan:
      "Deadline 1 hari. Job urgent perlu dikonfirmasi terlebih dahulu. Weekend tersedia. Weekdays tersedia mulai pukul 16.00.",
    no_hp: "083120405042",
  },
  {
    nama: "Yuyun Puji Utami",
    tim: "Tim 2",
    rating: null,
    keahlian: [
      "Laporan PKL",
      "PPT",
      "Makalah",
      "Artikel",
      "Tugas sekolah",
      "Pembuatan soal",
    ],
    keterangan: "Deadline 1 hari.",
    no_hp: "085852926215",
  },
  {
    nama: "Alamul Huda",
    tim: "Tim 2",
    rating: null,
    keahlian: ["Semua jenis tugas (kecuali kuantitatif & desain)"],
    keterangan: "Bisa kapan saja dan tersedia setiap hari.",
    no_hp: "082329345048",
  },
  {
    nama: "Wildan Mukhaladun",
    tim: "Tim 2",
    rating: null,
    keahlian: [
      "Laporan PKL/Magang",
      "PPT",
      "Makalah",
      "Karya tulis ilmiah",
      "Skripsi IT Bab III–V",
      "Artikel",
      "Praktikum",
      "Tugas sekolah/kuliah",
      "Web development",
      "Database & SQL",
      "REST API",
      "UI/UX",
      "AI & machine learning",
      "Data science & visualisasi",
      "Statistik (Excel, SPSS)",
      "Desain digital (Canva, poster, video AI)",
    ],
    keterangan:
      "Melayani tugas akademik dan pekerjaan bidang TISI/IT, pemrograman, penelitian, pengolahan data, hingga desain digital. Senin–Kamis: sore hingga malam. Jumat–Minggu: fleksibel.",
    no_hp: "081573810039",
  },
  {
    nama: "Muhammad Fahmi Affani",
    tim: "Tim 2",
    rating: null,
    keahlian: [
      "Laporan PKL",
      "PPT",
      "Makalah",
      "Skripsi kuantitatif & kualitatif",
      "Praktikum",
      "Artikel",
      "Tugas sekolah",
      "Berbagai laporan",
    ],
    keterangan:
      "Deadline fleksibel, bisa kapan saja. Mampu menangani sekitar 1–2 laporan per hari.",
    no_hp: "085196222080",
  },
  {
    nama: "Kholilul Anwar",
    tim: "Tim 2",
    rating: null,
    keahlian: ["Laporan PKL (siswa & mahasiswa)", "Makalah", "PPT", "Tugas sekolah"],
    keterangan: "Free terus.",
    no_hp: "081215685394",
  },

  // ============================ TIM 3 ============================
  {
    nama: "Dara Hayuning Priati",
    tim: "Tim 3",
    rating: 85,
    keahlian: [
      "Artikel jurnal",
      "SPSS",
      "Skripsi",
      "Laporan PKL",
      "Makalah",
      "Tugas umum",
    ],
    keterangan:
      "Fast response, mampu mengerjakan lebih dari satu job sehari, terkadang kurang teliti tetapi bersedia revisi.",
    no_hp: "085862764409",
  },
  {
    nama: "Anita Sari",
    tim: "Tim 3",
    rating: 82.5,
    keahlian: ["Laporan PKL", "Makalah"],
    keterangan: "Fast response dan mampu mengerjakan lebih dari satu job sehari.",
    no_hp: "089529839617",
  },
  {
    nama: "Affina Intan Permata",
    tim: "Tim 3",
    rating: 82,
    keahlian: ["Laporan PKL", "PPT", "Makalah"],
    keterangan:
      "Fast response, teliti, bisa ambil beberapa job kalau free karena sambil kerja.",
    no_hp: "085642414735",
  },
  {
    nama: "Jessiana Olita",
    tim: "Tim 3",
    rating: 81,
    keahlian: ["Laporan PKL", "PPT", "Poster", "Makalah"],
    keterangan:
      "Fast response, mampu mengerjakan lebih dari satu job, terkadang sibuk tetapi selalu menginformasikan.",
    no_hp: "085786656466",
  },
  {
    nama: "Surty Septriana",
    tim: "Tim 3",
    rating: 81,
    keahlian: ["Laporan PKL", "Makalah"],
    keterangan: "Fast response dan aman.",
    no_hp: "089530217454",
  },
  {
    nama: "Lika",
    tim: "Tim 3",
    rating: 81,
    keahlian: ["Laporan PKL", "PPT", "Poster", "Makalah"],
    keterangan: "Fast response dan aman.",
    no_hp: "081233702401",
  },
  {
    nama: "Firsty Ayesha",
    tim: "Tim 3",
    rating: 80,
    keahlian: ["Laporan PKL", "PPT", "Makalah"],
    keterangan: "Pengerjaan tepat, kadang slow respon kalau sibuk.",
    no_hp: "085771557776",
  },
  {
    nama: "Fadli Romadhan",
    tim: "Tim 3",
    rating: 79,
    keahlian: ["Edit Video", "Makalah"],
    keterangan: "Fast response dan pengerjaan tepat deadline.",
    no_hp: "085257135313",
  },

  // ============================ TIM 4 ============================
  {
    nama: "Lilis Anggreni",
    tim: "Tim 4",
    rating: 85,
    keahlian: [
      "Tugas umum",
      "Jurnal",
      "Skripsi",
      "Proposal",
      "Bab 4–5",
      "Olah data (EViews, SPSS, STATA, SmartPLS, NVivo)",
      "Bimbingan online",
    ],
    keterangan: "Pengerjaan cepat, tetapi membalas pesan agak lama.",
    no_hp: "081339453476",
  },
  {
    nama: "Arisanti",
    tim: "Tim 4",
    rating: 90,
    keahlian: [
      "Laporan",
      "Makalah",
      "Artikel",
      "PPT",
      "Revisi Word",
      "Skripsi kualitatif",
    ],
    keterangan:
      "Pengerjaan cepat, kecuali saat beribadah di Bali atau ada meeting mendadak.",
    no_hp: "081949851177",
  },
  {
    nama: "Ayu Hakikatul",
    tim: "Tim 4",
    rating: 85,
    keahlian: [
      "Makalah",
      "Artikel",
      "Esai",
      "Jurnal",
      "Skripsi",
      "Tesis",
      "Disertasi",
      "Proposal",
      "KTI",
      "PTK",
      "PTS",
      "Laporan PKL/Magang/KKN",
      "PPT",
    ],
    keterangan: "Pengerjaan cepat dan fast response.",
    no_hp: "085184741380",
  },
  {
    nama: "Annisa Nurpatiana",
    tim: "Tim 4",
    rating: 90,
    keahlian: [
      "Microsoft Office",
      "Power BI",
      "Desain (Canva, Figma, PowerDesigner)",
      "Coding (JavaScript, Google Colab, VS Code)",
    ],
    keterangan: "Bisa mengambil job, kecuali saat ada jadwal kuliah.",
    no_hp: "081320712491",
  },
  {
    nama: "Abdul Muhith",
    tim: "Tim 4",
    rating: 90,
    keahlian: [
      "Desain PPT",
      "Word",
      "Artikel",
      "Makalah",
      "Laporan",
      "Proposal",
      "Editing dokumen",
      "Materi presentasi",
      "Editing video",
      "Desain",
      "AutoCAD 2D",
    ],
    keterangan: "Fast response.",
    no_hp: "08990478172",
  },
  {
    nama: "Shinta Kurniawati",
    tim: "Tim 4",
    rating: 75,
    keahlian: [
      "Laporan PKL",
      "Makalah",
      "Resume",
      "Artikel ilmiah",
      "Jurnal ilmiah",
      "Skripsi",
    ],
    keterangan:
      "Slow response dan jarang mengambil job karena kesibukan sebagai dosen.",
    no_hp: "082228394762",
  },
  {
    nama: "Alfi Fitria",
    tim: "Tim 4",
    rating: 70,
    keahlian: ["Laporan PKL", "PPT", "Tugas sekolah", "Tugas kuliah"],
    keterangan:
      "Mengambil job saat libur kantor dan revisi belum bisa dikerjakan dengan cepat.",
    no_hp: "081315855918",
  },
  {
    nama: "Mita",
    tim: "Tim 4",
    rating: 50,
    keahlian: ["PPT", "Laporan PKL", "Resume"],
    keterangan:
      "Sudah tidak aktif mengambil job, keluar-masuk tim, dan proses revisi cukup lama.",
    no_hp: "089699866189",
  },
  {
    nama: "Riami Ananta",
    tim: "Tim 4",
    rating: 70,
    keahlian: ["PPT", "Laporan PKL", "Resume"],
    keterangan:
      "Jarang mengambil job, hanya saat membutuhkan, dan pengerjaan agak lama.",
    no_hp: "0895418951414",
  },

  // ============================ TIM 5 ============================
  {
    nama: "Ni Putu Anik Pradnyantri",
    tim: "Tim 5",
    rating: 85,
    keahlian: KEAHLIAN_TIM5,
    keterangan:
      "Memiliki ketersediaan tinggi dan bisa mengambil job kapan saja. Saat sedang luang, mampu menangani lebih dari 5 job.",
    no_hp: "081353380035",
  },
  {
    nama: "M. Radit Apriansyah",
    tim: "Tim 5",
    rating: 80,
    keahlian: KEAHLIAN_TIM5,
    keterangan: "Mampu menangani banyak job.",
    no_hp: "088298466678",
  },
  {
    nama: "Muhyi",
    tim: "Tim 5",
    rating: 70,
    keahlian: [...KEAHLIAN_TIM5, "Tugas pekerjaan"],
    keterangan: "Pengerjaan cukup baik, mampu menangani sekitar 2–3 job per hari.",
    no_hp: "089676669025",
  },
  {
    nama: "Tinia",
    tim: "Tim 5",
    rating: 70,
    keahlian: KEAHLIAN_TIM5,
    keterangan:
      "Dapat mengerjakan job dengan tenggat minimal H-1. Tidak menerima pekerjaan dengan tenggat hitungan jam.",
    no_hp: "087846524987",
  },
  {
    nama: "Intan",
    tim: "Tim 5",
    rating: 65,
    keahlian: KEAHLIAN_TIM5,
    keterangan:
      "Pengerjaan cukup baik, tetapi memiliki keterbatasan waktu. Mampu menangani sekitar 2–3 job per hari.",
    no_hp: "088276524024",
  },
  {
    nama: "Annisa Asni",
    tim: "Tim 5",
    rating: null,
    keahlian: KEAHLIAN_TIM5,
    keterangan: "Bisa handle job banyak.",
    no_hp: "082127343925",
  },
];
