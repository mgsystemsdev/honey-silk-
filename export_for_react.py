#!/usr/bin/env python3
"""Export planner pages + normalized link hotspots for the React viewer."""

from __future__ import annotations

import json
from pathlib import Path

import pymupdf

SRC = Path("HoneySilk-Planner-GoodNotes.pdf")
OUT_DIR = Path("planner-app/public")
PAGES_DIR = OUT_DIR / "pages"
MANIFEST = OUT_DIR / "planner.json"

DPI = 140
JPEG_QUALITY = 82


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"missing {SRC}")

    PAGES_DIR.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open(SRC)
    zoom = DPI / 72.0
    mat = pymupdf.Matrix(zoom, zoom)

    pages_out = []
    for i in range(doc.page_count):
        page = doc[i]
        rect = page.rect
        pw, ph = float(rect.width), float(rect.height)

        pix = page.get_pixmap(matrix=mat, alpha=False)
        name = f"page-{i + 1:03d}.jpg"
        pix.save(str(PAGES_DIR / name), jpg_quality=JPEG_QUALITY)

        links = []
        for link in page.get_links():
            if link.get("kind") != pymupdf.LINK_GOTO:
                continue
            dest = link.get("page")
            if dest is None or dest < 0 or dest >= doc.page_count:
                continue
            r = link["from"]
            links.append(
                {
                    "x": float(r.x0) / pw,
                    "y": float(r.y0) / ph,
                    "w": float(r.width) / pw,
                    "h": float(r.height) / ph,
                    "toPage": int(dest),
                }
            )

        pages_out.append({"index": i, "image": f"/pages/{name}", "links": links})
        if (i + 1) % 10 == 0 or i + 1 == doc.page_count:
            print(f"exported {i + 1}/{doc.page_count}", flush=True)

    manifest = {
        "title": "Honey & Silk Planner",
        "pageWidth": float(doc[0].rect.width),
        "pageHeight": float(doc[0].rect.height),
        "pageCount": doc.page_count,
        "pages": pages_out,
    }
    MANIFEST.write_text(json.dumps(manifest, separators=(",", ":")), encoding="utf-8")
    doc.close()

    total_links = sum(len(p["links"]) for p in pages_out)
    print(f"wrote {MANIFEST} pages={len(pages_out)} links={total_links}")


if __name__ == "__main__":
    main()
