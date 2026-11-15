"""Regenerate src/data/*.js from data/page-index.tsv, the STEPBible TBESH lexicon, data/glosses-lt.tsv
and the Open Scriptures Hebrew Bible.

Usage:  python tools/build_data.py
Downloads TBESH (CC BY 4.0, Tyndale House) and OSHB (WLC text, CC BY 4.0 lemmas) into data/ if missing.
"""
import json, re, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA, OUT = ROOT / "data", ROOT / "src" / "data"
TBESH = DATA / "tbesh.txt"
TBESH_URL = ("https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Lexicons/"
             "TBESH%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Hebrew"
             "%20-%20STEPBible.org%20CC%20BY.txt")


def pages():
    rows = []
    lines = (DATA / "page-index.tsv").read_text(encoding="utf-8").splitlines()[1:]
    for line in lines:
        pdf, printed, first, last = (line.split("\t") + ["", "", "", ""])[:4]
        rows.append([int(pdf) - 1, int(printed) if printed.strip() else 0, first.strip(), last.strip()])
    return rows


def lexicon():
    if not TBESH.exists():
        print("downloading TBESH ...")
        urllib.request.urlretrieve(TBESH_URL, TBESH)
    seen, rows = set(), []
    for line in TBESH.read_text(encoding="utf-8").splitlines():
        f = line.split("\t")
        if len(f) < 8 or not re.match(r"^H\d{4}", f[0]):
            continue
        es, heb, tr, pos, gl = f[1].split()[0], f[3].strip(), f[4].strip(), f[5].strip(), f[6].strip()
        if not re.search(r"[א-ת]", heb):
            continue
        d = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", f[7])).strip()
        if (es, heb, gl) in seen:
            continue
        seen.add((es, heb, gl))
        rows.append([es, heb, tr, pos, gl, d[:160]])
    return rows


def glosses_lt():
    """Lithuanian glosses, translated from the Hebrew word (see README).

    data/glosses-lt.tsv: english_gloss <TAB> hebrew_consonants <TAB> lithuanian.
    The consonants column is empty when the gloss belongs to a single Hebrew word; when several
    Hebrew words share one English gloss, each has its own line. Keys: "gloss" or "gloss|consonants".
    """
    out = {}
    path = DATA / "glosses-lt.tsv"
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            parts = line.split("	")
            if len(parts) != 3 or not parts[0] or not parts[2].strip():
                continue
            en, cons, lt = parts
            out[en + ("|" + cons if cons else "")] = lt.strip()
    return out


OSHB = DATA / "oshb"
OSHB_URL = "https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc/{}.xml"
# OSIS book ids of the Open Scriptures Hebrew Bible -> English names used in src/refs.js
OSIS = [("Gen", "Genesis"), ("Exod", "Exodus"), ("Lev", "Leviticus"), ("Num", "Numbers"), ("Deut", "Deuteronomy"),
        ("Josh", "Joshua"), ("Judg", "Judges"), ("Ruth", "Ruth"), ("1Sam", "1 Samuel"), ("2Sam", "2 Samuel"),
        ("1Kgs", "1 Kings"), ("2Kgs", "2 Kings"), ("1Chr", "1 Chronicles"), ("2Chr", "2 Chronicles"), ("Ezra", "Ezra"),
        ("Neh", "Nehemiah"), ("Esth", "Esther"), ("Job", "Job"), ("Ps", "Psalms"), ("Prov", "Proverbs"),
        ("Eccl", "Ecclesiastes"), ("Song", "Song of Songs"), ("Isa", "Isaiah"), ("Jer", "Jeremiah"),
        ("Lam", "Lamentations"), ("Ezek", "Ezekiel"), ("Dan", "Daniel"), ("Hos", "Hosea"), ("Joel", "Joel"),
        ("Amos", "Amos"), ("Obad", "Obadiah"), ("Jonah", "Jonah"), ("Mic", "Micah"), ("Nah", "Nahum"),
        ("Hab", "Habakkuk"), ("Zeph", "Zephaniah"), ("Hag", "Haggai"), ("Zech", "Zechariah"), ("Mal", "Malachi")]
# a word whose lemma is only a prefix letter (e.g. לוֹ "to him") -> that preposition's TBESH entry
PREP = {"b": "9003", "l": "9005", "k": "9004", "m": "4480A"}


def bible():
    """Every verse of the Hebrew Bible as "word id word id ...": the word with vowel points (no cantillation),
    and the extended Strong's number (without "H") of its main lemma, or "-".
    Text: Westminster Leningrad Codex (public domain); lemmas: Open Scriptures Hebrew Bible (CC BY 4.0).
    Where the written text (ketiv) has a marginal reading (qere), the qere is used. Hebrew chapter and verse numbering."""
    import xml.etree.ElementTree as ET
    ns = "{http://www.bibletechnologies.net/2003/OSIS/namespace}"
    drop = re.compile("[֑-ֽ֯׀׃׆/]")   # cantillation, meteg, paseq, sof pasuq, morpheme slash
    OSHB.mkdir(parents=True, exist_ok=True)

    def lemma_id(lemma):
        main = (lemma or "").split("/")[-1].strip()
        m = re.match(r"^(\d+)\s*([a-z])?", main)
        if m:
            return m.group(1).zfill(4) + (m.group(2) or "").upper()
        return PREP.get(main, "-")

    out = {}
    for osis, name in OSIS:
        path = OSHB / f"{osis}.xml"
        if not path.exists():
            print(f"downloading {osis}.xml ...")
            urllib.request.urlretrieve(OSHB_URL.format(osis), path)
        chapters = []
        for v in ET.parse(path).getroot().iter(ns + "verse"):
            _, ch, vs = v.get("osisID").split(".")
            ch, vs = int(ch), int(vs)
            while len(chapters) < ch:
                chapters.append([])
            words = []

            def add(w):
                words.append([drop.sub("", w.text or ""), lemma_id(w.get("lemma"))])

            for el in v:
                tag = el.tag.replace(ns, "")
                if tag == "w" and el.get("type") != "x-ketiv":
                    add(el)
                elif tag == "seg" and el.get("type") == "x-maqqef" and words:
                    words[-1][0] += "־"
                elif tag == "note" and el.get("type") == "variant":
                    for w in el.iter(ns + "w"):
                        add(w)
            while len(chapters[ch - 1]) < vs:
                chapters[ch - 1].append("")
            chapters[ch - 1][vs - 1] = " ".join(f"{t} {i}" for t, i in words if t)
        out[name] = chapters
    return out


def write(name, var, value):
    OUT.mkdir(parents=True, exist_ok=True)
    js = f"// generated by tools/build_data.py, do not edit\nwindow.{var}=" + \
        json.dumps(value, ensure_ascii=False, separators=(",", ":")) + ";\n"
    (OUT / name).write_text(js, encoding="utf-8")
    print(f"{name}: {len(value)} rows")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    write("pages.js", "ES_PAGES", pages())
    write("lexicon.js", "ES_LEX", lexicon())
    write("lexicon-lt.js", "ES_LEX_LT", glosses_lt())
    write("bible.js", "ES_BIBLE", bible())
