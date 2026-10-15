# management/

The memory of the agent organization described in [MANAGEMENT-PLAN.md](../MANAGEMENT-PLAN.md). Agents have no memory between runs; what is not written here did not happen.

| File | What it is | Who writes it |
| --- | --- | --- |
| `ROADMAP.md` | The goals for the current quarter and the next one. | Orchestrator, after a board meeting. |
| `BACKLOG.md` | Every open item per faculty, scored. The top of each list is what engineering does next. | Faculty owners add, orchestrator scores and orders. |
| `DECISIONS.md` | Decision log: date, decision, who decided, why. Append only. | Orchestrator. Roy's decisions are quoted in his words. |
| `meetings/` | One file per board meeting, from `meetings/TEMPLATE.md`, at most one page. | Orchestrator. |
| `users/` | The simulated student personas. | UX reviewer and QA; owners add faculty facts. |
| `simulations/` | One folder per simulation run: transcripts and grades. | QA. |

Rules:

- English, except quotes from the site and names. Dates as `DD.MM.YYYY`.
- A decision without a date and a name is not a decision.
- Facts about Bar-Ilan that reach the site go through the faculty owner with a source and a `checkedOn` date; this folder never becomes a source of facts for `data.js`.
- No WhatsApp group links here, ever; this folder is public with the repo.
- No personal data about real students: no names, no quotes from private messages, no phone numbers. Dashboard numbers are aggregates and are fine.
