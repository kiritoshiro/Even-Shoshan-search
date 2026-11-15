# Even-Shoshan Search

A small desktop app for finding words in Avraham Even-Shoshan's *A New Concordance of the Old Testament* (Hebrew & Aramaic). Type a word in **English, Hebrew, transliteration or a Strong's number**, or a **Bible verse**, and it opens the right page of your scanned copy.

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

## Lietuvių kalba / Lithuanian

The **LT** button at the top switches the whole app to Lithuanian, and **EN** switches it back. The choice is remembered.

- The interface, the Contents tab and the introduction titles are in Lithuanian. The introduction text itself is in English, as in the book.
- Glosses are in Lithuanian, translated from the Hebrew word rather than from the English gloss. When several Hebrew words share one English gloss, each gets its own Lithuanian word. Lithuanian Bible (RK 1999) vocabulary is used where it applies. The English gloss is shown after the Lithuanian one.
- Search accepts Lithuanian words, and letters with or without diacritics (`seti` finds `sėti`).
- Verses can be typed in RK style (`Pr 1, 1`, `Joz 22, 20`, or the book name without diacritics, e.g. `pradzios 2 7`). The verse title is shown as `Jozuės knyga 22, 20`.
- Bible references use RK abbreviations and citation style: `Joz 22, 20`. The tooltip shows `Jozuės knyga 22, 20`. RK follows the Hebrew chapter and verse numbering, as this concordance does.
- The Lithuanian glosses (`data/glosses-lt.tsv`) are machine-assisted translations and have not been reviewed by a translator. Corrections are welcome.

## Contents tab

The sidebar's **Contents** tab is the same outline as the PDF bookmarks, for navigating in the app:

- **English introduction:** each section, including the key to books of the Bible, verbal stems and Hebrew numbers.
- **Concordance:** one entry per Hebrew letter with its page range, opening to every page with its head words and English glosses.
- **Back matter:** the editor's English preface.

The page you are reading stays highlighted.

## How to search

| Type | Example | Result |
|---|---|---|
| English gloss | `seed`, `to create` | Lexicon matches with Hebrew, transliteration and page |
| Hebrew (vowels optional) | `זרע`, `שָׁלוֹם` | Page where that spelling falls alphabetically, plus lexicon matches |
| Hebrew word as written in a verse | `ויזרח`, `בְּרֵאשִׁית`, `לו` | **In the Bible:** the dictionary entries this form belongs to, how often it occurs, and their pages (`ויזרח` → `זָרַח`, p. 339). Vowel points you type narrow the forms; points you leave out don't matter |
| Verse | `Gen 1:1`, `Pr 1, 1`, `2 Met 3, 14`, `Psalm 23`, `בראשית א 1`, `ש״ב כג 4` | The verse in Hebrew, the concordance pages that quote it, then each word with its dictionary form, gloss and the page of **this verse's line** in that word's entry (below). ‹ › step to the previous and next verse. Two optional switches under the verse: **Word by word** and **Translations** (below) |
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

- **English refs** (E): writes references in English directly on the page (`Josh 22:20` in place of `יהושע כב 20`). This is done only where the scan's OCR read book, chapter and verse completely and the chapter exists in that book. On the pages tested that is about half of the references; the rest stay in Hebrew (hover them for the tooltip). Switch it off to see the original.

The settings are remembered.

Press Enter to open the first result, use ← → for the previous and next page, and `/` to jump to the search box. There is an on-screen Hebrew keypad with vowel points (shown on a sample letter; only the point is typed).

Verse numbers follow the Hebrew Bible, as the concordance and the Lithuanian RK translation do. English Bibles sometimes differ by a verse or a chapter (for example English Genesis 32:31 is Hebrew 32:32). Book names are accepted in English (`Gen`, `Genesis`), Lithuanian RK style (`Pr`, `Pradžios`) and Hebrew (`בראשית`). Ambiguous abbreviations such as `Pr` follow the interface language.

## Verse view: the verse in the concordance

With the PDF open, a verse search looks for the verse in the entry of each of its words, so a click opens the line that quotes this verse, not just the page where the word's entry begins. The pages are listed under the verse (**Pages quoting this verse**), and each word shows its own page:

- **✓ p. 923**: the line was found. A click opens that column with the line highlighted.
- **≈ p. 923**: the line's reference could not be read, so the app highlights (more faintly) where the verse falls in biblical order within the word's list. Check the lines around it.
- **p. 918–925**: the line was not found; these are the pages of the word's entry. A click opens the first.

How it works: Even-Shoshan lists each form of a word separately (`ויעש`, `ויעשו`, `עשה` …), in biblical order. Busy forms end with compact lists such as `דה"ב ג 7, 8, 10, 14`. The app reads the scan's hidden OCR text in each column of the entry's pages and carries the book and chapter through compact lists. A line counts as found when its book, chapter and verse are all read. When the reference is garbled (the OCR often misreads chapter letters), the app looks for the two readable references on either side of the verse in the list that shows the word's form. It highlights only where the evidence points to that word's own list. On 15 test verses, 73 of 228 words were found exactly, 72 placed approximately and 83 not found. Spot checks found the exact hits correct. The approximate ones were usually on the right list, sometimes a line or two off. Each word takes about 0.1 s on average (larger entries take longer).

## Verse view: word by word and translations

Under a verse there are two switches. They are off until you turn them on, and the app remembers them.

- **Word by word** shows each Hebrew word with its literal English translation and its grammar, e.g. `הָיְתָה` *<it> was* · verb Qal perfect 3rd fem. sing. Hover the grammar for the full names. In Lithuanian mode the grammar is in Lithuanian and the Lithuanian dictionary meaning is added under the English. The literal translation is from STEPBible TAHOT (English only); the grammar is from the Open Scriptures Hebrew Bible.
- **Translations** shows the verse in Bibles you add yourself: click **Add a Bible (MyBible .SQLite3)…** and choose MyBible Bible modules, e.g. Lithuanian translations. They are read on your computer and kept in the app; nothing is uploaded, and no translation text ships with the app. Tick or untick each one, or remove it with ✕.
  - Translations number some verses as English Bibles do (Gen 31:55, Mal 4, psalm titles without a number), and many mix the two numberings book by book. For each chapter where the numberings differ, the app picks the one whose chapter lengths match the translation, and shows the translation's own number next to its name when it differs (`· 31, 55`).
  - A verse that the translation joins to its neighbour, or a psalm title it does not number, shows *(no text for this verse)*.

## How it works

- `data/page-index.tsv` lists every PDF page with its printed page number and its two running heads (first and last entry on the page). A Hebrew lookup finds the first page whose last head sorts at or after the word. Consonants only, final letters treated as regular, multi-word names compared word by word, as the book does.
- About 73 of the 2,440 running heads were unreadable in the scan and are filled from neighbouring pages, so a lookup can occasionally land one page early. Use the arrows. Corrections to the TSV are welcome.
- The book lists many words under their root, so the alphabetical spot may only hold a cross-reference. Follow it.
- Scan quirks: printed page 506 is missing from the scan and page 508 is duplicated. Blank and section-divider pages are skipped.
- English glosses come from the [STEPBible TBESH lexicon](https://github.com/STEPBible/STEPBible-Data) (Tyndale House Cambridge, CC BY 4.0).
- Verse text and the dictionary form of every word come from the [Open Scriptures Hebrew Bible](https://github.com/openscriptures/morphhb): the Westminster Leningrad Codex with lemmas (Strong's numbers). `src/data/bible.js` holds every verse with vowel points (no cantillation) and each word's Strong's number. Where the written text (ketiv) has a marginal reading (qere), the qere is shown. A word's page is found from its dictionary form, so it is subject to the same alphabetical lookup as everything else.
- Word by word: `src/data/bible-gloss.js` is the English column of [STEPBible TAHOT](https://github.com/STEPBible/STEPBible-Data) (CC BY 4.0), lined up with the OSHB words by their consonants (99.96% of words). `src/data/bible-morph.js` is the OSHB grammar code of every word, put into words by `src/morph.js`. Both files load only when Word by word is first switched on. `src/data/versemap.js` (from TAHOT) lists where English verse numbers differ from the Hebrew; it is used to line up translations. MyBible modules are read with [sql.js](https://github.com/sql-js/sql.js) (`src/vendor/sql-wasm.*`).

## Development

The app is plain HTML/JS in `src/`, wrapped with [Tauri 2](https://tauri.app).

```bash
npm install
npm run dev      # run the desktop app
npm run build    # build installers for the current OS
npm run data     # regenerate src/data/*.js from data/page-index.tsv, TBESH, TAHOT and OSHB (downloaded into data/ if missing)
```

`src/index.html` also works in a browser served over http (for example `python -m http.server -d src`).

To make a release, bump the version in `src-tauri/tauri.conf.json`, then push a tag such as `v0.1.1`. GitHub Actions builds the Windows and macOS installers and publishes the release.

## Licenses

Code: MIT. pdf.js: Apache-2.0 (`src/vendor/pdfjs-LICENSE`). sql.js: MIT (`src/vendor/sqljs-LICENSE`). Lexicon and word-by-word translation: CC BY 4.0, STEPBible.org / Tyndale House (TBESH, TAHOT). Bible text: Westminster Leningrad Codex (public domain); lemmas and grammar: Open Scriptures Hebrew Bible, CC BY 4.0.
