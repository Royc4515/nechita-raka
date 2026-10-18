# Site review, main at 946c159 (faculty PR 6f), run 2026-10-18

Scope: CS and neuro builds from `main`, no source edited. Neuro was checked from its build (served from a copy of `public/` on localhost), not its URL (Vercel Authentication). Chat answers were not exercised live (no API or Groq key on the static server); I checked the chat's source data and the panel UI instead.

## Verdict

Both builds pass. The neuro build leaks CS content in the calendar, ICS file, "now" card, chat data, chat suggestions, FAQ and a few guide tips. The CS build is clean. Details below, leaks first.

## 1. Build and tests

| Command | Result |
|---|---|
| `npm run build` (cs) | exit 0, 182/182 tests pass, 0 fail, 15 guide pages, 155 courses |
| `FACULTY=neuro npm run build` | exit 0, 182/182 tests pass, 0 fail, 17 guide pages, 60 courses |

check-data warnings remaining:
- cs: `faculties/cs/data.js` line 70, guide "מרחב הלמידה של מדמ"ח" (cs-study-space) has no `sources`.
- neuro: 4 English pairs whose Hebrew text no longer exists: "איך מוצאים בניין וכיתה, איפה המחלקה והמזכירות…", "לאן פונים בשאלה אקדמית ולאן בבעיה טכנית.", "אתרי האוניברסיטה", "Gonda neuroscience news".
- No warning about shared content naming CS remains, but the content itself still does (see leaks). No missing English pairs on either build.
- The `courses: could not read saved courses` and `nope.json is missing` lines in the output come from tests that force failures. They are expected.
- WhatsApp guard: builds green, and `grep chat.whatsapp.com` over both `public/` copies finds nothing.

## 2. Leaks between faculties (priority)

### 2a. Neuro build shows CS content

Calendar (the merged `calendar.events` has no id field; shown by title):

| Event | Date | Scope | Shows on | Source |
|---|---|---|---|---|
| מפגש פתיחת שנה במחלקה למדעי המחשב ובינה מלאכותית, "מרחב הלמידה, בניין 503", register link forms.gle | 2026-10-21 13:00 | CS-specific | cs and neuro | shared/data.js:970 |
| בחינה: מבוא למדעי המחשב, מועד א' / ב' | 2027-01-21 / 02-11 | CS-specific | both | shared:978, 982 |
| בחינה: מתמטיקה בדידה, א' / ב' | 2027-01-27 / 02-17 | CS-specific | both | shared |
| בחינה: אלגברה לינארית 1, א' / ב' | 2027-02-02 / 02-22 | CS-specific | both | shared |
| בחינה: חשבון אינפיניטסימלי 1, א' / ב' | 2027-02-07 / 02-26 | CS-specific | both | shared |
| בחינה: מבנה מחשב, א' / ב' | 2027-06-30 / 07-25 | CS-specific | both | shared |
| בחינה: אלגברה לינארית 2, א' / ב' | 2027-07-12 / 08-05 | CS-specific | both | shared |
| בחינה: חשבון אינפיניטסימלי 2, א' / ב' | 2027-07-16 / 08-11 | CS-specific | both | shared |
| בחינה: הסתברות כללית למדעי המחשב, א' / ב' | 2027-07-20 / 08-22 | CS-specific | both | shared:1001, 1011 |
| יום ההולדת ה-26 של רועי (kind birthday) | 2027-08-12 | owner's, not faculty | both | shared |

That is 17 CS-specific events (1 opening plus 16 exam dates) on neuro. The other events (start of year, personal-slot publication, change period, election day, tuition payments, Hanukkah, fasts, Purim, Pesach, Memorial/Independence Day, Jerusalem Day, Shavuot, end of semester, exam periods, summer semester, start of 5788) are university-wide. "יריד קריירה" 2027-04-05 looks university-wide; I did not verify it. The neuro llms.txt says the calendar has "תאריכי הבחינות של מדעי המוח", but the exam dates are CS's.

Other neuro leaks:
- "Now" card on the neuro home: "אחר כך: מפגש פתיחת שנה במחלקה למדעי המחשב ובינה מלאכותית · בעוד 3 ימים". The calendar block also shows "במרחב הלמידה, בניין 503" and "להרשמה למפגש".
- `biu-5787.ics` is byte-identical on both builds: PRODID `-//BIU CS Year 1//`, UIDs `@biu-cs-5787`, `cs-year-opening-2026`, 32 lines of "בחינה: …" and "שנה א' במדמ"ח באינ-בר".
- Chat data, `FACULTY=neuro` through `api/_lib/chat/knowledge.js`: the core block (always in the prompt) says "הבא בלוח: … 21.10.2026: מפגש פתיחת שנה במחלקה למדעי המחשב… בניין 503…". The `calendar` chunk has all 17 CS events. These come from the shared calendar, so the weekly email (upcoming events) likely carries them too (not run).
- Chat chips: `chat.js:42` (repo root `chat.js`, hard-coded) shows "באיזה חדר ההרצאה בהכנה למדעי המחשב?" in Ron and Noi's panel on neuro (seen in the browser).
- Shared guide, tip and FAQ text that names CS and shows on neuro (the guide pages and the chat chunks):
  - `shared/data.js:400`, reserves tip: "קבוצות וואטסאפ למילואימניקים: של מדמ"ח…".
  - `shared:507` and FAQ `shared:1317`: "במדעי המחשב בדרך כלל לא בודקים נוכחות" (first-week and attendance FAQ).
  - FAQ `shared:1240-1243`, "איך מוצאים כיתה או בניין": "המזכירות של המחלקה למדעי המחשב בבניין 503… בניינים שסטודנטים במדמ"ח פוגשים… 216, 304, 401", with source link `cs.biu.ac.il/he/node/3`.
  - FAQ `shared:1291`, microwaves: "לסטודנטים במדמ"ח… בניין 216… מרחב הלמידה של מדמ"ח (503)".
  - `shared:444` and `1185` (academic vest, "STEM, ובהם מדעי המחשב"): arguably legitimate university rule wording, but it names CS only.
  - Neuro tile "wa-reserves-mentors": "במדמ"ח יש קבוצה לחונכים… אם יש כזאת גם במדעי המוח, היא עוד לא כאן" (also found by search for מדמח, and in the English text as "CS has a group…").
- `course-ai.js:75`: the prompt a neuro student copies to an AI starts "אני סטודנט/ית למדעי המחשב באוניברסיטת בר-אילן" (EN: "I'm a Computer Science student"). The AI is told the wrong faculty.
- `admin.html` on neuro: title "נחיתה רכה · מדמ"ח בר אילן"; the share link is `https://nechita-raka.vercel.app/?src=wa` (the CS site). Admin only.
- `assets/og-image-v2.jpg` is byte-identical to the CS one: a blue parachute with code symbols `{}` and `</>`. The neuro link preview shows the CS image (the og alt text is neutral).
- Bundle only: neuro `data.en.js` ships CS strings that nothing on neuro renders (e.g. line 799 reservists WhatsApp, 1091 and 1108 the CS building and microwave text, 210 "parachute made of code and books"). These match the 4 stale-pair warnings. Source-readable only.
- Code comments in `chat.js` and `chat.css` still say "Bit and Byte". Not user-visible.

Legitimate CS wording on neuro (not leaks):
- Track "משולב עם מדעי המחשב" and its year chips (`cs:1-3`), and the "cs" track short label "מדמ"ח".
- Courses 27230 and 27232 "מבוא למדמ"ח ותכנות מתקדם בפייתון" and their year-1 text, in the neuro-tracks and campus-map tips, FAQ 9 and `gonda-building`.
- Course code prefix 89 as "the second department's courses" (neuro tips, FAQ 10).
- Source link `cs.biu.ac.il/he/computer-science-and-brain-sciences` (neuro help guide) and the "למדעי המחשב… פונים דרך אתר המחלקה" line.
- In `course-ai.js`, the `/^מבוא למדעי המחשב/` abbreviation rule.
- No hits for: ביט/בייט/Bit/Byte as the mascots, bsc@cs, courses-cs-2027, "Hello, CS", a CS group photo, or CS WhatsApp group links.
- Mascots: neuro ships only noi and ron assets. Eggs: "hello brain".

### 2b. CS build shows neuro content

No leaks visible to a student. Chat core, chunks and prompt are clean. `llms.txt`, `sitemap.xml` and `manifest.webmanifest` are clean (15 CS guide pages; no neuro-* ids).
- Dead CSS only: every CS page inlines the neuro decor rules (`data-decor-backdrop="brain"`, `data-decor-watermark="neuron"`) plus a comment with `management/neuro/decor-brief.md`. The decor assets are not shipped, so nothing renders.
- Legitimate: FAQ 40 "(מדעי המוח, פסיכולוגיה, ביולוגיה…) שואלים באתר המחלקה"; campus-map "בניין 901 (המרכז לחקר המוח)"; course names with "רשתות נוירונים"; the English text of data.en.js 1238.

## 3. Content sanity

- `checkedOn`: all guides are 7.10.2026 or later. The oldest, 7.10, is 11 days old and passes the 14-day bar; they pass until 21.10. Neuro-owned guides are 18.10.2026. The CS-owned `courses` is 14.10 and `cs-study-space` is 13.10.
- Sources: all guides have them except CS `cs-study-space` (warning above).
- English pairs: no Hebrew left on the neuro home in EN, including calendar and FAQ. The 4 stale neuro pairs are the exception (not rendered).
- Sitemap and llms.txt: cs lists 15 guides plus home; neuro lists 17 (adds neuro-registration, neuro-tracks, gonda-building) and uses the neuro host. The neuro canonical URL is `nechita-raka-neuro.vercel.app`, so while Authentication is on, crawlers and og scrapers get the Vercel login.

## 4. Links (158 unique external URLs, WhatsApp and wa.me excluded, 1 s apart, HEAD then GET)

| Result | Count |
|---|---|
| ok (2xx) | 98 |
| bot check, not bypassed | 25 |
| redirect to a live page | 33 |
| TLS error | 1 |
| login wall (LinkedIn 999) | 1 |
| dead | 0 |

- Bot check (Radware, redirect to `validate.perfdrive.com`): `www.biu.ac.il` pages and every `*.biu.ac.il` host except a few; `www2.biu.ac.il`, `sspr`, `lemida`, `shoham`, `courses`, `sites.biu.ac.il`. Their content and `checkedOn` could not be re-verified by me. These include page/22573, 13336, Enrollment-FAQ, 13704, 22491, StudentsGuide, academic-year (he and en), campus-map and the campus-map PDF, article/11762, transport-and-parking, campus-services, node/583843 and kashrut. Pages in shared/data.js that are only bot-checked are: registration, first-week, university and help guides.
- Redirects that need a data fix:
  - `gondabrain.biu.ac.il/Extended%20track` redirects (301) to `/biology_cognition_track` (neuro:103, neuro-tracks).
  - `cs.biu.ac.il/he/computer-science-and-brain-sciences` redirects (301) to `/he/tracks/computer-science-and-brain-sciences-BSc` (neuro:289, help).
  - `dean.biu.ac.il/node/210` redirects (301) to `/efod-academi` (shared:440, 454, 457, 1186, academic-vest).
  - `mishloha.co.il/r/631454` redirects to a slug that answers 403 (bot).
- Harmless redirects: 8 `maps.google.com/?cid=` links go to `google.com/maps`, and `forms.gle/w6ZthiDpzTSwHQcd9` goes to the Google Form (200).
- Neuro self links: 22 URLs on `nechita-raka-neuro.vercel.app` (the courses JSON file link and 21 `courses?c=` deep links in neuro:403 and 497-649) redirect to the Vercel login. This is expected behind Authentication, but a student cannot open them until protection is lifted.
- `webcounter.ipi.co.il/counters/barilan` (shared, cs, neuro:631): TLS `UNABLE_TO_VERIFY_LEAF_SIGNATURE` from Node. A browser may be fine; worth a one-off manual check.
- `linkedin.com/in/roy-carmelli`: 999 anti-bot, normal.

## 5. Browser walk (built-in browser on `public/`; 375 emulated with an iframe, other widths with scripted scrollWidth checks)

Checked: home, a guide, courses, chat panel and both mascots (greeting and switch), search, EN toggle, dark mode, in neuro; courses, chat and mascot switch in CS.

- Chat panel opens, greeting in the mascot's voice, switch works, footer "נוי ורון הם AI" / "ביט ובייט הם AI" on each build. Sending a message was not tested (no API).
- Neuro track picker: "כל המסלולים" plus 8 tracks; choosing one filters (חד-חוגי: 24 courses); year chips הכול / שנה א' / ב' / ג' / סמינרים / אחר; day chips work. CS has no picker and its own chips (שנה א'-ג', אשכול 1, 2, השלמה, מגמת AI, סמינרים).
- Search "מדמח" on neuro finds the Python intro courses and the reservists tile (the latter is the CS wording noted above).
- Dark mode and EN toggle work on neuro; the EN title and header are fine.
- Horizontal overflow, scripted at 320, 375, 800 and 1280 px on 16 or 17 pages per build: none at 375 or 1280 on either build. Neuro only: at 800 px every page has `scrollWidth` 797 against 785 (about 12 px sideways scroll; likely the ≥768 px hero decor pseudo-element). Both builds: `/courses` at 320 px is 9 px wider than the viewport.
- Neuro header title wraps to three lines on phone ("נחיתה רכה - מדעי המוח בר אילן"). The CS header is "נחיתה רכה - מדמ"ח בר אילן" on two lines.

## 6. Findings table

| Severity | Where | Finding | One-line fix |
|---|---|---|---|
| blocks | shared/data.js:970-1011 calendar | 17 CS events (opening in 503 plus 16 CS exams) on neuro: calendar, "now" card, ICS, chat core and chunk | Move them to `faculties/cs/data.js` calendar.events (the merge already adds those). |
| blocks | `biu-5787.ics` (both builds identical) | Neuro downloads the CS calendar (PRODID BIU CS Year 1, 17 CS events) | Generate the ICS from the merged calendar, with a per-faculty PRODID and name. |
| blocks | chat.js:42 | Neuro chat chip "…בהכנה למדעי המחשב?" | Take the suggestions from `faculty.js`. |
| blocks | nechita-raka-neuro.vercel.app | 22 neuro in-site links and canonical/og/sitemap URLs lead to the Vercel login | Lift protection before launch, or point links at the protected host only for testers. |
| confuses | shared:400, 507, 1240-1243, 1291, 1317; neuro tile wa-reserves-mentors | Shared tips and FAQ speak about CS (503, 216, "במדמ"ח", cs.biu.ac.il node/3) | Move to per-faculty overrides, or reword shared text without the faculty. |
| confuses | course-ai.js:75 | AI prompt says "סטודנט/ית למדעי המחשב" on neuro | Use `FACULTY.name` in the prompt, he and en. |
| confuses | neuro admin.html | Title says מדמ"ח; share link points to the CS site | Take title and share URL from the manifest. |
| confuses | neuro:103, neuro:289, shared:440 etc. | Redirected URLs (gondabrain Extended track, cs.biu brain-sciences track, dean node/210) | Replace with the final URLs. |
| confuses | neuro, 800 px | 12 px horizontal scroll on every page | Find the ≥768 px decor pseudo-element and clip it (`overflow-x: clip` on `.hero-art`). |
| cosmetic | og-image-v2.jpg, soft-landing.webp | Same CS-flavoured parachute art for neuro previews | Add a faculty og image. |
| cosmetic | neuro data.en.js | 4 stale pairs and CS English strings shipped | Remove the pairs from the shared EN file; add them to `faculties/cs/data.en.js`. |
| cosmetic | CS pages | Neuro decor CSS and `management/neuro/decor-brief.md` comment inlined in every CS page | Emit the decor rules only when the manifest has `decor`. |
| cosmetic | cs `cs-study-space` | No sources (check-data warning) | Add the dean or department source. |
| cosmetic | `/courses` at 320 | 9 px overflow, both builds | Below the 375 spec; fix if cheap. |
| cosmetic | shared calendar | Owner's birthday (2027-08-12) is in the university calendar on both sites | Drop or make personal. |
| note | links | 25 bot-checked biu.ac.il URLs not verifiable by script; `webcounter.ipi.co.il` TLS error | Manual spot check, or an allow-listed checker. |
| note | not tested | Chat answers (no Groq/API), `simulate.mjs` | Run against the simulations branch if the prompt changes. |

Tests and builds pass; leaks above should be fixed before the neuro site is opened to students.
