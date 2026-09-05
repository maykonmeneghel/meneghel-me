#!/usr/bin/env python3
"""
Crop a transparent-background PNG to its subject and write it out again.

The SolidWorks render of the assembled soil sensor is 3840x2160 with the object
occupying a fraction of it; the rest is empty alpha that costs bytes and makes
the layout awkward. Stdlib only — zlib does the work, and the image is small
enough by this point that pure Python is fine.

    python3 tools/crop-render.py <in.png> <out.png> [padding] [#rrggbb]

Passing a background colour composites the alpha against it. A smooth 3D render
costs about 580 KB as a PNG and around a tenth of that as a JPEG, and since the
page behind it is one flat colour there is nothing for transparency to do.
"""
import struct
import sys
import zlib
from pathlib import Path


def paeth(a, b, c):
    pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
    return a if pa <= pb and pa <= pc else (b if pb <= pc else c)


def decode(path):
    data = Path(path).read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG"
    pos, idat = 8, b""
    w = h = depth = colour = 0
    while pos < len(data):
        length = struct.unpack(">I", data[pos:pos + 4])[0]
        kind = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + length]
        if kind == b"IHDR":
            w, h, depth, colour = struct.unpack(">IIBB", body[:10])
        elif kind == b"IDAT":
            idat += body
        elif kind == b"IEND":
            break
        pos += 12 + length
    assert depth == 8 and colour == 6, "expected 8-bit RGBA"

    raw = zlib.decompress(idat)
    stride = w * 4
    rows, prev, at = [], bytearray(stride), 0
    for _ in range(h):
        f = raw[at]; at += 1
        line = bytearray(raw[at:at + stride]); at += stride
        if f:
            for i in range(stride):
                a = line[i - 4] if i >= 4 else 0
                b = prev[i]
                c = prev[i - 4] if i >= 4 else 0
                if f == 1: line[i] = (line[i] + a) & 255
                elif f == 2: line[i] = (line[i] + b) & 255
                elif f == 3: line[i] = (line[i] + (a + b) // 2) & 255
                elif f == 4: line[i] = (line[i] + paeth(a, b, c)) & 255
        rows.append(line)
        prev = line
    return w, h, rows


def alpha_bounds(w, h, rows, threshold=8):
    x0, y0, x1, y1 = w, h, -1, -1
    for y, line in enumerate(rows):
        for x in range(w):
            if line[x * 4 + 3] > threshold:
                if x < x0: x0 = x
                if x > x1: x1 = x
                if y < y0: y0 = y
                if y > y1: y1 = y
    return x0, y0, x1, y1


def encode(path, w, h, rows):
    raw = b"".join(b"\x00" + bytes(r) for r in rows)
    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body))
    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw, 9))
           + chunk(b"IEND", b""))
    Path(path).write_bytes(png)


def flatten(rows, w, colour):
    """Composite RGBA over an opaque colour, leaving the alpha channel at 255."""
    br, bg, bb = colour
    for line in rows:
        for x in range(w):
            i = x * 4
            a = line[i + 3] / 255
            line[i] = round(line[i] * a + br * (1 - a))
            line[i + 1] = round(line[i + 1] * a + bg * (1 - a))
            line[i + 2] = round(line[i + 2] * a + bb * (1 - a))
            line[i + 3] = 255
    return rows


def main(src, dst, pad=12, bg=None, threshold=80):
    w, h, rows = decode(src)
    x0, y0, x1, y1 = alpha_bounds(w, h, rows, threshold)
    x0 = max(0, x0 - pad); y0 = max(0, y0 - pad)
    x1 = min(w - 1, x1 + pad); y1 = min(h - 1, y1 + pad)
    cw, ch = x1 - x0 + 1, y1 - y0 + 1
    cropped = [r[x0 * 4:(x1 + 1) * 4] for r in rows[y0:y1 + 1]]
    if bg:
        cropped = flatten(cropped, cw, bg)
    encode(dst, cw, ch, cropped)
    print(f"{w}x{h} -> {cw}x{ch}   {Path(dst).stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    colour = None
    if len(sys.argv) > 4:
        hexv = sys.argv[4].lstrip("#")
        colour = tuple(int(hexv[i:i + 2], 16) for i in (0, 2, 4))
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 12, colour)
