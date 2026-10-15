// Sends each persona's seed questions to a chat deployment, one fresh conversation per question,
// and writes one transcript per persona plus a grades sheet for QA.
// Run: node scripts/simulate.mjs --target <url> --persona <id|all> --out <dir> [--delay-ms 1000] [--limit N]
// Never against production: the target must be a preview deployment or localhost
// (management/simulations/README.md). No dependencies beyond Node's fetch.
// Env: VERCEL_AUTOMATION_BYPASS_SECRET (optional) gets a protected preview deployment to answer.
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { MIN_DELAY_MS, askOnce, assertNotProduction } from "./simulate/chat.mjs";
import { listPersonaIds, loadPersona } from "./simulate/personas.mjs";
import { gradeRows, gradesHeader, renderTranscript, tally } from "./simulate/transcript.mjs";

const USAGE = "usage: node scripts/simulate.mjs --target <url> --persona <id|all> --out <dir> [--delay-ms 1000] [--limit N]";

function readOptions(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      target: { type: "string" },
      persona: { type: "string" },
      out: { type: "string" },
      "delay-ms": { type: "string", default: String(MIN_DELAY_MS) },
      limit: { type: "string" },
    },
    strict: true,
  });
  if (!values.target || !values.persona || !values.out) throw new Error(USAGE);
  const delayMs = Number(values["delay-ms"]);
  if (!Number.isInteger(delayMs) || delayMs < MIN_DELAY_MS) throw new Error(`--delay-ms must be an integer of at least ${MIN_DELAY_MS}`);
  const limit = values.limit === undefined ? Infinity : Number(values.limit);
  if (limit !== Infinity && (!Number.isInteger(limit) || limit < 1)) throw new Error("--limit must be a positive integer");
  return { target: assertNotProduction(values.target).href, persona: values.persona, out: values.out, delayMs, limit };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Preview deployments sit behind Vercel Authentication; the project's bypass secret opens them to scripts. */
function bypassHeaders(env = process.env) {
  const secret = env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  return secret ? { "x-vercel-protection-bypass": secret } : {};
}

async function runPersona(persona, run, { delayMs, limit }) {
  const questions = persona.questions.slice(0, limit);
  const results = [];
  for (const [i, q] of questions.entries()) {
    if (i > 0) await sleep(delayMs);
    const reply = await askOnce(run.target, persona, q.text, { headers: bypassHeaders() });
    console.log(`[${persona.id}] ${q.n}/${questions.length} ${reply.outcome}${reply.detail ? ` (${reply.detail})` : ""}`);
    results.push({ n: q.n, input: q.text, note: q.note, ...reply });
  }
  return results;
}

async function main() {
  const options = readOptions(process.argv.slice(2));
  const run = { target: options.target, startedAt: new Date().toISOString() };
  const ids = options.persona === "all" ? listPersonaIds() : [options.persona];
  const personas = ids.map((id) => loadPersona(id));
  mkdirSync(options.out, { recursive: true });
  console.log(`target ${run.target}, personas ${ids.join(", ")}, output ${options.out}`);
  // One grades sheet per run: a rerun into the same folder starts it over, like the transcripts.
  const grades = join(options.out, "grades.md");
  writeFileSync(grades, gradesHeader(run) + "\n");

  const totals = [];
  for (const [i, persona] of personas.entries()) {
    if (i > 0) await sleep(options.delayMs);
    const results = await runPersona(persona, run, options);
    writeFileSync(join(options.out, `${persona.id}.md`), renderTranscript(run, persona, results) + "\n");
    appendFileSync(grades, gradeRows(persona, results) + "\n");
    totals.push(...results);
  }

  const counts = tally(totals);
  console.log(`done: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  if (totals.length && counts.error === totals.length) console.log("warning: every request failed; is the target up and is /api/chat configured there?");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
