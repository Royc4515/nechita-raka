import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { contentPlaceholders, fillText, loadContent, loadEnglish } from "../../faculties/content.js";
import { FACULTIES, validateFaculty } from "../../faculties/index.js";

const { cs, neuro } = FACULTIES;
const SHARED = ["shared/data.js", "shared/data.en.js"].map((f) => readFileSync(new URL(`../../${f}`, import.meta.url), "utf8")).join("\n");
const USED = [...new Set([...SHARED.matchAll(/\{fx:([A-Za-z]+)\}/g)].map((m) => m[1]))];
const textOf = (value) => JSON.stringify(value);

test("every {fx:name} the shared content uses is worded by both faculties, in Hebrew and English", () => {
  assert.ok(USED.length >= 7, "the shared content uses the phrases");
  for (const faculty of [cs, neuro]) {
    const values = contentPlaceholders(faculty);
    for (const name of USED) {
      assert.equal(typeof values.he[`fx:${name}`], "string", `${faculty.id} lacks the phrase ${name} (he)`);
      assert.equal(typeof values.en[`fx:${name}`], "string", `${faculty.id} lacks the phrase ${name} (en)`);
    }
  }
});

test("a phrase the manifest lacks fails with its name, and malformed phrases are rejected", () => {
  assert.throws(() => fillText("x {fx:nope}", contentPlaceholders(cs).he), /no "nope"/);
  assert.equal(fillText("x {fx:microwaves}y", { "fx:microwaves": "" }), "x y");
  const withPhrases = (phrases) => validateFaculty({ ...structuredClone(cs), content: { ...cs.content, phrases } });
  assert.throws(() => withPhrases([]), /must be an object/);
  assert.throws(() => withPhrases({ a1: { he: "x", en: "y" } }), /letters only/);
  assert.throws(() => withPhrases({ a: { he: "x" } }), /needs he and en/);
});

test("the CS sentences are unchanged and neuro says nothing about CS in the shared tips and FAQ", () => {
  const csText = textOf(loadContent(cs));
  for (const kept of ["המזכירות של המחלקה למדעי המחשב בבניין 503, קומה 1", "של מדמ\\\"ח, של החונכים", "במדעי המחשב בדרך כלל לא בודקים נוכחות", "לסטודנטים במדמ\\\"ח הכי קרוב בדרך כלל המיקרוגל בבניין 216", "cs.biu.ac.il/he/node/3"]) {
    assert.ok(csText.includes(kept), `CS keeps: ${kept}`);
  }
  const neuroData = loadContent(neuro);
  const shared = textOf({ guides: neuroData.guides.filter((g) => ["reserves", "first-week", "food"].includes(g.id)), faq: neuroData.faq.filter((q) => /כיתה|בניין|מיקרוגל|להיעדר/.test(q.q)) });
  assert.ok(!/503|מדמ\\"ח|cs\.biu|מדעי המחשב בדרך כלל|מרחב הלמידה של/.test(shared), "no CS wording");
  assert.ok(shared.includes("901") && shared.includes("gondabrain.biu.ac.il/directions"), "neuro's own building and source");
  const english = textOf(loadEnglish(neuro));
  assert.ok(!/CS students|CS learning space|CS courses usually|Computer Science department office/.test(english), "the neuro English file carries no CS sentence");
});
