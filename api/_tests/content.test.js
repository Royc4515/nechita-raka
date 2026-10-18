import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { BROWSER_FILES, contentFiles, contentPlaceholders, evalScript, fillPlaceholders, fillText, loadContent, loadEnglish, mergeContent, mergeEnglish, siteScript } from "../../faculties/content.js";
import { FACULTIES, FACULTY, facultyPath } from "../../faculties/index.js";

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
  faq: [{ q: "f-last?", a: "end" }, { q: "f-after-1?", a: "mid", after: "q1?" }, { q: "f-after-1b?", a: "mid2", after: "q1?" }, { q: "f-before-1?", a: "first", before: "q1?" }, { q: "f-before-2?", a: "between", before: "q2?" }],
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

test("faculty FAQ entries go after (or before) the shared question they name, in file order, or at the end; `after` and `before` are not published", () => {
  const { faq } = mergeContent(shared(), faculty(), ORDER);
  assert.deepEqual(faq.map((f) => f.q), ["f-before-1?", "q1?", "f-after-1?", "f-after-1b?", "f-before-2?", "q2?", "f-last?"]);
  assert.ok(faq.every((f) => !("after" in f) && !("before" in f)));
});

test("{mascots} and {coursesFile} are filled from the manifest, in each language, and other braces are left alone", () => {
  const values = contentPlaceholders(FACULTIES.cs);
  assert.deepEqual(values, { he: { mascots: "ביט ובייט", coursesFile: FACULTIES.cs.courses.fileLabel }, en: { mascots: "Bit and Byte", coursesFile: FACULTIES.cs.courses.fileLabelEn } });
  assert.equal(contentPlaceholders(FACULTIES.neuro).he.mascots, "נוי ורון");
  assert.equal(fillText("שואלים את {mascots} על {coursesFile}, {n} פעמים", values.he), `שואלים את ביט ובייט על ${FACULTIES.cs.courses.fileLabel}, {n} פעמים`);
  assert.equal(fillText("x {mascots}", null), "x {mascots}", "no values: nothing changes");
  const nested = { a: ["{mascots}", { b: "{coursesFile}", n: 3 }], c: null };
  const filled = fillPlaceholders(nested, values.he);
  assert.deepEqual(filled, { a: ["ביט ובייט", { b: FACULTIES.cs.courses.fileLabel, n: 3 }], c: null });
  assert.notEqual(filled.a, nested.a, "a new object, the input untouched");
  assert.equal(nested.a[0], "{mascots}");
  // The merge fills the content and the pairs; the English side gets the English values.
  const s = shared();
  s.guides[0].tips = ["tip for {mascots} and {coursesFile}"];
  const merged = mergeContent(s, faculty(), ORDER, values);
  assert.deepEqual(merged.guides[0].tips, [`tip for ביט ובייט and ${FACULTIES.cs.courses.fileLabel}`]);
  assert.deepEqual(mergeContent(s, faculty(), ORDER).guides[0].tips, ["tip for {mascots} and {coursesFile}"], "without values the text stays");
  const english = mergeEnglish({ ui: [["{mascots} אומרים {n}", "{mascots} say {n}"]], content: [["{coursesFile}", "{coursesFile}"]] }, { content: [] }, values);
  assert.deepEqual(english.ui, [["ביט ובייט אומרים {n}", "Bit and Byte say {n}"]]);
  assert.deepEqual(english.content, [[FACULTIES.cs.courses.fileLabel, FACULTIES.cs.courses.fileLabelEn]]);
});

test("the merge names what is wrong instead of dropping content", () => {
  const cases = [
    [(s, f, o) => { o.guides = ["a", "b"]; }, /"c" must be added to content\.order\.guides/],
    [(s, f, o) => { o.guides = ["a", "b", "c", "nope"]; }, /names "nope"/],
    [(s, f, o) => { o.guides = ["a", "a", "b", "c"]; }, /twice/],
    [(s) => { s.site = {}; }, /shared\/data\.js has fields/],
    [(s, f) => { delete f.site; }, /no site block/],
    [(s, f) => { f.faq[1].after = "missing?"; }, /no shared question has that exact text/],
    [(s, f) => { f.faq[3].before = "missing?"; }, /says before: "missing\?", but no shared question/],
    [(s, f) => { f.faq[3].after = "q1?"; }, /both after and before/],
    [(s, f) => { f.calendar.title = "x"; }, /faculty's calendar has fields/],
    [(s, f) => { f.guids = []; }, /guids/],
    [(s) => { s.guides.push(guide("a")); }, /"a" appears twice in the same file/],
    [(s, f) => { f.categories.push(category("y")); }, /"y" appears twice in the same file/],
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
  assert.throws(() => siteScript("SITE_DATA", JSON.parse('{"__proto__": 1}')), /__proto__/);
  assert.equal(BROWSER_FILES.SITE_DATA, "data.js");
});

test("every Vercel function bundles the content files the loader reads and the course files the model reads, for every faculty", () => {
  const { functions } = JSON.parse(readFileSync("vercel.json", "utf8"));
  const globToRe = (glob) => new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*")}$`);
  // The env picks the faculty at runtime (one Vercel project per faculty), so the bundle must hold every faculty's files.
  const needed = Object.values(FACULTIES).flatMap((f) => [...contentFiles(f).data, facultyPath(f, f.courses.catalog), facultyPath(f, f.courses.yearbook)]);
  for (const [fn, { includeFiles }] of Object.entries(functions)) {
    const patterns = includeFiles.replace(/^\{|\}$/g, "").split(",").map(globToRe);
    for (const file of needed) assert.ok(patterns.some((re) => re.test(file)), `${fn} includes ${file}`);
  }
});

test("the active faculty's content merges and is complete: every ordered id exists and every featured id is an item", () => {
  const data = loadContent(FACULTY);
  assert.deepEqual(data.guides.map((g) => g.id), FACULTY.content.order.guides);
  assert.deepEqual(data.categories.map((c) => c.id), FACULTY.content.order.categories);
  const items = new Set(data.categories.flatMap((c) => c.items.map((i) => i.id)));
  for (const id of data.featured) assert.ok(items.has(id), `featured "${id}" is an item`);
  assert.ok(data.site.academicYear, "the site block comes from the faculty");
  assert.ok(data.faq.length >= 40 && data.faq.every((f) => !("after" in f)));
  assert.deepEqual(contentFiles(FACULTY).data, ["shared/data.js", `faculties/${FACULTY.id}/data.js`]);
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
