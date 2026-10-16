// Proves the content split changed nothing: the merged content (faculties/content.js) is deep-equal to
// the single data.js of a git ref, evaluated the same way, and the merged English has the same ui and
// the same content pairs. Usage: node scripts/compare-content.mjs [ref]   (default origin/main)
// Exit code 1 on any difference, with the section and the first differing entry.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { evalScript, loadContent, loadEnglish } from "../faculties/content.js";

const ref = process.argv[2] || "origin/main";
const show = (path) => execFileSync("git", ["show", `${ref}:${path}`], { encoding: "utf8" });
// Objects evaluated in a vm sandbox have that sandbox's prototypes; cloning makes them plain for deepStrictEqual.
const plain = (value) => structuredClone(value);

const before = plain(evalScript(show("data.js"), "SITE_DATA", `${ref}:data.js`));
const after = plain(loadContent());
let failed = false;
const check = (label, fn) => {
  try {
    fn();
    console.log(`ok    ${label}`);
  } catch (err) {
    failed = true;
    console.log(`DIFF  ${label}\n${String(err.message).split("\n").slice(0, 40).join("\n")}`);
  }
};

check("top-level keys", () => assert.deepStrictEqual(Object.keys(after).sort(), Object.keys(before).sort()));
check("site", () => assert.deepStrictEqual(after.site, before.site));
check("featured", () => assert.deepStrictEqual(after.featured, before.featured));
check(`guides: ${before.guides.length}, same ids in the same order`, () => assert.deepStrictEqual(after.guides.map((g) => g.id), before.guides.map((g) => g.id)));
before.guides.forEach((g, i) => check(`guide ${g.id}`, () => assert.deepStrictEqual(after.guides[i], g)));
check(`categories: ${before.categories.length}, same ids in the same order`, () => assert.deepStrictEqual(after.categories.map((c) => c.id), before.categories.map((c) => c.id)));
before.categories.forEach((c, i) => check(`category ${c.id} (${c.items.length} items)`, () => assert.deepStrictEqual(after.categories[i], c)));
check(`calendar (${before.calendar.events.length} events, same order)`, () => assert.deepStrictEqual(after.calendar, before.calendar));
check(`faq (${before.faq.length} questions, same order)`, () => assert.deepStrictEqual(after.faq, before.faq));
check("the whole object", () => assert.deepStrictEqual(after, before));

const enBefore = plain(evalScript(show("data.en.js"), "SITE_EN", `${ref}:data.en.js`));
const enAfter = plain(loadEnglish());
const asKeys = (pairs) => pairs.map((p) => JSON.stringify(p)).sort();
check(`english ui (${enBefore.ui.length} pairs, same order)`, () => assert.deepStrictEqual(enAfter.ui, enBefore.ui));
check(`english content (${enBefore.content.length} pairs, same set; the page reads them as a lookup table)`, () => assert.deepStrictEqual(asKeys(enAfter.content), asKeys(enBefore.content)));
check("english content: no Hebrew text has two translations", () => assert.equal(new Set(enAfter.content.map(([he]) => he)).size, enAfter.content.length));

console.log(failed ? `\ncompare-content: the merged content differs from ${ref}` : `\ncompare-content: the merged content is deep-equal to ${ref}:data.js, and the English has the same pairs`);
process.exit(failed ? 1 : 0);
