#!/usr/bin/env python3
"""
Build the 3D board from the IDF 3.0 pair EAGLE exported in 2017.

  ibm_s.emn  board outline + thickness + drilled holes + component placements
  ibm_s.emp  the footprint outline of every package used

Together those describe a real assembled board: where each part sits, which way
it faces, which side of the laminate it is on, and what shape it is.

One thing the export lost: EAGLE's IDF exporter wrote every component height as
1.0 mm. Heights below are therefore assigned here, from the standard dimensions
of each package family, and are the only numbers in this pipeline that do not
come out of the source files.

    python3 tools/extract-board3d.py "<path to ibm_s.emn>"
"""
import json
import re
import sys
from pathlib import Path

DEFAULT_EMN = (
    "/Users/maykonmeneghel2/Library/Mobile Documents/com~apple~CloudDocs/Backup/"
    "Enterprises/Projetos/AGROM.IO/Projeto Mecânico/Por Projeto/PCB/ibm_s.emn"
)
OUT = Path(__file__).resolve().parent.parent / "apps/maykon/src/data/agrom-board3d.json"

# Millimetres above the laminate, by package family. Standard datasheet values.
HEIGHTS = {
    "E2_5-6E": 6.0,          # 6 mm electrolytic can
    "153CLV-0405": 5.5,      # radial electrolytic
    "1X02": 8.5, "1X03": 8.5, "1X04": 8.5, "1X05": 8.5,   # 0.1" pin headers
    "AK300_2": 10.0,         # screw terminal
    "22-23-2031": 8.0,       # Molex KK header
    "DIPSWITCH-02-209-2LPST": 5.0,
    "ESP8266-ESP12E": 3.2,   # the WiFi module, shield included
    "LED3MM": 4.5,
    "TO252": 2.3,            # DPAK
    "SOT223": 1.8,
    "SOT23-EBC": 1.1,
    "SO08": 1.75, "SO16": 1.75,
    "416131160801": 2.0,
    "C0805": 0.9, "R0805": 0.55, "M0805": 0.55, "0805": 0.55,
}
DEFAULT_HEIGHT = 1.2

R3 = lambda v: round(float(v), 3)


def read(path):
    return Path(path).read_text(errors="replace").replace("\r", "")


def sections(text, name):
    """Yield the body lines of every .NAME ... .END_NAME block.

    The rest of the header line is discarded: several IDF records carry an
    owner token there (".BOARD_OUTLINE UNOWNED"), which is not data.
    """
    pattern = re.compile(rf"^\.{name}\b[^\n]*\n(.*?)^\.END_{name}\b", re.S | re.M)
    for m in pattern.finditer(text):
        yield [ln.strip() for ln in m.group(1).splitlines() if ln.strip()]


def parse_library(emp_text):
    """geometry name -> {outline: [[x, y], ...]}"""
    lib = {}
    for body in sections(emp_text, "ELECTRICAL"):
        geom = body[0].split()[0]
        pts = []
        for line in body[1:]:
            parts = line.split()
            if len(parts) >= 3:
                pts.append([R3(parts[1]), R3(parts[2])])
        if pts and pts[0] == pts[-1]:
            pts.pop()
        if len(pts) >= 3:
            lib[geom] = pts
    return lib


def parse_board(emn_text, lib):
    outline_body = next(sections(emn_text, "BOARD_OUTLINE"))
    thickness = R3(outline_body[0])
    outline = []
    for line in outline_body[1:]:
        p = line.split()
        if len(p) >= 3:
            outline.append([R3(p[1]), R3(p[2])])
    if outline and outline[0] == outline[-1]:
        outline.pop()

    holes = []
    for line in next(sections(emn_text, "DRILLED_HOLES")):
        p = line.split()
        if len(p) >= 3:
            try:
                holes.append({"d": R3(p[0]), "x": R3(p[1]), "y": R3(p[2])})
            except ValueError:
                continue

    placement_body = next(sections(emn_text, "PLACEMENT"))
    parts, missing = [], set()
    # Records come in pairs: "geom part refdes" then "x y z rot side status".
    for head, pose in zip(placement_body[0::2], placement_body[1::2]):
        h = head.split()
        p = pose.split()
        if len(h) < 3 or len(p) < 5:
            continue
        geom = h[0]
        shape = lib.get(geom)
        if shape is None:
            missing.add(geom)
            continue
        parts.append({
            "ref": h[2],
            "geom": geom,
            "x": R3(p[0]),
            "y": R3(p[1]),
            "rot": R3(p[3]),
            "side": "bot" if p[4].upper().startswith("BOTTOM") else "top",
            "h": HEIGHTS.get(geom, DEFAULT_HEIGHT),
            "shape": shape,
        })
    return thickness, outline, holes, parts, missing


def main(emn_path):
    emn_path = Path(emn_path)
    emp_path = emn_path.with_suffix(".emp")
    lib = parse_library(read(emp_path))
    thickness, outline, holes, parts, missing = parse_board(read(emn_path), lib)

    data = {
        "source": "ibm_s.emn / .emp — IDF 3.0 exported from EAGLE, 2017",
        "note": "Component heights are assigned from package families; the IDF export flattened them all to 1.0 mm.",
        "units": "mm",
        "thickness": thickness,
        "outline": outline,
        "holes": holes,
        "parts": parts,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(",", ":")))

    print(f"thickness  {thickness} mm")
    print(f"outline    {len(outline)} points")
    print(f"holes      {len(holes)}")
    print(f"parts      {len(parts)}  ({sum(1 for p in parts if p['side'] == 'bot')} on the bottom)")
    print(f"packages   {len(lib)} footprints in the library")
    if missing:
        print(f"MISSING    footprints not in the library: {sorted(missing)}")
    print(f"written    {OUT}  ({OUT.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_EMN)
