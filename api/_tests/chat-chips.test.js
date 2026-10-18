import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadEnglish } from "../../faculties/content.js";
import { FACULTIES, validateFaculty } from "../../faculties/index.js";
import { browserFaculty } from "../../scripts/faculty-public.mjs";

const { cs, neuro } = FACULTIES;
const CS_CHIPS = ["מתי מתחילות הבחינות?", "איך משנים קורס באינ-בר?", "שכחתי סיסמה ללמדה", "מה עושים עם מבחן במילואים?", "באיזה חדר ההרצאה בהכנה למדעי המחשב?"];

test("CS keeps the five suggestion chips it always had, in order", () => {
  assert.deepEqual(cs.chat.suggestions, CS_CHIPS);
  assert.deepEqual(browserFaculty(cs).chat.suggestions, CS_CHIPS);
});

test("neuro's chips are about brain sciences and carry nothing of CS", () => {
  const chips = neuro.chat.suggestions;
  assert.equal(chips.length, 5);
  assert.ok(chips.some((c) => c.includes("מסלול")) && chips.some((c) => c.includes("901")) && chips.some((c) => c.includes("המחלקה השנייה")));
  assert.ok(!chips.some((c) => /מדעי המחשב|מדמ"ח|503/.test(c)));
  assert.deepEqual(browserFaculty(neuro).chat.suggestions, chips);
});

test("every chip has an English pair in its own faculty's build, and none is shipped to the other faculty", () => {
  for (const faculty of [cs, neuro]) {
    const keys = new Set(loadEnglish(faculty).ui.map(([he]) => he));
    for (const chip of faculty.chat.suggestions) assert.ok(keys.has(chip), `${faculty.id}: "${chip}" has no English pair`);
  }
  const csOnly = CS_CHIPS[4];
  assert.ok(!loadEnglish(neuro).ui.some(([he]) => he === csOnly), "the CS-only chip is not in the neuro English file");
});

test("the manifest's chat block is validated", () => {
  const withChat = (chat) => validateFaculty({ ...structuredClone(cs), chat });
  assert.throws(() => withChat(undefined), /chat.suggestions/);
  assert.throws(() => withChat({ suggestions: ["a", "b"] }), /three to eight/);
  assert.throws(() => withChat({ suggestions: ["a", "b", ""] }), /three to eight/);
  assert.throws(() => withChat({ suggestions: ["a", "b", "a"] }), /twice/);
});

test("chat.js reads its chips from the manifest, not from a list of its own", () => {
  const source = readFileSync(new URL("../../chat.js", import.meta.url), "utf8");
  assert.match(source, /FACULTY\.chat\.suggestions/);
  assert.doesNotMatch(source, /למדעי המחשב/);
});
