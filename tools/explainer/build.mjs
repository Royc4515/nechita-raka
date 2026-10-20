// Builds the explainer studio into one file that can be sent to anyone and opened by double-click:
// scenes.js is inlined and every image becomes a data: URI, so the canvas stays exportable as video
// (a canvas that draws images loaded from file:// paths is "tainted" and the browser refuses to record it).
// Also writes SCRIPT.md, the narration as plain text, from the same scenes.
// Run from the repo root: node tools/explainer/build.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const scenesSrc = readFileSync(join(here, "scenes.js"), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(scenesSrc, sandbox);
const { SCENES, ASSET_PATHS } = sandbox.window;

const assets = Object.fromEntries(
  Object.entries(ASSET_PATHS).map(([key, path]) => [key, `data:image/webp;base64,${readFileSync(join(root, path)).toString("base64")}`]),
);

const html = readFileSync(join(here, "studio.html"), "utf8")
  .replace('<script src="scenes.js"></script>', () => `<script>\n${scenesSrc}\n</script>`)
  .replace("<script>/*EMBED*/</script>", () => `<script>window.EMBEDDED_ASSETS = ${JSON.stringify(assets)};</script>`);
if (!html.includes("EMBEDDED_ASSETS =") || html.includes('src="scenes.js"')) throw new Error("studio.html markers not found");

mkdirSync(join(here, "dist"), { recursive: true });
writeFileSync(join(here, "dist", "explainer.html"), html);

const clean = (t) => t.split("|").map((s) => s.trim()).filter(Boolean).join(" ");
const title = (s) => (Array.isArray(s.title) ? s.title.join(" ") : s.title);
const md = [
  "# איך בניתי את נחיתה רכה: התסריט",
  "",
  "נוצר אוטומטית מ-`scenes.js` (`node tools/explainer/build.mjs`). לעריכה: משנים שם, או בסטודיו עצמו.",
  "",
  ...SCENES.flatMap((s, i) => [`## ${i + 1}. ${title(s)}`, "", clean(s.narration), ""]),
].join("\n");
writeFileSync(join(here, "SCRIPT.md"), md);

const chars = SCENES.reduce((a, s) => a + clean(s.narration).length, 0);
console.log(`dist/explainer.html: ${(html.length / 1024).toFixed(0)}KB, ${SCENES.length} scenes, ${chars} narration characters`);
