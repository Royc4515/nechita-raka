// What the build publishes for the selected faculty (MULTI-FACULTY-PLAN.md D4, D6, D7):
// public/faculty.js for the browser, manifest.webmanifest, and the mascot and link-preview images
// copied to the paths the site has always used.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname } from "node:path";
import { DECOR_STYLES, MASCOT_POSES } from "../faculties/index.js";

// Shared by every faculty; only the name, description and color come from the manifest (D6).
const WEBMANIFEST_ICONS = [
  { src: "./icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "./icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  { src: "./icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  { src: "./icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
];
const BACKGROUND_COLOR = "#f4f7fb"; // --bg of the light theme in index.html

/** The part of a mascot the page may know: names, lines and images, never the model prompts. */
const browserMascot = ({ id, name, nameEn, gender, files, poseWidths, hellos, timely, joined, thinking, peekLines }) =>
  ({ id, name, nameEn, gender, files, poseWidths, hellos, timely, joined, thinking, peekLines });

/** A course category as the courses page shows it: the id of the yearbook mapping, its label and the short chip text. */
const browserCategory = ({ id, label, short }) => ({ id, label, ...(short === undefined ? {} : { short }) });
/** A track as the picker shows it; only the named fields, so a note added to the manifest later never reaches the browser. */
const browserTrack = ({ id, label, short }) => ({ id, label, ...(short === undefined ? {} : { short }) });

/** The browser-safe subset of a manifest: what chat.js, peek.js, index.html and course-browser.js read from window.FACULTY. */
export function browserFaculty(faculty) {
  return {
    id: faculty.id,
    name: faculty.name,
    site: { url: faculty.site.url, shabbat: { title: faculty.site.shabbat.title, lines: faculty.site.shabbat.lines, footer: faculty.site.shabbat.footer } },
    theme: faculty.theme,
    labels: faculty.labels,
    chat: { suggestions: faculty.chat.suggestions },
    // The search's faculty synonyms and the faculty's easter eggs, merged by index.html into its shared lists.
    search: faculty.search,
    eggs: faculty.eggs,
    // The courses page: the categories (chips, section titles) and, for a faculty that has them, the tracks of its picker.
    courses: { categories: faculty.courses.categories.map(browserCategory) },
    ...(faculty.tracks === undefined ? {} : { tracks: faculty.tracks.map(browserTrack) }),
    defaultMascot: faculty.defaultMascot,
    mascots: faculty.mascots.map(browserMascot),
  };
}

/** The text of public/faculty.js. A "<" is escaped so the file is also safe to inline in HTML. */
export function facultyScript(faculty) {
  return `window.FACULTY = ${JSON.stringify(browserFaculty(faculty)).replace(/</g, "\\u003c")};\n`;
}

const jsonField = ([key, value]) => `${JSON.stringify(key)}: ${JSON.stringify(value)}`;

/**
 * A short content hash per icon file of a faculty's own icons folder (faculties/<id>/icons/), {} for a faculty without one
 * (CS keeps the shared set at its plain addresses). A text icon is hashed without carriage returns, so a Windows checkout and
 * the Linux build agree on the version.
 */
export function iconVersions(dir) {
  if (!existsSync(dir)) return {};
  return Object.fromEntries(readdirSync(dir).sort().map((file) => {
    const bytes = readFileSync(`${dir}/${file}`);
    const content = file.endsWith(".svg") ? Buffer.from(bytes.toString("utf8").replaceAll(String.fromCharCode(13), "")) : bytes;
    return [file, createHash("sha1").update(content).digest("hex").slice(0, 8)];
  }));
}

/** "./icons/icon.svg" with ?v=<hash> when the file has a version: browsers keep a tab icon per address, so a new address is how a changed icon reaches returning visitors. */
export const versionedIcon = (src, versions) => {
  const version = versions[src.slice(src.lastIndexOf("/") + 1)];
  return version ? `${src}?v=${version}` : src;
};

/** The text of manifest.webmanifest (the "add to home screen" descriptor), one icon per line; `versions` is iconVersions() of the faculty. */
export function webmanifest(faculty, versions = {}) {
  const fields = {
    name: faculty.pwa.name,
    short_name: faculty.pwa.shortName,
    description: faculty.pwa.description,
    lang: "he",
    dir: "rtl",
    start_url: "./",
    scope: "./",
    display: "standalone",
    background_color: BACKGROUND_COLOR,
    theme_color: faculty.pwa.themeColor,
  };
  const icons = WEBMANIFEST_ICONS.map((icon) => `    { ${Object.entries({ ...icon, src: versionedIcon(icon.src, versions) }).map(jsonField).join(", ")} }`);
  return `{\n${Object.entries(fields).map((f) => `  ${jsonField(f)},`).join("\n")}\n  "icons": [\n${icons.join(",\n")}\n  ]\n}\n`;
}

/** The name a published file takes as an address ("courses-cs-2027.json" -> "courses-cs-2027", served at /courses-cs-2027 too). */
export const nameStem = (file) => file.replace(/\..*$/, "");

/**
 * The reserved names with the faculty's catalog download (courses.download) added. Throws when the download
 * would take the name of a file the build writes itself (course-list.json, data.js...), because the copy
 * would then be overwritten in silence and the "courses file" link would serve the wrong file.
 */
export function reserveDownload(reserved, download) {
  if (reserved.has(nameStem(download))) throw new Error(`build-public: courses.download "${download}" is taken by a file the build writes; pick another name`);
  return new Set([...reserved, nameStem(download)]);
}

/** The hero illustration and its small avatar (site.heroArt), relative to faculties/<id>/; one file when they are the same. */
export const heroArtFiles = (faculty) => [...new Set([faculty.site.heroArt.file, faculty.site.heroArt.avatar])];

/** The files the faculty's design elements need (decor, DECOR_STYLES), relative to faculties/<id>/: published under assets/decor/. */
export const decorFiles = (faculty) => Object.entries(faculty.decor || {}).flatMap(([place, style]) => DECOR_STYLES[place][style].map((file) => `decor/${file}`));

/** Every image file the manifest points to, relative to faculties/<id>/. */
export function facultyImageFiles(faculty) {
  return [
    faculty.site.ogImage.file,
    ...heroArtFiles(faculty),
    ...decorFiles(faculty),
    ...faculty.mascots.flatMap((m) => [`mascot/${m.files.avatar}`, `mascot/${m.files.peek}`, ...MASCOT_POSES.map((pose) => `mascot/${m.files.poses}-${pose}.webp`)]),
  ];
}

/** Where each image of the faculty is published, relative to the output: the same addresses for every faculty (the hero art under assets/ by its own name, decor under assets/decor/). */
export function facultyImageTargets(faculty) {
  return Object.fromEntries(facultyImageFiles(faculty).map((file) => [file, file === faculty.site.ogImage.file ? faculty.site.ogImage.path : `assets/${file}`]));
}

/**
 * Copies only the images the manifest names (never the whole folder, so a stray file under
 * faculties/<id>/ is not published): the mascot images to assets/mascot/ and the OG image to the
 * path the manifest names. Throws when one is missing.
 */
export function copyFacultyAssets(faculty, out, dir = `faculties/${faculty.id}`) {
  const targets = facultyImageTargets(faculty);
  const missing = Object.keys(targets).filter((file) => !existsSync(`${dir}/${file}`));
  if (missing.length) throw new Error(`build-public: faculty "${faculty.id}" is missing ${missing.map((f) => `${dir}/${f}`).join(", ")}`);
  for (const [file, target] of Object.entries(targets)) {
    mkdirSync(dirname(`${out}/${target}`), { recursive: true });
    copyFileSync(`${dir}/${file}`, `${out}/${target}`);
  }
}
