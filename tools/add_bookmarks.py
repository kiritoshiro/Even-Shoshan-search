"""Add bookmarks and printed page numbers to your copy of the Even-Shoshan scan.

Usage:  python tools/add_bookmarks.py "<input.pdf>" ["<output.pdf>"]
Needs:  pip install pymupdf

The input must be the 1,316-page Internet Archive scan the index was made for.
Writes a new file (default: <input> - bookmarked.pdf); the original is not changed.

Adds:
  * an outline: Front matter, then one bookmark per Hebrew letter, and under each
    letter one bookmark per page ("340  זרח – זרע"), then Back matter;
  * page labels, so PDF viewers show and accept the book's printed page numbers
    (pages that are blank, dividers or plates show their PDF position in brackets).
"""
import sys
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parent.parent
EXPECTED_PAGES = 1316
LETTERS = "אבגדהוזחטיכלמנסעפצקרשת"
FINALS = str.maketrans("ךםןףץ", "כמנפצ")


def load_index():
    rows = []
    for line in (ROOT / "data" / "page-index.tsv").read_text(encoding="utf-8").splitlines()[1:]:
        pdf, printed, first, last = (line.split("\t") + ["", "", "", ""])[:4]
        rows.append((int(pdf) - 1, int(printed) if printed.strip() else 0, first.strip(), last.strip()))
    return rows


def initial(word):
    for ch in word.translate(FINALS):
        if ch in LETTERS:
            return ch
    return None


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = Path(sys.argv[1])
    dst = Path(sys.argv[2]) if len(sys.argv) > 2 else src.with_name(src.stem + " - bookmarked.pdf")
    doc = pymupdf.open(src)
    if doc.page_count != EXPECTED_PAGES:
        sys.exit(f"{src.name} has {doc.page_count} pages; the index is for the {EXPECTED_PAGES}-page scan.")

    rows = load_index()
    body = sorted((r for r in rows if r[1] > 0), key=lambda r: r[1])
    toc = [[1, "Front matter (English introduction, Hebrew preface)", 1]]

    # A letter starts on the first page whose last head begins with it (or a later letter).
    letter_at, li = {}, 0
    for r in body:
        first_letter = initial(r[3]) or initial(r[2])
        while li < len(LETTERS) and first_letter and LETTERS.index(first_letter) >= li:
            letter_at.setdefault(LETTERS[li], r[1])
            li += 1
    current = None
    for idx, printed, first, last in body:
        for L in LETTERS:
            if letter_at.get(L) == printed and L != current:
                current = L
                toc.append([1, L, idx + 1])
        heads = first if first == last or not last else f"{first} – {last}"
        toc.append([2, f"{printed}  {heads}".replace("?", "…"), idx + 1])

    last_body = max(r[0] for r in body)
    if last_body + 1 < doc.page_count:
        toc.append([1, "Back matter", last_body + 2])
    doc.set_toc(toc)

    labels = []
    printed_of = {r[0]: r[1] for r in rows}
    for i in range(doc.page_count):
        p = printed_of.get(i, 0)
        labels.append({"startpage": i, "prefix": "", "style": "D", "firstpagenum": p} if p
                      else {"startpage": i, "prefix": f"[{i + 1}]", "style": "", "firstpagenum": 1})
    doc.set_page_labels(labels)

    doc.save(dst, garbage=1)
    print(f"wrote {dst}  ({len(toc)} bookmarks)")


if __name__ == "__main__":
    main()
