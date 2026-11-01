import { useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { Button } from "./ui";
import { DocumentArrowDownIcon } from "./icons";

export interface ExportColumn {
  key: string;
  label: string;
  /** format tampilan (opsional) */
  render?: (row: Record<string, unknown>) => string;
  /** true → format Rupiah di Excel (angka + format #,##0) */
  currency?: boolean;
}

interface Props {
  title: string;
  /** nama file tanpa ekstensi, mis. "rekap-harian-2026-11-01" */
  filename: string;
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
  /** tampilkan tombol (default true) */
  className?: string;
}

/**
 * Export laporan ke PDF & Excel (D3).
 * PDF: header brand navy + tabel putih (siap cetak).
 * Excel: header slate + angka rupiah bernilai numerik (bisa diolah/sum).
 */
export function ExportButtons({ title, filename, columns, rows, className = "" }: Props) {
  const [busy, setBusy] = useState<"pdf" | "xlsx" | null>(null);

  const cellText = (col: ExportColumn, row: Record<string, unknown>) =>
    col.render ? col.render(row) : String(row[col.key] ?? "");

  const exportPdf = async () => {
    setBusy("pdf");
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();

      // Header brand
      doc.setFillColor(14, 41, 75); // navy
      doc.rect(0, 0, pageW, 64, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("JOKITUGASAJA_ID", 40, 30);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("CEPAT · MURAH · TERPERCAYA", 40, 44);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(title, pageW - 40, 30, { align: "right" });
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Dicetak: ${new Date().toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}  ·  ${rows.length} baris`,
        pageW - 40,
        46,
        { align: "right" }
      );

      autoTable(doc, {
        startY: 84,
        head: [columns.map((c) => c.label)],
        body: rows.map((r) => columns.map((c) => cellText(c, r))),
        styles: { font: "helvetica", fontSize: 9, cellPadding: 6, textColor: [15, 23, 42] },
        headStyles: { fillColor: [2, 132, 199], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 40, right: 40 },
      });

      doc.save(`${filename}.pdf`);
    } finally {
      setBusy(null);
    }
  };

  const exportExcel = async () => {
    setBusy("xlsx");
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(title.slice(0, 28));

      ws.addRow([title]);
      ws.mergeCells(1, 1, 1, columns.length);
      const titleCell = ws.getCell(1, 1);
      titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0E294B" } };
      titleCell.alignment = { vertical: "middle", horizontal: "left" };
      ws.getRow(1).height = 26;

      ws.addRow([
        `Dicetak ${new Date().toLocaleDateString("id-ID")} · ${rows.length} baris`,
      ]);
      ws.mergeCells(2, 1, 2, columns.length);
      ws.getRow(2).font = { italic: true, size: 9, color: { argb: "FF64748B" } };

      const headerRow = ws.addRow(columns.map((c) => c.label));
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0284C7" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });

      for (const r of rows) {
        const excelRow = ws.addRow(
          columns.map((c) => {
            if (c.currency) {
              const n = Number(r[c.key]);
              return Number.isFinite(n) ? n : 0;
            }
            return cellText(c, r);
          })
        );
        columns.forEach((c, i) => {
          if (c.currency) {
            excelRow.getCell(i + 1).numFmt = '"Rp" #,##0';
          }
        });
      }

      ws.columns.forEach((col, i) => {
        col.width = Math.min(
          42,
          Math.max(
            12,
            ...[columns[i]?.label.length ?? 10, ...rows.map((r) => cellText(columns[i], r).length)]
          ) + 3
        );
      });

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${filename}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <Button variant="ghost" onClick={exportPdf} disabled={busy !== null || rows.length === 0}>
        <DocumentArrowDownIcon className="h-4 w-4" />
        {busy === "pdf" ? "Membuat PDF…" : "Export PDF"}
      </Button>
      <Button variant="ghost" onClick={exportExcel} disabled={busy !== null || rows.length === 0}>
        <DocumentArrowDownIcon className="h-4 w-4" />
        {busy === "xlsx" ? "Membuat Excel…" : "Export Excel"}
      </Button>
    </div>
  );
}
