import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { rupiah, yyyyMmDd } from "../lib/format";
import { masukRekap, type Pesanan, type Profile } from "../lib/types";
import { alokasiFee, BAGI_HASIL, persen } from "../lib/fee";
import {
  jenisAdmin,
  keteranganJabatan,
  labelJabatan,
  namaLengkapAdmin,
} from "../lib/admin";
import {
  geserPeriode,
  rentangPeriode,
  type Periode,
} from "../lib/periode";
import { PeriodeTabs } from "../components/PeriodeTabs";
import { TambahTransaksiModal } from "../components/TambahTransaksiModal";
import { Button, Card, EmptyState, Spinner } from "../components/ui";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";

interface RincianRow {
  id: string;
  tanggal: string;
  penjoki: string;
  noHp: string | null;
  jenis: string;
  nominal: number;
}

function Kotak({
  label,
  value,
  icon,
  tone = "gold",
  delta,
}: {
  label: string;
  value: string;
  icon: string;
  tone?: "gold" | "green" | "blue" | "violet" | "orange";
  delta?: { persen: number; naik: boolean };
}) {
  const tones: Record<string, string> = {
    gold: "border-brand-border bg-brand/10 text-gold",
    green: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    blue: "border-sky-400/25 bg-sky-400/10 text-sky-300",
    violet: "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-300",
    orange: "border-orange-400/25 bg-orange-400/10 text-orange",
  };
  return (
    <div className="rounded-2xl border border-line bg-surface/80 p-4">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm ${tones[tone]}`}>
          {icon}
        </span>
        <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-text-muted">
          {label}
        </p>
      </div>
      <div className="mt-2.5 flex items-end justify-between gap-2">
        <p className="font-display text-[15px] font-extrabold leading-tight text-text-main tabular">
          {value}
        </p>
        {delta && delta.persen > 0 && (
          <span
            className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold ${
              delta.naik
                ? "bg-emerald-400/15 text-emerald-300"
                : "bg-red-400/15 text-red-300"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={3}>
              {delta.naik ? <path d="m5 15 7-7 7 7" /> : <path d="m5 9 7 7 7-7" />}
            </svg>
            {delta.persen.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Detail Rekap per admin — "ruangan" masing-masing admin.
 *
 * Revisi client 3 Nov 2026:
 * - Periode harian / mingguan / bulanan.
 * - 6 kartu: Total Transaksi, Total Pendapatan, Fee Penjoki 50%,
 *   Fee Admin CS 23%, Fee Admin Sosmed 7%, Fee Owner 20%.
 * - Rincian transaksi: No · Penjoki · Jenis Tugas · Nominal (tanpa Fee Tim).
 * - Tombol "Tambah Transaksi" hanya di ruangan akun sendiri.
 * - Admin sosmed: hanya melihat, tidak bisa menambah.
 */
export function DetailRekapPage() {
  const { adminId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const { profile } = useAuth();

  const tanggal = params.get("tanggal") ?? yyyyMmDd(new Date());
  const periode = (params.get("periode") as Periode | null) ?? "harian";
  const [modalOpen, setModalOpen] = useState(false);

  const rentang = rentangPeriode(periode, tanggal);

  const { data: admin, isLoading: loadingAdmin } = useQuery({
    queryKey: ["admin-detail", adminId],
    queryFn: async (): Promise<Profile | null> => {
      if (profile?.id === adminId) return profile;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, team_id, nama_lengkap, no_hp, aktif, team:teams(nama)")
        .eq("id", adminId)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Profile) ?? null;
    },
    enabled: Boolean(adminId),
  });

  const sosmed = admin ? jenisAdmin(admin) === "sosmed" : false;
  /** Tombol tambah hanya muncul di ruangan milik akun yang sedang login. */
  const milikSendiri = Boolean(profile?.id) && profile?.id === adminId;
  const bolehTambah = milikSendiri && !sosmed;
  /**
   * Ringkasan "agency" (total semua tim) HANYA untuk ruangan milik admin
   * sosmed sendiri. Saat sosmed membuka ruangan admin lain, yang tampil
   * tetap data admin tersebut (read-only).
   */
  const ringkasanAgency = sosmed && milikSendiri;

  const { data: rows, isLoading } = useQuery({
    queryKey: [
      "rekap-admin",
      adminId,
      rentang.mulaiIso,
      rentang.selesaiIso,
      ringkasanAgency,
    ],
    queryFn: async (): Promise<Pesanan[]> => {
      let q = supabase
        .from("pesanan")
        .select(
          "id, harga, status, status_bayar, tanggal, dibuat_oleh, jumlah_keterangan, penjoki:penjoki(nama,no_hp), jenis_tugas:jenis_tugas(nama)"
        )
        .gte("tanggal", rentang.mulaiIso)
        .lte("tanggal", rentang.selesaiIso);
      // Ruangan admin biasa (dan ruangan admin lain yang dibuka sosmed):
      // hanya transaksi milik admin tersebut.
      if (!ringkasanAgency) q = q.eq("dibuat_oleh", adminId);
      const { data, error } = await q.order("tanggal", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Pesanan[];
    },
    // Tunggu data admin agar tahu apakah ini ruangan sosmed.
    enabled: Boolean(adminId) && Boolean(admin),
  });

  const rekap = (rows ?? []).filter(masukRekap);
  const totalPendapatan = rekap.reduce((s, p) => s + p.harga, 0);
  const fee = alokasiFee(totalPendapatan);

  // Data pembanding (periode sebelumnya) untuk persentase kenaikan/penurunan
  const rentangPembanding = rentangPeriode(periode, geserPeriode(periode, tanggal, -1));
  const { data: rowsPembanding } = useQuery({
    queryKey: [
      "rekap-admin-pembanding",
      adminId,
      rentangPembanding.mulaiIso,
      rentangPembanding.selesaiIso,
      ringkasanAgency,
    ],
    queryFn: async (): Promise<Pesanan[]> => {
      let q = supabase
        .from("pesanan")
        .select("id, harga, status, status_bayar, tanggal, dibuat_oleh")
        .gte("tanggal", rentangPembanding.mulaiIso)
        .lte("tanggal", rentangPembanding.selesaiIso);
      if (!ringkasanAgency) q = q.eq("dibuat_oleh", adminId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Pesanan[];
    },
    enabled: Boolean(adminId) && Boolean(admin),
  });

  const rekapPembanding = (rowsPembanding ?? []).filter(masukRekap);
  const totalPendapatanPembanding = rekapPembanding.reduce((s, p) => s + p.harga, 0);

  function hitungPersentase(sekarang: number, sebelum: number): { persen: number; naik: boolean } {
    if (sebelum === 0) return { persen: sekarang > 0 ? 100 : 0, naik: sekarang > 0 };
    const delta = ((sekarang - sebelum) / sebelum) * 100;
    return { persen: Math.abs(delta), naik: delta >= 0 };
  }

  const deltaTransaksi = hitungPersentase(rekap.length, rekapPembanding.length);
  const deltaPendapatan = hitungPersentase(totalPendapatan, totalPendapatanPembanding);

  const rincian: RincianRow[] = useMemo(
    () =>
      rekap.map((p) => ({
        id: p.id,
        tanggal: p.tanggal,
        penjoki: p.penjoki?.nama ?? "-",
        noHp: p.penjoki?.no_hp ?? null,
        jenis: p.jenis_tugas?.nama ?? "-",
        nominal: p.harga,
      })),
    [rekap]
  );

  function exportPDF() {
    const doc = new jsPDF();
    const namaAdmin = admin?.nama_lengkap || "Admin";
    const namaTeam = admin?.team?.nama || "";
    
    // Header
    doc.setFontSize(16);
    doc.text("LAPORAN KEUANGAN", 105, 15, { align: "center" });
    doc.setFontSize(11);
    doc.text(`${namaAdmin}${namaTeam ? ` - ${namaTeam}` : ""}`, 105, 22, { align: "center" });
    doc.setFontSize(9);
    doc.text(rentang.label, 105, 28, { align: "center" });

    // Ringkasan
    doc.setFontSize(10);
    doc.text("RINGKASAN", 14, 38);
    const ringkasan = [
      ["Total Transaksi", String(rekap.length)],
      ["Total Pendapatan", rupiah(totalPendapatan)],
      ["Fee Penjoki (50%)", rupiah(fee.penjoki)],
      ["Fee Admin CS (23%)", rupiah(fee.adminCs)],
      ["Fee Admin Sosmed (7%)", rupiah(fee.adminSosmed)],
      ["Fee Owner (20%)", rupiah(fee.owner)],
    ];
    autoTable(doc, {
      startY: 42,
      head: [["Keterangan", "Jumlah"]],
      body: ringkasan,
      theme: "striped",
      styles: { fontSize: 9, halign: "left" },
      columnStyles: { 1: { halign: "right" } },
    });

    // Rincian Transaksi
    const finalY = (doc as any).lastAutoTable.finalY || 42;
    doc.text("RINCIAN TRANSAKSI", 14, finalY + 10);
    const body = rincian.map((r, i) => [
      i + 1,
      r.tanggal,
      r.penjoki,
      r.jenis,
      rupiah(r.nominal),
    ]);
    body.push(["", "", "", "TOTAL", rupiah(totalPendapatan)]);
    
    autoTable(doc, {
      startY: finalY + 14,
      head: [["No", "Tanggal", "Penjoki", "Jenis Tugas", "Nominal"]],
      body,
      theme: "grid",
      styles: { fontSize: 8, halign: "left" },
      columnStyles: { 
        0: { halign: "center", cellWidth: 10 },
        4: { halign: "right" },
      },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      footStyles: { fillColor: [236, 240, 241], textColor: 0, fontStyle: "bold" },
    });

    doc.save(`Laporan_${namaAdmin}_${tanggal}.pdf`);
  }

  async function exportExcel() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Laporan");
    const namaAdmin = admin?.nama_lengkap || "Admin";
    const namaTeam = admin?.team?.nama || "";

    // Header
    ws.mergeCells("A1:E1");
    const titleCell = ws.getCell("A1");
    titleCell.value = "LAPORAN KEUANGAN";
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: "center" };

    ws.mergeCells("A2:E2");
    ws.getCell("A2").value = `${namaAdmin}${namaTeam ? ` - ${namaTeam}` : ""}`;
    ws.getCell("A2").alignment = { horizontal: "center" };

    ws.mergeCells("A3:E3");
    ws.getCell("A3").value = rentang.label;
    ws.getCell("A3").alignment = { horizontal: "center" };

    // Ringkasan
    ws.getCell("A5").value = "RINGKASAN";
    ws.getCell("A5").font = { bold: true };
    
    const ringkasan = [
      ["Total Transaksi", rekap.length],
      ["Total Pendapatan", totalPendapatan],
      ["Fee Penjoki (50%)", fee.penjoki],
      ["Fee Admin CS (23%)", fee.adminCs],
      ["Fee Admin Sosmed (7%)", fee.adminSosmed],
      ["Fee Owner (20%)", fee.owner],
    ];
    
    ws.addRow(["Keterangan", "Jumlah"]);
    const headerRow = ws.lastRow;
    if (headerRow) {
      headerRow.font = { bold: true };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD3D3D3" } };
    }
    
    ringkasan.forEach(([ket, jml]) => {
      ws.addRow([ket, jml]);
      if (ws.lastRow && typeof jml === "number") {
        ws.lastRow.getCell(2).numFmt = "#,##0";
      }
    });

    // Spacing
    ws.addRow([]);
    ws.addRow([]);

    // Rincian Transaksi
    ws.addRow(["RINCIAN TRANSAKSI"]);
    ws.lastRow!.font = { bold: true };
    
    const detailHeader = ws.addRow(["No", "Tanggal", "Penjoki", "Jenis Tugas", "Nominal"]);
    detailHeader.font = { bold: true };
    detailHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2980B9" } };
    detailHeader.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    });

    rincian.forEach((r, i) => {
      const row = ws.addRow([i + 1, r.tanggal, r.penjoki, r.jenis, r.nominal]);
      row.getCell(5).numFmt = "#,##0";
    });

    // Total
    const totalRow = ws.addRow(["", "", "", "TOTAL", totalPendapatan]);
    totalRow.font = { bold: true };
    totalRow.getCell(5).numFmt = "#,##0";
    totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECF0F1" } };

    // Column widths
    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 12;
    ws.getColumn(3).width = 20;
    ws.getColumn(4).width = 25;
    ws.getColumn(5).width = 15;

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Laporan_${namaAdmin}_${tanggal}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const ubahPeriode = (p: Periode) => {
    const next = new URLSearchParams(params);
    next.set("periode", p);
    setParams(next, { replace: true });
  };

  const ubahTanggal = (t: string) => {
    const next = new URLSearchParams(params);
    next.set("tanggal", t);
    setParams(next, { replace: true });
  };

  if (loadingAdmin || isLoading) return <Spinner label="Memuat detail rekap…" />;

  if (!admin) {
    return (
      <Card>
        <EmptyState
          title="Tidak punya akses ke ruangan ini"
          hint="Data admin lain hanya dapat dibuka oleh owner atau admin sosmed."
        />
      </Card>
    );
  }

  const nama = namaLengkapAdmin(admin);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Profil admin */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/80 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-border/60 bg-brand/10 text-sm font-extrabold text-gold">
            {nama.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-text-main">{nama}</p>
            <p className="text-[11px] text-text-muted">{labelJabatan(admin)}</p>
            <p className="mt-0.5 text-[10px] leading-snug text-text-muted/80">
              {keteranganJabatan(admin)}
            </p>
          </div>
        </div>
        {!bolehTambah && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1 text-[11px] font-bold text-text-muted">
            Hanya lihat
          </span>
        )}
      </div>

      {/* Periode + navigasi */}
      <PeriodeTabs value={periode} onChange={ubahPeriode} />

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => ubahTanggal(geserPeriode(periode, tanggal, -1))}
          className="rounded-full border border-line bg-surface-2 p-2 text-text-secondary hover:border-brand-border hover:text-gold"
          aria-label="Periode sebelumnya"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <label className="relative flex items-center gap-2 rounded-full border border-brand-border bg-surface-2 px-4 py-2 text-xs font-bold text-gold-soft">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-gold" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <rect x="3" y="5" width="18" height="16" rx="2.5" />
            <path d="M8 3v4M16 3v4M3 10h18" />
          </svg>
          <span>{rentang.label}</span>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => ubahTanggal(e.target.value || yyyyMmDd(new Date()))}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Pilih tanggal acuan"
          />
        </label>
        <button
          onClick={() => ubahTanggal(geserPeriode(periode, tanggal, 1))}
          className="rounded-full border border-line bg-surface-2 p-2 text-text-secondary hover:border-brand-border hover:text-gold"
          aria-label="Periode berikutnya"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </div>

      {/* Kotak ringkasan */}
      {sosmed ? (
        <div className="grid grid-cols-2 gap-3">
          <Kotak label="Total Transaksi" value={String(rekap.length)} icon="#" tone="green" delta={deltaTransaksi} />
          <Kotak label="Total Pendapatan" value={rupiah(totalPendapatan)} icon="Rp" tone="gold" delta={deltaPendapatan} />
          <div className="col-span-2">
            <Kotak
              label={`Fee Admin Sosmed (${persen(BAGI_HASIL.adminSosmed)}%)`}
              value={rupiah(fee.adminSosmed)}
              icon="%"
              tone="violet"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Kotak label="Total Transaksi" value={String(rekap.length)} icon="#" tone="green" delta={deltaTransaksi} />
          <Kotak label="Total Pendapatan" value={rupiah(totalPendapatan)} icon="Rp" tone="gold" delta={deltaPendapatan} />
          <Kotak
            label={`Fee Penjoki (${persen(BAGI_HASIL.penjoki)}%)`}
            value={rupiah(fee.penjoki)}
            icon="P"
            tone="blue"
          />
          <Kotak
            label={`Fee Admin CS (${persen(BAGI_HASIL.adminCs)}%)`}
            value={rupiah(fee.adminCs)}
            icon="C"
            tone="green"
          />
          <Kotak
            label={`Fee Admin Sosmed (${persen(BAGI_HASIL.adminSosmed)}%)`}
            value={rupiah(fee.adminSosmed)}
            icon="S"
            tone="violet"
          />
          <Kotak
            label={`Fee Owner (${persen(BAGI_HASIL.owner)}%)`}
            value={rupiah(fee.owner)}
            icon="O"
            tone="orange"
          />
        </div>
      )}

      {/* Rincian transaksi */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <h3 className="font-display text-sm font-extrabold text-text-main">
              Rincian Transaksi
            </h3>
            <p className="text-[11px] text-text-muted">
              {rekap.length} transaksi · {rentang.label}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {rincian.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  onClick={exportPDF}
                  className="shrink-0 px-3 py-1.5 text-xs"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                  </svg>
                  PDF
                </Button>
                <Button
                  variant="ghost"
                  onClick={exportExcel}
                  className="shrink-0 px-3 py-1.5 text-xs"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <path d="M14 2v6h6M10 9l5 6M15 9l-5 6" />
                  </svg>
                  Excel
                </Button>
              </>
            )}
            {bolehTambah && (
              <Button
                variant="primary"
                onClick={() => setModalOpen(true)}
                className="shrink-0 px-3 py-1.5 text-xs"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.6}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Tambah Transaksi
              </Button>
            )}
          </div>
        </div>

        {rincian.length === 0 ? (
          <EmptyState
            title="Belum ada transaksi"
            hint={
              bolehTambah
                ? "Klik “Tambah Transaksi” untuk mencatat transaksi pertama."
                : "Transaksi selesai + lunas akan tampil di sini."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2/60 text-left text-[10px] uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-2.5 font-bold">No</th>
                  <th className="px-4 py-2.5 font-bold">Penjoki</th>
                  <th className="px-4 py-2.5 font-bold">Jenis Tugas</th>
                  <th className="px-4 py-2.5 text-right font-bold">Nominal</th>
                </tr>
              </thead>
              <tbody>
                {rincian.map((r, i) => (
                  <tr key={r.id} className="border-b border-line-soft last:border-0 hover:bg-surface-2/50">
                    <td className="px-4 py-2.5 tabular text-text-muted">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-bold text-text-main">{r.penjoki}</p>
                      {r.noHp && (
                        <p className="text-[10px] text-text-muted">{r.noHp}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary">{r.jenis}</td>
                    <td className="px-4 py-2.5 text-right font-extrabold text-gold-soft tabular">
                      {rupiah(r.nominal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line bg-surface-2/40">
                  <td colSpan={3} className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-text-muted">
                    Total Pendapatan
                  </td>
                  <td className="px-4 py-2.5 text-right font-display text-sm font-extrabold text-gold-soft tabular">
                    {rupiah(totalPendapatan)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {bolehTambah && (
        <TambahTransaksiModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          admin={admin}
          tanggalAcuan={tanggal}
        />
      )}
    </div>
  );
}
