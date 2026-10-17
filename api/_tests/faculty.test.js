import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { DEFAULT_FACULTY, FACULTIES, FACULTY, HERO_VARIANTS, MASCOT_POSES, THEME_KEYS, facultyFile, facultyIdFrom, facultyPath, selectFaculty, validateFaculty } from "../../faculties/index.js";
import { loadContent } from "../../faculties/content.js";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { browserFaculty, copyFacultyAssets, facultyImageFiles, facultyImageTargets, facultyScript, nameStem, reserveDownload, webmanifest } from "../../scripts/faculty-public.mjs";

const clone = (value) => structuredClone(value);
const DARK_SPLIT_TEXT = "@media (prefers-color-scheme: dark)";
const cs = FACULTIES.cs;

test("the default faculty is cs and FACULTY picks a known one", () => {
  assert.equal(DEFAULT_FACULTY, "cs");
  assert.equal(facultyIdFrom({}), "cs");
  assert.equal(facultyIdFrom({ FACULTY: " cs " }), "cs");
  assert.equal(facultyIdFrom({ FACULTY: "" }), "cs");
  assert.throws(() => facultyIdFrom({ FACULTY: "neuro" }), /not a known faculty/);
  assert.throws(() => facultyIdFrom({ FACULTY: "__proto__" }), /not a known faculty/);
  assert.equal(selectFaculty({}).id, "cs");
  assert.equal(FACULTY.id, "cs");
});

test("the CS manifest has the shape every faculty needs", () => {
  assert.equal(validateFaculty(cs), cs);
  assert.equal(cs.mascots.length, 2);
  assert.deepEqual(cs.mascots.map((m) => m.gender).sort(), ["f", "m"]);
  assert.deepEqual(cs.mascots.map((m) => m.id), ["bit", "byte"]);
  assert.equal(cs.defaultMascot, "bit");
  for (const mode of ["light", "dark"]) {
    assert.deepEqual(Object.keys(cs.theme[mode]).sort(), [...THEME_KEYS].sort(), `theme.${mode} has the six accent values`);
    for (const key of THEME_KEYS) assert.match(cs.theme[mode][key], /^#[0-9a-f]{6}$/);
  }
  assert.equal(cs.site.url, "https://nechita-raka.vercel.app");
  assert.equal(cs.pwa.themeColor, cs.theme.light.accent);
});

test("every file the CS manifest points to exists", () => {
  const dir = `faculties/${cs.id}`;
  assert.ok(existsSync(`${dir}/${cs.site.ogImage.file}`), "the OG image");
  for (const m of cs.mascots) {
    assert.ok(existsSync(`${dir}/mascot/${m.files.avatar}`), `${m.id}: avatar`);
    assert.ok(existsSync(`${dir}/mascot/${m.files.peek}`), `${m.id}: peek image`);
    for (const pose of MASCOT_POSES) assert.ok(existsSync(`${dir}/mascot/${m.files.poses}-${pose}.webp`), `${m.id}: ${pose}`);
  }
});

test("validateFaculty names the broken field", () => {
  const cases = [
    [(f) => { f.mascots.pop(); }, /exactly two/],
    [(f) => { f.mascots[1].gender = "m"; }, /one masculine/],
    [(f) => { f.mascots[1].id = "bit"; }, /share an id/],
    [(f) => { f.defaultMascot = "nope"; }, /defaultMascot/],
    [(f) => { delete f.theme.dark.focus; }, /theme\.dark\.focus/],
    [(f) => { f.theme.light.accent = "blue"; }, /theme\.light\.accent/],
    [(f) => { f.site.url = "https://x.example/"; }, /site\.url/],
    [(f) => { f.site.ogImage.path = "../secret"; }, /ogImage\.path/],
    [(f) => { f.mascots[0].files.peek = "../x.webp"; }, /files\.peek/],
    [(f) => { f.mascots[0].files.avatar = "faculty.js"; }, /files\.avatar/],
    [(f) => { f.mascots[0].files.poses = "../mascot"; }, /files\.poses/],
    [(f) => { f.site.ogImage.file = "faculty.js"; }, /ogImage\.file/],
    [(f) => { f.site.url = "https://x\"><script>"; }, /site\.url/],
    [(f) => { delete f.mascots[0].poseWidths.laptop; }, /poseWidths\.laptop/],
    [(f) => { f.mascots[0].hellos = []; }, /hellos/],
    [(f) => { f.labels.chatPath = ""; }, /labels\.chatPath/],
    [(f) => { f.hero.variant = "eeg"; }, /hero\.variant/],
    [(f) => { f.hero.path = ""; }, /hero\.path/],
    [(f) => { f.hero.lines = []; }, /hero\.lines/],
    [(f) => { f.hero.lines[0].tokens = [["blink", "x"]]; }, /hero\.lines\[0\]/],
    [(f) => { f.hero.lines[0].steps = 0; }, /hero\.lines\[0\]\.steps/],
    [(f) => { f.courses.catalog = "../secret.json"; }, /courses\.catalog/],
    [(f) => { f.courses.yearbook = "yearbook.js"; }, /courses\.yearbook/],
    [(f) => { f.courses.download = "courses/x.json"; }, /courses\.download/],
    [(f) => { f.courses.categories = []; }, /courses\.categories/],
    [(f) => { f.courses.categories.push({ id: "1", label: "שוב" }); }, /courses\.categories.*twice/],
    [(f) => { f.courses.categories[0].label = ""; }, /courses\.categories\[0\]\.label/],
    [(f) => { f.courses.officialSource = ""; }, /courses\.officialSource/],
    [(f) => { f.search.synonyms = [["only one"]]; }, /search\.synonyms\[0\]/],
    [(f) => { f.eggs[0].words = []; }, /eggs\[0\]\.words/],
    [(f) => { f.eggs[0].toast = ""; }, /eggs\[0\]\.toast/],
    [(f) => { f.eggs[0].effect = "drift"; }, /eggs\[0\]\.effect/],
    [(f) => { f.eggs[0].effect.type = "blink"; }, /eggs\[0\]\.effect\.type/],
    [(f) => { f.eggs[0].effect.colors = ["red;background:url(https://x.example/p)"]; }, /eggs\[0\]\.effect\.colors/],
    [(f) => { f.eggs[0].effect.glyphs = []; }, /eggs\[0\]\.effect\.glyphs/],
    [(f) => { f.id = "CS"; }, /id must be/],
    [(f) => { delete f.content; }, /content\.order is missing/],
    [(f) => { f.content.order.guides = []; }, /content\.order\.guides/],
    [(f) => { f.content.order.categories.push("Bad Id"); }, /content\.order\.categories has an id/],
    [(f) => { f.content.order.guides.push(f.content.order.guides[0]); }, /lists an id twice/],
  ];
  for (const [mutate, expected] of cases) {
    const broken = clone(cs);
    mutate(broken);
    assert.throws(() => validateFaculty(broken), expected);
  }
});

test("the browser subset keeps names, lines, theme and labels but not the model prompts", () => {
  const subset = browserFaculty(cs);
  assert.equal(subset.id, "cs");
  assert.deepEqual(subset.name, cs.name);
  assert.deepEqual(subset.theme, cs.theme);
  assert.deepEqual(subset.labels, cs.labels);
  assert.deepEqual(subset.search, cs.search);
  assert.deepEqual(subset.eggs, cs.eggs);
  assert.equal(subset.hero, undefined, "the hero is written by the prerender, the page does not need it");
  assert.equal(subset.courses, undefined, "the course files are read on the server and by the build");
  assert.equal(subset.site.url, cs.site.url);
  assert.equal(subset.defaultMascot, "bit");
  assert.equal(subset.mascots.length, 2);
  const text = facultyScript(cs);
  assert.match(text, /^window\.FACULTY = \{/);
  for (const m of cs.mascots) {
    const out = subset.mascots.find((s) => s.id === m.id);
    assert.deepEqual(out, { id: m.id, name: m.name, nameEn: m.nameEn, gender: m.gender, files: m.files, poseWidths: m.poseWidths, hellos: m.hellos, timely: m.timely, joined: m.joined, thinking: m.thinking, peekLines: m.peekLines });
    assert.ok(!text.includes(m.character.slice(0, 40)), `${m.id}: the character prompt stays on the server`);
    assert.ok(!text.includes(m.grammar), `${m.id}: the grammar line stays on the server`);
  }
  assert.ok(!text.includes("</script"), "safe to inline");
});

test("the web app manifest carries the faculty's name, description and color", () => {
  const parsed = JSON.parse(webmanifest(cs));
  assert.equal(parsed.name, cs.pwa.name);
  assert.equal(parsed.short_name, cs.pwa.shortName);
  assert.equal(parsed.description, cs.pwa.description);
  assert.equal(parsed.theme_color, cs.pwa.themeColor);
  assert.equal(parsed.lang, "he");
  assert.equal(parsed.dir, "rtl");
  assert.equal(parsed.icons.length, 4);
  for (const icon of parsed.icons) assert.ok(existsSync(icon.src.replace(/^\.\//, "")), icon.src);
});

test("the prerender writes the manifest's accent colors into the :root blocks and leaves the memorial override alone", async () => {
  const { accentLine, withTheme, withHero, homeDescription } = await import("../../scripts/prerender.mjs");
  const template = readFileSync("index.html", "utf8");
  const theme = { light: { ...cs.theme.light, accent: "#111111" }, dark: { ...cs.theme.dark, accent: "#222222" } };
  const out = withTheme(template, theme);
  assert.equal(out.split(accentLine(theme.light)).length - 1, 1, "one light line");
  assert.equal(out.split(accentLine(theme.dark)).length - 1, 2, "two dark lines");
  assert.ok(out.includes(`:root[data-day="memorial"] { --accent: #4b5563;`), "memorial override untouched");
  assert.equal(withTheme(template, cs.theme), template, "the CS values give the template back unchanged");
  assert.throws(() => withTheme(template.replace(DARK_SPLIT_TEXT, "@media (x)"), cs.theme), /dark-mode/);
  assert.ok(withHero(template, { ...cs.hero, path: "~/biu/x/year-1" }).includes(`<span>~/biu/x/year-1</span></div>`));
  assert.ok(withHero(template, { ...cs.hero, path: "a<b" }).includes(`<span>a&lt;b</span></div>`), "escaped");
  assert.equal(withHero(template, cs.hero), template, "the CS hero gives the template back unchanged");
  const lines = [{ steps: 3, start: 0.5, tokens: [["prompt", ">"], " a<b"] }, { steps: 4, start: 1, duration: 0.3, tokens: [["out", "\"ok\""]] }];
  const typed = withHero(template, { ...cs.hero, lines });
  assert.ok(typed.includes(`<pre class="term-body"><span class="ln" style="--n:3;--at:.5s"><span class="t-prompt">&gt;</span> a&lt;b</span><span class="ln" style="--n:4;--at:1s;--d:.3s"><span class="t-out">"ok"</span><span class="t-caret"></span></span></pre>`), typed.slice(typed.indexOf("term-body"), typed.indexOf("term-body") + 300));
  assert.throws(() => withHero(template, { ...cs.hero, variant: "eeg" }), /hero variant/);
  assert.throws(() => withHero(template, { ...cs.hero, lines: [{ steps: 3, start: 0.5, tokens: [["onclick", "x"]] }] }), /token kind/);
  assert.throws(() => withHero(template, { ...cs.hero, lines: [{ steps: "3;color:red", start: 0.5, tokens: ["x"] }] }), /whole steps/);
  assert.throws(() => withHero(template.replace('<pre class="term-body">', "<pre>"), cs.hero), /hero/);
  assert.equal(homeDescription("תשפ\"ז"), `${cs.site.description.replace("{year}", "תשפ\"ז")} יוזמה של סטודנט, לא אתר רשמי של האוניברסיטה.`);
  assert.equal(homeDescription(""), `${cs.site.description.replace(" {year}", "")} יוזמה של סטודנט, לא אתר רשמי של האוניברסיטה.`);
});

test("the build copies only the images the manifest names, to their fixed public paths", () => {
  const files = facultyImageFiles(cs);
  assert.equal(files.length, 1 + 2 * (2 + MASCOT_POSES.length));
  const targets = facultyImageTargets(cs);
  assert.equal(targets["og-image.jpg"], "assets/og-image-v2.jpg");
  assert.equal(targets["mascot/peek-bit.webp"], "assets/mascot/peek-bit.webp");
  const root = mkdtempSync(join(tmpdir(), "nr-faculty-"));
  try {
    const src = join(root, "src");
    for (const file of files) { mkdirSync(join(src, dirname(file)), { recursive: true }); writeFileSync(join(src, file), file); }
    writeFileSync(join(src, "mascot", "stray.txt"), "not published");
    writeFileSync(join(src, "faculty.js"), "not published");
    const out = join(root, "out");
    copyFacultyAssets(cs, out, src);
    for (const [file, target] of Object.entries(targets)) assert.equal(readFileSync(join(out, target), "utf8"), file);
    assert.ok(!existsSync(join(out, "assets", "mascot", "stray.txt")), "a stray file in the mascot folder stays out");
    assert.ok(!existsSync(join(out, "faculty.js")) && !existsSync(join(out, "assets", "faculty.js")), "the manifest is not copied as an asset");
    rmSync(join(src, "mascot", "her-idea.webp"));
    assert.throws(() => copyFacultyAssets(cs, join(root, "out2"), src), /missing .*her-idea\.webp/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the courses block names files that exist, categories with unique ids, and the download the content links to", () => {
  assert.ok(existsSync(facultyPath(cs, cs.courses.catalog)), "the catalog scan");
  assert.ok(existsSync(facultyPath(cs, cs.courses.yearbook)), "the yearbook mapping");
  assert.equal(facultyPath(cs, cs.courses.catalog), "faculties/cs/courses/catalog.json");
  assert.ok(existsSync(facultyFile(cs, cs.courses.catalog)), "the same file as a URL, for the server");
  assert.ok(cs.courses.categories.length > 0);
  const ids = cs.courses.categories.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, "category ids are unique");
  for (const c of cs.courses.categories) assert.ok(c.label.trim(), `${c.id} has a label`);
  assert.deepEqual(ids, ["1", "2", "3", "cluster1", "cluster2", "complement", "ai"], "the CS list, in display order");
  assert.match(cs.courses.officialSource, /ידיעון/);
  const item = loadContent(cs).categories.flatMap((c) => c.items).find((i) => i.id === "courses-file");
  assert.ok(item, "the content has the course-file item");
  assert.ok(item.url.endsWith(`/${cs.courses.download}`), `${item.url} points at the file the build publishes (${cs.courses.download})`);
});

test("the hero is a known variant with a path and typed lines; the search and the eggs are lists the page can merge", () => {
  assert.deepEqual(HERO_VARIANTS, ["terminal"]);
  assert.equal(cs.hero.variant, "terminal");
  assert.equal(cs.hero.path, "~/biu/cs/year-1");
  assert.ok(cs.hero.lines.length >= 1);
  for (const line of cs.hero.lines) {
    assert.ok(Number.isInteger(line.steps) && line.steps > 0);
    assert.ok(line.tokens.length >= 1);
  }
  assert.ok(cs.search.synonyms.some((group) => group.includes("מדעי המחשב")));
  assert.ok(cs.eggs.some((egg) => egg.toast.includes("Hello, CS!")));
});

test("the published catalog takes a name of its own: never one the build writes, and a guide cannot take its name either", () => {
  assert.equal(nameStem("courses-cs-2027.json"), "courses-cs-2027");
  const reserved = new Set(["index", "course-list", "data"]);
  const withDownload = reserveDownload(reserved, cs.courses.download);
  assert.ok(withDownload.has(nameStem(cs.courses.download)), "the download's name is reserved for guide ids");
  assert.equal(reserved.size, 3, "the input set is not changed");
  assert.throws(() => reserveDownload(reserved, "course-list.json"), /courses\.download "course-list\.json" is taken/);
  assert.throws(() => reserveDownload(reserved, "data.js"), /is taken/);
});
