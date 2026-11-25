# Plan: נחיתה רכה for more faculties

Date: 15.10.2026. Status: proposal, nothing decided yet. Reviewed against the code on branch `feat/yearbook-categories`.

The goal: the same site, the same code, the same general Bar-Ilan content, for neuroscience first and maybe more faculties later. Each faculty gets its own data, its own colors and its own pair of mascots (CS: ביט ובייט; neuro: נוי ורון). A fix or a feature is written once and reaches every faculty.

This document goes through what is faculty-specific today, every decision with its options and the reason for the pick, the phases and PRs, what neuro needs as content, the open questions only Roy can answer, and the risks.

## 1. Where the faculty hides today

The site was built for one faculty, so "CS" is not one object; it is spread across the code. This is the inventory, so nothing is missed.

| Area | Where | What is CS-specific |
| --- | --- | --- |
| Colors | `index.html` lines 39-68 (`:root` and dark mode), line 629 (memorial day override) | The blue accent set: `--accent`, `--accent-hover`, `--accent-ink`, `--accent-text`, `--accent-soft`, `--focus`. The memorial-day override proves the whole look follows these variables. |
| Mascots, server | `api/_lib/chat/prompt.js` | `PERSONAS` (names, grammar, character prompts), `DEFAULT_PERSONA`, the system prompt line "one of the two mascots of ... first-year Computer Science students". |
| Mascots, browser | `chat.js` lines 15-50 (names, avatars, greetings, "joined" lines), `peek.js` (names and bubble lines), `index.html` line 868 and 2092 (`MASCOT_FILES`, peek image), `chat.css` (one Bit/Byte rule) | Everything that names or pictures the two characters. |
| Mascot images | `assets/mascot/` | 7 poses per character plus avatar and peek image. |
| Mascot mentions in content | `data.js` (10 + 3 mentions), `data.en.js` (translations) | "שואלים את ביט ובייט בצ'אט" and similar. |
| Page identity | `scripts/prerender.mjs` lines 16-21 (`SITE_URL`, `OG_IMAGE`, `SITE_NAME`, `HOME_TITLE`), `index.html` lines 7-9 (title, description, canonical), `manifest.webmanifest` (name, description, theme_color, icons), `icons/` | Title, description, canonical address, OG image, PWA name and icons. |
| Hero and CS flavor | `index.html` line 729-730 (terminal animation `~/biu/cs/year-1`, "Hello, CS!"), line 2145 (easter egg "Hello, CS!"), `chat.js` line 167 (`~/year-1 › ask bit`), line 1091 (search synonyms for מדמ"ח) | Decorative, but it says CS. |
| Courses | `api/_lib/courses/model.js` (`CATALOG_FILE`, `YEARBOOK_FILE`, `CATEGORIES`), `courses-cs-2027.json`, `courses-yearbook.json`, `scripts/UPDATING-COURSES.md`, `vercel.json` `includeFiles` | The CS catalog scan, the CS yearbook mapping, the CS category list (years, clusters, AI track). |
| Content | `data.js` | Mixed. General Bar-Ilan: registration, payments, campus, bar-gate, shuttle, food (guide and 4 categories), exams, reserves, academic-vest, first-week, lemida-365, calendar, perks, most of `university`. CS: the `courses` guide, `cs-study-space`, the department contacts inside `help` and `campus-map`, the `materials` category (CS drive), all WhatsApp categories (`whatsapp`, `courses-a`, `wa-*`), the `featured` row, the `site` block (mentor, WhatsApp number), the FAQ entries about CS. |
| English | `data.en.js` | `ui` pairs are shared; `content` pairs follow the Hebrew content they translate. |
| Server config | env vars read in `api/` | `SITE_URL`, `GSC_SITE_URL`, `DATABASE_URL`, `ADMIN_EMAILS`, `GOOGLE_CLIENT_ID`, `REPORT_EMAIL`, `CHAT_SALT`, `CRON_SECRET`, `GROQ_API_KEY`, GCP identity for Search Console. All already per deployment. |
| Analytics | Neon tables `site_stats`, `site_visitors`, `chat_usage` (`api/_lib/stats`) | No faculty column; one database means one faculty. |
| Old address | `redirect/` and `.github/workflows/deploy.yml` (GitHub Pages) | Forwards old CS links. CS only, stays as is. |
| Tests | `api/_tests/*.test.js` | Several assert CS facts (course codes, categories, mascot names). |

What is already generic: the whole rendering, search, guides, calendar, schedule, chat pipeline, analytics, admin, weekly report, PWA, SEO prerender.

## 2. Decisions

Each one lists the options, the pick, and why. "Pick" is my recommendation; nothing is final until Roy says so.

### D1. Code strategy: fork, multi-deploy, or multi-tenant

Options:

1. **Fork the repo per faculty.** Fastest today. Every later fix (the schedule, the yearbook categories, the WhatsApp guard, a Groq model change) must be ported by hand to each copy. Within a semester the copies drift and the neuro site is behind.
2. **One repo, the faculty chosen at build time, one deployment per faculty.** The build reads `faculties/<id>/` and produces a site for that faculty only. Each faculty is a separate Vercel project on the same GitHub repo with its own env.
3. **One repo, one deployment, all faculties at runtime** (`/neuro/...` paths or hostnames). One domain, one database, one admin. Costs a faculty parameter in every API route, a faculty column in every table, N times the prerendered pages, path prefixes in every link, and a bigger blast radius: a bad deploy takes every faculty down.

Pick: **option 2.**

Why: the site is prerendered, so build-time selection is natural and free at runtime. The server side is already configured per deployment by env vars, so a second Vercel project gives neuro its own analytics, admin, chat history and Search Console without touching the schema. SEO is per faculty (own address, sitemap, OG image, Search Console property), and search is where much of the traffic comes from. Option 3 can be built later on top of option 2 if a single domain becomes important, because the manifest work is the same.

### D2. How the faculty is chosen

Pick: an environment variable `FACULTY` read by `scripts/build-public.mjs`, `scripts/check-data.mjs`, the tests and the server. Default `cs`, so the existing project and every local command behave exactly as today. On Vercel, the neuro project sets `FACULTY=neuro`.

Rejected: a CLI flag (Vercel builds run `npm run build` with no arguments), a branch per faculty (that is a fork in disguise).

### D3. Directory layout

```
faculties/
  cs/
    faculty.js        the manifest (section D4)
    data.js           CS content: guides, categories, featured, site block, CS FAQ
    data.en.js        English pairs for the CS content
    courses/
      catalog.json    today's courses-cs-2027.json
      yearbook.json   today's courses-yearbook.json
      README.md       today's scripts/UPDATING-COURSES.md
    mascot/           today's assets/mascot/
    icons/            today's icons/ (same icons, until someone draws faculty ones)
    og-image.jpg      today's assets/og-image-v2.jpg
  neuro/
    (same shape)
shared/
  data.js             general Bar-Ilan content: the guides and categories that are not faculty-specific, the calendar, the general FAQ
  data.en.js          English pairs for the shared content
```

Everything else (`index.html`, `chat.js`, `api/`, `scripts/`) stays where it is and becomes faculty-neutral. The moves use `git mv` so history is kept.

### D4. The manifest, `faculties/<id>/faculty.js`

One hand-editable file in the style of `data.js` (Hebrew comments per field). What it holds:

- `id`, Hebrew and English faculty names, the department's site and contact links.
- `brand`: site name as it appears in titles ("נחיתה רכה - מדעי המוח בר אילן"), home title, meta description, `siteUrl` default, OG image alt text, PWA short name, `themeColor`.
- `theme`: the accent set for light and for dark (six variables each). Nothing else: surfaces, text and borders stay shared so every faculty keeps the same quality of contrast.
- `mascots`: exactly two, each with `id`, Hebrew name, English name, `grammar` (masculine or feminine forms), `character` (the server prompt), greetings and the "joined" line (chat), peek lines (peek), and which one is the default. The two-persona structure stays because the chat UI (switch button), the stored persona and the grammar handling are built on it. For נוי ורון: רון takes the masculine grammar, נוי the feminine.
- `hero`: which hero variant to render (see D8) and its lines.
- `courses`: catalog file, yearbook file, the category list (id and label, in display order), the course-code prefix or filter, and the official source line shown with the data.
- `search`: faculty synonyms for the site search (today `index.html` line 1091 hardcodes מדמ"ח).
- `eggs`: faculty easter eggs (today "Hello, CS!"), on top of the shared ones.
- `content.order`: the order of guides and categories on the page, listing ids from both `shared/data.js` and `faculties/<id>/data.js`. This is how the merge knows where a faculty guide goes among the shared ones.

The browser gets a generated `public/faculty.js` (`window.FACULTY = {...}` with the browser-safe subset: names, mascots without the server prompts, theme, hero, search synonyms), loaded before `chat.js` and `peek.js`. The server imports the manifest directly. The prerender writes the theme variables, the title, the description, the canonical and the OG tags into the HTML.

### D5. Content split and merge

`data.js` is split into `shared/data.js` and `faculties/cs/data.js`, both in today's format. The merge happens in `loadData()` (`scripts/prerender.mjs`), which every build step and the chat's knowledge base already go through:

- `guides` and `categories`: the union of both files, ordered by `content.order` in the manifest. A faculty file may also override a shared entry by reusing its id, for the rare case where a shared guide needs a faculty paragraph (the `help` guide's department contacts, the `campus-map` department buildings). Override means replace the whole entry; no deep merge, so what you see in the file is what you get.
- `featured`, `site`: faculty only.
- `calendar`: shared events plus faculty events, sorted by date.
- `faq`: union.
- The browser today loads `data.js` directly. The build will write the merged result to `public/data.js`, so `index.html` keeps reading one file and the WhatsApp-hiding step keeps working unchanged.

`npm run check` validates the merged data and still reports the line in the file where an error is, by checking each source file separately first.

Rejected: a single `data.js` with a `faculty` tag per entry. It keeps one file but every neuro edit scrolls through CS content and vice versa, and a maintainer for neuro should not need to touch CS lines.

### D6. Theme

The accent variables already drive the whole look, including dark mode and the memorial-day override, so the theme is six values for light and six for dark, written by the prerender into the `:root` block. `manifest.webmanifest` is generated with the faculty's `theme_color` and name. Icons stay shared until faculty icons exist (the manifest points to `faculties/<id>/icons/`, so swapping later is a file change).

Neuro palette: to be chosen (section 5). Anything that reads as "brain" without becoming hard to read: a violet or a teal set, validated for contrast in both modes like the current blue.

### D7. Mascots

`api/_lib/chat/prompt.js`, `chat.js`, `peek.js`, `index.html` and `chat.css` read names, grammar, prompts, lines and image paths from the manifest. The image set per character stays the same seven poses plus avatar and peek image, so the page code does not change; the build copies `faculties/<id>/mascot/` to `public/assets/mascot/` under fixed names (`<id>-wave.webp` and so on), keyed by the mascot id.

The persona stored in the browser (`nr-chat-persona`) is the mascot id, so each site remembers its own characters and a CS visitor's choice never leaks into neuro (different origin anyway).

Mentions in content ("שואלים את ביט ובייט") move with the content: the CS ones live in `faculties/cs/data.js`; shared content that needs to mention the mascots uses a `{mascots}` placeholder the build fills from the manifest ("נוי ורון").

The prompt's faculty line ("first-year Computer Science students") comes from the manifest too, with the faculty name in English and Hebrew.

### D8. Hero and faculty flavor

The hero today is a fake terminal typing Python, which is pure CS. Options: keep the terminal for everyone (wrong for neuro), make the hero a generic illustration (loses the charm), or make the hero a variant chosen by the manifest. Pick: a variant. CS keeps `terminal`; neuro gets a new small variant, for example a line that draws itself like an EEG trace with the same three-line "soft landing" punchline, in the same CSS-only animation style, sized like the terminal so the layout is identical. The `chat-path` label (`~/year-1 › ask bit`) and easter eggs come from the manifest.

### D9. Courses

`api/_lib/courses/model.js` takes the catalog path, the yearbook path and the category list from the manifest instead of constants. The course page, the chat facts, the site search and `course-list.json` already go through this one module, so nothing else changes. The scan procedure (`UPDATING-COURSES.md`) moves next to each faculty's data, because the catalog query and the yearbook differ per faculty.

Neuro caveat: the brain sciences program takes courses from several departments (biology, psychology, CS, math), so its catalog scan is a filter over several department codes, and its yearbook maps courses to the program's own structure (year, track, elective pools). The model's category mechanism already supports a course in several categories, which neuro needs even more than CS.

Decided 15.10.2026: the neuro site serves **all brain sciences programs**, the single major and the combined tracks (with CS, with psychology, and the others). Consequences:

- The manifest gets a `tracks` list (id and label per program). The yearbook mapping carries the track as a category prefix (for example `single:1`, `cs:1`, `psy:2`), so the existing "a course in several categories" mechanism covers it without a new data shape.
- The courses page and the schedule get a track selector, remembered in the browser like the theme and the persona. The chat reads it from the request and filters course facts to that track; with no selection it answers for all tracks and says which one a fact belongs to.
- Shared content that differs by track (which secretariat, which groups, which building) lives as per-track variants in `faculties/neuro/data.js`, chosen by the same selector, so a combined-CS student sees CS contacts alongside neuro ones.
- The catalog scan covers every department that teaches into any of the tracks; the yearbook mapping is the source of truth for which course belongs to which track.

### D10. Deployment and infrastructure

- **Vercel**: a second project, `nechita-raka-neuro`, connected to the same GitHub repo, with `FACULTY=neuro` and its own env. Vercel supports several projects on one repo. An "Ignored Build Step" can skip a neuro deploy when a push only touches `faculties/cs/`, and vice versa; nice to have, not required.
- `vercel.json`: `includeFiles` for the functions becomes `{shared/**,faculties/**}` (the functions need the data and the courses files; including both faculties costs a few MB and avoids a per-faculty `vercel.json`).
- **Database**: a separate Neon database per faculty (a second database in the same Neon project is enough; no schema change, no faculty column). Analytics, chat usage and the admin dashboard stay faculty-pure.
- **Groq**: a separate API key per faculty. The free tier's rate limits are per key; one shared key would let a busy day on one site throttle the other.
- **Google sign-in for the admin**: either a second OAuth client or the same client with the new origin added. Pick the same client plus origin (one thing to manage); `ADMIN_EMAILS` per project, so a neuro co-maintainer only sees neuro.
- **Search Console**: a property per address and `GSC_SITE_URL` per project. The Workload Identity setup is per Vercel project and needs the new project id added to the pool; documented in the README already.
- **Weekly report**: `REPORT_EMAIL` per project. Two mails a week to Roy, one per faculty, until there is a neuro maintainer.
- **CI**: the GitHub workflow runs check and tests once per faculty (a matrix over `FACULTY`). The GitHub Pages redirect stays CS only.

### D11. Addresses and the brand

Options: keep `*.vercel.app` addresses (CS stays at `nechita-raka.vercel.app`, neuro gets `nechita-raka-neuro.vercel.app`), or buy a domain and give each faculty a subdomain (`cs.`, `neuro.`) with a hub at the root listing faculties.

Pick: **keep the vercel.app addresses for the first neuro release**, decide on a domain after neuro has traffic. Moving CS off its current address costs rankings and breaks every link shared in WhatsApp; a domain is worth it only once there are two or three live faculties. The brand "נחיתה רכה" stays the umbrella; the faculty appears in the site name and the title ("נחיתה רכה - מדעי המוח בר אילן").

### D12. `index.html` stays one file

`index.html` is 2,778 lines of markup, CSS and JS. Splitting it into components is a separate project and not needed for faculties: the prerender already injects content into it, and the manifest injection follows the same path. Rule for this work: nothing faculty-specific is added to `index.html`; it reads `window.FACULTY` or gets values injected.

### D13. Tests

Tests that assert CS facts (course codes, category labels, mascot names) are parametrized by the manifest, so they read the expected values from `faculties/<id>/` and run per faculty. A new test asserts the manifest's shape (two mascots, one masculine and one feminine, six theme values per mode, every file it points to exists). `npm test` runs for `FACULTY=cs` by default and CI runs both.

### D14. Documentation

`README.md` gets one section about faculties and the manifest, and a line per faculty pointing to `faculties/<id>/README.md` (how to edit that faculty's content and courses, who maintains it). The CS README content that is about the courses scan moves under `faculties/cs/courses/`.

## 3. Phases and PRs

Each PR leaves the CS site unchanged and deployable. The order is chosen so the riskiest refactor (the content split) happens after the manifest exists and the tests cover it.

| PR | Scope | Files touched (main ones) | Done when |
| --- | --- | --- | --- |
| 1. Manifest, theme, mascots | Create `faculties/cs/faculty.js`; build writes `public/faculty.js`; prerender injects title, description, canonical, OG, theme; chat, peek, prompt and `index.html` read the manifest; move `assets/mascot/` and the OG image under `faculties/cs/`. | `scripts/build-public.mjs`, `scripts/prerender.mjs`, `index.html`, `chat.js`, `peek.js`, `chat.css`, `api/_lib/chat/prompt.js`, tests | Build and tests pass; the site looks and reads exactly as before in light and dark; a diff of `public/` before and after shows only the new `faculty.js` and the moved assets. |
| 2. Content split | `git mv data.js shared/data.js`, extract CS entries to `faculties/cs/data.js`, same for English; `content.order` in the manifest; `loadData()` merges; `check-data.mjs` reports per file; the build writes merged `public/data.js`. | `shared/`, `faculties/cs/`, `scripts/prerender.mjs`, `scripts/check-data.mjs`, README | Merged output is byte-identical to today's `data.js` in content (order of guides and categories, every item); the WhatsApp guard still passes. |
| 3. Courses and flavor | Model reads catalog, yearbook and categories from the manifest; move the CS course files and the scan README; hero variant mechanism with `terminal` as the only variant; search synonyms and easter eggs from the manifest. | `api/_lib/courses/model.js`, `faculties/cs/courses/`, `index.html`, tests, `vercel.json` | Course page, chat course facts and search unchanged; tests pass. |
| 4. Per-faculty build and CI | `FACULTY` env var everywhere, tests parametrized, CI matrix, manifest shape test, README section. Create `faculties/neuro/` as a copy of CS with placeholder names and the CS palette, so the pipeline is exercised end to end. | `scripts/`, `.github/workflows/`, `api/_tests/`, `faculties/neuro/` | `FACULTY=neuro npm run build` produces a site; CI runs both. |
| 5. Neuro project on Vercel | Create the Vercel project from the same repo, env vars, Neon database, Groq key, OAuth origin, Search Console property and WIF, `REPORT_EMAIL`. | Vercel, Neon, Google Cloud | `nechita-raka-neuro.vercel.app` serves the placeholder; chat answers; admin logs in; the daily crons run without error. |
| 6. Neuro content | Real `faculties/neuro/data.js` and English, the theme, נוי ורון prompts, lines and images, the hero variant, the catalog scan and yearbook mapping, the department contacts, WhatsApp groups, the mentor block. | `faculties/neuro/` only, plus the hero variant in `index.html` | A neuro student can use the site the way a CS student uses the CS one; `npm run check` is clean; the chat answers neuro questions from the facts. |
| 7. Launch | `noindex` off for neuro, share link with `?src=wa`, Search Console submit, announce in the neuro groups. | `faculties/neuro/`, robots | Indexed, traffic shows in the neuro admin. |

Effort, roughly: PRs 1 to 4 are the code work, about one focused session each, with PR 2 the longest because of the content audit. PR 5 is an hour of console work. PR 6 is mostly data gathering and depends on the open questions below. A third faculty after that is PR 5 and PR 6 only.

## 4. What neuro needs as content

Nothing of this exists in the repo yet. Each line is a data-gathering task, not a code task.

- The exact program: Bar-Ilan's brain sciences BSc (which track, which department runs it, the yearbook for תשפ"ז).
- The catalog scan: which department codes carry the program's courses, and the yearbook mapping of courses to year and pool.
- Department contacts: secretariat email and phone, the department site, office location and hours.
- Study spaces and buildings neuro students actually use (the Gonda building 901 is already mentioned in the CS campus guide).
- WhatsApp groups: year, courses, reservists, and who owns the links.
- Drive or shared materials, if the program has one.
- Program-specific rules: attendance, lab courses, prerequisites that differ from CS, whether reserve duty alternative assessment applies (the CS guide notes STEM exceptions).
- The mentor block: who is the "רועי" of the neuro site (name, WhatsApp, LinkedIn), and whether the chat should mention a mentor at all.
- נוי ורון: personalities (two voices that contrast like Bit and Byte), what they study and like, how they tease each other; the image set in the same seven poses plus avatar and peek, with the Flow characters saved for consistency.
- The palette and the OG image.
- The English names of the mascots and the English title line.

## 5. Decisions taken on 15.10.2026

| Topic | Decision |
| --- | --- |
| Code strategy | One repo, faculty chosen at build time, one Vercel project per faculty (D1, D2). |
| Addresses | Keep the vercel.app addresses for now; domain decision after neuro has traffic (D11). |
| Neuro program | All brain sciences programs: single major and the combined tracks (see D9, tracks). |
| Neuro mentor | Roy, same site block and private WhatsApp buttons as CS. |
| Mascot voices | רון masculine, נוי feminine, mirroring Bit and Byte. |
| Neuro palette | Violet, validated for contrast in light and dark. |
| Groq | A second key on the same account. To confirm with Groq that limits are per key. |
| Maintainer | Roy for now; admin and weekly report stay his. |

Still open: which faculties might come after neuro (decides whether the hero gets a generic variant now).

## 5a. The original questions (kept for the record)

1. **Which neuro program exactly**, and is there a published yearbook like the CS one? This decides whether PR 6 reuses the course model as is or needs a different category structure.
2. **Who maintains neuro?** If someone else, `ADMIN_EMAILS` and `REPORT_EMAIL` for that project are theirs, and `faculties/neuro/README.md` is written for them. If Roy alone, two weekly mails are fine.
3. **Mentor on the neuro site**: Roy, someone else, or none? It changes the `site` block, the chat's "ask Roy" fallback and the private-WhatsApp buttons.
4. **Mascot gender split**: the plan gives רון the masculine voice and נוי the feminine, mirroring Bit and Byte. Confirm the names and the split, and their English spellings (Noi and Ron).
5. **Palette direction** for neuro: violet, teal, or something else. One sentence is enough; the exact values are picked for contrast.
6. **Addresses**: agree to keep `nechita-raka.vercel.app` for CS and `nechita-raka-neuro.vercel.app` for neuro for now, with a domain decision later?
7. **Groq**: a second key under the same Groq account, or a separate account?
8. **Which faculties after neuro**, if already known. It does not change the design, but it decides whether the hero should get a cheaper "generic" variant now so a third faculty does not need a new animation.

## 6. Risks and how the plan handles them

- **The content split breaks something silently.** The acceptance test for PR 2 is a byte-level comparison of the merged data against today's `data.js`, plus the existing checker and the WhatsApp guard.
- **A faculty bundle ships the other faculty's data.** The build copies only the selected faculty's folder into `public/`; a build-time guard fails if `public/` contains another faculty's id or mascot names, the same way the WhatsApp guard works today.
- **Two Vercel projects, one repo, double builds.** Acceptable; builds take under a minute. Ignored Build Step can cut it later.
- **Drift between faculties' content quality.** Shared content is edited once. Faculty content has a maintainer per faculty and the checker runs for every faculty in CI.
- **The chat's character prompt is per faculty but the rules are shared.** The rules (limits, output format, reserve-duty tone) stay in code, so a safety fix reaches every faculty; only the persona text is data.
- **Neon and Groq free tiers.** A second database and a second key stay inside free limits at the current traffic; the admin dashboard shows if that changes.
