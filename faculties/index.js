// The faculties the site can be built for, and which one this build or server is.
//
// Each faculty is a manifest in faculties/<id>/faculty.js (hand-edited, see faculties/cs/faculty.js).
// The id comes from the FACULTY env var (MULTI-FACULTY-PLAN.md D2), default "cs", so every local
// command and the existing Vercel project behave as before. The manifests are imported statically so
// Vercel's function bundler sees them; adding a faculty is one line in FACULTIES.
import cs from "./cs/faculty.js";

export const FACULTIES = Object.freeze({ cs });
export const DEFAULT_FACULTY = "cs";

/** The seven poses every mascot has as images, used by index.html's mascot slots. */
export const MASCOT_POSES = Object.freeze(["wave", "think", "celebrate", "point", "calendar", "idea", "laptop"]);
/** The accent set a theme mode holds (index.html :root). */
export const THEME_KEYS = Object.freeze(["accent", "accentHover", "accentInk", "accentText", "accentSoft", "focus"]);

const ID_RE = /^[a-z][a-z0-9-]*$/;
const COLOR_RE = /^#[0-9a-f]{6}$/;
const FILE_RE = /^[\w.-]+$/;

const fail = (id, what) => { throw new Error(`faculty "${id}": ${what}`); };
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;

function checkMascot(id, mascot, index) {
  const where = `mascots[${index}]`;
  if (!mascot || typeof mascot !== "object") fail(id, `${where} is not an object`);
  if (!ID_RE.test(mascot.id || "")) fail(id, `${where}.id must be lowercase English letters`);
  for (const key of ["name", "nameEn", "grammar", "character", "joined", "thinking"]) if (!nonEmpty(mascot[key])) fail(id, `${where}.${key} is missing`);
  if (mascot.gender !== "m" && mascot.gender !== "f") fail(id, `${where}.gender must be "m" or "f"`);
  const files = mascot.files || {};
  for (const key of ["poses", "avatar", "peek"]) if (!FILE_RE.test(files[key] || "")) fail(id, `${where}.files.${key} is missing or not a plain file name`);
  for (const pose of MASCOT_POSES) if (!Number.isInteger((mascot.poseWidths || {})[pose])) fail(id, `${where}.poseWidths.${pose} must be a whole number`);
  if (!Array.isArray(mascot.hellos) || !mascot.hellos.length || !mascot.hellos.every(nonEmpty)) fail(id, `${where}.hellos must be a non-empty list of texts`);
  for (const slot of ["morning", "evening", "night"]) if (!nonEmpty((mascot.timely || {})[slot])) fail(id, `${where}.timely.${slot} is missing`);
  if (!Array.isArray(mascot.peekLines) || !mascot.peekLines.length || !mascot.peekLines.every(nonEmpty)) fail(id, `${where}.peekLines must be a non-empty list of texts`);
}

function checkTheme(id, theme) {
  for (const mode of ["light", "dark"]) {
    const set = (theme || {})[mode];
    if (!set || typeof set !== "object") fail(id, `theme.${mode} is missing`);
    for (const key of THEME_KEYS) if (!COLOR_RE.test(set[key] || "")) fail(id, `theme.${mode}.${key} must be a #rrggbb color`);
  }
}

/** Throws with the field's name when the manifest is not usable; returns it otherwise. */
export function validateFaculty(faculty) {
  const id = faculty && faculty.id;
  if (!ID_RE.test(id || "")) throw new Error(`faculty: id must be lowercase English letters, got ${JSON.stringify(id)}`);
  for (const key of ["he", "en"]) if (!nonEmpty((faculty.name || {})[key])) fail(id, `name.${key} is missing`);
  const site = faculty.site || {};
  if (!/^https:\/\/[^\s/]+$/.test(site.url || "")) fail(id, "site.url must be an https origin without a trailing slash");
  for (const key of ["brand", "name", "title", "description"]) if (!nonEmpty(site[key])) fail(id, `site.${key} is missing`);
  const og = site.ogImage || {};
  if (!FILE_RE.test(og.file || "")) fail(id, "site.ogImage.file must be a plain file name");
  if (!/^[\w./-]+$/.test(og.path || "") || og.path.startsWith("/") || og.path.includes("..")) fail(id, "site.ogImage.path must be a relative path inside public/");
  if (!Number.isInteger(og.width) || !Number.isInteger(og.height) || !nonEmpty(og.alt)) fail(id, "site.ogImage needs width, height and alt");
  const pwa = faculty.pwa || {};
  for (const key of ["name", "shortName", "description"]) if (!nonEmpty(pwa[key])) fail(id, `pwa.${key} is missing`);
  if (!COLOR_RE.test(pwa.themeColor || "")) fail(id, "pwa.themeColor must be a #rrggbb color");
  checkTheme(id, faculty.theme);
  for (const key of ["chatPath", "heroPath"]) if (!nonEmpty((faculty.labels || {})[key])) fail(id, `labels.${key} is missing`);
  if (!Array.isArray(faculty.mascots) || faculty.mascots.length !== 2) fail(id, "mascots must be a list of exactly two");
  faculty.mascots.forEach((m, i) => checkMascot(id, m, i));
  const genders = faculty.mascots.map((m) => m.gender).sort().join("");
  if (genders !== "fm") fail(id, "mascots must be one masculine (m) and one feminine (f)");
  if (faculty.mascots[0].id === faculty.mascots[1].id) fail(id, "the two mascots share an id");
  if (!faculty.mascots.some((m) => m.id === faculty.defaultMascot)) fail(id, "defaultMascot is not one of the mascots");
  return faculty;
}

/** The faculty id for this run: FACULTY from the environment, or the default. Unknown ids throw. */
export function facultyIdFrom(env = process.env) {
  const raw = typeof env.FACULTY === "string" ? env.FACULTY.trim() : "";
  const id = raw || DEFAULT_FACULTY;
  if (!Object.hasOwn(FACULTIES, id)) throw new Error(`FACULTY="${id}" is not a known faculty (known: ${Object.keys(FACULTIES).join(", ")})`);
  return id;
}

/** The validated manifest of the faculty this run is for. */
export function selectFaculty(env = process.env) {
  return validateFaculty(FACULTIES[facultyIdFrom(env)]);
}

/** The faculty of this process, picked once at import. */
export const FACULTY = selectFaculty();
