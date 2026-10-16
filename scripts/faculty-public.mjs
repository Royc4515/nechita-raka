// What the build publishes for the selected faculty (MULTI-FACULTY-PLAN.md D4, D6, D7):
// public/faculty.js for the browser, manifest.webmanifest, and the mascot and link-preview images
// copied to the paths the site has always used.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { MASCOT_POSES } from "../faculties/index.js";

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

/** The browser-safe subset of a manifest: what chat.js, peek.js and index.html read from window.FACULTY. */
export function browserFaculty(faculty) {
  return {
    id: faculty.id,
    name: faculty.name,
    site: { url: faculty.site.url },
    theme: faculty.theme,
    labels: faculty.labels,
    // The search's faculty synonyms and the faculty's easter eggs, merged by index.html into its shared lists.
    search: faculty.search,
    eggs: faculty.eggs,
    defaultMascot: faculty.defaultMascot,
    mascots: faculty.mascots.map(browserMascot),
  };
}

/** The text of public/faculty.js. A "<" is escaped so the file is also safe to inline in HTML. */
export function facultyScript(faculty) {
  return `window.FACULTY = ${JSON.stringify(browserFaculty(faculty)).replace(/</g, "\\u003c")};\n`;
}

const jsonField = ([key, value]) => `${JSON.stringify(key)}: ${JSON.stringify(value)}`;

/** The text of manifest.webmanifest (the "add to home screen" descriptor), one icon per line. */
export function webmanifest(faculty) {
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
  const icons = WEBMANIFEST_ICONS.map((icon) => `    { ${Object.entries(icon).map(jsonField).join(", ")} }`);
  return `{\n${Object.entries(fields).map((f) => `  ${jsonField(f)},`).join("\n")}\n  "icons": [\n${icons.join(",\n")}\n  ]\n}\n`;
}

/** Every image file the manifest points to, relative to faculties/<id>/. */
export function facultyImageFiles(faculty) {
  return [
    faculty.site.ogImage.file,
    ...faculty.mascots.flatMap((m) => [`mascot/${m.files.avatar}`, `mascot/${m.files.peek}`, ...MASCOT_POSES.map((pose) => `mascot/${m.files.poses}-${pose}.webp`)]),
  ];
}

/** Where each image of the faculty is published, relative to the output: the same addresses for every faculty. */
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
