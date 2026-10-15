// Reads the simulated-student personas in management/users/<id>.md for scripts/simulate.mjs.
// A persona file declares `Mascot: bit|byte` and `Language: ...`, and lists its seed questions as
// a numbered list under "## Seed questions". A question may start with a "(note)" for the runner;
// the note is kept in the transcript and is not sent.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const USERS_DIR = "management/users";
const PERSONA_ID = /^[a-z0-9-]{1,60}$/;
const SEED_HEADING = /^## Seed questions[ \t]*\r?$/m;
const NEXT_HEADING = /^## /m;
const NUMBERED = /^(\d+)\.\s+(.+?)\s*$/;
const LEADING_NOTE = /^\((.+?)\)\s+(.+)$/;

/** { id, mascot, language, questions: [{ n, text, note? }] } or throws with the file's problem. */
export function parsePersona(id, markdown) {
  const mascot = markdown.match(/^Mascot:\s*(bit|byte)\b/m)?.[1];
  if (!mascot) throw new Error(`${id}: no "Mascot: bit" or "Mascot: byte" line`);
  const language = markdown.match(/\bLanguage:\s*([A-Za-z]+)/)?.[1]?.toLowerCase() ?? "hebrew";
  const [, after] = markdown.split(SEED_HEADING);
  if (after === undefined) throw new Error(`${id}: no "## Seed questions" section`);
  const questions = after
    .split(NEXT_HEADING)[0]
    .split("\n")
    .map((line) => line.match(NUMBERED))
    .filter(Boolean)
    .map(([, n, body]) => {
      const noted = body.match(LEADING_NOTE);
      return noted ? { n: Number(n), text: noted[2], note: noted[1] } : { n: Number(n), text: body };
    });
  if (!questions.length) throw new Error(`${id}: no numbered questions under "## Seed questions"`);
  return { id, mascot, language, questions };
}

export function loadPersona(id, dir = USERS_DIR) {
  if (!PERSONA_ID.test(id)) throw new Error(`persona id must be lowercase letters, digits and dashes, got "${id}"`);
  return parsePersona(id, readFileSync(join(dir, `${id}.md`), "utf8"));
}

/** Every persona file in the folder, README excluded, in name order. */
export function listPersonaIds(dir = USERS_DIR) {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md") && name !== "README.md")
    .map((name) => name.slice(0, -3))
    .sort();
}
