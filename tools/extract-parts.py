#!/usr/bin/env python3
"""
Turn the AGROM.IO 3D-printed parts into meshes small enough to ship.

Source: the binary STLs SolidWorks exported for printing, which live outside
this repository. Together they are about 34,000 triangles — far more than a
web page should carry — so each is decimated by vertex clustering: snap every
vertex to a grid, merge the ones that land together, and drop the triangles
that collapse to a line. Crude next to quadric simplification, but it keeps
silhouettes honest at this scale and it is 30 lines instead of 300.

    python3 tools/extract-parts.py "<folder with the STLs>"

Output goes to public/ and is fetched only when the chapter is reached.
"""
import json
import math
import struct
import sys
from pathlib import Path

DEFAULT_DIR = (
    "/Users/maykonmeneghel2/Library/Mobile Documents/com~apple~CloudDocs/Backup/"
    "Enterprises/Projetos/AGROM.IO/Projeto Mecânico/Por Processos/Impressão 3D"
)
OUT = Path(__file__).resolve().parent.parent / "apps/maykon/public/models/agrom-parts.json"

TARGET_TRIS = 900
# Coordinates are quantised to this fraction of the part's size before being
# written as integers, which is what keeps the JSON small.
QUANT = 2048

# The part names are Maykon's own, from the file names, and stay in Portuguese
# in every language. What each part *is* gets described in the locale files, so
# a reader of the Spanish page is not handed a sentence of English.
# Ordered so the viewer opens on a part that fills the frame. "Barra Central"
# is a thin bar and covers about 4% of it, which reads as a rendering fault.
PARTS = [
    "Tampa OS",
    "Suporte GAS",
    "Tampa WS",
    "Suporte Bateria",
    "Barra Central",
    "Tampa GAS",
    "Tampa Suporte Bateria",
]


def read_binary_stl(path: Path):
    data = path.read_bytes()
    count = struct.unpack_from("<I", data, 80)[0]
    tris = []
    off = 84
    for _ in range(count):
        vals = struct.unpack_from("<12f", data, off)
        tris.append((vals[3:6], vals[6:9], vals[9:12]))
        off += 50
    return tris


def bounds(tris):
    xs = [v[0] for t in tris for v in t]
    ys = [v[1] for t in tris for v in t]
    zs = [v[2] for t in tris for v in t]
    return (min(xs), min(ys), min(zs)), (max(xs), max(ys), max(zs))


def cluster(tris, divisions):
    """Snap vertices to a grid and drop whatever collapses."""
    (lo, hi) = bounds(tris)
    span = max(hi[i] - lo[i] for i in range(3)) or 1.0
    cell = span / divisions

    index = {}
    verts = []

    def key_of(v):
        k = tuple(int(math.floor((v[i] - lo[i]) / cell)) for i in range(3))
        if k not in index:
            index[k] = len(verts)
            # Sit the merged vertex at the centre of its cell.
            verts.append([lo[i] + (k[i] + 0.5) * cell for i in range(3)])
        return index[k]

    faces = []
    seen = set()
    for a, b, c in tris:
        ia, ib, ic = key_of(a), key_of(b), key_of(c)
        if ia == ib or ib == ic or ia == ic:
            continue  # collapsed to a line
        sig = tuple(sorted((ia, ib, ic)))
        if sig in seen:
            continue
        seen.add(sig)
        faces.append((ia, ib, ic))
    return verts, faces


def decimate(tris, target):
    """Find the coarsest grid that still leaves roughly `target` triangles."""
    best = None
    for divisions in (8, 10, 12, 14, 16, 20, 24, 28, 34, 40, 48, 56, 68, 80):
        verts, faces = cluster(tris, divisions)
        best = (verts, faces, divisions)
        if len(faces) >= target:
            break
    return best


def pack(verts, faces):
    """Centre the part, scale it to unit size, and quantise to integers."""
    xs = [v[0] for v in verts]
    ys = [v[1] for v in verts]
    zs = [v[2] for v in verts]
    centre = [(min(a) + max(a)) / 2 for a in (xs, ys, zs)]
    span = max(max(a) - min(a) for a in (xs, ys, zs)) or 1.0
    scale = 2.0 / span  # part now fits in [-1, 1]

    packed = []
    for v in verts:
        for i in range(3):
            packed.append(round((v[i] - centre[i]) * scale * QUANT))
    flat = [i for f in faces for i in f]
    return packed, flat, span


def main(folder):
    folder = Path(folder)
    out_parts = []
    for stem in PARTS:
        name = stem
        path = folder / f"{stem}.STL"
        if not path.exists():
            print(f"MISSING  {path.name}")
            continue
        tris = read_binary_stl(path)
        verts, faces, divisions = decimate(tris, TARGET_TRIS)
        packed, flat, span = pack(verts, faces)
        out_parts.append({
            "id": stem.lower().replace(" ", "-"),
            "name": name,
            "mm": round(span, 1),
            "source": len(tris),
            "tris": len(faces),
            "grid": divisions,
            "v": packed,
            "f": flat,
        })
        print(f"{name:<24} {len(tris):>6} -> {len(faces):>5} tris   grid {divisions:>3}   {span:6.1f} mm")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"quant": QUANT, "parts": out_parts}, separators=(",", ":")))
    print(f"\nwritten {OUT}  ({OUT.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DIR)
