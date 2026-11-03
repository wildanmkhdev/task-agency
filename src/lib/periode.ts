import { tanggalPanjang, yyyyMmDd } from "./format";

/**
 * Periode rekap — revisi client 3 Nov 2026:
 * client meminta rekap tersedia dalam **harian, mingguan, dan bulanan**.
 */
export type Periode = "harian" | "mingguan" | "bulanan";

export const LABEL_PERIODE: Record<Periode, string> = {
  harian: "Harian",
  mingguan: "Mingguan",
  bulanan: "Bulanan",
};

export const DAFTAR_PERIODE: Periode[] = ["harian", "mingguan", "bulanan"];

export interface Rentang {
  periode: Periode;
  /** ISO awal hari (inklusif) — dipakai query Supabase */
  mulaiIso: string;
  /** ISO akhir hari (inklusif) */
  selesaiIso: string;
  /** Label siap tampil, mis. "Senin, 3 November 2026" */
  label: string;
  /** Periode sebelumnya — untuk hitung naik/turun */
  sebelumnya: { mulaiIso: string; selesaiIso: string; label: string };
}

const awalHari = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);

const akhirHari = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

const tambahHari = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const namaBulan = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(d);

const hariBulan = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(d);

/** Senin sebagai awal minggu. */
function awalMinggu(d: Date): Date {
  const offset = (d.getDay() + 6) % 7; // Senin = 0 … Minggu = 6
  return tambahHari(awalHari(d), -offset);
}

/**
 * Hitung rentang untuk sebuah periode berdasarkan tanggal acuan.
 * Semua batas dihitung pada zona waktu lokal perangkat agar konsisten
 * dengan cara `tanggal` disimpan (tengah malam lokal → ISO).
 */
export function rentangPeriode(periode: Periode, tanggal: string): Rentang {
  const base = new Date(`${tanggal}T00:00:00`);

  if (periode === "harian") {
    const kemarin = tambahHari(base, -1);
    return {
      periode,
      mulaiIso: awalHari(base).toISOString(),
      selesaiIso: akhirHari(base).toISOString(),
      label: tanggalPanjang(base),
      sebelumnya: {
        mulaiIso: awalHari(kemarin).toISOString(),
        selesaiIso: akhirHari(kemarin).toISOString(),
        label: tanggalPanjang(kemarin),
      },
    };
  }

  if (periode === "mingguan") {
    const senin = awalMinggu(base);
    const minggu = tambahHari(senin, 6);
    const seninLalu = tambahHari(senin, -7);
    return {
      periode,
      mulaiIso: awalHari(senin).toISOString(),
      selesaiIso: akhirHari(minggu).toISOString(),
      label: `${hariBulan(senin)} – ${hariBulan(minggu)} ${minggu.getFullYear()}`,
      sebelumnya: {
        mulaiIso: awalHari(seninLalu).toISOString(),
        selesaiIso: akhirHari(tambahHari(seninLalu, 6)).toISOString(),
        label: `${hariBulan(seninLalu)} – ${hariBulan(tambahHari(seninLalu, 6))} ${seninLalu.getFullYear()}`,
      },
    };
  }

  const awalBulan = new Date(base.getFullYear(), base.getMonth(), 1);
  const akhirBulan = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  const awalBulanLalu = new Date(base.getFullYear(), base.getMonth() - 1, 1);
  const akhirBulanLalu = new Date(base.getFullYear(), base.getMonth(), 0);

  return {
    periode,
    mulaiIso: awalHari(awalBulan).toISOString(),
    selesaiIso: akhirHari(akhirBulan).toISOString(),
    label: namaBulan(awalBulan),
    sebelumnya: {
      mulaiIso: awalHari(awalBulanLalu).toISOString(),
      selesaiIso: akhirHari(akhirBulanLalu).toISOString(),
      label: namaBulan(awalBulanLalu),
    },
  };
}

/** Geser tanggal acuan satu periode ke depan/belakang. */
export function geserPeriode(
  periode: Periode,
  tanggal: string,
  arah: 1 | -1
): string {
  const d = new Date(`${tanggal}T00:00:00`);
  if (periode === "harian") return yyyyMmDd(tambahHari(d, arah));
  if (periode === "mingguan") return yyyyMmDd(tambahHari(d, 7 * arah));
  return yyyyMmDd(new Date(d.getFullYear(), d.getMonth() + arah, 1));
}

/** Kata ganti pembanding, mis. "dari kemarin" / "dari minggu lalu". */
export function labelPembanding(periode: Periode): string {
  if (periode === "harian") return "dari kemarin";
  if (periode === "mingguan") return "dari minggu lalu";
  return "dari bulan lalu";
}
