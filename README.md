# Even-Shoshan Search

A small desktop app for finding words in Avraham Even-Shoshan's *A New Concordance of the Old Testament* (Hebrew & Aramaic). Type a word in **English, Hebrew, transliteration or a Strong's number** and it opens the right page of your scanned copy.

## Download

Get the installer for Windows or macOS from [Releases](https://github.com/kiritoshiro/Even-Shoshan-search/releases).

- **Windows:** `…_x64-setup.exe` or `…_x64_en-US.msi`
- **macOS:** `…_universal.dmg` (Apple Silicon and Intel). The app is not signed. If macOS refuses to open it, right-click the app and choose **Open**, or run `xattr -cr "/Applications/Even-Shoshan Search.app"` once.

## The concordance PDF is not included

The book is under copyright, so this repository contains no part of it. Use your own scan: on first launch click **Open concordance PDF…** and choose the file. The app remembers where it is.

The page index was made for the Baker edition scan from the Internet Archive with **1,316 PDF pages** (English introduction by John H. Sailhamer). Another scan will have different page positions; the app warns if the page count differs.

## Bookmarks in the PDF itself

`tools/add_bookmarks.py` writes a copy of your scan with:

- an outline of the English introduction by section, including the key to abbreviations, books of the Bible, verbal stems and Hebrew numbers;
- one bookmark per Hebrew letter (`ז (Zayin)`), and under it one per page with English glosses in parentheses (`340  זרח (to rise) – זרע (to sow)`);
- page labels, so any PDF viewer shows the book's printed page numbers and "go to page 340" works. Blank pages, dividers and plates show their PDF position in brackets, e.g. `[205]`.

```bash
pip install pymupdf
python tools/add_bookmarks.py "path/to/your-scan.pdf"     # writes "… - bookmarked.pdf" next to it
```

The bookmarked copy has the same pages in the same order, so the app works with it too.

## How to search

| Type | Example | Result |
|---|---|---|
| English gloss | `seed`, `to create` | Lexicon matches with Hebrew, transliteration and page |
| Hebrew (vowels optional) | `זרע`, `שָׁלוֹם` | Page where that spelling falls alphabetically, plus lexicon matches |
| Transliteration | `bara`, `shalom` | Lexicon matches |
| Strong's number | `H1254` | That entry |
| Printed page | `p340` | Opens page 340 |

## Reading tools

Buttons under the page toolbar (keyboard shortcut in brackets):

- **Clean paper** (C): turns the yellow-grey scan into white paper and dark ink. The slider sets the strength. The scan is never forced to pure black and white, so vowel points and dagesh stay intact.
- **Dark** (D): light text on a dark background.
- **Column zoom** (K): click one of the three columns and it fills the window. ← moves to the next column (right to left, then on to the next page) and → goes back. Esc returns to the whole page.
- **Magnifier** (M), or hold **Shift**: a round lens under the cursor that uses the full-resolution scan (about 350 dpi).

- **Reference tooltips**: hover over a reference such as `יהושע כב 20` and a tooltip shows `Joshua 22:20`. References are book + chapter in Hebrew letters + verse in digits, numbered as in the Hebrew Bible, which sometimes differs from English Bibles by a verse or a chapter. The tooltip reads the scan's hidden OCR text: book names are reliable, but chapter and verse are sometimes missing, and then only the book is shown.

The settings are remembered.

Press Enter to open the first result, use ← → for the previous and next page, and `/` to jump to the search box. There is an on-screen Hebrew keypad.

## How it works

- `data/page-index.tsv` lists every PDF page with its printed page number and its two running heads (first and last entry on the page). A Hebrew lookup finds the first page whose last head sorts at or after the word. Consonants only, final letters treated as regular, multi-word names compared word by word, as the book does.
- About 73 of the 2,440 running heads were unreadable in the scan and are filled from neighbouring pages, so a lookup can occasionally land one page early. Use the arrows. Corrections to the TSV are welcome.
- The book lists many words under their root, so the alphabetical spot may only hold a cross-reference. Follow it.
- Scan quirks: printed page 506 is missing from the scan and page 508 is duplicated. Blank and section-divider pages are skipped.
- English glosses come from the [STEPBible TBESH lexicon](https://github.com/STEPBible/STEPBible-Data) (Tyndale House Cambridge, CC BY 4.0).

## Development

The app is plain HTML/JS in `src/`, wrapped with [Tauri 2](https://tauri.app).

```bash
npm install
npm run dev      # run the desktop app
npm run build    # build installers for the current OS
npm run data     # regenerate src/data/*.js from data/page-index.tsv and TBESH
```

`src/index.html` also works in a browser served over http (for example `python -m http.server -d src`).

To make a release, bump the version in `src-tauri/tauri.conf.json`, then push a tag such as `v0.1.1`. GitHub Actions builds the Windows and macOS installers and publishes the release.

## Licenses

Code: MIT. pdf.js: Apache-2.0 (`src/vendor/pdfjs-LICENSE`). Lexicon data: CC BY 4.0, STEPBible.org / Tyndale House.
