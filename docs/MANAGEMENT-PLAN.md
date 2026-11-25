# Management plan: the "company" behind נחיתה רכה

Date: 15.10.2026. Status: proposal, nothing decided. Companion to [MULTI-FACULTY-PLAN.md](MULTI-FACULTY-PLAN.md).

Goal: run one site for several faculties with a team of AI agents in fixed roles, so Roy talks to one party (the President) and everything else (specs, design, code, tests, security, distribution) happens in a repeatable, documented process instead of one-off chats.

## 1. Structure

```
Roy (owner: decides, approves, publishes)
└── President Orchestrator
    ├── CS CEO            owns the content, data and student needs for CS
    ├── Neuro CEO         same for brain sciences
    ├── VP Designer       visual identity: palettes, mascots, images, OG, hero
    ├── VP UI/UX          flows, accessibility, mobile, RTL, Hebrew copy
    ├── VP SWE            architecture, code, PRs, code review
    ├── VP QA             tests, coverage, data checks, simulations
    ├── VP Security       pre-merge review, privacy, the chat, permissions
    ├── VP Social         distribution: WhatsApp, LinkedIn, announcements, "what's new"
    └── Simulated users   student personas for testing and simulations
```

### What each role does, and does not do

| Role | Owns | Never does | Tools | Model |
| --- | --- | --- | --- | --- |
| President | Takes a goal from Roy, breaks it into tasks, picks who works, logs decisions in `management/`, reports to Roy in one page, escalates questions. Keeps the roadmap and backlog. | No code, no content, no publishing. | Read, delegate to agents, Workflows | Fable / Opus |
| Faculty CEO | The faculty's backlog, fact accuracy (source and date for every fact), the faculty manifest, the mascots' voice, student needs read from the admin dashboard (searches not found, chat topics). Writes specs, accepts deliverables. | No code. Never invents a fact. | Read, browser for university sites, admin dashboard | Sonnet |
| Designer | Palette per faculty with contrast checks, mascots (character brief plus images in Flow), OG image, icons, hero variant. Delivers a design spec, not CSS. | Never touches `index.html` | Browser (Flow), Read | Sonnet |
| UI/UX | Reviews every change on mobile, RTL, light and dark, accessibility, copy. Runs flow tests with the simulated users (registration, schedule, chat). | Does not implement | Built-in browser, Read | Sonnet |
| SWE | Plans and implements PRs with TDD, code review, green build, README updates. Writes only after an approved spec. | Does not decide content or priorities | All | Fable / Opus |
| QA | Unit and integration tests, `npm run check`, build per faculty, E2E on critical flows, runs simulations and grades chat answers, regression before every merge. | Does not fix code (reports to SWE) | Bash, Read, browser | Sonnet (+ Gemini for an independent review) |
| Security | Review before every merge: secrets, input, injection, prompt injection in the chat, rate limits, privacy (no stored questions, hidden WhatsApp links), admin auth, Vercel env. Red team with the simulated users. | Does not approve features alone; can block a merge | Bash, Read | Opus |
| Social | Drafts messages for groups and networks, release announcements, "what's new" in the site, tracks `?src=wa` and referrers in the dashboard, proposes content. | Never posts. Every publication goes through Roy. | Read, admin dashboard | Sonnet |
| Simulated users | Fixed personas (a student stressed before the change period, a reservist, an English speaker, a first-year brain sciences student, a "troll" trying to extract the prompt). Ask the chat, walk the site flows, report where they got stuck. | Do not judge facts (that is QA and the CEO) | Bash (simulation script), browser | Haiku |

## 2. How it is implemented

Everything with tools that already exist; no new infrastructure.

1. **The President is the main Claude Code session** in the project, with a `/board` command (a project skill) that loads the process: reads `management/ROADMAP.md`, `management/DECISIONS.md` and the weekly report, then decides what goes to whom. No separate "president" agent: an agent that spawns agents loses context twice.
2. **Roles are project agents** in `.claude/agents/<role>.md`: a role prompt, a narrow tool list, a model. The technical VPs wrap the ECC agents that already exist (`planner`, `architect`, `tdd-guide`, `code-reviewer`, `security-reviewer`, `e2e-runner`) and add only the site's context (structure, the fact rules, the WhatsApp-link policy). Nothing is duplicated.
3. **Memory is files** in `management/`: `ROADMAP.md` (quarter), `BACKLOG.md` (per faculty, scored), `DECISIONS.md` (decision log with date and who decided), `meetings/<date>.md` (meeting summaries), `users/<persona>.md` (the personas), `simulations/<date>/` (transcripts and grades). An agent without memory that did not write to a file did not make a decision.
4. **Parallelism through Workflows** only for a real fan-out: a PR reviewed by UI/UX, QA and Security at once; all personas simulated at once. Everything else runs one agent at a time. Two code writers never touch the same files.
5. **Simulations run against a local server** with a separate database and a separate Groq key, never against production: the chat is capped at 150 messages a day for the whole site and 15 per visitor, and analytics would be polluted. A script, `scripts/simulate.mjs`, sends the personas' questions to `api/chat`, stores transcripts, and QA grades each answer: answered / not answered / invented a fact / broke character / blocked.
6. **Publishing is always human**: Social drafts, Roy sends. Merging to main: after QA and Security are green, the President proposes and Roy approves (or the President merges small content fixes alone, per the rule in section 4).

## 3. Workflows

**A. New feature** (for example the schedule): the CEO writes a short spec (who needs it, what problem, how we know it worked) → the President prioritizes and approves → UI/UX and Designer deliver a spec (screen, copy, assets) → SWE implements in a PR with tests → QA runs tests and a simulation of the flow → Security reviews → the President presents to Roy → merge → Social drafts the "what's new" message.

**B. Content update** (a date moved, a new group, a course scan): the CEO brings the fact with source and date → QA runs `npm run check` and a comparison → merge. No design, SWE or Security unless code was touched.

**C. Weekly board meeting** (tied to the Sunday weekly report): the President reads the report; each CEO brings three things: what the data taught us (searches not found, chat topics, pages), what is urgent in the academic calendar in the next two weeks, what they ask from SWE; the President updates the backlog and roadmap and writes a one-page summary in `meetings/`. Roy reads one page.

**D. Simulation** (before every chat release or big content change): every persona, 10 questions each, against the new and the old version; QA compares the grades; Security runs the troll persona.

**E. New faculty release**: per [MULTI-FACULTY-PLAN.md](MULTI-FACULTY-PLAN.md) section 3, with that faculty's CEO owning the content PRs and SWE owning the code.

## 4. Decision rules

The President decides alone: the order of work within the week, which VPs work, merging a content-only PR that passed `check` (a date, a link, wording).

Only Roy decides: anything a real student sees for the first time (a feature, a design change, a mascot), any post in a group or a network, any spend (domain, key), anything touching privacy or security, any academic fact without an official source, deleting content, priority between faculties when the CEOs disagree.

Backlog score (so two CEOs compete for SWE without an argument): students affected (1-5) × urgency by the academic calendar (1-5) ÷ effort (1-5). Tie: the faculty that got less in the last month.

## 5. Budget and models

The organization runs on demand, not in the background. Rule of thumb: a normal task involves 2 to 3 roles, not nine. A full feature: up to 6. The weekly meeting: President plus two CEOs.

Models: Haiku for the simulated users (cheap, many), Sonnet for CEOs, Designer, UI/UX, QA and Social, Fable or Opus for the President, SWE and Security. One independent review of code and text before a merge through `gemini-delegate` (not on Claude's quota, and a different model catches mistakes the writing model does not see).

### Review ladder (decided 16.10.2026)

Which reviews a PR gets is decided by the files it touches, not by judgment per PR. `node scripts/review-tier.mjs` prints the tier and the agents to run. The highest tier among the touched files wins.

| Tier | Files | Review | Cost |
| --- | --- | --- | --- |
| 0 | `data.js`, `data.en.js`, `management/`, `shared/`, faculty content, course JSON, the calendar file | CI only (`npm run check`, tests, build). Owner fact-check when a Bar-Ilan fact changed. No QA, no security. | none |
| 1 | `scripts/`, `api/_tests/`, `.claude/`, README and other docs, package files | Engineer self-review plus CI. No agents. | none |
| 2 | Browser code: `index.html`, `chat.js`, `peek.js`, `track.js`, `admin.*`, `course-*.js`, CSS, the web manifest, `faculties/*/faculty.js` | QA only: build, tests, one browser walk of the touched flow on phone and desktop. UX reviewer only when something visible changed. | one Sonnet run |
| 3 | `api/` (not tests), `vercel.json`, the build and prerender scripts, `.github/` | QA plus security, both scoped to the diff. If the prompt, the knowledge chunks or chat facts changed, `simulate.mjs --limit 3` with one or two personas instead of a full run. One Gemini review instead of a second Claude pass. | two runs |

Budget rules inside every review brief: the agent gets the diff and the touched-file list and reads only those plus what they import; the report is under 300 words, findings only; a review runs once per PR, at the end, not per commit. A full simulation is a board decision, never a per-PR habit.

## 6. Difficulties and problems

1. **Agents are not people.** No memory between runs, no knowledge of last week's decision unless it is in a file, and they never pick up a task on their own. The organization works only if memory is in files and the process is triggered (a command, or a scheduled task).
2. **Cost and tokens.** Every handoff between agents loses detail and re-reads the code. Nine roles on every small task is expensive theater. Hence "2 to 3 roles per task" and the President being the session itself, not another layer.
3. **Self-approval.** The same model writes the code, tests it and "uses" it. An agent handed a hypothesis tends to confirm it. Mitigations: QA and Security receive the code, not the conclusion; one review on a different model (Gemini); simulations compare old versus new instead of only grading.
4. **Fact truth.** An agent can invent a date or an academic rule with full confidence. The site's existing rule (every fact from an official source with `checkedOn`) becomes the CEO's duty and QA's check; simulated users test experience, never truth.
5. **Overlaps.** Designer versus UI/UX; QA versus Security versus `code-reviewer`. The table's boundaries must stay sharp: Designer = assets and palette, UI/UX = flows and copy; QA = does it work, Security = is it safe and private.
6. **The repo is public.** A `management/` folder with the backlog, personas and decision log is visible to everyone, students included. Either accept that (transparency) or keep management in a private folder outside the repo, and then agents need a path to it.
7. **Simulations cost money and can interfere.** Against production they would eat the 150-message daily cap and fake the dashboard. A local server, a separate DB and a separate Groq key are mandatory, and even then Groq's free quota applies.
8. **No real question corpus.** The chat stores only counters (topics, outcomes), not the questions themselves, on purpose (privacy). Personas are written from knowledge of the students and from searches not found, not from real transcripts.
9. **A Neuro CEO without a faculty.** Until `faculties/neuro/` exists there is nothing to manage. In the first months this role mostly collects content and sources.
10. **Two writers on the same files.** `index.html` is one big file; two SWE tasks in parallel will conflict. One writer at a time, or a worktree per task and serial merges.
11. **Social.** An agent drafts well but does not know the groups, cannot tell what "sounds like an ad", and must never expose group links. Every text passes through Roy, and link checking is part of QA.
12. **Authority.** The President "decides" only inside the limits of section 4. Without those limits agents interpret "manage" too broadly.

## 7. Decisions taken on 15.10.2026

| Topic | Decision |
| --- | --- |
| Scope | Development and operations (content updates, weekly report, academic calendar). |
| Merge authority | The President merges content-only PRs after `check`, and code PRs after QA and Security are green. Features a student sees for the first time, publishing, spend, privacy, facts without a source and deletions still wait for Roy. |
| Priorities | Scoring formula (students × urgency ÷ effort), Roy overrides. |
| Cadence | Weekly, started by Roy after the Sunday report, plus on demand. Not scheduled. |
| President | The main session plus a `/board` command; no separate orchestrator agent. |
| Models | As proposed: Haiku personas, Sonnet for CEOs, Designer, UI/UX, QA, Social; Fable or Opus for President, SWE, Security. |
| Independent review | Gemini through Antigravity reviews code and text before merge. |
| Technical VPs | Thin wrappers over the ECC agents. |
| Agents and memory | `.claude/agents/` and `management/` live in the repo (public). |
| Simulations | The script takes a target URL. Default target: a Vercel preview deployment with Preview env (separate Neon database, separate Groq key, own salt), usable from desktop and from cloud sessions on mobile. Localhost is an option on the desktop. The chat's daily cap gets an env override for previews. |
| Personas | Five: stressed first-year CS student before the change period, reservist, English speaker, first-year brain sciences student (once neuro exists), troll. Seeded from the dashboard's "searches not found". |
| E2E | Node tests plus the built-in browser; no Playwright. |
| Security | Code review, operations (Vercel env, firewall, rate limits) and the red team. |
| Social | WhatsApp groups and LinkedIn. Roy is the only publisher. |
| Design tools | Flow and Gemini image generation on the Google AI Pro plan. No Canva, no Figma. |
| Neuro CEO | Roy is the human behind it for now. |

Still open: the weekly agent budget (low, medium, high) and whether the agents keep corporate titles or plain role names.

## 7a. The original questions (kept for the record)

**Scope and authority**
1. Is the organization for development only, or also ongoing operations (content updates, reacting to the weekly report, answering students)?
2. What may the President do without you: merge content-only PRs? merge code after QA and Security? deploy? Or does every merge go through you?
3. Is the backlog scoring rule (students × urgency ÷ effort) acceptable, or do you want to arbitrate between faculties yourself?
4. Is the President the main session you talk to, or a separate agent you launch with a command?

**Cadence and triggering**
5. A fixed weekly meeting (Sunday, after the report), on demand only, or a scheduled task that runs alone in the cloud and leaves you a summary?
6. How much time and cost per week are you willing to spend? This sets how many roles actually run.

**Models and tools**
7. Is the proposed model split acceptable (Haiku for personas, Sonnet for CEOs and most VPs, Fable or Opus for President, SWE and Security)?
8. Is Gemini through Antigravity part of the team as an independent reviewer, or Claude only?
9. Should the technical VPs wrap the existing ECC agents (planner, tdd-guide, code-reviewer, security-reviewer, e2e-runner) or be entirely new agents?
10. Do the agents live in the project (`.claude/agents/` in the public repo) or in your global folder?

**Memory and privacy**
11. `management/` inside the public repo, in a private folder outside it, or in Notion?
12. Language of the documents: English (token-friendly, your preference) with Hebrew only for names and copy?

**Simulated users**
13. How many personas and which? Proposed: a student stressed before the change period, a reservist, an English speaker, a brain sciences student, a "troll" trying to extract the prompt. Any you want to add?
14. Where do simulations run: a local server with a separate DB and Groq key (proposed), or a Vercel preview environment with its own env?
15. May the "searches not found" from the dashboard seed the personas' questions?

**Specific roles**
16. Social: which channels (WhatsApp, LinkedIn, Instagram, other), how often, what tone? Confirmed that you are the only publisher?
17. Designer: Flow for images as today, or also Canva or Figma (both need a connection)?
18. Security: code review only, or also operations (Vercel env, firewall, rate limits) and a red team on the chat?
19. QA: add Playwright for E2E (a dependency and longer CI), or stay with node tests and the built-in browser?
20. Neuro CEO: is there a real person behind it (the future maintainer) the agent works with, or is it you for now?

**Names**
21. Keep the titles (President, CEO, VP) or plain role names (content editor, designer, tester)? It only affects the prompts, but grand titles make agents expand their authority.

## 8. Setup steps

1. Decide the answers to the questions and update this document.
2. `management/` with a roadmap, an empty backlog per faculty, a decision log, and the first 5 personas.
3. `.claude/agents/` with the nine roles (thin wrappers over ECC agents), and the `/board` command.
4. `scripts/simulate.mjs`, the chat caps as env overrides for previews, and the local-server procedure in `management/simulations/README.md` (`.claude/launch.json` is gitignored and machine-specific).
5. First board meeting on the next weekly report; output: a prioritized CS backlog and the list of content missing for neuro.
6. After two weeks: check what was useful and what was theater, and cut roles if needed.
