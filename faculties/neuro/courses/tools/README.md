# Study-plan tools (neuro)

Four steps that turn the Gonda study-plan PDFs into `../plans.json` and `../yearbook.json`. Run them from this folder, in order; each writes a working folder next to the scripts that git ignores.

1. `node fetch-plans.mjs` downloads every חוקה PDF (תשפ"ה, תשפ"ו, תשפ"ז) of the eight track pages into `plans/<track>/` and writes `manifest.json`. 1.5 seconds between requests, a normal User-Agent, stops on 403, 429 or an HTML answer. `--list` only lists the links.
2. `python -m venv venv` and `venv/Scripts/pip install pypdf` once, then `venv/Scripts/python -I extract.py` writes `text/<track>-<year>.txt`.
3. `node parse-plans.mjs` parses the flattened tables into `parsed/plans.json`: course rows (code, name from `../catalog.json` for 27- codes, credits, hours), blocks closed by the totals lines, years inferred (see the header comment).
4. `node build-yearbook.mjs` writes `out/plans.json`, `out/yearbook.json`, `out/categories.json` and `out/summary.md`. The yearbook follows the plan of the student's start year: year 1 from תשפ"ז, year 2 from the updated תשפ"ו plan, year 3 from תשפ"ה. Copy `out/yearbook.json` to `../yearbook.json`, the compact form of `out/plans.json` to `../plans.json`, and the categories into `faculty.js` (the orchestrator did this with a one-off script on 18.10.2026).

Known limits: the PDF text has no year headings, so years come from block order (double majors) or the department code numbering (single major); partner-department codes with four digits (86-2073 versus 86-207) are ambiguous without their catalog; names of non-27 courses are the raw, partly reversed PDF text. The owner verifies against the PDFs before launch (`management/neuro/plans.md`).
