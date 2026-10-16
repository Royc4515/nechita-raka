// Copies only what the browser needs into public/, which is all Vercel serves.
// Everything else (api/ source, tests, scripts, README) stays private; the chat function is
// built from api/ separately.
//
// The pages themselves are generated (scripts/prerender.mjs): index.html with the content already in
// the HTML, one page per guide (public/<id>.html, served at /<id> thanks to cleanUrls in vercel.json),
// sitemap.xml and llms.txt. robots.txt is copied as is.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { loadCourses } from "../api/_lib/courses/model.js";
import { FACULTY } from "../faculties/index.js";
import { copyFacultyAssets, facultyScript, webmanifest } from "./faculty-public.mjs";
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
  "robots.txt",
  "biu-5787.ics",
  "courses-cs-2027.json",
  "course-browser.js",
  "course-ai.js",
  "course-ai-dialog.js",
  "course-calendar.js",
  "course-calendar-dialog.js",
  "course-card.js",
  "course-schedule.js",
  "course-store.js",
  "course-time.js",
  "course-week.js",
  "course-browser.css",
  "assets",
  "icons",
];
// Written by the build for the selected faculty (FACULTY env var, default cs; see faculties/index.js).
const GENERATED = ["faculty.js", "manifest.webmanifest"];
// Names a guide's address must not take: they are files the site already serves, or generated ones.
const RESERVED = new Set(["index", "sitemap", "llms", "api", "_vercel", "course-list", ...[...FILES, ...GENERATED].map((f) => f.replace(/\..*$/, ""))]);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
for (const file of [...FILES, "index.html"]) {
  if (!existsSync(file)) throw new Error(`build-public: ${file} is missing`);
}
for (const file of FILES) cpSync(file, `${OUT}/${file}`, { recursive: true });

// The faculty: the browser's copy of the manifest (names, lines, theme; never the model prompts),
// the "add to home screen" descriptor, and the mascot and link-preview images at their usual addresses.
writeFileSync(`${OUT}/faculty.js`, facultyScript(FACULTY));
writeFileSync(`${OUT}/manifest.webmanifest`, webmanifest(FACULTY));
copyFacultyAssets(FACULTY, OUT);

// WhatsApp group links stay out of every published file, so bots that scan pages and scripts for
// chat.whatsapp.com (that is how spam bots find groups) find nothing. data.js in the repo keeps the
// plain links for editing and for the chat server; the published copy builds them in the browser, and
// the prerendered HTML points those links back to the page, which redraws them from data.js on load.
const WA = "https://chat.whatsapp.com/";
const hideWhatsAppInHtml = (html) => html.replaceAll(/href="https:\/\/chat\.whatsapp\.com\/[^"]*"/g, 'href="./#categories"');
const dataJs = readFileSync(`${OUT}/data.js`, "utf8");
writeFileSync(`${OUT}/data.js`, `var __wa = ["https:", "", ["chat", "whatsapp", "com"].join("."), ""].join("/");\n${dataJs.replaceAll("`" + WA, "`${__wa}")}`);

const data = loadData();
// The courses page and the site search read this smaller, shaped copy of the catalog scan (api/_lib/courses/model.js).
const courses = loadCourses();
writeFileSync(`${OUT}/course-list.json`, JSON.stringify(courses));
const template = readFileSync("index.html", "utf8");
const updated = lastUpdated(data);
writeFileSync(`${OUT}/index.html`, hideWhatsAppInHtml(homePage(template, data, updated)));
for (const guide of data.guides) {
  if (RESERVED.has(guide.id)) throw new Error(`build-public: the guide id "${guide.id}" is taken by a file of the site; pick another id`);
  writeFileSync(`${OUT}/${guide.id}.html`, hideWhatsAppInHtml(guidePage(template, data, guide, updated, courses)));
}
writeFileSync(`${OUT}/sitemap.xml`, sitemapXml(data, updated));
writeFileSync(`${OUT}/llms.txt`, llmsTxt(data, updated));

// The guard: a WhatsApp link in any published file fails the build.
const walk = (dir) => readdirSync(dir).flatMap((name) => (statSync(`${dir}/${name}`).isDirectory() ? walk(`${dir}/${name}`) : [`${dir}/${name}`]));
const leaks = walk(OUT).filter((file) => /\.(html|js|txt|xml|json|webmanifest|ics|css)$/.test(file) && readFileSync(file, "utf8").includes("chat.whatsapp.com"));
if (leaks.length) throw new Error(`build-public: WhatsApp links are exposed in ${leaks.join(", ")}`);
console.log(`build-public: faculty "${FACULTY.id}"; copied ${FILES.length} entries and wrote faculty.js, manifest.webmanifest, index.html, ${data.guides.length} guide pages, sitemap.xml and llms.txt to ${OUT}/ (last updated ${updated}), and ${courses.courses.length} courses to course-list.json`);
