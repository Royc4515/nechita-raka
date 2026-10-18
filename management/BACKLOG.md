# Backlog

Score = students affected (1-5) × calendar urgency (1-5) ÷ effort (1-5). Higher first. Tie: the faculty that got less engineering in the last month. The orchestrator scores; owners propose. Done items move to the bottom with the date.

Columns: S = students, U = urgency, E = effort.

## Shared (both faculties)

| Item | S | U | E | Score | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Courses and flavor from the manifest (PR 3) | 5 | 2 | 3 | 3.3 | done 18.10.2026, #80 | Course files under `faculties/cs/courses/`, catalog, yearbook, categories and source line from the `courses` block; `hero` (terminal variant), `search.synonyms` and `eggs` from the manifest. No visible change. |
| Per-faculty build and CI (PR 4) | 5 | 2 | 2 | 5.0 | done 18.10.2026, #83 | `FACULTY` resolved through `faculties/index.js` everywhere, tests parametrized by the active faculty plus a shape test over every manifest, CI matrix over cs and neuro, the faculty guard in the build, placeholder `faculties/neuro/` (violet, נוי ורון, tracks list). |
| Simulation script | 3 | 2 | 2 | 3.0 | done 16.10.2026 | `scripts/simulate.mjs` takes a target URL; preview env with its own DB and key. The local server is documented in `simulations/README.md` instead of a launch config (gitignored). |
| Chat daily caps as env overrides for previews | 2 | 2 | 1 | 4.0 | done 16.10.2026 | `CHAT_GLOBAL_DAILY` and `CHAT_PER_VISITOR_DAILY`, read in `api/_lib/chat/config.js`. |
| Weekly report also written to a file the board can read | 2 | 1 | 2 | 1.0 | idea | Today it is only an email; the board needs Roy to paste it. |
| Chat: PII hook garbles sentences when it redacts a phone number copied from the facts | 4 | 2 | 1 | 8.0 | done 16.10.2026 | Baseline 15.10.2026 (troll 8, neuro 2): "הטלפון של המזכירות הוא קבוצת הוואטסאפ של נחיתה רכה". Fix: the numbers (long and `*9392`) are hidden from the chat facts in `knowledge.js`, replaced by "(מספר הטלפון מופיע באתר)"; the hook stays as a backstop for invented numbers. |
| Chat: greeting-prefixed and follow-up messages answer "לא הבנתי" | 4 | 3 | 2 | 6.0 | open | Baseline 15.10.2026, `security-extras.md`: three probes. Check which model answered (`chat: "ok", model` log). |
| Chat: invented Inbar menu paths and buildings when no fact matches | 5 | 3 | 2 | 7.5 | open | Baseline 15.10.2026: 11 of 50 invented-fact. Facts per Inbar screen, a buildings fact, stronger "not sure" rule. |
| Chat: gender slashes ("את/ה", "קח/י") where the prompt says plural | 3 | 2 | 1 | 6.0 | open | Baseline 15.10.2026: seven answers. Prompt line or style-hook check. |
| Chat: the personal registration window is said to open 12.10 14:00 (it is published then; changes start 14.10) | 5 | 4 | 1 | 20.0 | open | Second run 18.10.2026: stressed 3 (also in the baseline) and neuro 5 (new). Facts: guide:registration. Make the fact say "published 12.10 14:00, your own time is in Inbar" in one sentence. |
| Chat: neuro students get the CS main group link as "the brain sciences group" and the CS courses file as theirs | 3 | 3 | 1 | 9.0 | open | Second run 18.10.2026: neuro 3 (new), neuro 9 (baseline). The CS site has no neuro groups; a neuro question should get "not on this site" (see the Neuro row on group links). |
| Chat: building 503 placed in the 400 zone; 304 placed in the 200 zone | 3 | 2 | 1 | 6.0 | open | Second run 18.10.2026: english 8 (new), stressed 10 (baseline, partly fixed). Add the zone table (200 exact sciences, 300 law and lecture halls, 400 Jewish studies, 500 Israel Heritage) to the campus-map chat fact, or tell the model not to name zones. |
| Chat: special-sitting rule for reservists invented ("two weeks after the original exam", "only two sittings", "free") | 4 | 3 | 1 | 12.0 | open | Second run 18.10.2026: reservist 1 (new). guide:reserves: submit after Moed B, no later than two weeks after it. |
| Chat: raw source tags in the answer text ("מקורות: [faq:20]", "FAQ 20") | 3 | 2 | 1 | 6.0 | open | Second run 18.10.2026: reservist 6 and 8. Strip `[faq:N]` / `[guide:x]` tags in the answer hook, or tell the prompt not to print them. |
| Chat: "about 70 credit points in year 1" where the baseline said it is not on the site | 4 | 3 | 1 | 12.0 | open | Second run 18.10.2026: stressed 8 (new). No credit fact exists; the "not sure" rule did not hold. Cs-owner to check the yearbook, then either add the fact or keep the refusal. |
| Simulations README: env change needs a redeploy; default delay too fast for Groq | 1 | 2 | 1 | 2.0 | done 16.10.2026 | Baseline attempt 1 failed on both. Fix: README says an env change needs a redeploy and explains the pacing; the script's default is now `--delay-ms 20000` and a `busy` answer is retried twice, a minute apart. |
| Simulation transcripts: WhatsApp group links written raw | 1 | 2 | 1 | 2.0 | done 16.10.2026 | Baseline 15.10.2026 had to be redacted by hand. Fix: `scripts/simulate/transcript.mjs` writes every group link as `https://chat.whatsapp.com/[redacted]`. |

## CS

| Item | S | U | E | Score | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Verify change-period dates and the 14.10 course scan hold through 28.10 | 5 | 5 | 1 | 25.0 | open | cs-owner checks Inbar announcements; update `checkedOn`. |
| Exam-season guide refresh before מועד א' of semester א' | 5 | 2 | 2 | 5.0 | open | Dates come in December; sources to be checked then. |
| Source for the `cs-study-space` guide (check-data warning) | 4 | 1 | 1 | 4.0 | open | No `sources` on the CS learning space guide (building 503, My BLE-ID entry). cs-owner: add the department page or the secretariat's instruction (faculty PR 6g could not invent one). |

## Neuro

| Item | S | U | E | Score | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| List the brain sciences programs and tracks with their yearbooks | 5 | 3 | 2 | 7.5 | done 18.10.2026, #82 | Single major, combined with CS, with psychology, others. Source links per track. |
| Department contacts, office, hours | 4 | 2 | 1 | 8.0 | partly, PR 6a 18.10.2026 | Email, contact and procedures pages are in the neuro `help` guide. Room and hours are not published on any Gonda page; the students' "טיפים לפי שנים" doc says floor 1 of 901 next to the Tami 4 (fingerprint entry set up there). Roy verifies with the office, then the "עוד לא אומת" wording in `help`, `gonda-building` and two FAQ entries goes. |
| Buildings and study spaces neuro students use | 3 | 2 | 1 | 6.0 | done 18.10.2026, PR 6a | `gonda-building` guide and the neuro `campus-map` override, from /directions, /about, /node/944 and the 14.10 catalog scan (year-1 lecture buildings 901, 905, 604, 1002). |
| Neuro guides, categories and FAQ (PR 6a) | 5 | 4 | 3 | 6.7 | done 18.10.2026 | `neuro-registration`, `neuro-tracks`, `courses`, `gonda-building`, `campus-map` and `help` overrides, `university` override, `neuro-year1-courses`, eight FAQ entries. Gaps left: office room and hours (above); the year assignment in `yearbook.json` is inferred and still needs a check against the חוקה PDFs; `single-comp:1` in the yearbook includes 27-207, 27-209 and 27-2000, which the official page /computaional_track omits (it takes 86-147, 86-148, 86-153, 27-230, 27-232 instead); the missing group links in `wa-neuro-year1`, `wa-neuro-year3` and `wa-neuro-gonda`. |
| Shared content leaks CS into the neuro site | 3 | 3 | 1 | 9.0 | done 18.10.2026, PR 6d | The shared FAQ on a missing course moved into each faculty's file (CS with bsc@, neuro with the Gonda office, both `before` the shared courses question); the shared `university` category keeps only university sites and each faculty overrides it (CS copy holds `courses-file`, `opening-event`, `cs-contact`; neuro's contact id is now `gonda-contact`); the registration tip and the lectures FAQ say `{mascots}` and `{coursesFile}`, filled from the manifest in both languages; neuro publishes `courses-neuro-2027.json`. Left: the shared calendar still carries the CS year-opening event (`מפגש פתיחת שנה במחלקה למדעי המחשב`), a content move for the owners. |
| Neuro icons and link preview, designer polish | 2 | 1 | 1 | 2.0 | open | PR 6g made them in a browser canvas from `hero-brain.webp` (violet tile icons, `icons/icon.svg` embeds the 192 px PNG, 1200x630 link preview). Designer: a hand-drawn vector icon and a final link-preview composition. |
| WhatsApp groups per track and year | 4 | 2 | 1 | 8.0 | open | Links never enter this folder; they go straight to `faculties/neuro/data.js`. |
| Catalog scan over the departments that teach into the tracks | 5 | 2 | 4 | 2.5 | partly | Department 27 scanned 14.10.2026 (`catalog.json`); the yearbook per track and cohort is built from the Gonda plans (18.10.2026, `plans.json`, `tools/`). Second departments (60, 80, 86, 89, 31, 37) not scanned yet. |
| נוי ורון character briefs | 3 | 1 | 2 | 1.5 | open | Ron masculine, Noi feminine. Contrast like Bit and Byte. |
| Violet palette, light and dark, contrast-checked | 3 | 1 | 1 | 3.0 | open | designer |
| Hero variant for neuro | 2 | 1 | 2 | 1.0 | done 18.10.2026, PR 6d | `hero.variant: eeg`: the terminal window with a trace that draws itself in the accent, then three typed lines; CSS-only, four rows like the terminal. The hero illustration (`site.heroArt`) was a drawn placeholder until PR 6e. |
| Neuro hero illustration | 2 | 1 | 1 | 2.0 | done 18.10.2026, PR 6e (a Flow brain on a violet disc, `faculties/neuro/hero-brain.webp`) | designer: a picture for `site.heroArt` in `faculties/neuro/` (640x640, shown round) and its small avatar, replacing the drawn EEG disc. |
| Track selector, years from track:year ids, chat track field (PR 6d) | 5 | 4 | 3 | 6.7 | done 18.10.2026 | Courses page picker (select, remembered as `nr-track`, offered once), year chips and sections per track or per year, cards name tracks and years; `course-years.js` shared by the page and the model; the chat request carries `track` (validated), retrieval demotes other tracks' course facts, SITE names the student's track. CS output unchanged. |

## Done

| Item | Date | Notes |
| --- | --- | --- |
| Content split shared/ and faculties/cs (PR 2, #79) | 16.10.2026 | `shared/data.js` + `faculties/cs/data.js`, merged by `faculties/content.js`; `scripts/compare-content.mjs` proves the merged data deep-equal to the old `data.js`. No visible change. |
| Faculty manifest, CS only (PR 1, #78) | 16.10.2026 | Theme, mascots, meta from `faculties/cs/faculty.js`. No visible change. |
| Inbar group-change mechanics confirmed by Roy and restored to the FAQ (#76) | 16.10.2026 | |
| Yearbook categories (#68), chat facts from the baseline (#74) | 16.10.2026 | #74 merged after the CS owner's fact check. |
| Plans written and decided | 15.10.2026 | `MULTI-FACULTY-PLAN.md`, `MANAGEMENT-PLAN.md`. |
