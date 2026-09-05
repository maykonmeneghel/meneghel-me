#!/usr/bin/env python3
"""
Turn the AGROM.IO EAGLE board into the compact JSON the COPPER chapter renders.

The source lives outside this repository (it is a 2017 hardware project, not
code), so the generated JSON is committed and this script is kept beside it for
provenance. Re-run only if the board file changes:

    python3 tools/extract-board.py "<path to AGROM.brd>"

Stdlib only, no dependencies. EAGLE units are millimetres and its Y axis points
up; the renderer flips Y rather than this script, so the numbers here stay
comparable to what EAGLE itself shows.
"""
import json
import math
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

DEFAULT_SRC = (
    "/Users/maykonmeneghel2/Library/Mobile Documents/com~apple~CloudDocs/Backup/"
    "Enterprises/Projetos/AGROM.IO/Projeto Eletrônico/PCI/AGROM.brd"
)
OUT = Path(__file__).resolve().parent.parent / "apps/maykon/src/data/agrom-board.json"

TOP, BOTTOM = "1", "16"
R2 = lambda v: round(float(v), 2)


def arc_points(x1, y1, x2, y2, curve_deg, segments=10):
    """EAGLE draws an arc as a wire with a `curve` angle. Approximate it."""
    a = math.radians(float(curve_deg))
    dx, dy = x2 - x1, y2 - y1
    chord = math.hypot(dx, dy)
    if chord == 0 or a == 0:
        return [(x1, y1), (x2, y2)]
    radius = chord / (2 * math.sin(a / 2))
    # Centre sits off the chord midpoint, perpendicular to it.
    h = math.sqrt(max(radius**2 - (chord / 2) ** 2, 0)) * (1 if a > 0 else -1)
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    ux, uy = -dy / chord, dx / chord
    cx, cy = mx - ux * h, my - uy * h
    a1 = math.atan2(y1 - cy, x1 - cx)
    a2 = a1 + a
    return [
        (cx + radius * math.cos(a1 + (a2 - a1) * i / segments),
         cy + radius * math.sin(a1 + (a2 - a1) * i / segments))
        for i in range(segments + 1)
    ]


def segments_of(wire):
    """One wire becomes one segment, or several if it is an arc."""
    x1, y1 = float(wire.get("x1")), float(wire.get("y1"))
    x2, y2 = float(wire.get("x2")), float(wire.get("y2"))
    if wire.get("curve"):
        pts = arc_points(x1, y1, x2, y2, wire.get("curve"))
        return [(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) for i in range(len(pts) - 1)]
    return [(x1, y1, x2, y2)]


def main(src_path):
    board = ET.parse(src_path).getroot().find(".//board")
    plain = board.find("plain")

    circle = plain.find("circle")
    outline = {"cx": R2(circle.get("x")), "cy": R2(circle.get("y")), "r": R2(circle.get("radius"))}

    holes = [
        {"x": R2(h.get("x")), "y": R2(h.get("y")), "d": R2(h.get("drill"))}
        for h in plain.findall("hole")
    ]

    nets = []
    for signal in board.findall(".//signals/signal"):
        top, bot = [], []
        # Vias belong to a signal, and counting them per net is the whole point:
        # a via is one moment where that track had to change sides.
        net_vias = [
            [R2(v.get("x")), R2(v.get("y")), R2(v.get("drill"))]
            for v in signal.findall("via")
        ]
        for wire in signal.findall("wire"):
            target = top if wire.get("layer") == TOP else bot if wire.get("layer") == BOTTOM else None
            if target is None:
                continue
            width = R2(wire.get("width"))
            for (a, b, c, d) in segments_of(wire):
                target.append([R2(a), R2(b), R2(c), R2(d), width])
        if top or bot:
            length = sum(
                math.hypot(x2 - x1, y2 - y1)
                for (x1, y1, x2, y2, _w) in top + bot
            )
            nets.append({
                "name": signal.get("name"),
                "top": top,
                "bot": bot,
                "vias": net_vias,
                "mm": round(length, 1),
            })

    # Power and ground first: they are the ones worth clicking.
    nets.sort(key=lambda n: -(len(n["top"]) + len(n["bot"])))

    parts = [
        {"n": e.get("name"), "x": R2(e.get("x")), "y": R2(e.get("y")), "pkg": e.get("package")}
        for e in board.findall(".//elements/element")
    ]

    texts = [
        {"t": t.text, "x": R2(t.get("x")), "y": R2(t.get("y")), "size": R2(t.get("size"))}
        for t in plain.findall("text")
        if t.text
    ]

    data = {
        "source": "AGROM.brd — EAGLE 7.6, AGROM.IO soil probe, 2017",
        "units": "mm",
        "outline": outline,
        "holes": holes,
        "nets": nets,
        "parts": parts,
        "texts": texts,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False))

    seg_top = sum(len(n["top"]) for n in nets)
    seg_bot = sum(len(n["bot"]) for n in nets)
    print(f"nets      {len(nets)}")
    print(f"segments  {seg_top} top · {seg_bot} bottom")
    print(f"vias      {sum(len(n['vias']) for n in nets)}")
    print(f"copper    {sum(n['mm'] for n in nets):.0f} mm total")
    print(f"parts     {len(parts)}")
    print(f"written   {OUT}  ({OUT.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC)
