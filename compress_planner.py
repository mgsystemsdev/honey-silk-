#!/usr/bin/env python3
"""Compress image-heavy Canva PDFs for GoodNotes while keeping links."""

from __future__ import annotations

import sys
import time

import pymupdf

MAX_SIDE = 1800  # ~150-180 dpi on letter/tablet pages
JPEG_QUALITY = 70


def count_links(doc: pymupdf.Document) -> int:
    total = 0
    for page in doc:
        total += len(page.get_links())
    return total


def scale_pixmap(pix: pymupdf.Pixmap, max_side: int) -> pymupdf.Pixmap:
    longest = max(pix.width, pix.height)
    if longest <= max_side:
        return pix
    scale = max_side / longest
    new_w = max(1, int(pix.width * scale))
    new_h = max(1, int(pix.height * scale))
    return pymupdf.Pixmap(pix, new_w, new_h)


def compress(src: str, dst: str) -> None:
    started = time.time()
    doc = pymupdf.open(src)
    links_before = count_links(doc)
    print(f"pages={doc.page_count} links={links_before}", flush=True)

    seen: set[int] = set()
    replaced = 0
    skipped = 0

    for page_index in range(doc.page_count):
        page = doc[page_index]
        for img in page.get_images(full=True):
            xref = img[0]
            if xref in seen:
                continue
            seen.add(xref)

            try:
                pix = pymupdf.Pixmap(doc, xref)
            except Exception as exc:
                skipped += 1
                print(f"skip xref={xref}: {exc}", flush=True)
                continue

            if pix.width < 2 or pix.height < 2:
                skipped += 1
                continue

            # JPEG path needs RGB without alpha
            if pix.n - pix.alpha > 3:
                pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
            if pix.alpha:
                pix = pymupdf.Pixmap(pix, 0)

            pix = scale_pixmap(pix, MAX_SIDE)

            try:
                stream = pix.tobytes("jpeg", jpg_quality=JPEG_QUALITY)
                # replace on this page; same xref updates document-wide image
                page.replace_image(xref, stream=stream)
                replaced += 1
            except Exception as exc:
                skipped += 1
                print(f"fail xref={xref}: {exc}", flush=True)

        if (page_index + 1) % 5 == 0 or page_index + 1 == doc.page_count:
            elapsed = time.time() - started
            print(
                f"page {page_index + 1}/{doc.page_count} "
                f"images={len(seen)} replaced={replaced} skipped={skipped} "
                f"({elapsed:.0f}s)",
                flush=True,
            )

    print("saving compressed PDF...", flush=True)
    doc.save(
        dst,
        garbage=4,
        deflate=True,
        deflate_images=True,
        deflate_fonts=True,
        clean=True,
    )
    links_after = count_links(doc)
    doc.close()

    elapsed = time.time() - started
    print(
        f"done in {elapsed:.0f}s | replaced={replaced} skipped={skipped} "
        f"links_before={links_before} links_after={links_after}",
        flush=True,
    )


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("usage: compress_planner.py <input.pdf> <output.pdf>", file=sys.stderr)
        sys.exit(2)
    compress(sys.argv[1], sys.argv[2])
