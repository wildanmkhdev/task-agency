import { DAFTAR_PERIODE, LABEL_PERIODE, type Periode } from "../lib/periode";

/** Pemilih periode: Harian · Mingguan · Bulanan (revisi client 3 Nov 2026). */
export function PeriodeTabs({
  value,
  onChange,
}: {
  value: Periode;
  onChange: (p: Periode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Pilih periode rekap"
      className="flex w-full gap-1 rounded-full border border-line bg-surface-2 p-1"
    >
      {DAFTAR_PERIODE.map((p) => {
        const aktif = p === value;
        return (
          <button
            key={p}
            role="tab"
            aria-selected={aktif}
            onClick={() => onChange(p)}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
              aktif
                ? "bg-brand text-[#10231a] shadow-[0_4px_14px_-8px_rgba(217,180,95,0.9)]"
                : "text-text-secondary hover:text-text-main"
            }`}
          >
            {LABEL_PERIODE[p]}
          </button>
        );
      })}
    </div>
  );
}
