# Read this first

Written 18.10.2026 by the orchestrator for Roy, updated overnight after the neuro site became launchable. Kept current: the newest "Where things stand" replaces the old one. To continue, open the orchestrator session and say "continue from management/NEXT.md".

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

| Faculty PR 4 | #83 | `FACULTY` env everywhere, CI matrix over cs and neuro, a build guard against another faculty's names, and a placeholder `faculties/neuro/` (CS content copied, violet accent, mascots נוי and רון with CS images). `FACULTY=neuro npm run build` produces a neuro site. |
| Neuro courses | #87, #88 | Roy's catalog scan of department 27 (60 courses) is the neuro catalog; the Gonda study plans of three cohorts for all eight tracks were downloaded, parsed and turned into `plans.json` and a `track:year` yearbook (`management/neuro/plans.md` has the rule and the diffs). |
| Neuro content | #91, #92, #93 | WhatsApp communities and resources from Roy's WhatsApp (missing links point at Roy), the mascots נוי and רון with 18 images, and the guides, categories and FAQ from the Gonda pages. The neuro site now has everything but the engineering of PR 6d. |
| Neuro engineering and design | #95, #96 | Track selector with a one-time prompt, years from track:year ids, chat facts naming the track, the neuro file name, egg and EEG hero, the last CS leaks moved out of shared content, and seven manifest-driven decor elements with Flow images (synapse background, brain backdrop, spike headings, lab illustrations, bench footer) plus the colored brain as the hero illustration. CS output verified unchanged except decor-keyed CSS. |
| Shabbat rest | #101 | Both sites close from candle lighting to havdalah (offline times equal to Hebcal on 127 of 127 Shabbatot, Ramat Gan), a poster-style rest page per faculty, the chat answers without the model. Holidays are not handled yet. |
| Leak sweep | #102 | The QA review of 19.10 fixed: calendar events, per-faculty ICS, chat chips, shared tips, admin, icons and og image for neuro. Neuro build has no CS wording left except legitimate combined-track mentions. |
| Simulation 2 | #100 | CS chat: invented facts 11 to 7, answered 24 to 30, no leaks from the troll. |
| Neuro Vercel | #90 | The project nechita-raka-neuro runs with its own database, Groq key and salt, behind Vercel Authentication. |
| Neuro research | #82 | `management/neuro/programs.md`: seven brain sciences programs with sources, proposed track ids, study-plan pages, catalog codes, contacts, nine open questions. |

The CS site works exactly as before. The code side of the faculty plan (PRs 1 to 4) is done; what remains is the neuro Vercel project (PR 5) and the neuro content (PR 6).

## Tomorrow, in this order

1. **First board meeting.** Sunday's weekly report arrived by email on 18.10. Paste its text into the orchestrator session and run `/board`. Output: a one-page summary in `management/meetings/`, the backlog re-scored, questions for you. This also refreshes the backlog rows that are stale (PR 2 and the simulation items still say "in review").
2. **Neuro questions**: nine of ten are answered in `management/neuro/programs.md`. Open: Q10, which of the two תשפ"ו plan PDFs binds students who started in תשפ"ו (the mapping assumes the "updated per תשפ"ז" one). Also the service-center hours, behind a bot check.
3. **Vercel project for neuro** (faculty PR 5): done on 18.10.2026 in the dashboard (`nechita-raka-neuro`, own Neon database, second Groq key, own salt, admin sign-in). It is behind Vercel Authentication on all deployments until the content PR lands. Left for launch: Resend variables for the weekly mail, the Search Console property and its Workload Identity binding, and turning the protection off.
4. **Neuro engineering** (faculty PR 6d, in review): track selector, years from `track:year` ids, chat facts naming the track, per-faculty download name, egg and hero, the last CS leaks in shared content, the dark-mode shadow. After it the neuro site is launchable.
5. **Before launch, yours**: the four missing group links (year 1, year-1 reservists and mentors, the Since 2025 community, the Gonda community), the office room and hours (written as "לפי הוותיקים, עוד לא אומת" until you confirm), the inferred years in `yearbook.json` against the PDFs, a read of the two character prompts, and a walk through the neuro preview.
6. **Audience copy** (faculty PR 6f, in review): decided on 18.10.2026, the neuro site addresses the whole department, first-years first but not only. The sweep makes the audience phrase, the tagline and the chat path manifest values (`site.audience`, `site.tagline`, `labels.chatPath`): the neuro title, descriptions, JSON-LD, llms.txt and the chat's SITE line say brain sciences students; the CS build is byte-identical.
7. **Launch** (faculty PR 7): Resend variables for the weekly mail, a Search Console property and its Workload Identity binding, protection off, `noindex` off, the launch kit from the social role, a simulation run with the neuro persona.

## Decisions waiting on you

- **Service-center hours** in the Inbar login FAQ: the official page sits behind a bot check, so nobody verified "א'–ה' 9:00–17:00". A glance at the page settles it.
- **Groq limits per key**: the plan assumes a second key on the same account has its own rate limit. Groq's console says whether limits are per key or per organization. If per organization, neuro needs its own account.
- **Second simulation**: the chat fixes from the baseline (#73, #74, #76) are live. A second run against a preview would show whether the 11 invented facts dropped. It costs about 50 Groq messages and 17 minutes. Say "run the second simulation" if you want the number before the neuro work.

## Housekeeping

- Seven worktrees of finished sessions sit under `.claude/worktrees/` (amazing-galileo, dreamy-dirac, elated-bell, faculty-manifest, heuristic-lovelace, infallible-kare and the first baseline's). They are safe to remove once PR 3 is merged; the app's "clean up worktrees" does it.
- The Preview environment on Vercel (separate database, Groq key, salt, raised caps, bypass secret) is set and recorded in the orchestrator's memory, so the next simulation needs no setup.

## Ready to distribute when (checklist of 19.10.2026)

1. Roy: the four missing WhatsApp links (year 1, year-1 reservists and mentors, the Since 2025 community, the Gonda community) or accept the "link missing" tiles.
2. Roy: the secretariat room and hours (or keep "לפי הוותיקים, עוד לא אומת"), the inferred years in `yearbook.json`, a read of the two character prompts, one walk through the neuro preview.
3. Orchestrator, after 1 and 2: Resend variables for the weekly mail, a Search Console property and Workload Identity binding for the neuro project, turn Vercel Authentication off on the neuro project, drop `noindex`, one neuro simulation run, then post the drafts in `management/social/2026-10-19-neuro-launch.md` (Roy posts).
