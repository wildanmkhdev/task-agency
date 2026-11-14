#!/usr/bin/env python3
"""Buat ulang favicon & ikon PWA dari `src/assets/logo-mark.png`.

Latar belakang: file PNG logo menyimpan ratusan bintik semi-transparan di
sekitar glyph (sisa ekspor). Bila dipakai langsung, bintik itu ikut ter-render
sebagai smudge abu-abu pada ikon 192/512 — terlihat "kotor".

Script ini:
  1. Membuang piksel dengan alpha rendah (noise) dan semua komponen kecil,
     menyisakan hanya glyph utama.
  2. Merender ulang pada 4x resolusi lalu menurunkannya (LANCZOS) supaya tepi
     tetap halus tanpa bintik.
  3. Menulis ulang seluruh ikon di `public/`.

Jalankan: python3 scripts/generate-icons.py
"""

from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "assets" / "logo-mark.png"
OUT = ROOT / "public"

BG = (2, 31, 26)  # #021f1a — theme_color aplikasi
FG = (220, 236, 228)  # #dcece4 — warna glyph pada logo asli
ALPHA_MIN = 60  # di bawah ini dianggap noise
SS = 4  # supersampling


def largest_component_mask(alpha: Image.Image) -> Image.Image:
    """Mask biner yang hanya berisi komponen terbesar (glyph)."""
    w, h = alpha.size
    px = alpha.load()
    seen = bytearray(w * h)
    best: list[tuple[int, int]] = []

    for y in range(h):
        for x in range(w):
            i = y * w + x
            if seen[i] or px[x, y] == 0:
                continue
            seen[i] = 1
            queue = deque([(x, y)])
            comp: list[tuple[int, int]] = []
            while queue:
                cx, cy = queue.popleft()
                comp.append((cx, cy))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        j = ny * w + nx
                        if not seen[j] and px[nx, ny] > 0:
                            seen[j] = 1
                            queue.append((nx, ny))
            if len(comp) > len(best):
                best = comp

    mask = Image.new("L", (w, h), 0)
    mp = mask.load()
    for x, y in best:
        mp[x, y] = 255
    return mask


def clean_glyph() -> Image.Image:
    """Glyph bersih: alpha dirapikan, noise di luar glyph dibuang."""
    src = Image.open(SRC).convert("RGBA")
    alpha = src.getchannel("A").point(lambda v: v if v >= ALPHA_MIN else 0)
    mask = largest_component_mask(alpha)

    # Batasi alpha asli pada area glyph saja → tepi memakai anti-alias asli.
    alpha = Image.composite(alpha, Image.new("L", alpha.size, 0), mask)
    # Haluskan sisa gerigi dari threshold.
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.6)).point(
        lambda v: 0 if v < 24 else (255 if v > 235 else v)
    )

    glyph = Image.new("RGBA", src.size, FG + (0,))
    glyph.putalpha(alpha)
    return glyph.crop(alpha.getbbox())


def render(glyph: Image.Image, size: int, content_ratio: float) -> Image.Image:
    """Ikon persegi: glyph di tengah, tinggi = content_ratio * size."""
    canvas = Image.new("RGB", (size * SS, size * SS), BG)
    gd = glyph.size
    target_h = size * SS * content_ratio
    target_w = target_h * gd[0] / gd[1]
    scaled = glyph.resize((max(1, round(target_w)), max(1, round(target_h))), Image.LANCZOS)
    pos = (
        (canvas.width - scaled.width) // 2,
        (canvas.height - scaled.height) // 2,
    )
    canvas.paste(scaled, pos, scaled)
    return canvas.resize((size, size), Image.LANCZOS)


def main() -> int:
    if not SRC.exists():
        print(f"✖ Sumber tidak ada: {SRC}", file=sys.stderr)
        return 1

    glyph = clean_glyph()
    (OUT / "icons").mkdir(parents=True, exist_ok=True)

    targets = [
        # (path, ukuran, rasio tinggi glyph terhadap kanvas)
        (OUT / "icons" / "icon-192.png", 192, 0.62),
        (OUT / "icons" / "icon-512.png", 512, 0.62),
        # Maskable: konten harus aman di dalam safe-zone 80%.
        (OUT / "icons" / "icon-maskable-512.png", 512, 0.46),
        (OUT / "icons" / "apple-touch-icon.png", 180, 0.62),
        (OUT / "icons" / "favicon-32.png", 32, 0.70),
        (OUT / "favicon.png", 64, 0.70),
    ]

    for path, size, ratio in targets:
        render(glyph, size, ratio).save(path, "PNG", optimize=True)
        print(f"✔ {path.relative_to(ROOT)} · {size}x{size}")

    print(f"✔ glyph bersih {glyph.size[0]}x{glyph.size[1]} (noise dibuang)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
