import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { DEFAULT_FACULTY, FACULTIES, FACULTY, MASCOT_POSES, THEME_KEYS, facultyIdFrom, selectFaculty, validateFaculty } from "../../faculties/index.js";
import { browserFaculty, facultyScript, webmanifest } from "../../scripts/faculty-public.mjs";

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
    [(f) => { delete f.mascots[0].poseWidths.laptop; }, /poseWidths\.laptop/],
    [(f) => { f.mascots[0].hellos = []; }, /hellos/],
    [(f) => { f.labels.heroPath = ""; }, /labels\.heroPath/],
    [(f) => { f.id = "CS"; }, /id must be/],
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
  const { accentLine, withTheme, withHeroPath, homeDescription } = await import("../../scripts/prerender.mjs");
  const template = readFileSync("index.html", "utf8");
  const theme = { light: { ...cs.theme.light, accent: "#111111" }, dark: { ...cs.theme.dark, accent: "#222222" } };
  const out = withTheme(template, theme);
  assert.equal(out.split(accentLine(theme.light)).length - 1, 1, "one light line");
  assert.equal(out.split(accentLine(theme.dark)).length - 1, 2, "two dark lines");
  assert.ok(out.includes(`:root[data-day="memorial"] { --accent: #4b5563;`), "memorial override untouched");
  assert.equal(withTheme(template, cs.theme), template, "the CS values give the template back unchanged");
  assert.throws(() => withTheme(template.replace(DARK_SPLIT_TEXT, "@media (x)"), cs.theme), /dark-mode/);
  assert.ok(withHeroPath(template, "~/biu/x/year-1").includes(`<span>~/biu/x/year-1</span></div>`));
  assert.ok(withHeroPath(template, "a<b").includes(`<span>a&lt;b</span></div>`), "escaped");
  assert.equal(withHeroPath(template, cs.labels.heroPath), template);
  assert.equal(homeDescription("תשפ\"ז"), `${cs.site.description.replace("{year}", "תשפ\"ז")} יוזמה של סטודנט, לא אתר רשמי של האוניברסיטה.`);
  assert.equal(homeDescription(""), `${cs.site.description.replace(" {year}", "")} יוזמה של סטודנט, לא אתר רשמי של האוניברסיטה.`);
});
