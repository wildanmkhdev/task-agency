/**
 * Dataset resmi penjoki — "REKAP DATA PENJOKI JOKITUGASAJA_ID".
 *
 * Sumber: `data/DOC-20261113-WA0039.docx` (rekap client terbaru).
 * Tabel DOCX: TIM 2, TIM 3, TIM 4, TIM 5 — 45 penjoki.
 * TIM 1 tidak ada di rekap sehingga tidak disentuh.
 *
 * Digenerate oleh `scripts/penjoki-docx.py`; jangan edit manual.
 *
 * Catatan:
 * - `rating` 1–5 berasal dari kolom Rating rekap. Rating kualitas ini
 *   dipakai sebagai FALLBACK rate bila penjoki belum punya transaksi
 *   berating bulan ini.
 * - `no_hp` disimpan apa adanya seperti di rekap. Normalisasi dilakukan
 *   saat sync/import.
 */
export interface PenjokiSeed {
  nama: string;
  tim: "Tim 2" | "Tim 3" | "Tim 4" | "Tim 5";
  rating: number | null;
  keahlian: string[];
  keterangan: string;
  no_hp: string;
}

export const PENJOKI_DATA: PenjokiSeed[] = [
  // ============================ TIM 2 ============================
  {
    nama: "Akmal Falasifa",
    tim: "Tim 2",
    rating: 4,
    keahlian: ["Laporan kegiatan", "Skripsi proposal rumpun ilmu pendidikan/teoretis, khususnya PBA", "Skripsi Bab IV–V dan analisis data kuantitatif", "Makalah, review jurnal, PPT, esai ilmiah, konversi skripsi/tesis menjadi artikel, modul ajar/RPP", "Desain grafis: brosur, pamflet, dan infografis"],
    keterangan: "Poin 1 dan 4: deadline minimal 1 hari. Poin 2, 3, dan 5: waktu pengerjaan perlu dinegosiasikan terlebih dahulu.",
    no_hp: "085233953004",
  },
  {
    nama: "Alamul Huda",
    tim: "Tim 2",
    rating: 4,
    keahlian: ["Semua jenis tugas, kecuali tugas kuantitatif dan desain"],
    keterangan: "Bisan kapan saja dan tersedia setiap hari.",
    no_hp: "082329345048",
  },
  {
    nama: "Desi Amalia",
    tim: "Tim 2",
    rating: 3,
    keahlian: ["Laporan PKL, PPT, makalah, artikel, dan tugas sekolah"],
    keterangan: "Tugas sekolah menyesuaikan jenis pekerjaan. Deadline minimal 1 hari.",
    no_hp: "083161222712",
  },
  {
    nama: "Dyora Windayani",
    tim: "Tim 2",
    rating: 3,
    keahlian: ["Laporan PKL, PPT, makalah, skripsi kuantitatif dan kualitatif, praktikum, artikel, tugas sekolah, CV, portofolio, tugas kuliah, tesis, tugas tulis tangan, dan lainnya"],
    keterangan: "Pengerjaan fleksibel, tetapi lebih sering malam hari. Deadline minimal 1 hari. Bisa menerima job urgent. Instruksi pekerjaan harus jelas.",
    no_hp: "089526405861",
  },
  {
    nama: "Kholilul Anwar",
    tim: "Tim 2",
    rating: 3,
    keahlian: ["Laporan PKL (siswa & mahasiswa)", "Makalah", "PPT", "Tugas Sekolah, dan sejenisnya"],
    keterangan: "Free terus.",
    no_hp: "081215685394",
  },
  {
    nama: "Mita Lusari",
    tim: "Tim 2",
    rating: 3,
    keahlian: ["Laporan PKL, PPT, makalah, skripsi kualitatif, artikel, tugas sekolah, esai, dan lainnya"],
    keterangan: "Waktu pengerjaan fleksibel, bisa kapan saja.",
    no_hp: "085727446324",
  },
  {
    nama: "Muhammad Fahmi Affani",
    tim: "Tim 2",
    rating: 3,
    keahlian: ["Laporan PKL, PPT, makalah, skripsi kuantitatif dan kualitatif, praktikum, artikel, tugas sekolah, serta berbagai jenis laporan selama tersedia data dan contoh"],
    keterangan: "Deadline fleksibel, bisa kapan saja. Mampu menangani sekitar 1–2 laporan per hari.",
    no_hp: "085196222080",
  },
  {
    nama: "Naim Kuzaini",
    tim: "Tim 2",
    rating: 5,
    keahlian: [],
    keterangan: "",
    no_hp: "",
  },
  {
    nama: "Nur Safira",
    tim: "Tim 2",
    rating: 4,
    keahlian: ["Laporan PKL dan tugas sekolah", "Tugas CPNS", "Semua tugas kuliah S1, kecuali coding, matematika, kimia, dan bidang nakes", "Skripsi kualitatif", "Tesis bidang pendidikan dan penelitian kualitatif"],
    keterangan: "Pengerjaan pukul 18.30–21.30. Pekerjaan setelah jam tersebut masuk pengerjaan hari berikutnya. Jumat tersedia dari pagi hingga malam. Deadline 1–2 hari. Tidak menerima job urgent.",
    no_hp: "085646049741",
  },
  {
    nama: "Rania Zahrotul Khumairo",
    tim: "Tim 2",
    rating: 3,
    keahlian: [],
    keterangan: "",
    no_hp: "082331262934",
  },
  {
    nama: "Riski Supriyanti",
    tim: "Tim 2",
    rating: 3,
    keahlian: ["Berbagai jenis tugas selama tersedia contoh pengerjaan, kecuali skripsi dan jenjang di atasnya"],
    keterangan: "Deadline 1 hari. Job urgent perlu dikonfirmasi terlebih dahulu. Weekend tersedia. Weekdays tersedia mulai pukul 16.00 karena pagi hingga sore bekerja.",
    no_hp: "083120405042",
  },
  {
    nama: "Wildan Mukhaladun",
    tim: "Tim 2",
    rating: 4,
    keahlian: ["Tugas akademik: laporan PKL/magang, PPT, makalah, karya tulis ilmiah, skripsi kuantitatif dan kualitatif khusus Bab III–V rumpun IT, artikel, praktikum, dan tugas sekolah/kuliah", "Pemrograman dan IT: website, web application, frontend/backend, database, SQL, CRUD, REST API, analisis sistem, perancangan aplikasi, UI/UX, dan dokumentasi proyek IT", "AI dan data science: proyek AI, machine learning, pengolahan data, visualisasi data, dashboard, model prediksi, dan klasifikasi", "Statistik: Excel, SPSS, analisis statistik, interpretasi data kuantitatif, dan visualisasi data", "Desain digital: Canva, mockup, poster, infografis, video animasi AI, serta video presentasi dan edukasi berbantuan AI"],
    keterangan: "Melayani tugas akademik dan pekerjaan bidang TISI/IT, pemrograman, penelitian, pengolahan data, hingga desain digital. Senin–Kamis: sore hingga malam. Jumat–Minggu: fleksibel.",
    no_hp: "081573810039",
  },
  {
    nama: "Yulia Nurrahmawati",
    tim: "Tim 2",
    rating: null,
    keahlian: [],
    keterangan: "",
    no_hp: "083829101533",
  },
  {
    nama: "Yuyun Puji Utami",
    tim: "Tim 2",
    rating: 2,
    keahlian: ["Laporan PKL, PPT, makalah, artikel, dan tugas sekolah, termasuk pembuatan soal"],
    keterangan: "Deadline 1 hari.",
    no_hp: "085852926215",
  },
  {
    nama: "Zulfa Jalila",
    tim: "Tim 2",
    rating: 3,
    keahlian: ["Laporan PKL, PPT, makalah, tugas sekolah, dan lainnya"],
    keterangan: "Deadline 1-2 hari.",
    no_hp: "085942949179",
  },

  // ============================ TIM 3 ============================
  {
    nama: "Affina Intan Permata",
    tim: "Tim 3",
    rating: 5,
    keahlian: ["Laporan PKL", "PPT", "Makalah"],
    keterangan: "Fast response, teliti, bisa ambil beberapa job kalau free karena sambil kerja.",
    no_hp: "085642414735",
  },
  {
    nama: "Ajeng Dayu",
    tim: "Tim 3",
    rating: 3,
    keahlian: ["PPT", "Makalah"],
    keterangan: "Pengerjaan Cepat.",
    no_hp: "082332474089",
  },
  {
    nama: "Anita Sari",
    tim: "Tim 3",
    rating: 5,
    keahlian: ["Laporan PKL", "Makalah"],
    keterangan: "Fast response dan mampu mengerjakan lebih dari satu job sehari.",
    no_hp: "089529839617",
  },
  {
    nama: "Dara Hayuning Priati",
    tim: "Tim 3",
    rating: 5,
    keahlian: ["Artikel jurnal, SPSS, skripsi, laporan PKL, makalah, tugas umum"],
    keterangan: "Fast response, mampu mengerjakan lebih dari satu job sehari, terkadang kurang teliti tetapi bersedia revisi.",
    no_hp: "085862764409",
  },
  {
    nama: "Dyah Fitri Inayati",
    tim: "Tim 3",
    rating: 3,
    keahlian: ["PPT", "Makalah"],
    keterangan: "Revisi agak sulit tapi dikerjakan.",
    no_hp: "085721493256",
  },
  {
    nama: "Fadli Romadhan",
    tim: "Tim 3",
    rating: 4,
    keahlian: ["Edit Video", "Makalah"],
    keterangan: "Fast response dan pengerjaan tepat deadline.",
    no_hp: "085257135313",
  },
  {
    nama: "Firsty Ayesha",
    tim: "Tim 3",
    rating: 3,
    keahlian: ["Laporan PKL", "PPT", "Makalah"],
    keterangan: "Pengerjaan tepat, kadang slowrespon kalau sibuk.",
    no_hp: "085771557776",
  },
  {
    nama: "Jessiana Olita",
    tim: "Tim 3",
    rating: 4,
    keahlian: ["Laporan PKL", "PPT", "Poster", "Makalah"],
    keterangan: "Fast response, mampu mengerjakan lebih dari satu job, terkadang sibuk tetapi selalu menginformasikan.",
    no_hp: "085786656466",
  },
  {
    nama: "Lika",
    tim: "Tim 3",
    rating: 4,
    keahlian: ["Laporan PKL", "PPT", "Poster", "Makalah"],
    keterangan: "Fast response dan aman.",
    no_hp: "081233702401",
  },
  {
    nama: "Rania Nuril",
    tim: "Tim 3",
    rating: 4,
    keahlian: ["Laporan PKL", "PPT", "Makalah"],
    keterangan: "Fast respon, pengerjaan cepat.",
    no_hp: "085755432975",
  },
  {
    nama: "Sabrina Oktaviani",
    tim: "Tim 3",
    rating: 4,
    keahlian: ["Makalah", "PPT"],
    keterangan: "Pengerjaan Cepat.",
    no_hp: "081216624802",
  },
  {
    nama: "Solagratia",
    tim: "Tim 3",
    rating: 3,
    keahlian: ["makalah, daftar pustaka bahasa inggris (AI) jadi mungkin dari admin bisa req pengerjaan, hanya menerima job tertentu yang harganya pasti"],
    keterangan: "Pengerjaan cepat.",
    no_hp: "085179652412",
  },
  {
    nama: "Surty Septriana",
    tim: "Tim 3",
    rating: 4,
    keahlian: ["Laporan PKL", "Makalah"],
    keterangan: "Fast response dan aman.",
    no_hp: "089530217454",
  },
  {
    nama: "Widya Eka Agustin",
    tim: "Tim 3",
    rating: 5,
    keahlian: [],
    keterangan: "",
    no_hp: "",
  },

  // ============================ TIM 4 ============================
  {
    nama: "Abdul Muhith",
    tim: "Tim 4",
    rating: 5,
    keahlian: ["Desain PPT, Word, artikel, makalah, laporan, proposal, editing dokumen, materi presentasi, editing video, desain, AutoCAD 2D"],
    keterangan: "Fast response.",
    no_hp: "08990478172",
  },
  {
    nama: "Alfi Fitria Salsabila",
    tim: "Tim 4",
    rating: 3,
    keahlian: ["Laporan PKL, PPT, tugas sekolah dan kuliah"],
    keterangan: "Mengambil job saat libur kantor dan revisi belum bisa dikerjakan dengan cepat.",
    no_hp: "081315855918",
  },
  {
    nama: "Annisa Nurpatiana",
    tim: "Tim 4",
    rating: 5,
    keahlian: ["Microsoft Office (Word, Excel, PowerPoint, Power BI), desain (PowerDesigner, Canva, Figma), coding (VS Code, Google Colab, JavaScript)"],
    keterangan: "Bisa mengambil job, kecuali saat ada jadwal kuliah.",
    no_hp: "081320712491",
  },
  {
    nama: "Ayu Hakikatul Maula",
    tim: "Tim 4",
    rating: 5,
    keahlian: ["Makalah, artikel, esai, jurnal, skripsi, tesis, disertasi, proposal, KTI, PTK, PTS, laporan PKL/magang/KKN, PPT"],
    keterangan: "Pengerjaan cepat dan fast response.",
    no_hp: "085184741380",
  },
  {
    nama: "Fitrotin",
    tim: "Tim 4",
    rating: 5,
    keahlian: [],
    keterangan: "",
    no_hp: "",
  },
  {
    nama: "Lilis Anggreni",
    tim: "Tim 4",
    rating: 5,
    keahlian: ["Tugas umum, jurnal, skripsi, proposal, Bab 4–5, olah data (EViews, SPSS, STATA, SmartPLS, NVivo), bimbingan online"],
    keterangan: "Pengerjaan cepat, tetapi membalas pesan agak lama.",
    no_hp: "081339453476",
  },
  {
    nama: "Ni Kadek Risma Arisanti",
    tim: "Tim 4",
    rating: 5,
    keahlian: ["Laporan, makalah, artikel, PPT, revisi Word, skripsi kualitatif"],
    keterangan: "Pengerjaan cepat, kecuali saat beribadah di Bali atau ada meeting mendadak.",
    no_hp: "081949851177",
  },
  {
    nama: "Shinta Kurniawati",
    tim: "Tim 4",
    rating: 4,
    keahlian: ["Laporan PKL, makalah, resume, artikel ilmiah, jurnal ilmiah, skripsi"],
    keterangan: "Slow response dan jarang mengambil job karena kesibukan sebagai dosen.",
    no_hp: "082228394762",
  },

  // ============================ TIM 5 ============================
  {
    nama: "Anisa Dian Lestari",
    tim: "Tim 5",
    rating: 5,
    keahlian: [],
    keterangan: "",
    no_hp: "",
  },
  {
    nama: "Annisa Asni",
    tim: "Tim 5",
    rating: 4,
    keahlian: ["Tugas SMK/SMA, laporan dan PPT PKL. Dapat menangani berbagai jenis tugas, kecuali coding dan skripsi"],
    keterangan: "Bisa handle job banyak.",
    no_hp: "082127343925",
  },
  {
    nama: "Asrori",
    tim: "Tim 5",
    rating: 3,
    keahlian: [],
    keterangan: "",
    no_hp: "",
  },
  {
    nama: "Desak Tini Adnyani",
    tim: "Tim 5",
    rating: 4,
    keahlian: ["Tugas SMK/SMA, laporan dan PPT PKL. Dapat menangani berbagai jenis tugas, kecuali coding dan skripsi"],
    keterangan: "Dapat mengerjakan job dengan tenggat minimal H-1. Tidak menerima pekerjaan dengan tenggat hitungan jam.",
    no_hp: "087846524987",
  },
  {
    nama: "Intan",
    tim: "Tim 5",
    rating: 3,
    keahlian: ["Tugas SMK/SMA, laporan dan PPT PKL. Dapat menangani berbagai jenis tugas, kecuali coding dan skripsi"],
    keterangan: "Pengerjaan cukup baik, tetapi memiliki keterbatasan waktu. Mampu menangani sekitar 2–3 job per hari.",
    no_hp: "088276524024",
  },
  {
    nama: "M. Radit Apriansyah",
    tim: "Tim 5",
    rating: 5,
    keahlian: ["Tugas SMK/SMA, laporan dan PPT PKL. Dapat menangani berbagai jenis tugas, kecuali coding dan skripsi"],
    keterangan: "Mampu menangani banyak job.",
    no_hp: "088298466678",
  },
  {
    nama: "Muhyi",
    tim: "Tim 5",
    rating: 4,
    keahlian: ["Tugas SMK/SMA, laporan dan PPT PKL. Dapat menangani berbagai jenis tugas, tugas pekerjaan"],
    keterangan: "Pengerjaan cukup baik, mampu menangani sekitar 2–3 job per hari.",
    no_hp: "089676669025",
  },
  {
    nama: "Ni Putu Anik Pradnyantri",
    tim: "Tim 5",
    rating: 5,
    keahlian: ["Tugas SMK/SMA, laporan dan PPT PKL. Dapat menangani berbagai jenis tugas, kecuali coding dan skripsi"],
    keterangan: "Memiliki ketersediaan tinggi dan bisa mengambil job kapan saja. Saat sedang luang, mampu menangani lebih dari 5 job.",
    no_hp: "081353380035",
  },

];
