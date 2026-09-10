from PIL import Image
from pathlib import Path

ROOT = Path(r"e:\Michael\Projects\3DPrinter\public\support")


def crop_gcash():
    # Already good from prior pass — regenerate with known-good box.
    src = ROOT / "gcash.png"
    im = Image.open(src).convert("RGB")
    # Prior detection: (156, 291, 395, 530) — add a touch of quiet zone.
    box = (148, 283, 403, 538)
    out = im.crop(box).resize((900, 900), Image.Resampling.NEAREST)
    out.save(ROOT / "gcash-qr.png")
    print("gcash", box, out.size)


def maya_row_transitions(pix, y, x0, x1):
    t = 0
    prev = pix[x0, y] < 140
    for x in range(x0, x1):
        dark = pix[x, y] < 140
        if dark != prev:
            t += 1
            prev = dark
    return t


def crop_maya():
    src = ROOT / "maya.jpg"
    im = Image.open(src).convert("RGB")
    gray = im.convert("L")
    w, h = gray.size
    pix = gray.load()

    # Score candidate square sizes. Maya QR is a large centered module.
    best = None
    for side in range(340, 520, 4):
        # horizontal center bias
        for left in range(max(40, w // 2 - side // 2 - 40), min(w - side - 40, w // 2 - side // 2 + 41), 4):
            for top in range(220, 420, 4):
                if top + side >= h - 80:
                    continue
                # Sample every 4th row inside the square
                score = 0
                rows = 0
                for y in range(top, top + side, 4):
                    t = maya_row_transitions(pix, y, left, left + side)
                    # Strong QR rows have many flips
                    if t >= 28:
                        score += t
                        rows += 1
                # Prefer squares that look QR-like across most rows
                if rows < side / 4 / 4:
                    continue
                density = score / max(1, rows)
                key = (rows, density, -abs(left + side / 2 - w / 2))
                if best is None or key > best[0]:
                    best = (key, (left, top, left + side, top + side))

    if best is None:
        raise SystemExit("Maya QR not found")
    box = best[1]
    # Add quiet zone
    pad = 16
    left, top, right, bottom = box
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(w, right + pad)
    bottom = min(h, bottom + pad)
    # Re-square
    side = min(right - left, bottom - top)
    cx = (left + right) / 2
    cy = (top + bottom) / 2
    left = int(cx - side / 2)
    top = int(cy - side / 2)
    box = (left, top, left + side, top + side)
    out = im.crop(box).resize((900, 900), Image.Resampling.NEAREST)
    out.save(ROOT / "maya-qr.png")
    print("maya", box, "score", best[0], out.size)


crop_gcash()
crop_maya()
