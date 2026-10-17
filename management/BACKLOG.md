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
| Simulations README: env change needs a redeploy; default delay too fast for Groq | 1 | 2 | 1 | 2.0 | done 16.10.2026 | Baseline attempt 1 failed on both. Fix: README says an env change needs a redeploy and explains the pacing; the script's default is now `--delay-ms 20000` and a `busy` answer is retried twice, a minute apart. |
| Simulation transcripts: WhatsApp group links written raw | 1 | 2 | 1 | 2.0 | done 16.10.2026 | Baseline 15.10.2026 had to be redacted by hand. Fix: `scripts/simulate/transcript.mjs` writes every group link as `https://chat.whatsapp.com/[redacted]`. |

## CS

| Item | S | U | E | Score | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Verify change-period dates and the 14.10 course scan hold through 28.10 | 5 | 5 | 1 | 25.0 | open | cs-owner checks Inbar announcements; update `checkedOn`. |
| Exam-season guide refresh before מועד א' of semester א' | 5 | 2 | 2 | 5.0 | open | Dates come in December; sources to be checked then. |

## Neuro

| Item | S | U | E | Score | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| List the brain sciences programs and tracks with their yearbooks | 5 | 3 | 2 | 7.5 | done 18.10.2026, #82 | Single major, combined with CS, with psychology, others. Source links per track. |
| Department contacts, office, hours | 4 | 2 | 1 | 8.0 | partly | Email and pages in `neuro/programs.md`; room and hours are not published. |
| Buildings and study spaces neuro students use | 3 | 2 | 1 | 6.0 | partly | Gonda building 901 is already in the CS campus guide. |
| WhatsApp groups per track and year | 4 | 2 | 1 | 8.0 | open | Links never enter this folder; they go straight to `faculties/neuro/data.js`. |
| Catalog scan over the departments that teach into the tracks | 5 | 2 | 4 | 2.5 | partly | Department 27 scanned 14.10.2026 (`catalog.json`); the yearbook per track and cohort is built from the Gonda plans (18.10.2026, `plans.json`, `tools/`). Second departments (60, 80, 86, 89, 31, 37) not scanned yet. |
| נוי ורון character briefs | 3 | 1 | 2 | 1.5 | open | Ron masculine, Noi feminine. Contrast like Bit and Byte. |
| Violet palette, light and dark, contrast-checked | 3 | 1 | 1 | 3.0 | open | designer |
| Hero variant for neuro | 2 | 1 | 2 | 1.0 | open | CSS-only, same size as the terminal. |

## Done

| Item | Date | Notes |
| --- | --- | --- |
| Content split shared/ and faculties/cs (PR 2, #79) | 16.10.2026 | `shared/data.js` + `faculties/cs/data.js`, merged by `faculties/content.js`; `scripts/compare-content.mjs` proves the merged data deep-equal to the old `data.js`. No visible change. |
| Faculty manifest, CS only (PR 1, #78) | 16.10.2026 | Theme, mascots, meta from `faculties/cs/faculty.js`. No visible change. |
| Inbar group-change mechanics confirmed by Roy and restored to the FAQ (#76) | 16.10.2026 | |
| Yearbook categories (#68), chat facts from the baseline (#74) | 16.10.2026 | #74 merged after the CS owner's fact check. |
| Plans written and decided | 15.10.2026 | `MULTI-FACULTY-PLAN.md`, `MANAGEMENT-PLAN.md`. |
