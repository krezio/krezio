"""Cut Computer Modern down to the characters the README images use.

    python scripts/fonts.py <folder with cmu-*.woff2>

Writes data/fonts/<name>.woff2 for each face, small enough to embed in an SVG, and
data/fonts/metrics.json with each character's width so the scripts can measure
text. Needs fonttools and brotli. Only re-run it if the images need new characters.
"""
import json
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

SRC = Path(sys.argv[1])
OUT = Path(__file__).resolve().parent.parent / "data" / "fonts"
FACES = ["cmu-serif-roman", "cmu-serif-bold", "cmu-tt-roman"]
TEXT = "".join(chr(c) for c in range(32, 127)) + "·→∎–—’×≈%~"

OUT.mkdir(parents=True, exist_ok=True)
metrics = {}
for face in FACES:
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["kern", "liga"]
    font = subset.load_font(str(SRC / f"{face}.woff2"), opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=TEXT)
    sub.subset(font)
    out = OUT / f"{face}.woff2"
    subset.save_font(font, str(out), opts)

    tt = TTFont(str(out))
    cmap = tt.getBestCmap()
    hmtx = tt["hmtx"]
    upm = tt["head"].unitsPerEm
    metrics[face] = {ch: round(hmtx[cmap[ord(ch)]][0] / upm, 4) for ch in TEXT if ord(ch) in cmap}
    print(face, out.stat().st_size, "bytes")

(OUT / "metrics.json").write_text(json.dumps(metrics, ensure_ascii=False), encoding="utf8")
