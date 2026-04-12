"""Generate og-image.png (WhatsApp requires PNG/JPG for link previews, not SVG). Run: python generate_og_png.py"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
OUT = Path(__file__).resolve().parent / "og-image.png"


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    import os

    windir = Path(os.environ.get("WINDIR", "C:/Windows"))
    fonts = [
        windir / "Fonts" / name,
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    ]
    for p in fonts:
        if p.is_file():
            try:
                return ImageFont.truetype(str(p), size)
            except OSError:
                pass
    return ImageFont.load_default()


def lerp_rgb(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return (
        int(a[0] + (b[0] - a[0]) * t),
        int(a[1] + (b[1] - a[1]) * t),
        int(a[2] + (b[2] - a[2]) * t),
    )


def main() -> None:
    img = Image.new("RGB", (W, H), "#0a0a0f")
    px = img.load()
    c0 = (10, 10, 15)
    c1 = (18, 18, 26)
    for y in range(H):
        t = y / max(H - 1, 1)
        r, g, b = lerp_rgb(c0, c1, t * 0.35 + 0.15 * (1 - abs(t - 0.5) * 2))
        for x in range(W):
            px[x, y] = (r, g, b)

    d = ImageDraw.Draw(img)
    step = 32
    for x in range(0, W + 1, step):
        d.line([(x, 0), (x, H)], fill=(20, 22, 28), width=1)
    for y in range(0, H + 1, step):
        d.line([(0, y), (W, y)], fill=(20, 22, 28), width=1)

    margin = 72
    d.rectangle(
        [margin, margin, W - margin, H - margin],
        outline=(255, 255, 255, 20),
        width=1,
    )

    bar_x0, bar_x1 = margin, margin + 4
    for yy in range(margin, H - margin):
        t = (yy - margin) / max(H - 2 * margin - 1, 1)
        col = lerp_rgb((0, 255, 136), (0, 212, 255), t)
        d.line([(bar_x0, yy), (bar_x1, yy)], fill=col, width=4)

    font_title = load_font("segoeuib.ttf", 72)
    font_sub = load_font("segoeui.ttf", 32)
    font_mono = load_font("consola.ttf", 22)
    font_small = load_font("segoeui.ttf", 20)

    d.text((120, 130), "Om Shah", font=font_title, fill=(228, 228, 231))
    d.text((120, 230), "Cybersecurity & automation", font=font_sub, fill=(161, 161, 170))
    d.text((120, 310), ">_", font=font_mono, fill=(0, 255, 136))
    d.text((168, 310), "security", font=font_mono, fill=(113, 113, 122))
    d.text((288, 310), ".portfolio", font=font_mono, fill=(0, 255, 136))
    d.text((120, 400), "UTS · Sydney", font=font_small, fill=(82, 82, 91))

    img.save(OUT, "PNG", optimize=True)
    size_kb = OUT.stat().st_size / 1024
    print(f"Wrote {OUT} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
