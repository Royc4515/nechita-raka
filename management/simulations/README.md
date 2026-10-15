# Simulations

One folder per run, named `YYYY-MM-DD-<label>/`, holding the transcripts and `grades.md`.

## How a run works

1. Target: a Vercel preview deployment whose Preview env has its own `DATABASE_URL`, `GROQ_API_KEY` and `CHAT_SALT` (never the production values), or `http://localhost:<port>` on the desktop with the same separate env (see "Running the API locally" below). Production is never a target: it is capped at 150 chat messages a day and its analytics would be polluted. The script refuses `nechita-raka.vercel.app`.
2. `node scripts/simulate.mjs --target <url> --persona <id|all> --out management/simulations/<run>/`. It sends each persona's seed questions, one fresh conversation per question, 20 seconds apart by default (see "Pacing" below), and writes one transcript file per persona (`<id>.md`: input, answer, mascot, sources, outcome) plus `grades.md` with one empty row per answer. The outcome is what the server returned: `ok`, `rate_limited`, `daily_cap`, `blocked` (the chat declined in character), or `error` (network, timeout, 4xx/5xx). A 503 `busy` is retried twice, a minute apart, before it counts as an `error`; the transcript (not the grades sheet) notes a retry that then succeeded.
3. QA grades every answer in `grades.md`: `answered`, `not-answered`, `invented-fact`, `broke-character`, `blocked`, `error`. An `invented-fact` grade needs the fact and the official source that contradicts it.
4. Before a release, the same run goes against the old and the new version; the comparison, not the absolute score, is what the board reads.
5. Security reads the troll transcript and files a bug for every success.

A full run is 5 personas × 10 questions = 50 messages from one IP. The site's defaults (150 a day for the site, 15 a day per visitor) would answer `rate_limited` from the 16th message, so the target's Preview env raises both caps (`CHAT_PER_VISITOR_DAILY`, `CHAT_GLOBAL_DAILY`, table below). Without the overrides, `--limit <n>` sends only the first n questions per persona.

Options: `--limit <n>` (first n questions per persona), `--delay-ms <ms>` (default 20000, at least 1000). A question in a persona file that starts with a note in parentheses, like the troll's injected-history case, is sent without the note and the note is kept in the transcript. The troll's burst and malformed-message cases (questions 9 and 10) are sent as the plain text in the file; the `student-user` agent or a manual run covers the real burst.

## Target: a preview deployment

Every push to a branch gets a preview URL (`https://nechita-raka-git-<branch>-<account>.vercel.app`, shown on the PR). Use that branch URL: the script refuses only `nechita-raka.vercel.app`, and a production deployment's unique URL (`nechita-raka-<hash>-<account>.vercel.app`) runs with the production env. Before the first run, in Vercel > Settings > Environment Variables, set for the **Preview** environment only:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | A separate Neon database (a second project or a branch of the production one), never the production URL. |
| `GROQ_API_KEY` | A separate Groq key, so a run cannot eat production's free quota. |
| `CHAT_SALT` | Any random string of 64 characters, different from production. |
| `CHAT_GLOBAL_DAILY` | The site-wide daily cap for previews, e.g. `1000`. Production leaves it unset (150). |
| `CHAT_PER_VISITOR_DAILY` | The per-IP daily cap for previews, e.g. `500`, so one machine can send a full run. Production leaves it unset (15). |

An environment variable applies only to deployments built after it was set or changed: a deployment reads the env at build time. After editing Preview variables, redeploy the branch before the run (push an empty commit, or "Redeploy" on the deployment in the Vercel dashboard). The baseline of 15.10.2026 first ran against PR #70's preview, which predated the cap variables, and the default 15-per-visitor cap stopped it at message 14.

Preview deployments are protected by Vercel Authentication by default, so a script gets a 401. Either turn protection off for previews (Settings > Deployment Protection) or create a bypass secret there ("Protection Bypass for Automation"); the script sends it when it is in the environment:

```bash
VERCEL_AUTOMATION_BYPASS_SECRET=<secret> node scripts/simulate.mjs --target https://nechita-raka-git-<branch>-<account>.vercel.app --persona all --out management/simulations/2026-10-20-baseline/
```

Without protection, the same command without the variable. On Windows PowerShell set the variable first (`$env:VERCEL_AUTOMATION_BYPASS_SECRET = "<secret>"`).

## Pacing

Every message carries the whole system prompt, about 8,000 characters of Hebrew, so a run spends the Groq key's per-minute token budget fast: at one second between questions both models answered 429 after about seven messages and the chat returned 503 `busy` (baseline attempt of 15.10.2026). The default `--delay-ms 20000` is what the full baseline ran with, without a single `busy`; a full run of 50 messages takes about 17 minutes. Keep the default unless the target is `localhost` with a key nobody else uses. When a `busy` still happens, the script waits a minute and resends that question, up to twice, before it records an `error`.

## Running the API locally

The `api/` functions are Vercel functions (Web-standard `POST` handlers listed in `vercel.json`); nothing in the repo serves them, and `python -m http.server` from the README serves only the static files. Locally they run through the Vercel CLI, which emulates the platform:

1. `npx vercel link` once, choosing the nechita-raka project (writes `.vercel/`, which is gitignored).
2. Give the **Development** environment in Vercel the same five variables as Preview above (tick Development next to Preview when creating them). `vercel dev` downloads Development variables by itself; they must never be the production values.
3. `npx vercel dev --listen 3000`, then in a second terminal:

```bash
node scripts/simulate.mjs --target http://localhost:3000 --persona stressed-first-year --out management/simulations/2026-10-20-local/
```

`.claude/launch.json` is machine-specific and gitignored; if you want the Browser pane to start the server, add a `chat-local` entry there with `runtimeExecutable: "npx"`, `runtimeArgs: ["vercel", "dev", "--listen", "3000"]` and `port: 3000`.

## What a run never contains

Real student messages, group links, phone numbers, or the production salt and keys. Transcripts are synthetic by construction. The script writes every WhatsApp group link as `https://chat.whatsapp.com/[redacted]` (answers, questions, sources and error details alike); a transcript that still shows an invite code is a bug in `scripts/simulate/transcript.mjs`, not something to fix by hand. Keep `grades.md` and the transcripts; delete nothing from a run so two runs stay comparable.
