# Decision log

Append only. Newest at the bottom. Format: date, decision, who, why. Roy's decisions are quoted in his words when he gave them.

| Date | Decision | Who | Why |
| --- | --- | --- | --- |
| 15.10.2026 | One repo, the faculty chosen at build time (`FACULTY` env, default `cs`), one Vercel project per faculty with its own env and database. | Roy | Prerendered site, server already configured per deployment, SEO per faculty. Alternatives (fork, runtime multi-tenant) in MULTI-FACULTY-PLAN.md D1. |
| 15.10.2026 | Keep the vercel.app addresses; domain decision after neuro has traffic. | Roy | Moving CS off its address costs rankings and breaks shared links. |
| 15.10.2026 | The neuro site serves all brain sciences programs: single major and the combined tracks (CS, psychology, others), with a track selector. | Roy ("brain science all programs, single, combined cs, combined psychology, etc") | One site per faculty, not per track. |
| 15.10.2026 | Roy is the mentor on the neuro site and the human behind the neuro owner for now. | Roy | No neuro maintainer yet. |
| 15.10.2026 | רון takes the masculine voice, נוי the feminine; violet palette for neuro. | Roy | Mirrors Bit and Byte so the grammar code is reused. |
| 15.10.2026 | A second Groq key on the same account for neuro. | Roy | Separate rate limits; one account. To confirm with Groq that limits are per key. |
| 15.10.2026 | The organization covers development and operations. | Roy | Content and calendar work is most of the weekly load. |
| 15.10.2026 | The orchestrator may merge content-only PRs after `npm run check`, and code PRs after QA and security are green. Features a student sees for the first time, publishing, spend, privacy, facts without a source and deletions wait for Roy. | Roy | Speed; the review chain is the control. |
| 15.10.2026 | Priorities by score: students × urgency ÷ effort; Roy overrides. | Roy | Two owners compete for one engineer without argument. |
| 15.10.2026 | Board runs weekly, started by Roy after the Sunday report, plus on demand. Not scheduled. | Roy | No tokens on quiet weeks. |
| 15.10.2026 | The orchestrator is the main session with `/board`; no separate orchestrator agent. | Roy | An agent that spawns agents loses context twice. |
| 15.10.2026 | Models: Haiku personas; Sonnet owners, designer, UX, QA, social; Fable or Opus orchestrator, engineer, security. Gemini (Antigravity) reviews before merge. | Roy | Cost where quality matters less; an independent model catches what the writer misses. |
| 15.10.2026 | Technical roles wrap the ECC agents (planner, tdd-guide, code-reviewer, security-reviewer, e2e-runner). Agents and `management/` live in the public repo. | Roy | No duplicated prompts; versioned with the code; transparency accepted. |
| 15.10.2026 | Simulations run against a target URL, default a Vercel preview deployment with its own DB, Groq key and salt; localhost optional on the desktop. Never production. | Orchestrator, after Roy asked for a setup that works from desktop and from mobile | Cloud sessions have no local server; previews exist from anywhere. |
| 15.10.2026 | Five personas: stressed first-year CS student, reservist, English speaker, first-year brain sciences student, troll. Seeded from the dashboard's "searches not found". | Orchestrator (Roy: "you decide") | Three biggest traffic sources, the second faculty, and the red team. |
| 15.10.2026 | No Playwright; node tests plus the built-in browser. | Roy | No new dependency, CI stays fast. |
| 15.10.2026 | Security covers code review, operations (Vercel env, firewall, rate limits) and the red team. | Roy | |
| 15.10.2026 | Social drafts for WhatsApp groups and LinkedIn only. Roy is the only publisher. | Roy | |
| 15.10.2026 | Design tools: Flow and Gemini image generation on the Google AI Pro plan; no Canva, no Figma. | Roy | No paid plans for those. |
| 15.10.2026 | Plans, reports and agent prompts are written in English; Hebrew only for site copy and names. | Roy ("it needs to be in english its much more tokens friendly") | Token cost. |
| 15.10.2026 | Agent ids are plain role names (orchestrator, cs-owner, neuro-owner, designer, ux-reviewer, engineer, qa, security, social, student-user); the corporate titles stay in the plan as nicknames. | Orchestrator, pending Roy's answer | Grand titles make agents expand their authority; ids are easy to rename. |

| 16.10.2026 | Weekly agent budget: medium. One board meeting plus one or two PRs a week, 2 to 3 roles per task. | Roy | Fits the plan's default; revisit after two weeks. |
| 16.10.2026 | Faculties after neuro, if any: psychology and engineering are the candidates. Nothing committed; no generic hero variant yet. | Roy ("all are just a plan, idk if I'll really do those") | Keeps the hero work to CS and neuro. |
| 16.10.2026 | PR #74 (chat facts from the baseline) merged after the CS owner's fact check; unsourced claims (Inbar arrows icon, free-place rule) were removed rather than kept. Open question for Roy: does the arrows icon work for every multi-group course, and is "free place, no overlap" the actual rule? | Orchestrator, under the content-merge rule | Facts without an official source do not reach the site. |

| 16.10.2026 | The Inbar group-change mechanics are confirmed: the arrows icon next to a course changes its group for any multi-group course, and a move is allowed only to a group with a free place that does not overlap another course. The two sentences return to the registration FAQ (PR #76). | Roy (checked in Inbar) | A maintainer's own check in the system counts as a source when no page states it; noted in a comment in data.js. |
| 18.10.2026 | Neuro site: no default track; a one-time track picker on first visit, and until chosen the chat and the courses page show all tracks and name the track of each fact. | Roy | No program is clearly the biggest; a wrong default misleads. |
| 18.10.2026 | Neuro site prints no degree letters (B.Sc / B.A.); program names only. | Roy | Gonda and the second departments disagree. |
| 18.10.2026 | Unpublished neuro facts (office room and hours, year-1 lecture and lab buildings) come from students Roy asks; they enter data.js with Roy as the source and a date, never from a guess. | Roy | Nothing official states them. |
| 18.10.2026 | The CS double-major study plan for תשפ"ז is the PDF the Gonda page links as חוקה תשפ"ז; the page caption saying תשפ"ו is stale. Life Sciences rooms 211A and 211C in building 212 are as published. | Orchestrator, checked in the browser | |

| 18.10.2026 | Neuro tracks: eight. The single major is two tracks, `single` (biological and cognition specializations, identical in year 1) and `single-comp` (computational, chosen at registration); plus the six double majors `cs`, `psychology`, `biology`, `philosophy`, `linguistics`, `physics`. The placeholder manifest's three track ids are replaced in the neuro content PR. | Roy | Matches how students register; avoids two identical year-1 lists. |
| 18.10.2026 | Students who started in תשפ"ו follow the updated תשפ"ו plan ("מעודכן לפי תוכנית לימודים תשפ"ז"), not the original; the neuro yearbook's year 2 maps from it. The rule for every cohort: the plan of the student's start year, in its latest published version. | Roy | Gonda lists the updated plan first and it aligns with the תשפ"ז courses. |
| 18.10.2026 | The neuro Vercel project exists: `nechita-raka-neuro` (prj_MaqPtWR6wA5R86u1IKf4TPionElB) on the same GitHub repo, FACULTY=neuro, its own Neon database `nechita-raka-neuro` (Frankfurt, a branch per preview), a second Groq key, its own CHAT_SALT, SITE_URL https://nechita-raka-neuro.vercel.app, ADMIN_EMAILS, GOOGLE_CLIENT_ID with the new origin added in GCP. Vercel Authentication on all deployments until the content PR, so nothing is public. Resend and Search Console variables wait for launch. | Roy (dashboard), orchestrator (plan and verification) | The Vercel connector can read projects but returns 403 on creating a project or listing env, so Roy set everything in the dashboard. |
Open, waiting for Roy: the service-center hours (bot check); verification of the inferred years in faculties/neuro/courses/yearbook.json against the PDFs before launch.
