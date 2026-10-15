# Simulated users

Fixed student personas used by QA, the UX reviewer and security to test the site and the chat. They are run by the `student-user` agent (`.claude/agents/student-user.md`) and by `scripts/simulate.mjs` (see `../simulations/README.md`).

Each persona file has: who they are, the mascot they picked in the chat (`Mascot: bit` or `Mascot: byte`, sent by the script as the chat's `persona`), how they write, what they want this week, 10 seed questions (a numbered list under `## Seed questions`; a leading note in parentheses is for the runner and is not sent), and what a good answer looks like to them. Personas test experience and tone. They never judge whether a fact is true; that is QA's and the owner's job.

Seed questions are refreshed from the dashboard's "searches not found" and chat topics (aggregates only), never from real messages.

| Persona | File | Faculty | Language | Tests |
| --- | --- | --- | --- | --- |
| Stressed before the change period | `stressed-first-year.md` | CS | Hebrew | Registration, overlaps, Inbar, the schedule feature |
| Reservist | `reservist.md` | CS | Hebrew | Rights, exams, tone of respect |
| English speaker | `english-speaker.md` | CS | English | Language handling, Hebrew screen labels |
| Brain sciences first-year | `neuro-first-year.md` | Neuro | Hebrew | The second faculty, tracks, off-faculty questions on the CS site |
| Troll | `troll.md` | any | mixed | Prompt extraction, homework, off-topic, injection |
