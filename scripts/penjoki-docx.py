#!/usr/bin/env python3
"""Generator `prisma/penjoki-data.ts` dari rekap DOCX client.

Sumber: file `.docx` di folder `data/` (4 tabel = TIM 2, TIM 3, TIM 4,
TIM 5) dengan kolom ke-5 = Rating 1–5. Nama file boleh berubah; script
memilih file yang mengandung "penjoki", lalu file `.docx` pertama.
Butuh: `pip install python-docx`.

Jalankan:
    python3 scripts/penjoki-docx.py

Hasil (file TS) di-commit, jadi script ini hanya alat dev — tidak dipakai
saat build/runtime.
"""
from __future__ import annotations

import html
import json
from pathlib import Path

from docx import Document

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "prisma" / "penjoki-data.ts"


def cari_sumber() -> Path:
    """Pilih DOCX rekap penjoki dari folder data/."""
    semua = sorted(
        p
        for p in (ROOT / "data").glob("*.docx")
        if not p.name.startswith("~$")
    )
    if not semua:
        raise SystemExit("Tidak ada file .docx di folder data/")
    for p in semua:
        if "penjoki" in p.name.lower():
            return p
    return semua[0]

# Urutan tabel di DOCX → nama tim.
TIM_PER_TABEL = {0: "Tim 2", 1: "Tim 3", 2: "Tim 4", 3: "Tim 5"}
# Urutan tampil di file TS.
URUTAN_TIM = ["Tim 2", "Tim 3", "Tim 4", "Tim 5"]

LANJUTAN = ("kecuali", "dan ", "atau ", "khususnya", "termasuk", "beserta")


def split_keahlian(teks: str) -> list[str]:
    """Pisah keahlian per baris & koma, tanpa memotong frasa pengecualian."""
    hasil: list[str] = []
    for baris in (teks or "").split("\n"):
        baris = baris.strip()
        if not baris:
            continue
        bagian: list[str] = []
        buf = ""
        depth = 0
        for ch in baris:
            if ch == "(":
                depth += 1
            elif ch == ")":
                depth = max(0, depth - 1)
            if ch == "," and depth == 0:
                bagian.append(buf)
                buf = ""
            else:
                buf += ch
        bagian.append(buf)

        gabung: list[str] = []
        for b in bagian:
            b = b.strip(" .")
            if not b:
                continue
            if gabung and b.lower().startswith(LANJUTAN):
                gabung[-1] = f"{gabung[-1]}, {b}"
            else:
                gabung.append(b)

        # Pisah hanya bila semua potongan berbentuk label pendek berhuruf
        # kapital ("Laporan PKL, PPT, Makalah"). Kalau ada potongan berupa
        # frasa deskriptif ("review jurnal", "dan infografis"), baris itu
        # adalah satu keahlian utuh — jangan dipecah.
        bisa_dipecah = len(gabung) > 1 and all(
            b[0].isupper() and len(b.split()) <= 6 for b in gabung
        )
        hasil.extend(gabung if bisa_dipecah else [baris])

    unik, terlihat = [], set()
    for k in hasil:
        key = k.lower()
        if key not in terlihat:
            terlihat.add(key)
            unik.append(k)
    return unik


def rapikan_keterangan(teks: str) -> str:
    """Gabung baris jadi satu paragraf pendek yang enak dibaca."""
    baris = [b.strip() for b in (teks or "").split("\n") if b.strip()]
    hasil = []
    for b in baris:
        if not b.endswith((".", "!", "?")):
            b += "."
        hasil.append(b)
    return " ".join(hasil)


def baca_rating(teks: str) -> int | None:
    """Kolom Rating berisi 1–5; selain itu dianggap belum dinilai."""
    teks = (teks or "").strip()
    if teks.isdigit():
        nilai = int(teks)
        if 1 <= nilai <= 5:
            return nilai
    return None


def main() -> None:
    src = cari_sumber()
    print(f"📄 Sumber: {src.relative_to(ROOT)}")
    doc = Document(src)
    assert len(doc.tables) == 4, f"harap 4 tabel, dapat {len(doc.tables)}"

    baris_semua: list[dict] = []
    for idx, tabel in enumerate(doc.tables):
        tim = TIM_PER_TABEL[idx]
        for row in tabel.rows[1:]:
            sel = [html.unescape(c.text).strip() for c in row.cells]
            nama = sel[0].strip()
            if not nama:
                continue
            baris_semua.append(
                {
                    "nama": nama,
                    "tim": tim,
                    "rating": baca_rating(sel[4]) if len(sel) > 4 else None,
                    "keahlian": split_keahlian(sel[1]),
                    "keterangan": rapikan_keterangan(sel[2]),
                    "no_hp": sel[3].replace(" ", ""),
                }
            )

    baris_semua.sort(key=lambda r: (URUTAN_TIM.index(r["tim"]), r["nama"].lower()))
    assert baris_semua, "Tidak ada baris penjoki yang terbaca dari DOCX"
    jumlah = len(baris_semua)

    bagian = [
        "/**",
        " * Dataset resmi penjoki — \"REKAP DATA PENJOKI JOKITUGASAJA_ID\".",
        " *",
        f" * Sumber: `data/{src.name}` (rekap client terbaru).",
        f" * Tabel DOCX: TIM 2, TIM 3, TIM 4, TIM 5 — {jumlah} penjoki.",
        " * TIM 1 tidak ada di rekap sehingga tidak disentuh.",
        " *",
        " * Digenerate oleh `scripts/penjoki-docx.py`; jangan edit manual.",
        " *",
        " * Catatan:",
        " * - `rating` 1–5 berasal dari kolom Rating rekap. Rating kualitas ini",
        " *   dipakai sebagai FALLBACK rate bila penjoki belum punya transaksi",
        " *   berating bulan ini.",
        " * - `no_hp` disimpan apa adanya seperti di rekap. Normalisasi dilakukan",
        " *   saat sync/import.",
        " */",
        "export interface PenjokiSeed {",
        '  nama: string;',
        '  tim: "Tim 2" | "Tim 3" | "Tim 4" | "Tim 5";',
        "  rating: number | null;",
        "  keahlian: string[];",
        "  keterangan: string;",
        "  no_hp: string;",
        "}",
        "",
        "export const PENJOKI_DATA: PenjokiSeed[] = [",
    ]

    for tim in URUTAN_TIM:
        bagian.append(f"  // ============================ {tim.upper()} ============================")
        for r in (x for x in baris_semua if x["tim"] == tim):
            bagian.append("  {")
            bagian.append(f"    nama: {json.dumps(r['nama'], ensure_ascii=False)},")
            bagian.append(f"    tim: {json.dumps(r['tim'])},")
            bagian.append(f"    rating: {json.dumps(r['rating'])},")
            bagian.append(
                f"    keahlian: {json.dumps(r['keahlian'], ensure_ascii=False)},"
            )
            bagian.append(
                f"    keterangan: {json.dumps(r['keterangan'], ensure_ascii=False)},"
            )
            bagian.append(f"    no_hp: {json.dumps(r['no_hp'])},")
            bagian.append("  },")
        bagian.append("")

    bagian.append("];")
    bagian.append("")

    teks = "\n".join(bagian)
    OUT.write_text(teks, encoding="utf-8")
    print(f"✔ {jumlah} penjoki ditulis ke {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
