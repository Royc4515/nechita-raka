# Read this first

Written 18.10.2026 by the orchestrator for Roy. Kept current: the newest "Where things stand" replaces the old one. To continue, open the orchestrator session and say "continue from management/NEXT.md".

## Where things stand (18.10.2026)

Everything below is merged into main and live, with no visible change on the CS site.

| Step | PR | What it gave us |
| --- | --- | --- |
| Plans | #69 | `MULTI-FACULTY-PLAN.md`, `MANAGEMENT-PLAN.md`, this folder, nine role agents, `/board`. |
| Simulations | #70, #71, #73 | `scripts/simulate.mjs`, the first graded baseline (24 answered, 11 invented facts, 0 broke character), the four defects it found fixed. |
| Chat facts | #74, #76 | Facts and keywords the chat was missing, fact-checked by the CS owner; the Inbar group-change steps confirmed by Roy. |
| Review ladder | #77 | `scripts/review-tier.mjs`: reviews by touched files, so small changes cost no agents. |
| Faculty PR 1 | #78 | `faculties/cs/faculty.js`: theme, mascots, meta and PWA fields from one manifest. |
| Faculty PR 2 | #79 | Content split: `shared/data.js` (all of Bar-Ilan) and `faculties/cs/data.js` (CS), merged at build, proven identical. |
| Faculty PR 3 | #80 | Courses (catalog, yearbook, categories under `faculties/cs/courses/`), the hero, the search synonyms and the easter eggs from the manifest. Security notes fixed; the orchestrator did the browser walk on 18.10 (hero, synonyms, egg, course browser, catalog link) before merging. |

The CS site works exactly as before. The repo is now one `FACULTY=cs` build away from a second faculty, once PR 4 adds the per-faculty build.

## Tomorrow, in this order

1. **First board meeting.** Sunday's weekly report arrived by email on 18.10. Paste its text into the orchestrator session and run `/board`. Output: a one-page summary in `management/meetings/`, the backlog re-scored, questions for you. This also refreshes the backlog rows that are stale (PR 2 and the simulation items still say "in review").
2. **Faculty PR 3** is merged; nothing to do.
3. **Faculty PR 4**: per-faculty build and CI (`FACULTY` env everywhere, tests parametrized, CI matrix, a placeholder `faculties/neuro/` copied from CS). Say "start PR 4" and a session is briefed from `MULTI-FACULTY-PLAN.md` section 3. After it, `FACULTY=neuro npm run build` produces a site.
4. **Neuro content, in parallel.** No code needed. Say "run the neuro owner" and it brings the list of brain sciences programs and tracks with their yearbooks, department contacts, buildings and the first course mapping, each with a source, into `management/BACKLOG.md`. This is the longest item on the path to neuro, so it should start before PR 4 finishes.
5. **Vercel project for neuro** (faculty PR 5) happens only after PR 4, and it is manual work on your side: a second Vercel project on the same repo with `FACULTY=neuro`, its own Neon database, a second Groq key, a Search Console property. The exact env list is in `MULTI-FACULTY-PLAN.md` D10.

## Decisions waiting on you

- **Service-center hours** in the Inbar login FAQ: the official page sits behind a bot check, so nobody verified "א'–ה' 9:00–17:00". A glance at the page settles it.
- **Groq limits per key**: the plan assumes a second key on the same account has its own rate limit. Groq's console says whether limits are per key or per organization. If per organization, neuro needs its own account.
- **Second simulation**: the chat fixes from the baseline (#73, #74, #76) are live. A second run against a preview would show whether the 11 invented facts dropped. It costs about 50 Groq messages and 17 minutes. Say "run the second simulation" if you want the number before the neuro work.

## Housekeeping

- Seven worktrees of finished sessions sit under `.claude/worktrees/` (amazing-galileo, dreamy-dirac, elated-bell, faculty-manifest, heuristic-lovelace, infallible-kare and the first baseline's). They are safe to remove once PR 3 is merged; the app's "clean up worktrees" does it.
- The Preview environment on Vercel (separate database, Groq key, salt, raised caps, bypass secret) is set and recorded in the orchestrator's memory, so the next simulation needs no setup.
