/**
 * Agregasi Statistik Tim — fungsi murni, tanpa akses jaringan.
 *
 * Dipakai halaman `StatistikTimPage` dan diuji terpisah lewat
 * `scripts/check-statistik.ts`. Dengan begitu aturan angka (transaksi selesai,
 * pendapatan, rata-rata rate, delta bulan sebelumnya) hanya hidup di satu
 * tempat dan bisa diverifikasi tanpa membuka browser.
 */
import { belumAdaData, ratePenjoki } from "./rate";
import { adaDiTimTampil, timTampil } from "./teams";
import { masukRekap, type Pesanan, type Penjoki, type Team } from "./types";

export type BarisStatistik = Pick<
  Pesanan,
  "kode" | "team_id" | "penjoki_id" | "harga" | "status" | "status_bayar" | "rating"
>;

/** Satu baris rating untuk agregasi akumulasi rate. */
export type BarisRating = Pick<Pesanan, "penjoki_id" | "rating" | "status">;

export interface RingkasanTim {
  id: string;
  nama: string;
  transaksi: number;
  pendapatan: number;
  /** Rata-rata rate penjoki tim (skala 0–5); null bila belum ada yang terukur. */
  rate: number | null;
}

export interface HasilStatistik {
  tim: RingkasanTim[];
  total: {
    transaksi: number;
    pendapatan: number;
    rate: number | null;
  };
  /** Perubahan terhadap bulan sebelumnya. Untuk rate satuannya poin, bukan %. */
  delta: {
    transaksi: number | null;
    pendapatan: number | null;
    rate: number | null;
  };
}

const rata = (nilai: number[]): number | null =>
  nilai.length === 0 ? null : nilai.reduce((a, b) => a + b, 0) / nilai.length;

/** Persentase perubahan; null bila pembanding nol/tidak ada. */
export function persenPerubahan(now: number, prev: number): number | null {
  return prev ? ((now - prev) / prev) * 100 : null;
}

interface Agregat {
  transaksi: Map<string, number>;
  pendapatan: Map<string, number>;
  /** Rating transaksi di dalam periode per penjoki (cadangan bila peta
   *  akumulasi tidak diberikan). Skala 0–5. */
  ratingPenjoki: Map<string, number[]>;
}

function agregat(rows: BarisStatistik[]): Agregat {
  const hasil: Agregat = {
    transaksi: new Map(),
    pendapatan: new Map(),
    ratingPenjoki: new Map(),
  };

  for (const r of rows) {
    // Rating transaksi non-BATAL (selesai maupun belum lunas) tetap menilai
    // kualitas kerja penjoki. Transaksi tanpa rating diabaikan.
    if (r.status !== "BATAL" && r.rating != null && Number.isFinite(r.rating)) {
      const daftar = hasil.ratingPenjoki.get(r.penjoki_id) ?? [];
      daftar.push(Number(r.rating));
      hasil.ratingPenjoki.set(r.penjoki_id, daftar);
    }
    if (!masukRekap(r)) continue;
    hasil.transaksi.set(r.team_id, (hasil.transaksi.get(r.team_id) ?? 0) + 1);
    hasil.pendapatan.set(
      r.team_id,
      (hasil.pendapatan.get(r.team_id) ?? 0) + r.harga
    );
  }

  return hasil;
}

/**
 * Rata-rata rate penjoki yang sudah punya data.
 * Rate per penjoki = rata-rata rating AKUMULASI (atau rating periode bila
 * peta akumulasi tidak diberikan), fallback `rating_skill` (rekap DOCX).
 * Yang benar-benar kosong tidak dinilai.
 */
function rataRate(
  penjoki: Penjoki[],
  rating: Map<string, number[]>
): number | null {
  return rata(
    penjoki
      .map((p) => {
        const nilai = rating.get(p.id) ?? [];
        if (belumAdaData(nilai, p.rating_skill)) return null;
        return ratePenjoki(nilai, p.rating_skill);
      })
      .filter((v): v is number => v !== null)
  );
}

/**
 * Ubah baris rating menjadi peta `penjoki_id → daftar nilai`.
 * Dipakai untuk rate AKUMULASI (semua transaksi sampai batas tanggal).
 * BATAL, kosong, dan nilai di luar 1–5 diabaikan.
 */
export function petaPenilaian(rows: BarisRating[]): Map<string, number[]> {
  const peta = new Map<string, number[]>();
  for (const r of rows) {
    if (r.status === "BATAL" || r.rating == null) continue;
    const n = Number(r.rating);
    if (!Number.isFinite(n) || n < 1 || n > 5) continue;
    const daftar = peta.get(r.penjoki_id) ?? [];
    daftar.push(n);
    peta.set(r.penjoki_id, daftar);
  }
  return peta;
}

export function hitungStatistikTim({
  pesananKini,
  pesananLalu,
  teams,
  penjoki,
  penilaianKini,
  penilaianLalu,
}: {
  pesananKini: BarisStatistik[];
  pesananLalu: BarisStatistik[];
  teams: Team[];
  penjoki: Penjoki[];
  /**
   * Rating AKUMULASI per penjoki sampai akhir periode (opsional).
   * Bila diisi, rate memakai peta ini — konsisten dengan halaman Data
   * Penjoki. Bila kosong, dipakai rating di dalam periode saja.
   */
  penilaianKini?: Map<string, number[]>;
  penilaianLalu?: Map<string, number[]>;
}): HasilStatistik {
  const kini = agregat(pesananKini);
  const lalu = agregat(pesananLalu);

  const ratingKini = penilaianKini ?? kini.ratingPenjoki;
  const ratingLalu = penilaianLalu ?? lalu.ratingPenjoki;

  // Tim 1 & Sosmed disembunyikan — aturan yang sama dengan daftar penjoki.
  const penjokiTampil = penjoki.filter(adaDiTimTampil);

  const tim: RingkasanTim[] = timTampil(teams).map((t) => ({
    id: t.id,
    nama: t.nama,
    transaksi: kini.transaksi.get(t.id) ?? 0,
    pendapatan: kini.pendapatan.get(t.id) ?? 0,
    rate: rataRate(
      penjokiTampil.filter((p) => p.team_id === t.id),
      ratingKini
    ),
  }));

  // Ringkasan memakai SELURUH transaksi periode ini, bukan hanya tim yang
  // tampil, supaya angkanya sama dengan Data Rekap Harian Tim.
  const rekapKini = pesananKini.filter(masukRekap);
  const rekapLalu = pesananLalu.filter(masukRekap);

  const totalTransaksi = rekapKini.length;
  const totalPendapatan = rekapKini.reduce((s, r) => s + r.harga, 0);
  const transaksiLalu = rekapLalu.length;
  const pendapatanLalu = rekapLalu.reduce((s, r) => s + r.harga, 0);

  const rateKini = rataRate(penjokiTampil, ratingKini);
  const rateLalu = rataRate(penjokiTampil, ratingLalu);

  return {
    tim,
    total: {
      transaksi: totalTransaksi,
      pendapatan: totalPendapatan,
      rate: rateKini,
    },
    delta: {
      transaksi: persenPerubahan(totalTransaksi, transaksiLalu),
      pendapatan: persenPerubahan(totalPendapatan, pendapatanLalu),
      rate: rateKini === null || rateLalu === null ? null : rateKini - rateLalu,
    },
  };
}
