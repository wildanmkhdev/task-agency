/**
 * Agregasi Statistik Tim — fungsi murni, tanpa akses jaringan.
 *
 * Dipakai halaman `StatistikTimPage` dan diuji terpisah lewat
 * `scripts/check-statistik.ts`. Dengan begitu aturan angka (transaksi selesai,
 * pendapatan, rata-rata rate, delta bulan sebelumnya) hanya hidup di satu
 * tempat dan bisa diverifikasi tanpa membuka browser.
 */
import { belumAdaData, hitungRate } from "./rate";
import { adaDiTimTampil, timTampil } from "./teams";
import { masukRekap, type Pesanan, type Penjoki, type Team } from "./types";

export type BarisStatistik = Pick<
  Pesanan,
  "team_id" | "penjoki_id" | "harga" | "status" | "status_bayar"
>;

export interface RingkasanTim {
  id: string;
  nama: string;
  transaksi: number;
  pendapatan: number;
  /** Rata-rata rate penjoki tim; null bila belum ada yang terukur. */
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
  tugasPenjoki: Map<string, number>;
}

function agregat(rows: BarisStatistik[]): Agregat {
  const hasil: Agregat = {
    transaksi: new Map(),
    pendapatan: new Map(),
    tugasPenjoki: new Map(),
  };

  for (const r of rows) {
    // Volume tugas (dasar rate) = semua tugas non-BATAL, termasuk yang belum
    // lunas — sama dengan halaman Laporan.
    if (r.status !== "BATAL") {
      hasil.tugasPenjoki.set(
        r.penjoki_id,
        (hasil.tugasPenjoki.get(r.penjoki_id) ?? 0) + 1
      );
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

/** Rata-rata rate penjoki yang sudah punya data (yang kosong tidak dinilai). */
function rataRate(penjoki: Penjoki[], tugas: Map<string, number>): number | null {
  return rata(
    penjoki
      .filter((p) => !belumAdaData(p.rating_skill, tugas.get(p.id) ?? 0))
      .map((p) => hitungRate(p.rating_skill, tugas.get(p.id) ?? 0))
  );
}

export function hitungStatistikTim({
  pesananKini,
  pesananLalu,
  teams,
  penjoki,
}: {
  pesananKini: BarisStatistik[];
  pesananLalu: BarisStatistik[];
  teams: Team[];
  penjoki: Penjoki[];
}): HasilStatistik {
  const kini = agregat(pesananKini);
  const lalu = agregat(pesananLalu);

  // Tim 1 & Sosmed disembunyikan — aturan yang sama dengan daftar penjoki.
  const penjokiTampil = penjoki.filter(adaDiTimTampil);

  const tim: RingkasanTim[] = timTampil(teams).map((t) => ({
    id: t.id,
    nama: t.nama,
    transaksi: kini.transaksi.get(t.id) ?? 0,
    pendapatan: kini.pendapatan.get(t.id) ?? 0,
    rate: rataRate(
      penjokiTampil.filter((p) => p.team_id === t.id),
      kini.tugasPenjoki
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

  const rateKini = rataRate(penjokiTampil, kini.tugasPenjoki);
  const rateLalu = rataRate(penjokiTampil, lalu.tugasPenjoki);

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
