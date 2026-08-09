#!/usr/bin/env python3
"""Rebuild a Canva planner PDF for GoodNotes: raster pages + transplant links."""

from __future__ import annotations

import math
import sys
import time

import pymupdf

DPI = 200
JPEG_QUALITY = 85


def count_links(doc: pymupdf.Document) -> int:
    return sum(len(page.get_links()) for page in doc)


def sanitize_link(link: dict) -> dict:
    """Make Canva link dicts safe for insert_link (NaN points, extra keys)."""
    clean = dict(link)
    clean.pop("xref", None)
    clean.pop("id", None)

    to = clean.get("to")
    if isinstance(to, pymupdf.Point):
        x = 0.0 if math.isnan(to.x) else float(to.x)
        y = 0.0 if math.isnan(to.y) else float(to.y)
        clean["to"] = pymupdf.Point(x, y)

    zoom = clean.get("zoom")
    if zoom is not None and isinstance(zoom, float) and math.isnan(zoom):
        clean["zoom"] = 0.0

    return clean


def rebuild(src_path: str, dst_path: str) -> None:
    started = time.time()
    src = pymupdf.open(src_path)
    dst = pymupdf.open()

    links_before = count_links(src)
    zoom = DPI / 72.0
    mat = pymupdf.Matrix(zoom, zoom)

    print(
        f"source pages={src.page_count} links={links_before} dpi={DPI} jpeg={JPEG_QUALITY}",
        flush=True,
    )

    # Pass 1: rasterize every page into a flat image page.
    # Collect links first so destinations can resolve after all pages exist.
    all_links: list[list[dict]] = []

    for i in range(src.page_count):
        page = src[i]
        all_links.append([dict(link) for link in page.get_links()])

        pix = page.get_pixmap(matrix=mat, alpha=False, annots=True)
        img = pix.tobytes("jpeg", jpg_quality=JPEG_QUALITY)
        new_page = dst.new_page(width=page.rect.width, height=page.rect.height)
        new_page.insert_image(new_page.rect, stream=img)

        if (i + 1) % 5 == 0 or i + 1 == src.page_count:
            elapsed = time.time() - started
            print(f"raster {i + 1}/{src.page_count} ({elapsed:.0f}s)", flush=True)

        del pix

    # Pass 2: insert links now that every destination page exists.
    inserted = 0
    failed = 0
    for i, links in enumerate(all_links):
        page = dst[i]
        for link in links:
            clean = sanitize_link(link)
            try:
                page.insert_link(clean)
                inserted += 1
            except Exception as exc:
                failed += 1
                if failed <= 20:
                    print(
                        f"link fail page={i + 1}: {exc} "
                        f"dest={clean.get('page')} from={clean.get('from')}",
                        flush=True,
                    )

    print(f"links inserted={inserted} failed={failed}", flush=True)
    print("saving...", flush=True)
    dst.save(
        dst_path,
        garbage=4,
        deflate=True,
        deflate_images=True,
        deflate_fonts=True,
        clean=True,
    )

    links_after = count_links(dst)
    dst.close()
    src.close()

    elapsed = time.time() - started
    print(
        f"done in {elapsed:.0f}s | links_before={links_before} links_after={links_after}",
        flush=True,
    )
    if links_after != links_before:
        raise SystemExit(
            f"link count mismatch: before={links_before} after={links_after}"
        )


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("usage: rebuild_planner.py <input.pdf> <output.pdf>", file=sys.stderr)
        sys.exit(2)
    rebuild(sys.argv[1], sys.argv[2])
