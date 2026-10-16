import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { BROWSER_FILES, contentFiles, evalScript, loadContent, loadEnglish, mergeContent, mergeEnglish, siteScript } from "../../faculties/content.js";
import { FACULTY } from "../../faculties/index.js";

const guide = (id, extra = {}) => ({ id, title: `t-${id}`, steps: [`s`], ...extra });
const category = (id) => ({ id, title: `c-${id}`, items: [] });
const ORDER = { guides: ["a", "b", "c"], categories: ["x", "y"] };
const shared = () => ({
  guides: [guide("a"), guide("b", { tips: ["shared"] })],
  categories: [category("x")],
  calendar: { title: "cal", terms: [], events: [{ date: "2026-10-11", title: "first" }, { date: "2027-01-01", title: "third" }] },
  faq: [{ q: "q1?", a: "a1" }, { q: "q2?", a: "a2" }],
});
const faculty = () => ({
  site: { author: "me" },
  featured: ["x1"],
  guides: [guide("c"), guide("b", { tips: ["faculty"] })],
  categories: [category("y")],
  calendar: { events: [{ date: "2026-12-01", title: "second" }, { date: "2026-10-11", title: "first, faculty" }] },
  faq: [{ q: "f-last?", a: "end" }, { q: "f-after-1?", a: "mid", after: "q1?" }, { q: "f-after-1b?", a: "mid2", after: "q1?" }],
});

test("guides and categories are the union in the manifest's order, a faculty id replacing the shared one whole", () => {
  const merged = mergeContent(shared(), faculty(), ORDER);
  assert.deepEqual(merged.guides.map((g) => g.id), ["a", "b", "c"]);
  assert.deepEqual(merged.guides[1].tips, ["faculty"], "no deep merge: the faculty entry wins as a whole");
  assert.deepEqual(merged.categories.map((c) => c.id), ["x", "y"]);
  assert.deepEqual(merged.site, { author: "me" });
  assert.deepEqual(merged.featured, ["x1"]);
});

test("the calendar keeps the shared fields and sorts shared plus faculty events by date, shared first on a tie", () => {
  const { calendar } = mergeContent(shared(), faculty(), ORDER);
  assert.equal(calendar.title, "cal");
  assert.deepEqual(calendar.events.map((e) => e.title), ["first", "first, faculty", "second", "third"]);
});

test("faculty FAQ entries go after the shared question they name, in file order, or at the end; `after` is not published", () => {
  const { faq } = mergeContent(shared(), faculty(), ORDER);
  assert.deepEqual(faq.map((f) => f.q), ["q1?", "f-after-1?", "f-after-1b?", "q2?", "f-last?"]);
  assert.ok(faq.every((f) => !("after" in f)));
});

test("the merge names what is wrong instead of dropping content", () => {
  const cases = [
    [(s, f, o) => { o.guides = ["a", "b"]; }, /"c" must be added to content\.order\.guides/],
    [(s, f, o) => { o.guides = ["a", "b", "c", "nope"]; }, /names "nope"/],
    [(s, f, o) => { o.guides = ["a", "a", "b", "c"]; }, /twice/],
    [(s) => { s.site = {}; }, /shared\/data\.js has fields/],
    [(s, f) => { delete f.site; }, /no site block/],
    [(s, f) => { f.faq[1].after = "missing?"; }, /no shared question has that exact text/],
    [(s, f) => { f.calendar.title = "x"; }, /faculty's calendar has fields/],
    [(s, f) => { f.guids = []; }, /guids/],
  ];
  for (const [mutate, expected] of cases) {
    const [s, f, o] = [shared(), faculty(), structuredClone(ORDER)];
    mutate(s, f, o);
    assert.throws(() => mergeContent(s, f, o), expected);
  }
});

test("English pairs are the union, shared first, and unknown fields are refused", () => {
  const merged = mergeEnglish({ ui: [["a", "A"]], content: [["b", "B"]] }, { content: [["c", "C"]] });
  assert.deepEqual(merged, { ui: [["a", "A"]], content: [["b", "B"], ["c", "C"]] });
  assert.throws(() => mergeEnglish({ ui: [], content: [], extra: [] }, {}), /extra/);
});

test("siteScript writes a script the browser evaluates back to the same data, with strings in backticks", () => {
  const data = { s: "plain", tricky: "back`tick ${not} \\slash\nline\r\u0001", n: 3, t: true, nil: null, list: [1, "two", { k: "v" }], empty: [], obj: {}, "odd key": 1 };
  const text = siteScript("SITE_DATA", data);
  assert.ok(text.startsWith("window.SITE_DATA = {"));
  assert.match(text, /s: `plain`,/, "strings are template literals, so the WhatsApp-hiding step still finds them by their backtick");
  // structuredClone: objects from the vm sandbox have its prototypes, which deepStrictEqual would compare.
  assert.deepEqual(structuredClone(evalScript(text, "SITE_DATA", "test")), data);
  assert.throws(() => siteScript("SITE_DATA", { f: () => 1 }), /cannot write a function/);
  assert.equal(BROWSER_FILES.SITE_DATA, "data.js");
});

test("the CS content merges and is complete: every ordered id exists and every featured id is an item", () => {
  const data = loadContent(FACULTY);
  assert.deepEqual(data.guides.map((g) => g.id), FACULTY.content.order.guides);
  assert.deepEqual(data.categories.map((c) => c.id), FACULTY.content.order.categories);
  const items = new Set(data.categories.flatMap((c) => c.items.map((i) => i.id)));
  for (const id of data.featured) assert.ok(items.has(id), `featured "${id}" is an item`);
  assert.ok(data.site.academicYear, "the site block comes from the faculty");
  assert.ok(data.faq.length >= 40 && data.faq.every((f) => !("after" in f)));
  assert.deepEqual(contentFiles(FACULTY).data, ["shared/data.js", "faculties/cs/data.js"]);
  const english = loadEnglish(FACULTY);
  assert.ok(english.ui.length > 100 && english.content.length > 100);
});

test("the merged script survives the build's WhatsApp hiding step", () => {
  const text = siteScript("SITE_DATA", { items: [{ url: "https://chat.whatsapp.com/abc" }] });
  const WA = "https://chat.whatsapp.com/";
  const hidden = `var __wa = ["https:", "", ["chat", "whatsapp", "com"].join("."), ""].join("/");\n${text.replaceAll("`" + WA, "`${__wa}")}`;
  assert.ok(!hidden.includes("chat.whatsapp.com"));
  const sandbox = { window: {} };
  vm.runInNewContext(hidden, sandbox);
  assert.equal(sandbox.window.SITE_DATA.items[0].url, "https://chat.whatsapp.com/abc");
});
