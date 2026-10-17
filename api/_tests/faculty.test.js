import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { DEFAULT_FACULTY, FACULTIES, FACULTY, HERO_VARIANTS, MASCOT_POSES, THEME_KEYS, facultyFile, facultyIdFrom, facultyPath, selectFaculty, validateFaculty } from "../../faculties/index.js";
import { loadContent, loadEnglish } from "../../faculties/content.js";
import { browserFaculty, copyFacultyAssets, facultyImageFiles, facultyImageTargets, facultyScript, nameStem, reserveDownload, webmanifest } from "../../scripts/faculty-public.mjs";
import { foreignFacultyLeaks, mascotImageNames } from "../../scripts/faculty-guard.mjs";
import { accentLine, homeDescription, robotsTxt, withHero, withSiteName, withTheme } from "../../scripts/prerender.mjs";

const clone = (value) => structuredClone(value);
const DARK_SPLIT_TEXT = "@media (prefers-color-scheme: dark)";
// index.html is written with the CS values (it opens locally without a build), so the template tests name CS.
const cs = FACULTIES.cs;
const ALL = Object.values(FACULTIES);
const OTHER = ALL.find((f) => f.id !== FACULTY.id);

// The facts of each faculty that the active run asserts (MULTI-FACULTY-PLAN.md D13): keyed by id, so the
// same tests run for whichever FACULTY the env names. A new faculty adds a row here.
const CS_CATEGORIES = ["1", "2", "3", "cluster1", "cluster2", "complement", "ai"];
const EXPECTED = {
  cs: { mascots: ["bit", "byte"], defaultMascot: "bit", url: "https://nechita-raka.vercel.app", heroPath: "~/biu/cs/year-1", synonym: "מדעי המחשב", egg: "Hello, CS!", categories: CS_CATEGORIES, tracks: undefined, download: "courses-cs-2027.json" },
  // The placeholder (faculty PR 4): neuro identity, CS courses, egg and download until PR 6 brings its content.
  neuro: { mascots: ["noi", "ron"], defaultMascot: "noi", url: "https://nechita-raka-neuro.vercel.app", heroPath: "~/biu/neuro/year-1", synonym: "מדעי המוח", egg: "Hello, CS!", categories: CS_CATEGORIES, tracks: ["single", "cs", "psychology"], download: "courses-cs-2027.json" },
};
const expected = EXPECTED[FACULTY.id];

test("the default faculty is cs, FACULTY picks a known one, and an unknown id fails fast with the known list", () => {
  assert.equal(DEFAULT_FACULTY, "cs");
  assert.equal(facultyIdFrom({}), "cs");
  assert.equal(facultyIdFrom({ FACULTY: " cs " }), "cs");
  assert.equal(facultyIdFrom({ FACULTY: "" }), "cs");
  assert.equal(facultyIdFrom({ FACULTY: "neuro" }), "neuro");
  assert.throws(() => facultyIdFrom({ FACULTY: "law" }), /FACULTY="law" is not a known faculty \(known: cs, neuro\)/);
  assert.throws(() => facultyIdFrom({ FACULTY: "__proto__" }), /not a known faculty/);
  assert.throws(() => facultyIdFrom({ FACULTY: "CS" }), /not a known faculty/);
  assert.equal(selectFaculty({}).id, "cs");
  assert.equal(selectFaculty({ FACULTY: "neuro" }).id, "neuro");
  assert.ok(Object.hasOwn(FACULTIES, FACULTY.id), "the process runs for a known faculty");
  assert.ok(expected, `this test file knows the facts of "${FACULTY.id}"`);
});

test("every folder under faculties/ is a known faculty, and every manifest has the shape the site needs", () => {
  const folders = readdirSync("faculties", { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  assert.deepEqual(folders, Object.keys(FACULTIES).sort(), "faculties/index.js lists every folder and nothing else");
  assert.ok(ALL.length >= 2, "at least two faculties, so the per-faculty machinery is exercised");
  for (const f of ALL) {
    const dir = `faculties/${f.id}`;
    assert.equal(validateFaculty(f), f, `${f.id}: validates`);
    assert.equal(f.mascots.length, 2, `${f.id}: two mascots`);
    assert.deepEqual(f.mascots.map((m) => m.gender).sort(), ["f", "m"], `${f.id}: one masculine and one feminine`);
    assert.equal(new Set(f.mascots.map((m) => m.id)).size, 2, `${f.id}: distinct mascot ids`);
    assert.ok(f.mascots.some((m) => m.id === f.defaultMascot), `${f.id}: defaultMascot is one of the two`);
    for (const mode of ["light", "dark"]) {
      assert.deepEqual(Object.keys(f.theme[mode]).sort(), [...THEME_KEYS].sort(), `${f.id}: theme.${mode} has the six accent values`);
      for (const key of THEME_KEYS) assert.match(f.theme[mode][key], /^#[0-9a-f]{6}$/, `${f.id}: theme.${mode}.${key}`);
    }
    assert.equal(f.pwa.themeColor, f.theme.light.accent, `${f.id}: the app color is the light accent`);
    assert.ok(existsSync(`${dir}/${f.site.ogImage.file}`), `${f.id}: the OG image`);
    for (const m of f.mascots) {
      assert.ok(existsSync(`${dir}/mascot/${m.files.avatar}`), `${f.id}/${m.id}: avatar`);
      assert.ok(existsSync(`${dir}/mascot/${m.files.peek}`), `${f.id}/${m.id}: peek image`);
      for (const pose of MASCOT_POSES) assert.ok(existsSync(`${dir}/mascot/${m.files.poses}-${pose}.webp`), `${f.id}/${m.id}: ${pose}`);
    }
    for (const key of ["catalog", "yearbook"]) assert.ok(existsSync(facultyPath(f, f.courses[key])), `${f.id}: courses.${key}`);
    assert.ok(existsSync(`${dir}/data.js`) && existsSync(`${dir}/data.en.js`), `${f.id}: content files`);
    // loadContent throws when content.order names an id neither file has, or misses one they have.
    const data = loadContent(f);
    assert.deepEqual(data.guides.map((g) => g.id), f.content.order.guides, `${f.id}: every ordered guide exists`);
    assert.deepEqual(data.categories.map((c) => c.id), f.content.order.categories, `${f.id}: every ordered category exists`);
    const english = loadEnglish(f);
    assert.ok(english.ui.length > 100 && english.content.length > 100, `${f.id}: English pairs`);
    if (f.tracks !== undefined) {
      const ids = f.tracks.map((t) => t.id);
      assert.equal(new Set(ids).size, ids.length, `${f.id}: track ids are unique`);
      for (const t of f.tracks) assert.ok(/[֐-׿]/.test(t.label), `${f.id}: track "${t.id}" has a Hebrew label`);
    }
    assert.ok(f.site.url.startsWith("https://") && !f.site.url.endsWith("/"), `${f.id}: site.url is an origin`);
  }
  assert.equal(new Set(ALL.map((f) => f.site.url)).size, ALL.length, "every faculty has its own address");
});

test("the active faculty's manifest holds the facts its tests and content rely on", () => {
  assert.deepEqual(FACULTY.mascots.map((m) => m.id), expected.mascots);
  assert.equal(FACULTY.defaultMascot, expected.defaultMascot);
  assert.equal(FACULTY.site.url, expected.url);
  assert.equal(FACULTY.hero.path, expected.heroPath);
  assert.deepEqual(FACULTY.tracks && FACULTY.tracks.map((t) => t.id), expected.tracks);
  assert.equal(FACULTY.courses.download, expected.download);
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
    [(f) => { f.tracks = []; }, /tracks must be a non-empty list/],
    [(f) => { f.tracks = [{ id: "a", label: "א" }, { id: "a", label: "ב" }]; }, /tracks lists an id twice/],
    [(f) => { f.tracks = [{ id: "Single", label: "א" }]; }, /tracks\[0\]\.id/],
    [(f) => { f.tracks = [{ id: "single", label: "" }]; }, /tracks\[0\]\.label/],
    [(f) => { f.department.url = "http://cs.biu.ac.il/"; }, /department/],
    [(f) => { delete f.department; }, /department/],
  ];
  for (const [mutate, expectedError] of cases) {
    const broken = clone(cs);
    mutate(broken);
    assert.throws(() => validateFaculty(broken), expectedError);
  }
  const withTracks = clone(cs);
  withTracks.tracks = [{ id: "single", label: "חד-חוגי" }, { id: "cs", label: "משולב" }];
  assert.equal(validateFaculty(withTracks), withTracks, "a well-formed tracks list is accepted");
});

test("the browser subset keeps names, lines, theme and labels but not the model prompts", () => {
  const subset = browserFaculty(FACULTY);
  assert.equal(subset.id, FACULTY.id);
  assert.deepEqual(subset.name, FACULTY.name);
  assert.deepEqual(subset.theme, FACULTY.theme);
  assert.deepEqual(subset.labels, FACULTY.labels);
  assert.deepEqual(subset.search, FACULTY.search);
  assert.deepEqual(subset.eggs, FACULTY.eggs);
  assert.equal(subset.hero, undefined, "the hero is written by the prerender, the page does not need it");
  assert.equal(subset.courses, undefined, "the course files are read on the server and by the build");
  assert.equal(subset.tracks, undefined, "nothing reads the tracks yet, so they are not published");
  assert.equal(subset.department, undefined, "the department link is written into llms.txt by the build");
  assert.equal(subset.site.url, FACULTY.site.url);
  assert.equal(subset.defaultMascot, FACULTY.defaultMascot);
  assert.equal(subset.mascots.length, 2);
  const text = facultyScript(FACULTY);
  assert.match(text, /^window\.FACULTY = \{/);
  for (const m of FACULTY.mascots) {
    const out = subset.mascots.find((s) => s.id === m.id);
    assert.deepEqual(out, { id: m.id, name: m.name, nameEn: m.nameEn, gender: m.gender, files: m.files, poseWidths: m.poseWidths, hellos: m.hellos, timely: m.timely, joined: m.joined, thinking: m.thinking, peekLines: m.peekLines });
    assert.ok(!text.includes(m.character.slice(0, 40)), `${m.id}: the character prompt stays on the server`);
    assert.ok(!text.includes(m.grammar), `${m.id}: the grammar line stays on the server`);
  }
  assert.ok(!text.includes("</script"), "safe to inline");
});

test("the web app manifest carries the faculty's name, description and color", () => {
  const parsed = JSON.parse(webmanifest(FACULTY));
  assert.equal(parsed.name, FACULTY.pwa.name);
  assert.equal(parsed.short_name, FACULTY.pwa.shortName);
  assert.equal(parsed.description, FACULTY.pwa.description);
  assert.equal(parsed.theme_color, FACULTY.pwa.themeColor);
  assert.equal(parsed.lang, "he");
  assert.equal(parsed.dir, "rtl");
  assert.equal(parsed.icons.length, 4);
  for (const icon of parsed.icons) assert.ok(existsSync(icon.src.replace(/^\.\//, "")), icon.src);
});

test("the prerender writes the manifest's accent colors into the :root blocks and leaves the memorial override alone", () => {
  const template = readFileSync("index.html", "utf8");
  const theme = { light: { ...cs.theme.light, accent: "#111111" }, dark: { ...cs.theme.dark, accent: "#222222" } };
  const out = withTheme(template, theme);
  assert.equal(out.split(accentLine(theme.light)).length - 1, 1, "one light line");
  assert.equal(out.split(accentLine(theme.dark)).length - 1, 2, "two dark lines");
  assert.ok(out.includes(`:root[data-day="memorial"] { --accent: #4b5563;`), "memorial override untouched");
  assert.equal(withTheme(template, cs.theme), template, "the CS values give the template back unchanged");
  assert.throws(() => withTheme(template.replace(DARK_SPLIT_TEXT, "@media (x)"), cs.theme), /dark-mode/);
  // admin.html has the same three accent lines, so the build themes it the same way.
  const admin = readFileSync("admin.html", "utf8");
  assert.equal(withTheme(admin, cs.theme), admin, "the CS values give the admin page back unchanged");
  assert.equal(withTheme(admin, theme).split(accentLine(theme.dark)).length - 1, 2, "the admin page takes the dark lines too");
});

test("the prerender writes the manifest's hero, site name and sitemap address; the CS values give the template back unchanged", () => {
  const template = readFileSync("index.html", "utf8");
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
  // The H1 of the brand block: the site's name from the manifest.
  assert.equal(withSiteName(template, cs.site.name), template, "the CS name gives the template back unchanged");
  assert.ok(withSiteName(template, OTHER.site.name).includes(`<h1>${OTHER.site.name}</h1>`));
  assert.ok(withSiteName(template, "a<b").includes(`<h1>a&lt;b</h1>`), "escaped");
  assert.throws(() => withSiteName(template.replace('<div class="brand">', '<div class="brandx">'), cs.site.name), /brand block/);
  // robots.txt: its Sitemap line points at the faculty's address.
  const robots = readFileSync("robots.txt", "utf8");
  const out = robotsTxt(robots);
  assert.ok(out.includes(`Sitemap: ${FACULTY.site.url}/sitemap.xml`));
  assert.equal((out.match(/^Sitemap:/gm) || []).length, 1);
  assert.equal(out.replace(/^Sitemap: .*$/m, "Sitemap: X"), robots.replace(/^Sitemap: .*$/m, "Sitemap: X"), "nothing else changes");
  assert.throws(() => robotsTxt(robots.replace(/^Sitemap: .*$/m, "")), /Sitemap line/);
  assert.equal(homeDescription("תשפ\"ז"), `${FACULTY.site.description.replace("{year}", "תשפ\"ז")} יוזמה של סטודנט, לא אתר רשמי של האוניברסיטה.`);
  assert.equal(homeDescription(""), `${FACULTY.site.description.replace(" {year}", "")} יוזמה של סטודנט, לא אתר רשמי של האוניברסיטה.`);
});

test("the build copies only the images the manifest names, to their fixed public paths", () => {
  const [first, second] = FACULTY.mascots;
  const files = facultyImageFiles(FACULTY);
  assert.equal(files.length, 1 + 2 * (2 + MASCOT_POSES.length));
  const targets = facultyImageTargets(FACULTY);
  assert.equal(targets[FACULTY.site.ogImage.file], FACULTY.site.ogImage.path);
  assert.equal(targets[`mascot/${first.files.peek}`], `assets/mascot/${first.files.peek}`);
  const root = mkdtempSync(join(tmpdir(), "nr-faculty-"));
  try {
    const src = join(root, "src");
    for (const file of files) { mkdirSync(join(src, dirname(file)), { recursive: true }); writeFileSync(join(src, file), file); }
    writeFileSync(join(src, "mascot", "stray.txt"), "not published");
    writeFileSync(join(src, "faculty.js"), "not published");
    const out = join(root, "out");
    copyFacultyAssets(FACULTY, out, src);
    for (const [file, target] of Object.entries(targets)) assert.equal(readFileSync(join(out, target), "utf8"), file);
    assert.ok(!existsSync(join(out, "assets", "mascot", "stray.txt")), "a stray file in the mascot folder stays out");
    assert.ok(!existsSync(join(out, "faculty.js")) && !existsSync(join(out, "assets", "faculty.js")), "the manifest is not copied as an asset");
    rmSync(join(src, "mascot", `${second.files.poses}-idea.webp`));
    assert.throws(() => copyFacultyAssets(FACULTY, join(root, "out2"), src), new RegExp(`missing .*${second.files.poses}-idea\\.webp`));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the courses block names files that exist, categories with unique ids, and the download the content links to", () => {
  assert.ok(existsSync(facultyPath(FACULTY, FACULTY.courses.catalog)), "the catalog scan");
  assert.ok(existsSync(facultyPath(FACULTY, FACULTY.courses.yearbook)), "the yearbook mapping");
  assert.equal(facultyPath(FACULTY, FACULTY.courses.catalog), `faculties/${FACULTY.id}/${FACULTY.courses.catalog}`);
  assert.ok(existsSync(facultyFile(FACULTY, FACULTY.courses.catalog)), "the same file as a URL, for the server");
  assert.ok(FACULTY.courses.categories.length > 0);
  const ids = FACULTY.courses.categories.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, "category ids are unique");
  for (const c of FACULTY.courses.categories) assert.ok(c.label.trim(), `${c.id} has a label`);
  assert.deepEqual(ids, expected.categories, "the faculty's list, in display order");
  assert.match(FACULTY.courses.officialSource, /ידיעון/);
  const item = loadContent(FACULTY).categories.flatMap((c) => c.items).find((i) => i.id === "courses-file");
  assert.ok(item, "the content has the course-file item");
  assert.ok(item.url.endsWith(`/${FACULTY.courses.download}`), `${item.url} points at the file the build publishes (${FACULTY.courses.download})`);
});

test("the hero is a known variant with a path and typed lines; the search and the eggs are lists the page can merge", () => {
  assert.deepEqual(HERO_VARIANTS, ["terminal"]);
  assert.equal(FACULTY.hero.variant, "terminal");
  assert.ok(FACULTY.hero.lines.length >= 1);
  for (const line of FACULTY.hero.lines) {
    assert.ok(Number.isInteger(line.steps) && line.steps > 0);
    assert.ok(line.tokens.length >= 1);
  }
  assert.ok(FACULTY.search.synonyms.some((group) => group.includes(expected.synonym)));
  assert.ok(FACULTY.eggs.some((egg) => egg.toast.includes(expected.egg)));
});

test("the published catalog takes a name of its own: never one the build writes, and a guide cannot take its name either", () => {
  assert.equal(nameStem("courses-cs-2027.json"), "courses-cs-2027");
  const reserved = new Set(["index", "course-list", "data"]);
  const withDownload = reserveDownload(reserved, FACULTY.courses.download);
  assert.ok(withDownload.has(nameStem(FACULTY.courses.download)), "the download's name is reserved for guide ids");
  assert.equal(reserved.size, 3, "the input set is not changed");
  assert.throws(() => reserveDownload(reserved, "course-list.json"), /courses\.download "course-list\.json" is taken/);
  assert.throws(() => reserveDownload(reserved, "data.js"), /is taken/);
});

test("the faculty guard passes a clean bundle and fails one that carries another faculty's manifest, images, names, address or colors", () => {
  assert.ok(OTHER, "a second faculty to leak from");
  assert.equal(mascotImageNames(FACULTY).length, 2 * (2 + MASCOT_POSES.length));
  const root = mkdtempSync(join(tmpdir(), "nr-guard-"));
  const write = (file, text) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), text); };
  const clean = () => {
    rmSync(root, { recursive: true, force: true });
    write("faculty.js", facultyScript(FACULTY));
    write("manifest.webmanifest", webmanifest(FACULTY));
    write("index.html", `<title>${FACULTY.site.title}</title>${accentLine(FACULTY.theme.light)}<h1>${FACULTY.site.name}</h1>`);
    write("sitemap.xml", `<loc>${FACULTY.site.url}/</loc>`);
    write(`assets/mascot/${FACULTY.mascots[0].files.avatar}`, "img");
  };
  const leaks = () => foreignFacultyLeaks(root, FACULTY);
  const markers = () => leaks().map((l) => `${l.file}: ${l.faculty}: ${l.marker}`).join("\n");
  try {
    clean();
    assert.deepEqual(leaks(), [], "a clean bundle");
    // A planted foreign mascot name in the browser manifest.
    write("faculty.js", facultyScript(FACULTY).replace(`"name":"${FACULTY.mascots[0].name}"`, `"name":"${OTHER.mascots[0].name}"`));
    assert.match(markers(), new RegExp(`faculty\\.js: ${OTHER.id}: mascot name "${OTHER.mascots[0].name}"`));
    assert.match(markers(), /faculty\.js: .*mascots .* instead of /, "the parsed manifest is not the active faculty's");
    // The other faculty's manifest altogether.
    clean();
    write("faculty.js", facultyScript(OTHER));
    assert.match(markers(), new RegExp(`faculty\\.js: ${OTHER.id}: id "${OTHER.id}" instead of "${FACULTY.id}"`));
    // One of the other faculty's image files, and a page that references one.
    clean();
    write(`assets/mascot/${OTHER.mascots[1].files.peek}`, "img");
    assert.match(markers(), new RegExp(`^assets/mascot/${OTHER.mascots[1].files.peek}: ${OTHER.id}: image file`, "m"));
    clean();
    write("exams.html", `<img src="./assets/mascot/${OTHER.mascots[0].files.avatar}">`);
    assert.match(markers(), new RegExp(`^exams\\.html: ${OTHER.id}: image ${OTHER.mascots[0].files.avatar}$`, "m"));
    // The other faculty's name in a heading, address in the sitemap, colors in a page.
    clean();
    write("index.html", `<h1>${OTHER.pwa.name}</h1>`);
    assert.match(markers(), new RegExp(`^index\\.html: ${OTHER.id}: pwa\\.name`, "m"));
    // The HTML writer escapes quotes (מדמ"ח -> מדמ&quot;ח) and JSON-LD prints them as \": both forms still count.
    clean();
    write("index.html", `<title>${OTHER.site.title.replace(/'/g, "&#39;").replace(/"/g, "&quot;")}</title>`);
    assert.match(markers(), new RegExp(`^index\\.html: ${OTHER.id}: site\\.title`, "m"));
    clean();
    write("index.html", `<script type="application/ld+json">${JSON.stringify({ name: OTHER.pwa.name })}</script>`);
    assert.match(markers(), new RegExp(`^index\\.html: ${OTHER.id}: pwa\\.name`, "m"));
    // robots.txt and llms.txt are written from the manifest too.
    clean();
    write("robots.txt", `Sitemap: ${OTHER.site.url}/sitemap.xml`);
    assert.match(markers(), new RegExp(`^robots\\.txt: ${OTHER.id}: site\\.url`, "m"));
    clean();
    write("llms.txt", `[x](${OTHER.site.url}/#faq)`);
    assert.match(markers(), new RegExp(`^llms\\.txt: ${OTHER.id}: site\\.url`, "m"));
    // A Hebrew name with a one-letter prefix is still the name.
    clean();
    write("manifest.webmanifest", `{"description":"שאלו את ${FACULTY.mascots[0].name} ו${OTHER.mascots[0].name}"}`);
    assert.match(markers(), new RegExp(`^manifest\\.webmanifest: ${OTHER.id}: mascot name "${OTHER.mascots[0].name}"`, "m"));
    clean();
    write("sitemap.xml", `<loc>${OTHER.site.url}/</loc>`);
    assert.match(markers(), new RegExp(`^sitemap\\.xml: ${OTHER.id}: site\\.url`, "m"));
    clean();
    write("index.html", `<style>${accentLine(OTHER.theme.dark)}</style>`);
    assert.match(markers(), new RegExp(`^index\\.html: ${OTHER.id}: theme\\.dark$`, "m"));
    // Prose may name the other faculty's mascots or address (shared content does; check-data warns about it).
    clean();
    write("registration.html", `<p>${OTHER.mascots[0].name} ${OTHER.mascots[1].nameEn} ${OTHER.site.url}</p>`);
    assert.deepEqual(leaks(), []);
    // A file that is not text is only checked by its name.
    clean();
    write("assets/photo.webp", OTHER.site.title);
    assert.deepEqual(leaks(), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
