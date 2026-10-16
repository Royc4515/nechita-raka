// What the build publishes for the selected faculty (MULTI-FACULTY-PLAN.md D4, D6, D7):
// public/faculty.js for the browser, manifest.webmanifest, and the mascot and link-preview images
// copied to the paths the site has always used.
import { cpSync, existsSync, mkdirSync } from "node:fs";
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

/**
 * Copies the faculty's images into the output: the mascot folder to assets/mascot/ and the OG image
 * to the path the manifest names, so the addresses stay the same for every faculty.
 */
export function copyFacultyAssets(faculty, out) {
  const dir = `faculties/${faculty.id}`;
  const missing = facultyImageFiles(faculty).filter((file) => !existsSync(`${dir}/${file}`));
  if (missing.length) throw new Error(`build-public: faculty "${faculty.id}" is missing ${missing.map((f) => `${dir}/${f}`).join(", ")}`);
  mkdirSync(`${out}/assets`, { recursive: true });
  cpSync(`${dir}/mascot`, `${out}/assets/mascot`, { recursive: true });
  cpSync(`${dir}/${faculty.site.ogImage.file}`, `${out}/${faculty.site.ogImage.path}`);
}
