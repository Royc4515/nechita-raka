import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FACULTIES, validateFaculty } from "../../faculties/index.js";
import { iconVersions, versionedIcon, webmanifest } from "../../scripts/faculty-public.mjs";
import { withBrandMark, withIconLinks } from "../../scripts/prerender.mjs";

// index.html is written with the CS values (it opens locally without a build), so these tests start from the template.
const template = readFileSync("index.html", "utf8");
const admin = readFileSync("admin.html", "utf8");
const { cs, neuro } = FACULTIES;
const SYMBOL_RE = /<symbol id="plane-icon"[\s\S]*?<\/symbol>/;
const symbolOf = (html) => html.match(SYMBOL_RE)[0];
const markOf = (faculty) => readFileSync(`faculties/${faculty.id}/${faculty.site.brandMark}`, "utf8");

test("CS keeps the parachute: no brand mark in its manifest and the template comes back unchanged", () => {
  assert.equal(cs.site.brandMark, undefined);
  assert.equal(withBrandMark(template, undefined, cs.theme.light.accent), template);
  assert.match(symbolOf(template), /#0b5fae/, "the template symbol is the CS parachute on the CS blue");
});

test("neuro's brand mark is a file of its own, drawn on the faculty accent instead of the CS blue", () => {
  assert.equal(validateFaculty(neuro), neuro);
  assert.match(neuro.site.brandMark, /^[\w-]+\.svg$/);
  assert.ok(existsSync(`faculties/neuro/${neuro.site.brandMark}`), "the file is in faculties/neuro/");
  const html = withBrandMark(template, markOf(neuro), neuro.theme.light.accent);
  const symbol = symbolOf(html);
  assert.equal(html.match(/<symbol id="plane-icon"/g).length, 1, "still one symbol, still the same id, so both brand spots follow");
  assert.match(symbol, /^<symbol id="plane-icon" viewBox="0 0 512 512">/);
  assert.ok(symbol.includes(`fill="${neuro.theme.light.accent}"`), "the tile is the manifest's accent");
  assert.ok(!/0b5fae/i.test(symbol), "none of the CS blue is left in the symbol");
  assert.ok(!symbol.includes("TILE"), "the tile token is replaced everywhere");
  assert.equal(html.replace(SYMBOL_RE, ""), template.replace(SYMBOL_RE, ""), "nothing outside the symbol changes");
  assert.equal((html.match(/<use href="#plane-icon"\/>/g) || []).length, 2, "the header brand and the sticky mini brand both draw it");
});

test("a brand mark that is not what the build expects fails the build", () => {
  assert.throws(() => withBrandMark(template.replace('<symbol id="plane-icon"', '<symbol id="other"'), markOf(neuro), "#6434cc"), /exactly one/);
  assert.throws(() => withBrandMark(template, "<script>alert(1)</script>", "#6434cc"), /brand mark/);
  assert.throws(() => withBrandMark(template, markOf(neuro), "red"), /#rrggbb/);
});

test("the manifest accepts only a plain svg file name as the brand mark", () => {
  for (const bad of ["../x.svg", "mark.png", "", 3, "a/b.svg"]) assert.throws(() => validateFaculty({ ...structuredClone(neuro), site: { ...structuredClone(neuro.site), brandMark: bad } }), /site\.brandMark/, String(bad));
});

test("icon versions: a faculty with its own icons gets a content hash per file, the shared set none", () => {
  const dir = mkdtempSync(join(tmpdir(), "icons-"));
  try {
    writeFileSync(join(dir, "a.png"), Buffer.from([1, 2, 3]));
    writeFileSync(join(dir, "b.svg"), "<svg>\r\n</svg>\r\n");
    const versions = iconVersions(dir);
    assert.deepEqual(Object.keys(versions).sort(), ["a.png", "b.svg"]);
    assert.match(versions["a.png"], /^[0-9a-f]{8}$/);
    writeFileSync(join(dir, "b.svg"), "<svg>\n</svg>\n");
    assert.equal(iconVersions(dir)["b.svg"], versions["b.svg"], "line endings in a text icon do not change the version");
    writeFileSync(join(dir, "a.png"), Buffer.from([1, 2, 4]));
    assert.notEqual(iconVersions(dir)["a.png"], versions["a.png"], "new content, new version");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  assert.deepEqual(iconVersions("faculties/cs/icons"), {}, "CS has no icons folder of its own");
  assert.equal(versionedIcon("./icons/icon.svg", {}), "./icons/icon.svg");
  assert.equal(versionedIcon("./icons/icon.svg", { "icon.svg": "abcd1234" }), "./icons/icon.svg?v=abcd1234");
});

test("the page and the dashboard link the versioned icons; without versions (CS) they are byte-identical", () => {
  assert.equal(withIconLinks(template, {}), template);
  assert.equal(withIconLinks(admin, {}), admin);
  const versions = iconVersions("faculties/neuro/icons");
  assert.deepEqual(Object.keys(versions).sort(), ["apple-touch-icon.png", "favicon-32.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "icon.svg"]);
  const page = withIconLinks(template, versions);
  assert.ok(page.includes(`<link rel="icon" href="./icons/icon.svg?v=${versions["icon.svg"]}" type="image/svg+xml">`));
  assert.ok(page.includes(`<link rel="icon" href="./icons/favicon-32.png?v=${versions["favicon-32.png"]}" type="image/png" sizes="32x32">`));
  assert.ok(page.includes(`<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png?v=${versions["apple-touch-icon.png"]}">`));
  assert.ok(withIconLinks(admin, versions).includes(`href="./icons/icon.svg?v=${versions["icon.svg"]}"`));
  assert.throws(() => withIconLinks(template.replace(/<link rel="(?:icon|apple-touch-icon)"[^>]*>\s*/g, ""), versions), /icon link/);
});

test("the web manifest points at the versioned icons for neuro and at the plain ones for CS", () => {
  const plain = JSON.parse(webmanifest(cs));
  assert.deepEqual(plain.icons.map((i) => i.src), ["./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/icon.svg"]);
  assert.equal(webmanifest(cs), webmanifest(cs, {}));
  const versions = iconVersions("faculties/neuro/icons");
  const own = JSON.parse(webmanifest(neuro, versions));
  assert.deepEqual(own.icons.map((i) => i.src), [
    `./icons/icon-192.png?v=${versions["icon-192.png"]}`,
    `./icons/icon-512.png?v=${versions["icon-512.png"]}`,
    `./icons/icon-maskable-512.png?v=${versions["icon-maskable-512.png"]}`,
    `./icons/icon.svg?v=${versions["icon.svg"]}`,
  ]);
});
