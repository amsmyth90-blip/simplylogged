from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "public" / "brand"
SOURCE = BRAND / "diarydock-logo-master.png"


def remove_white(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = []
    for red, green, blue, _ in rgba.getdata():
        distance = max(255 - red, 255 - green, 255 - blue)
        alpha = max(0, min(255, int((distance - 5) * 7.5)))
        pixels.append((red, green, blue, alpha))
    rgba.putdata(pixels)
    return rgba


def alpha_crop(image: Image.Image, padding: int = 20) -> Image.Image:
    box = image.getchannel("A").getbbox()
    if not box:
        return image
    left, top, right, bottom = box
    return image.crop(
        (
            max(0, left - padding),
            max(0, top - padding),
            min(image.width, right + padding),
            min(image.height, bottom + padding),
        )
    )


def contain(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    result = image.copy()
    result.thumbnail(size, Image.Resampling.LANCZOS)
    return result


master = Image.open(SOURCE).convert("RGBA")
transparent = remove_white(master)
transparent.save(BRAND / "diarydock-logo-transparent.png")

# Compact lock-up: symbol and wordmark without the small tagline.
compact_source = transparent.crop((70, 110, master.width - 70, 925))
compact = alpha_crop(compact_source, 10)
compact.save(BRAND / "diarydock-logo-compact.png")

# Mark-only extraction for small screens and app icons.
mark_source = transparent.crop((300, 120, 920, 770))
mark = alpha_crop(mark_source, 8)
mark.save(BRAND / "diarydock-mark.png")

# Rounded app icon with the selected mark and its original colour treatment.
icon_size = 1024
icon = Image.new("RGBA", (icon_size, icon_size), (0, 0, 0, 0))
gradient = Image.new("RGBA", (icon_size, icon_size))
gp = gradient.load()
for y in range(icon_size):
    for x in range(icon_size):
        t = (x + y) / (2 * (icon_size - 1))
        gp[x, y] = (
            int(12 + (45 - 12) * t),
            int(48 + (43 - 48) * t),
            int(103 + (114 - 103) * t),
            255,
        )
mask = Image.new("L", (icon_size, icon_size), 0)
ImageDraw.Draw(mask).rounded_rectangle((20, 20, 1004, 1004), radius=220, fill=255)
icon.paste(gradient, (0, 0), mask)
mark_for_icon = contain(mark, (720, 720))
mark_white = Image.new("RGBA", mark_for_icon.size, (255, 255, 255, 0))
mark_white.putalpha(mark_for_icon.getchannel("A"))
icon.alpha_composite(
    mark_white,
    ((icon_size - mark_white.width) // 2, (icon_size - mark_white.height) // 2 - 10),
)
icon.save(BRAND / "diarydock-app-icon.png")

# Single-colour white asset for dark video frames and dark website headers.
white = Image.new("RGBA", compact.size, (255, 255, 255, 0))
white.putalpha(compact.getchannel("A"))
white.save(BRAND / "diarydock-logo-white.png")

# Portrait video end card.
end_card = Image.new("RGB", (1080, 1920), "#F7F8FB")
draw = ImageDraw.Draw(end_card)
for y in range(1920):
    t = y / 1919
    colour = (
        int(247 - 10 * t),
        int(248 - 8 * t),
        int(251 - 1 * t),
    )
    draw.line((0, y, 1080, y), fill=colour)

logo = contain(compact, (850, 760))
end_card.paste(logo, ((1080 - logo.width) // 2, 360), logo)

font_regular = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 39)
font_bold = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 48)
font_cta = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 34)
headline = "Your digital home, for everyday life."
tagline = "ORGANISED. PROTECTED. IN ONE PLACE."

draw.text(
    (540, 1260),
    headline,
    font=font_bold,
    fill="#0A2F67",
    anchor="mm",
)
draw.text(
    (540, 1350),
    tagline,
    font=font_regular,
    fill="#334E7A",
    anchor="mm",
)
draw.rounded_rectangle((155, 1490, 925, 1590), radius=50, fill="#285BB4")
cta = "For today, and whatever comes next"
draw.text(
    (540, 1540),
    cta,
    font=font_cta,
    fill="white",
    anchor="mm",
)
end_card.save(BRAND / "diarydock-video-end-card.png")

print("Created DiaryDock brand pack in", BRAND)
