import { useMemo, useState } from "react";
import { CalendarIcon, ChevronRightIcon } from "../components/icons";
import { Card } from "../components/ui";
import { tanggalPanjang } from "../lib/format";

const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function namaBulan(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(d);
}

function samaHari(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Senin berikutnya (termasuk hari ini bila Senin). */
function seninBerikut(n = 4): Date[] {
  const hasil: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const selisih = (8 - d.getDay()) % 7;
  d.setDate(d.getDate() + selisih);
  for (let i = 0; i < n; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i * 7);
    hasil.push(x);
  }
  return hasil;
}

/** Jadwal Setor Mingguan — kalender bulanan + daftar jadwal mendatang. */
export function JadwalSetorPage() {
  const [bulan, setBulan] = useState(() => new Date());
  const hariIni = useMemo(() => new Date(), []);
  const mendatang = useMemo(() => seninBerikut(4), []);

  const tahun = bulan.getFullYear();
  const bln = bulan.getMonth();
  const offset = (new Date(tahun, bln, 1).getDay() + 6) % 7;
  const jumlahHari = new Date(tahun, bln + 1, 0).getDate();
  const sel: (Date | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: jumlahHari }, (_, i) => new Date(tahun, bln, i + 1)),
  ];
  while (sel.length % 7 !== 0) sel.push(null);

  const geser = (n: number) => {
    const d = new Date(tahun, bln + n, 1);
    setBulan(d);
  };

  return (
    <div className="space-y-4">
      {/* Info jadwal */}
      <div className="rounded-2xl border border-brand-border bg-brand/10 px-4 py-3.5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-brand/15 text-gold">
            <CalendarIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-[13px] font-extrabold text-gold-soft">
              Jadwal Setor Mingguan
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">
              Pastikan setoran sesuai dengan tanggal yang telah ditentukan.
            </p>
          </div>
        </div>
      </div>

      {/* Kalender */}
      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => geser(-1)}
            className="rounded-full border border-line p-1.5 text-text-secondary hover:border-brand-border hover:text-gold"
            aria-label="Bulan sebelumnya"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path d="m15 6-6 6 6 6" />
            </svg>
          </button>
          <p className="font-display text-sm font-extrabold text-text-main">
            {namaBulan(bulan)}
          </p>
          <button
            onClick={() => geser(1)}
            className="rounded-full border border-line p-1.5 text-text-secondary hover:border-brand-border hover:text-gold"
            aria-label="Bulan berikutnya"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {HARI.map((h) => (
            <p
              key={h}
              className="pb-1 text-[10px] font-bold uppercase tracking-wide text-text-muted"
            >
              {h}
            </p>
          ))}
          {sel.map((d, i) => {
            if (!d) return <span key={`kosong-${i}`} />;
            const iniHari = samaHari(d, hariIni);
            const setor = d.getDay() === 1;
            return (
              <span
                key={d.toISOString()}
                className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold tabular ${
                  iniHari
                    ? "bg-brand text-[#10231a]"
                    : setor
                      ? "border border-brand-border text-gold"
                      : "text-text-secondary"
                }`}
                title={
                  iniHari
                    ? "Hari ini"
                    : setor
                      ? "Tanggal setor"
                      : undefined
                }
              >
                {d.getDate()}
              </span>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-center gap-5 border-t border-line-soft pt-3 text-[10px] text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand" /> Hari ini
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-brand" /> Tanggal setor
          </span>
        </div>
      </Card>

      {/* Jadwal mendatang */}
      <div>
        <h3 className="mb-2 px-1 font-display text-sm font-extrabold text-text-main">
          Jadwal Mendatang
        </h3>
        <Card className="divide-y divide-line-soft overflow-hidden">
          {mendatang.map((d) => (
            <div key={d.toISOString()} className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-border/60 bg-brand/10 text-gold">
                <CalendarIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-text-main">
                  {tanggalPanjang(d)}
                </p>
                <p className="text-[11px] text-text-muted">Setor Mingguan</p>
              </div>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-text-muted" />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
