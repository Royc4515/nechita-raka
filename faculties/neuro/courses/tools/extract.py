"""Extract text from every plans/<track>/<name>.pdf into text/<track>-<name>.txt.

Run from the gonda folder with the venv interpreter and -I:
    venv/Scripts/python.exe -I extract.py
"""

import pathlib
import sys

from pypdf import PdfReader

HERE = pathlib.Path(__file__).resolve().parent
PLANS = HERE / "plans"
TEXT = HERE / "text"


def extract(pdf: pathlib.Path, out: pathlib.Path) -> tuple[int, int]:
    """Write the text of one PDF with page separators. Returns (pages, non-empty chars)."""
    reader = PdfReader(str(pdf))
    pages = len(reader.pages)
    chunks = [f"# {pdf.parent.name} {pdf.stem} | pages: {pages}\n"]
    chars = 0
    for number, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        chars += len(text)
        chunks.append(f"\n===== page {number} of {pages} =====\n{text}\n")
    out.write_text("".join(chunks), encoding="utf-8")
    return pages, chars


def main() -> int:
    TEXT.mkdir(exist_ok=True)
    rows = []
    status = 0
    for pdf in sorted(PLANS.glob("*/*.pdf")):
        out = TEXT / f"{pdf.parent.name}-{pdf.stem}.txt"
        try:
            pages, chars = extract(pdf, out)
            text_state = "ok" if chars else "EMPTY (no text layer, likely scanned)"
        except Exception as exc:  # keep going; report per file
            pages, text_state = 0, f"ERROR: {exc}"
            status = 1
        rows.append((pdf.parent.name, pdf.stem, pdf.stat().st_size, pages, text_state))

    print(f"{'track':<12} {'year':<7} {'bytes':>8} {'pages':>5}  text")
    for track, stem, size, pages, text_state in rows:
        print(f"{track:<12} {stem:<7} {size:>8} {pages:>5}  {text_state}")
    return status


if __name__ == "__main__":
    sys.exit(main())
