#!/usr/bin/env python3
"""
Read the AGROM.IO bills of material into JSON.

Each product in `Projeto Mecânico/Lista dos Materiais` has its own workbook,
listing what it is made of, in what quantity, from which supplier and who was
responsible for sourcing it. An .xlsx is a zip of XML, so stdlib opens it and
no dependency is needed.

    python3 tools/extract-boms.py "<Lista dos Materiais folder>"
"""
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
OUT = Path(__file__).resolve().parent.parent / "apps/maykon/src/data/agrom-boms.json"

DEFAULT_DIR = (
    "/Users/maykonmeneghel2/Library/Mobile Documents/com~apple~CloudDocs/Backup/"
    "Enterprises/Projetos/AGROM.IO/Projeto Mecânico/Lista dos Materiais"
)

# Workbook -> the product id the site uses.
PRODUCTS = {
    "BOM Corpo": "corpo",
    "BOM OS": "cabeca-os",
    "BOM WS": "cabeca-ws",
    "BOM THD": "thd",
    "BOM GAS STATION": "gas",
    "BOM Painel Solar": "painel",
    "BOM AIR": "air",
}


def rows_of(path: Path):
    """Every non-empty row of every sheet, as a list of cell strings."""
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in root.findall(f"{NS}si"):
            shared.append("".join(t.text or "" for t in si.iter(f"{NS}t")))

    out = []
    for name in sorted(n for n in z.namelist() if re.match(r"xl/worksheets/sheet\d+\.xml", n)):
        root = ET.fromstring(z.read(name))
        for row in root.iter(f"{NS}row"):
            cells = []
            for c in row.findall(f"{NS}c"):
                v = c.find(f"{NS}v")
                if v is None or v.text is None:
                    cells.append("")
                elif c.get("t") == "s" and int(v.text) < len(shared):
                    cells.append(shared[int(v.text)].strip())
                else:
                    cells.append(v.text.strip())
            if any(cells):
                out.append(cells)
    return out


def parse(path: Path):
    """Columns are quantity, unit, part, then supplier and owner where present."""
    items = []
    for cells in rows_of(path):
        padded = cells + [""] * (6 - len(cells))
        qty, unit, part, supplier, owner = padded[0], padded[1], padded[2], padded[3], padded[4]
        # The header row names the first column; skip it and anything without a part.
        if not part or qty.lower().startswith("qde"):
            continue
        try:
            quantity = float(qty)
        except ValueError:
            continue
        items.append({
            "qty": int(quantity) if quantity == int(quantity) else quantity,
            "unit": unit,
            "part": part,
            **({"supplier": supplier} if supplier else {}),
            **({"owner": owner} if owner else {}),
        })
    return items


def main(folder):
    folder = Path(folder)
    boms = {}
    for stem, product in PRODUCTS.items():
        path = folder / f"{stem}.xlsx"
        if not path.exists():
            print(f"MISSING  {path.name}")
            continue
        items = parse(path)
        boms[product] = items
        suppliers = len({i["supplier"] for i in items if i.get("supplier")})
        print(f"{product:<10} {len(items):>2} items, {suppliers} named suppliers   ({stem})")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(boms, separators=(",", ":"), ensure_ascii=False))
    total = sum(len(v) for v in boms.values())
    print(f"\n{total} line items across {len(boms)} products")
    print(f"written {OUT}  ({OUT.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DIR)
