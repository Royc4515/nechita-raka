// Renders one persona's transcript and the grades sheet QA fills in (management/simulations/README.md).

/** The grade list from management/simulations/README.md, in its order. */
export const GRADES = ["answered", "not-answered", "invented-fact", "broke-character", "blocked", "error"];
export const OUTCOMES = ["ok", "rate_limited", "daily_cap", "blocked", "error"];

/** Counts per outcome, every outcome listed so the line reads the same in every run. */
export function tally(results) {
  return Object.fromEntries(OUTCOMES.map((o) => [o, results.filter((r) => r.outcome === o).length]));
}

const cell = (text) => String(text).replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();

/** One markdown file per persona: input, answer, mascot, sources and outcome for every question. */
export function renderTranscript({ target, startedAt }, persona, results) {
  const counts = tally(results);
  const lines = [
    `# Transcript: ${persona.id}`,
    "",
    `- Target: ${target}`,
    `- Run: ${startedAt}`,
    `- Mascot: ${persona.mascot}`,
    `- Language: ${persona.language}`,
    `- Outcomes: ${OUTCOMES.map((o) => `${o} ${counts[o]}`).join(", ")}`,
    "",
  ];
  for (const r of results) {
    lines.push(`## Question ${r.n}`, "", `- Input: ${r.input}`);
    if (r.note) lines.push(`- Note: ${r.note}`);
    lines.push(`- Mascot: ${persona.mascot}`, `- Outcome: ${r.outcome}${r.detail ? ` (${r.detail})` : ""}`);
    lines.push(`- Sources: ${r.sources.length ? r.sources.map((s) => `[${s.title}](${s.url})`).join(", ") : "none"}`);
    if (r.roy) lines.push("- Roy line: yes");
    lines.push("- Answer:", "", ...(r.answer ? r.answer.split("\n").map((l) => `> ${l}`) : ["> (no answer)"]), "");
  }
  return lines.join("\n");
}

export function gradesHeader({ target, startedAt }) {
  return [
    "# Grades",
    "",
    `Run: ${startedAt}. Target: ${target}.`,
    "",
    `One row per answer. Grade is one of: ${GRADES.map((g) => `\`${g}\``).join(", ")}. The outcome column is what the server returned; the grade is QA's call. An \`invented-fact\` grade needs the fact and the official source that contradicts it, in the note.`,
    "",
    "| Persona | # | Outcome | Grade | Note |",
    "|---|---|---|---|---|",
  ].join("\n");
}

/** Table rows for one persona, grade and note left empty for QA. */
export function gradeRows(persona, results) {
  const note = (r) => (r.outcome === "error" && r.detail ? ` ${cell(r.detail)}` : "");
  return results.map((r) => `| ${persona.id} | ${r.n} | ${r.outcome} | |${note(r)} |`).join("\n");
}
