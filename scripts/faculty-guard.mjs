// The faculty guard: a public/ built for one faculty holds nothing of another faculty (MULTI-FACULTY-PLAN.md D2, D10).
// It works like the WhatsApp guard in build-public.mjs: after the build, every published file is checked and one
// hit fails the build, so a Vercel project with the wrong FACULTY, or a script that still imports faculties/cs/
// directly, can never ship the other faculty's manifest, images, names or addresses.
//
// Two scopes, because the content files may legitimately quote a name or an address in prose (the shared guides
// are written for every faculty, and scripts/check-data.mjs warns when they name one):
// - everywhere: the other faculty's folder path, image file names, page title, app name and accent colors.
// - the files written from the manifest alone (faculty.js, manifest.webmanifest, sitemap.xml, robots.txt, llms.txt):
//   also its site address, its mascot ids and its mascot names. public/faculty.js is parsed too: it must be the active faculty's.
// A text marker is matched as the HTML and JSON writers print it too (escaped quotes), and a Hebrew name with a
// "and" prefix (ובייט) still counts as the name; other prefixes would match words such as בנוי.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { evalScript } from "../faculties/content.js";
import { FACULTIES, FACULTY, MASCOT_POSES } from "../faculties/index.js";
import { heroArtFiles } from "./faculty-public.mjs";
import { accentLine, esc } from "./prerender.mjs";

/** The published files whose text is scanned (the same set as the WhatsApp guard). */
export const TEXT_FILE_RE = /\.(html|js|txt|xml|json|webmanifest|ics|css)$/;
/** The files the build writes from the manifest alone; a foreign name or address there means the wrong manifest was used. */
export const MANIFEST_FILES = Object.freeze(new Set(["faculty.js", "manifest.webmanifest", "sitemap.xml", "robots.txt", "llms.txt"]));

const HEBREW = "\\u0590-\\u05ff";
const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The forms a text takes in the published files: as is, as the HTML writer escapes it, and as JSON prints it. */
const forms = (text) => [...new Set([text, esc(text), JSON.stringify(text).slice(1, -1)])];
/** A name as a whole word: a Hebrew name may carry the "and" prefix (ו, as in ובייט) and is otherwise bounded by non-Hebrew letters (Hebrew has no \b); an English one is bounded by \b. */
const wordRe = (name) => (/[֐-׿]/.test(name) ? new RegExp(`(?<![${HEBREW}])ו?${escapeRe(name)}(?![${HEBREW}])`) : new RegExp(`\\b${escapeRe(name)}\\b`));
const literalRe = (text) => new RegExp(forms(text).map(escapeRe).join("|"));

/** Every image file name a faculty's manifest publishes under assets/mascot/ (the OG image keeps a fixed path and is not a marker). */
export const mascotImageNames = (faculty) => faculty.mascots.flatMap((m) => [m.files.avatar, m.files.peek, ...MASCOT_POSES.map((pose) => `${m.files.poses}-${pose}.webp`)]);
/** The image file names that identify a faculty's bundle: its mascot images and its hero illustration (published under assets/). */
export const facultyImageNames = (faculty) => [...mascotImageNames(faculty), ...heroArtFiles(faculty)];

/** The strings that identify a faculty's bundle, as [label, regexp] pairs: `everywhere` for every text file, `manifestOnly` for MANIFEST_FILES. */
export function facultyMarkers(faculty) {
  const everywhere = [
    [`faculties/${faculty.id}/`, literalRe(`faculties/${faculty.id}/`)],
    [`site.title "${faculty.site.title}"`, literalRe(faculty.site.title)],
    [`pwa.name "${faculty.pwa.name}"`, literalRe(faculty.pwa.name)],
    ...facultyImageNames(faculty).map((name) => [`image ${name}`, literalRe(name)]),
    ...["light", "dark"].map((mode) => [`theme.${mode}`, literalRe(accentLine(faculty.theme[mode]))]),
  ];
  const manifestOnly = [
    [`site.url ${faculty.site.url}`, literalRe(faculty.site.url)],
    ...faculty.mascots.flatMap((m) => [[`mascot id "${m.id}"`, literalRe(`"id":"${m.id}"`)], [`mascot name "${m.name}"`, wordRe(m.name)], [`mascot name "${m.nameEn}"`, wordRe(m.nameEn)]]),
  ];
  return { everywhere, manifestOnly };
}

/** The markers of `other` that `active` does not share (two faculties may legitimately share a value, such as a color). */
function foreignMarkers(other, active) {
  const own = facultyMarkers(active);
  const ownSources = new Set([...own.everywhere, ...own.manifestOnly].map(([, re]) => re.source));
  const { everywhere, manifestOnly } = facultyMarkers(other);
  const notOwn = (list) => list.filter(([, re]) => !ownSources.has(re.source));
  return { everywhere: notOwn(everywhere), manifestOnly: notOwn(manifestOnly) };
}

const walk = (dir) => readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)]));

/** public/faculty.js parsed: anything but the active faculty's id and mascots is a leak. */
function browserManifestLeaks(dir, active) {
  const file = join(dir, "faculty.js");
  if (!existsSync(file)) return [];
  let parsed;
  try {
    parsed = evalScript(readFileSync(file, "utf8"), "FACULTY", "faculty.js");
  } catch (error) {
    return [{ file: "faculty.js", faculty: "?", marker: `not a faculty script (${error.message})` }];
  }
  const describe = (mascots) => (Array.isArray(mascots) ? mascots.map((m) => `${m && m.id}:${m && m.name}:${m && m.nameEn}`).join(",") : "");
  if (parsed.id !== active.id) return [{ file: "faculty.js", faculty: String(parsed.id), marker: `id "${parsed.id}" instead of "${active.id}"` }];
  const want = describe(active.mascots);
  const got = describe(parsed.mascots);
  if (got !== want) return [{ file: "faculty.js", faculty: String(parsed.id), marker: `mascots ${got} instead of ${want}` }];
  return [];
}

/**
 * The files under `dir` (a built public/) that hold another faculty's data: [{ file, faculty, marker }], empty when clean.
 * `active` is the faculty the build is for; `faculties` every known one (faculties/index.js).
 */
export function foreignFacultyLeaks(dir, active = FACULTY, faculties = FACULTIES) {
  const others = Object.values(faculties).filter((f) => f.id !== active.id);
  const ownImages = new Set(facultyImageNames(active));
  const leaks = [...browserManifestLeaks(dir, active)];
  for (const path of walk(dir)) {
    const file = relative(dir, path).replaceAll("\\", "/");
    const text = TEXT_FILE_RE.test(file) ? readFileSync(path, "utf8") : null;
    for (const other of others) {
      if (facultyImageNames(other).includes(basename(file)) && !ownImages.has(basename(file))) leaks.push({ file, faculty: other.id, marker: `image file ${basename(file)}` });
      if (text === null) continue;
      const { everywhere, manifestOnly } = foreignMarkers(other, active);
      for (const [marker, re] of MANIFEST_FILES.has(file) ? [...everywhere, ...manifestOnly] : everywhere) {
        if (re.test(text)) leaks.push({ file, faculty: other.id, marker });
      }
    }
  }
  return leaks;
}
