// Copies only what the browser needs into public/, which is all Vercel serves.
// Everything else (api/ source, tests, scripts, README) stays private; the chat function is
// built from api/ separately.
//
// The pages themselves are generated (scripts/prerender.mjs): index.html with the content already in
// the HTML, one page per guide (public/<id>.html, served at /<id> thanks to cleanUrls in vercel.json),
// sitemap.xml and llms.txt. robots.txt is copied as is.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { guidePage, homePage, lastUpdated, llmsTxt, loadData, sitemapXml } from "./prerender.mjs";

const OUT = "public";
const FILES = [
  "data.js",
  "data.en.js",
  "chat.js",
  "chat.css",
  "peek.js",
  "track.js",
  "admin.html",
  "admin.js",
  "manifest.webmanifest",
  "robots.txt",
  "biu-5787.ics",
  "assets",
  "icons",
];
// Names a guide's address must not take: they are files the site already serves, or generated ones.
const RESERVED = new Set(["index", "sitemap", "llms", "api", "_vercel", ...FILES.map((f) => f.replace(/\..*$/, ""))]);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
for (const file of [...FILES, "index.html"]) {
  if (!existsSync(file)) throw new Error(`build-public: ${file} is missing`);
}
for (const file of FILES) cpSync(file, `${OUT}/${file}`, { recursive: true });

const data = loadData();
const template = readFileSync("index.html", "utf8");
const updated = lastUpdated(data);
writeFileSync(`${OUT}/index.html`, homePage(template, data, updated));
for (const guide of data.guides) {
  if (RESERVED.has(guide.id)) throw new Error(`build-public: the guide id "${guide.id}" is taken by a file of the site; pick another id`);
  writeFileSync(`${OUT}/${guide.id}.html`, guidePage(template, data, guide, updated));
}
writeFileSync(`${OUT}/sitemap.xml`, sitemapXml(data, updated));
writeFileSync(`${OUT}/llms.txt`, llmsTxt(data, updated));
console.log(`build-public: copied ${FILES.length} entries and wrote index.html, ${data.guides.length} guide pages, sitemap.xml and llms.txt to ${OUT}/ (last updated ${updated})`);
