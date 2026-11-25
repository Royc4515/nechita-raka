// The link-preview image of each notice (1200x630 JPEG), for the /notice-<id> page its share button sends.
//
//   node scripts/notice-images.mjs            makes the images that are missing, for every faculty
//   node scripts/notice-images.mjs --force    makes them all again (after editing a notice's title or text)
//
// Run it after adding a notice to shared/data.js or faculties/<id>/data.js, then commit the images. A shared notice
// gets one image per faculty, in that faculty's colors and with its illustration: faculties/<id>/notices/<notice-id>.jpg.
// It needs Playwright with Chromium (a dev tool: the Vercel build only copies the images). No image, no harm: the
// page falls back to the site's own preview image, and `npm run check` warns.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { loadContent } from "../faculties/content.js";
import { FACULTIES } from "../faculties/index.js";

const force = process.argv.includes("--force");
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { throw new Error("notice-images: Playwright is not installed (npm i -D playwright, then npx playwright install chromium)"); }

const esc = (text) => String(text ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const dmy = (iso) => iso.split("-").reverse().map((p, i) => (i < 2 ? String(Number(p)) : p)).join(".");
const mime = (file) => (file.endsWith(".webp") ? "image/webp" : file.endsWith(".png") ? "image/png" : "image/jpeg");

function cardHtml(faculty, notice) {
  const { accent, accentHover } = faculty.theme.light;
  const art = faculty.site.heroArt.file;
  const artUri = `data:${mime(art)};base64,${readFileSync(`faculties/${faculty.id}/${art}`).toString("base64")}`;
  const host = new URL(faculty.site.url).host;
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;800&display=swap">
<style>
  * { box-sizing: border-box; margin: 0; }
  body { inline-size: 1200px; block-size: 630px; overflow: hidden; font-family: Heebo, "FreeSans", "DejaVu Sans", sans-serif; color: #fff;
    background: radial-gradient(circle at 12% 85%, rgb(255 255 255 / .16), transparent 42%), linear-gradient(135deg, ${accent}, ${accentHover} 70%, #0f1b2d); }
  .card { display: flex; align-items: center; gap: 48px; block-size: 100%; padding: 56px 64px; }
  .text { flex: 1; min-inline-size: 0; display: flex; flex-direction: column; gap: 22px; }
  .pill { align-self: flex-start; display: flex; align-items: center; gap: 12px; padding: 10px 22px; border-radius: 999px; background: rgb(255 255 255 / .18); font-size: 28px; font-weight: 600; }
  .pill svg { inline-size: 32px; block-size: 32px; }
  h1 { font-size: ${notice.title.length > 44 ? 54 : 64}px; font-weight: 800; line-height: 1.18; }
  p { font-size: 30px; line-height: 1.45; color: rgb(255 255 255 / .9); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .foot { display: flex; gap: 18px; align-items: center; font-size: 24px; color: rgb(255 255 255 / .8); }
  .foot b { color: #fff; font-weight: 800; }
  .art { flex: none; inline-size: 340px; block-size: 340px; border-radius: 50%; background: rgb(255 255 255 / .14); display: grid; place-items: center; }
  .art img { inline-size: 310px; block-size: 310px; border-radius: 50%; object-fit: cover; }
</style></head><body><div class="card">
  <div class="text">
    <span class="pill"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1Z"/><path d="M16 9a3 3 0 0 1 0 6"/><path d="M19 6a7 7 0 0 1 0 12"/></svg>הודעה חשובה · ${esc(dmy(notice.from))}</span>
    <h1>${esc(notice.title)}</h1>
    <p>${esc(notice.text)}</p>
    <div class="foot"><b>${esc(faculty.site.name)}</b><span>${esc(host)}</span></div>
  </div>
  <div class="art"><img src="${artUri}" alt=""></div>
</div></body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
let made = 0;
for (const faculty of Object.values(FACULTIES)) {
  const dir = `faculties/${faculty.id}/notices`;
  for (const notice of loadContent(faculty).notices) {
    const file = `${dir}/${notice.id}.jpg`;
    if (existsSync(file) && !force) continue;
    mkdirSync(dir, { recursive: true });
    await page.setContent(cardHtml(faculty, notice), { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    writeFileSync(file, await page.screenshot({ type: "jpeg", quality: 86 }));
    console.log(`notice-images: ${file}`);
    made += 1;
  }
}
await browser.close();
console.log(made ? `notice-images: ${made} made. Commit them with the notice.` : "notice-images: every notice has its image.");
