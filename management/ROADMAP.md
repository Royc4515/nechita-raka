# Roadmap

Updated 15.10.2026 by the orchestrator, from [MULTI-FACULTY-PLAN.md](../MULTI-FACULTY-PLAN.md) and [MANAGEMENT-PLAN.md](../MANAGEMENT-PLAN.md). The academic year תשפ"ז started on 12.10.2026 (change period 14.10 to 28.10).

## Now (October to December 2026)

Goal: the CS site keeps serving first-year students through the change period and the first exam season, while the code becomes faculty-neutral.

| # | Item | Owner | Done when |
| --- | --- | --- | --- |
| 1 | Keep CS content current through the change period: dates, groups, the course scan of 14.10. | cs-owner | Every calendar event in the next two weeks has a source checked this month. |
| 2 | Management setup: this folder, the role agents, `/board`, the simulation script and a `chat-local` launch config. | orchestrator, engineer | First board meeting held; one simulation run stored under `simulations/`. |
| 3 | Faculty manifest with CS as the only faculty (PR 1 of the faculty plan). | engineer | Site unchanged, theme and mascots read from `faculties/cs/faculty.js`. |
| 4 | Content split into `shared/` and `faculties/cs/` (PR 2). | engineer, cs-owner | Merged `data.js` identical to today's. |
| 5 | Courses and flavor from the manifest (PR 3), per-faculty build and CI (PR 4). | engineer, qa | `FACULTY=neuro npm run build` produces a placeholder site. |
| 6 | Neuro content collection: programs and tracks, yearbooks, department contacts, groups, study spaces. | neuro-owner | A checklist in `BACKLOG.md` with a source per item. |

## Next (January to March 2027)

Goal: the neuro site exists and is used by first-year brain sciences students in semester ב'.

| # | Item | Owner | Done when |
| --- | --- | --- | --- |
| 7 | Neuro Vercel project, database, Groq key, Search Console (PR 5). | Roy, orchestrator | Done 18.10.2026 except Search Console and the weekly mail, which wait for launch. The placeholder site is behind Vercel Authentication. |
| 8 | Neuro content, theme, נוי ורון, hero variant, track selector (PR 6). | neuro-owner, designer, engineer | Done 18.10.2026 (#91 to #96): content, mascots, groups, track selector, years, flavor and decor. Launchable; waiting on Roy's checks and the launch steps (item 9). |
| 9 | Neuro launch before the change period of semester ב'. | social, orchestrator | Indexed; traffic visible in the neuro admin. |
| 10 | First exam season on both sites: exam guides, מועד ב', reservist rights. | both owners | Exam-season searches have answers; "not found" searches drop. |

## Later

- A third faculty, if one is chosen (psychology, math or engineering were named as possibilities, none decided).
- A domain with a subdomain per faculty and a hub page, once two faculties have traffic.
- A generic hero variant, if a third faculty comes.
