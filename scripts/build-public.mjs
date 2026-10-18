// Copies only what the browser needs into public/, which is all Vercel serves.
// Everything else (api/ source, tests, scripts, README) stays private; the chat function is
// built from api/ separately.
//
// The pages themselves are generated (scripts/prerender.mjs): index.html with the content already in
// the HTML, one page per guide (public/<id>.html, served at /<id> thanks to cleanUrls in vercel.json),
// sitemap.xml and llms.txt. robots.txt gets the faculty's sitemap address; admin.html its accent colors.
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { CATALOG_FILE, loadCourses } from "../api/_lib/courses/model.js";
import { BROWSER_FILES, loadEnglish, siteScript } from "../faculties/content.js";
import { loadIcs } from "./calendar-ics.mjs";
import { FACULTY } from "../faculties/index.js";
import { foreignFacultyLeaks } from "./faculty-guard.mjs";
import { copyFacultyAssets, facultyScript, nameStem, reserveDownload, webmanifest } from "./faculty-public.mjs";
import { guidePage, homePage, lastUpdated, llmsTxt, loadData, robotsTxt, sitemapXml, withAdminIdentity, withTheme } from "./prerender.mjs";

const OUT = "public";
const FILES = [
  "chat.js",
  "chat.css",
  "peek.js",
  "track.js",
  "admin.html",
  "admin.js",
  "robots.txt",
  "course-browser.js",
  "course-ai.js",
  "course-ai-dialog.js",
  "course-calendar.js",
  "course-calendar-dialog.js",
  "course-card.js",
  "course-schedule.js",
  "course-store.js",
  "course-time.js",
  "course-track.js",
  "course-week.js",
  "course-years.js",
  "course-browser.css",
  "shabbat.js",
  "shabbat.css",
  "shabbat-times.js",
  "assets",
  "icons",
];
// Written by the build for the selected faculty (FACULTY env var, default cs; see faculties/index.js):
// the content and its English merged from shared/ and faculties/<id>/ (faculties/content.js), the
// browser's copy of the manifest and the "add to home screen" descriptor.
const GENERATED = [BROWSER_FILES.SITE_DATA, BROWSER_FILES.SITE_EN, "faculty.js", "manifest.webmanifest", FACULTY.calendar.file];
// Names a guide's address must not take: they are files the site already serves, or generated ones. The
// faculty's catalog scan, published under courses.download, joins them and must not take one of them itself.
const RESERVED = reserveDownload(new Set(["index", "sitemap", "llms", "api", "_vercel", "course-list", ...[...FILES, ...GENERATED].map(nameStem)]), FACULTY.courses.download);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
for (const file of [...FILES, "index.html"]) {
  if (!existsSync(file)) throw new Error(`build-public: ${file} is missing`);
}
for (const file of FILES) cpSync(file, `${OUT}/${file}`, { recursive: true });
// The dashboard has the same three accent lines as index.html and takes the faculty's colors the same way, plus its name and share link.
writeFileSync(`${OUT}/admin.html`, withAdminIdentity(withTheme(readFileSync("admin.html", "utf8"), FACULTY.theme), FACULTY.site));
writeFileSync(`${OUT}/robots.txt`, robotsTxt(readFileSync("robots.txt", "utf8")));

// The faculty: the browser's copy of the manifest (names, lines, theme; never the model prompts),
// the "add to home screen" descriptor, and the mascot and link-preview images at their usual addresses.
writeFileSync(`${OUT}/faculty.js`, facultyScript(FACULTY));
writeFileSync(`${OUT}/manifest.webmanifest`, webmanifest(FACULTY));
// The calendar file for the "add all dates to my calendar" button: the university's dates plus the faculty's own (scripts/calendar-ics.mjs).
writeFileSync(`${OUT}/${FACULTY.calendar.file}`, loadIcs(FACULTY));
copyFacultyAssets(FACULTY, OUT);

// The content the browser reads: shared/data.js and faculties/<id>/data.js merged into one data.js,
// as index.html has always read it, and the same for the English pairs.
const data = loadData();
writeFileSync(`${OUT}/${BROWSER_FILES.SITE_DATA}`, siteScript("SITE_DATA", data));
writeFileSync(`${OUT}/${BROWSER_FILES.SITE_EN}`, siteScript("SITE_EN", loadEnglish()));

// WhatsApp group links stay out of every published file, so bots that scan pages and scripts for
// chat.whatsapp.com (that is how spam bots find groups) find nothing. The content files in the repo keep
// the plain links for editing and for the chat server; the published copy builds them in the browser, and
// the prerendered HTML points those links back to the page, which redraws them from data.js on load.
const WA = "https://chat.whatsapp.com/";
const hideWhatsAppInHtml = (html) => html.replaceAll(/href="https:\/\/chat\.whatsapp\.com\/[^"]*"/g, 'href="./#categories"');
const dataJs = readFileSync(`${OUT}/data.js`, "utf8");
writeFileSync(`${OUT}/data.js`, `var __wa = ["https:", "", ["chat", "whatsapp", "com"].join("."), ""].join("/");\n${dataJs.replaceAll("`" + WA, "`${__wa}")}`);

// The catalog scan itself, for students who upload it to an AI to build a schedule (the "courses-file" item in
// the content links to it), and the smaller, shaped copy the courses page and the site search read (api/_lib/courses/model.js).
copyFileSync(CATALOG_FILE, `${OUT}/${FACULTY.courses.download}`);
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
// The faculty guard: a bundle built for one faculty never carries another faculty's manifest, images,
// names or addresses (scripts/faculty-guard.mjs), so a wrong FACULTY on a Vercel project cannot ship them.
const foreign = foreignFacultyLeaks(OUT, FACULTY);
if (foreign.length) throw new Error(`build-public: public/ holds another faculty's data: ${foreign.map((l) => `${l.file} (${l.faculty}: ${l.marker})`).join(", ")}`);
console.log(`build-public: faculty "${FACULTY.id}"; copied ${FILES.length} entries and wrote data.js, data.en.js, faculty.js, manifest.webmanifest, index.html, ${data.guides.length} guide pages, sitemap.xml and llms.txt to ${OUT}/ (last updated ${updated}), and ${courses.courses.length} courses to course-list.json`);
