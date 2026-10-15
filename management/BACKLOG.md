# Backlog

Score = students affected (1-5) × calendar urgency (1-5) ÷ effort (1-5). Higher first. Tie: the faculty that got less engineering in the last month. The orchestrator scores; owners propose. Done items move to the bottom with the date.

Columns: S = students, U = urgency, E = effort.

## Shared (both faculties)

| Item | S | U | E | Score | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Faculty manifest, CS only (PR 1) | 5 | 3 | 3 | 5.0 | planned | Theme, mascots, meta from `faculties/cs/faculty.js`. No visible change. |
| Content split shared/ and faculties/cs (PR 2) | 5 | 3 | 4 | 3.8 | planned | Byte-identical merged `data.js`. |
| Courses and flavor from the manifest (PR 3) | 5 | 2 | 3 | 3.3 | planned | Catalog, yearbook, categories, hero variant, synonyms, eggs. |
| Per-faculty build and CI (PR 4) | 5 | 2 | 2 | 5.0 | planned | `FACULTY` env, tests parametrized, placeholder `faculties/neuro/`. |
| Simulation script | 3 | 2 | 2 | 3.0 | in review | `scripts/simulate.mjs` takes a target URL; preview env with its own DB and key. The local server is documented in `simulations/README.md` instead of a launch config (gitignored). |
| Chat daily caps as env overrides for previews | 2 | 2 | 1 | 4.0 | in review | `CHAT_GLOBAL_DAILY` and `CHAT_PER_VISITOR_DAILY`, read in `api/_lib/chat/config.js`. |
| Weekly report also written to a file the board can read | 2 | 1 | 2 | 1.0 | idea | Today it is only an email; the board needs Roy to paste it. |
| Chat: PII hook garbles sentences when it redacts a phone number copied from the facts | 4 | 2 | 1 | 8.0 | open | Baseline 15.10.2026 (troll 8, neuro 2): "הטלפון של המזכירות הוא קבוצת הוואטסאפ של נחיתה רכה". Drop the numbers from the chat facts or rewrite the clause. |
| Chat: greeting-prefixed and follow-up messages answer "לא הבנתי" | 4 | 3 | 2 | 6.0 | open | Baseline 15.10.2026, `security-extras.md`: three probes. Check which model answered (`chat: "ok", model` log). |
| Chat: invented Inbar menu paths and buildings when no fact matches | 5 | 3 | 2 | 7.5 | open | Baseline 15.10.2026: 11 of 50 invented-fact. Facts per Inbar screen, a buildings fact, stronger "not sure" rule. |
| Chat: gender slashes ("את/ה", "קח/י") where the prompt says plural | 3 | 2 | 1 | 6.0 | open | Baseline 15.10.2026: seven answers. Prompt line or style-hook check. |
| Simulations README: env change needs a redeploy; default delay too fast for Groq | 1 | 2 | 1 | 2.0 | open | Baseline attempt 1 failed on both. Recommend `--delay-ms 20000` or back off on `busy` in the script. |

## CS

| Item | S | U | E | Score | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Verify change-period dates and the 14.10 course scan hold through 28.10 | 5 | 5 | 1 | 25.0 | open | cs-owner checks Inbar announcements; update `checkedOn`. |
| Yearbook categories PR (#68) merged | 4 | 4 | 1 | 16.0 | in review | Branch `feat/yearbook-categories`. |
| Exam-season guide refresh before מועד א' of semester א' | 5 | 2 | 2 | 5.0 | open | Dates come in December; sources to be checked then. |

## Neuro

| Item | S | U | E | Score | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| List the brain sciences programs and tracks with their yearbooks | 5 | 3 | 2 | 7.5 | open | Single major, combined with CS, with psychology, others. Source links per track. |
| Department contacts, office, hours | 4 | 2 | 1 | 8.0 | open | Official site only. |
| Buildings and study spaces neuro students use | 3 | 2 | 1 | 6.0 | open | Gonda building 901 is already in the CS campus guide. |
| WhatsApp groups per track and year | 4 | 2 | 1 | 8.0 | open | Links never enter this folder; they go straight to `faculties/neuro/data.js`. |
| Catalog scan over the departments that teach into the tracks | 5 | 2 | 4 | 2.5 | open | Follows the rules in `scripts/UPDATING-COURSES.md`. |
| נוי ורון character briefs | 3 | 1 | 2 | 1.5 | open | Ron masculine, Noi feminine. Contrast like Bit and Byte. |
| Violet palette, light and dark, contrast-checked | 3 | 1 | 1 | 3.0 | open | designer |
| Hero variant for neuro | 2 | 1 | 2 | 1.0 | open | CSS-only, same size as the terminal. |

## Done

| Item | Date | Notes |
| --- | --- | --- |
| Plans written and decided | 15.10.2026 | `MULTI-FACULTY-PLAN.md`, `MANAGEMENT-PLAN.md`. |
