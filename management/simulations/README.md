# Simulations

One folder per run, named `YYYY-MM-DD-<label>/`, holding the transcripts and `grades.md`.

## How a run works

1. Target: a Vercel preview deployment whose Preview env has its own `DATABASE_URL`, `GROQ_API_KEY` and `CHAT_SALT` (never the production values), or `http://localhost:<port>` on the desktop with the same separate env. Production is never a target: it is capped at 150 chat messages a day and its analytics would be polluted.
2. `node scripts/simulate.mjs --target <url> --persona <id|all> --out management/simulations/<run>/` (script planned; item in `BACKLOG.md`). It sends each persona's seed questions, one fresh conversation per question unless the persona says otherwise, and writes one transcript file per persona.
3. QA grades every answer in `grades.md`: `answered`, `not-answered`, `invented-fact`, `broke-character`, `blocked`, `error`. An `invented-fact` grade needs the fact and the official source that contradicts it.
4. Before a release, the same run goes against the old and the new version; the comparison, not the absolute score, is what the board reads.
5. Security reads the troll transcript and files a bug for every success.

## What a run never contains

Real student messages, group links, phone numbers, or the production salt and keys. Transcripts are synthetic by construction.
