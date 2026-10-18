// The faculties the site can be built for, and which one this build or server is.
//
// Each faculty is a manifest in faculties/<id>/faculty.js (hand-edited, see faculties/cs/faculty.js).
// The id comes from the FACULTY env var (MULTI-FACULTY-PLAN.md D2), default "cs", so every local
// command and the existing Vercel project behave as before. The manifests are imported statically so
// Vercel's function bundler sees them; adding a faculty is one line in FACULTIES.
import cs from "./cs/faculty.js";
import neuro from "./neuro/faculty.js";

export const FACULTIES = Object.freeze({ cs, neuro });
export const DEFAULT_FACULTY = "cs";

/** The seven poses every mascot has as images, used by index.html's mascot slots. */
export const MASCOT_POSES = Object.freeze(["wave", "think", "celebrate", "point", "calendar", "idea", "laptop"]);
/** The accent set a theme mode holds (index.html :root). */
export const THEME_KEYS = Object.freeze(["accent", "accentHover", "accentInk", "accentText", "accentSoft", "focus"]);
/**
 * The hero blocks the prerender can render (MULTI-FACULTY-PLAN.md D8): "terminal" is the typing terminal of index.html;
 * "eeg" is the same window with a trace that draws itself above the typed lines (scripts/prerender.mjs).
 */
export const HERO_VARIANTS = Object.freeze(["terminal", "eeg"]);
/**
 * The design elements a faculty may turn on (the optional `decor` block): each key is a place on the page, each value a
 * style index.html draws when the build sets data-decor-<key>="<value>" on <html> (scripts/prerender.mjs withDecor),
 * listed with the files under faculties/<id>/decor/ the style needs (published to assets/decor/, scripts/faculty-public.mjs).
 * The styles are a shared vocabulary, like the hero variants: any faculty may use one. A faculty without decor (CS) has none.
 */
export const DECOR_STYLES = Object.freeze({
  // A faint neural network behind the hero, in place of the dotted grid; it breathes slowly in dark mode.
  background: Object.freeze({ synapses: Object.freeze(["synapses.svg"]) }),
  // A small action-potential trace before the section titles, in place of "// "; no "_" after the title, no [ ] on counts.
  headings: Object.freeze({ spike: Object.freeze(["spike.svg"]) }),
  // A neuron drawing on the accent banner tile, in place of "{ }".
  watermark: Object.freeze({ neuron: Object.freeze(["neuron.webp"]) }),
  // A violet lift under the cards in light mode and a faint lit edge in dark mode.
  cards: Object.freeze({ glow: Object.freeze([]) }),
});
/** The colored pieces a terminal line may hold (the .t-* classes in index.html). */
export const TERMINAL_TOKEN_KINDS = Object.freeze(["prompt", "kw", "str", "out", "dim"]);
/** The effects index.html's playEffect() knows; anything else there falls back to confetti. */
export const EFFECT_TYPES = Object.freeze(["drift", "embers", "confetti"]);

const ROOT = new URL("../", import.meta.url);
/** A file of the faculty's folder, repo-relative ("faculties/cs/courses/catalog.json"). */
export const facultyPath = (faculty, file) => `faculties/${faculty.id}/${file}`;
/** The same file as a URL, resolved from this module, so it opens from any working directory and on Vercel. */
export const facultyFile = (faculty, file) => new URL(facultyPath(faculty, file), ROOT);

const ID_RE = /^[a-z][a-z0-9-]*$/;
const COLOR_RE = /^#[0-9a-f]{6}$/;
const NAME_RE = /^[\w-]+$/;
const IMAGE_RE = /^[\w-]+\.(webp|jpg|png)$/;
const HERO_ART_RE = /^[\w-]+\.(webp|jpg|png|svg)$/; // the hero illustration may be a drawn placeholder
const CONTENT_ID_RE = /^[a-z0-9-]+$/; // guide and category ids, as check-data.mjs requires them
const JSON_PATH_RE = /^[\w-]+(\/[\w-]+)*\.json$/; // a data file inside faculties/<id>/, no ".." and no absolute path
const JSON_NAME_RE = /^[\w-]+\.json$/;

const fail = (id, what) => { throw new Error(`faculty "${id}": ${what}`); };
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;

function checkMascot(id, mascot, index) {
  const where = `mascots[${index}]`;
  if (!mascot || typeof mascot !== "object") fail(id, `${where} is not an object`);
  if (!ID_RE.test(mascot.id || "")) fail(id, `${where}.id must be lowercase English letters`);
  for (const key of ["name", "nameEn", "grammar", "character", "joined", "thinking"]) if (!nonEmpty(mascot[key])) fail(id, `${where}.${key} is missing`);
  if (mascot.gender !== "m" && mascot.gender !== "f") fail(id, `${where}.gender must be "m" or "f"`);
  const files = mascot.files || {};
  if (!NAME_RE.test(files.poses || "")) fail(id, `${where}.files.poses must be a plain file prefix`);
  for (const key of ["avatar", "peek"]) if (!IMAGE_RE.test(files[key] || "")) fail(id, `${where}.files.${key} must be a plain image file name`);
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
  // Optional: a pale 1px edge on the mascot images in dark mode (index.html), for mascots drawn on a dark outline.
  if (theme.mascotShadow !== undefined && typeof theme.mascotShadow !== "boolean") fail(id, "theme.mascotShadow must be true or false");
}

/** site.heroArt: the illustration next to the hero on wide screens and the small round avatar next to the brand on phones. */
function checkHeroArt(id, art) {
  if (!art || typeof art !== "object") fail(id, "site.heroArt is missing");
  for (const key of ["file", "avatar"]) if (!HERO_ART_RE.test(art[key] || "")) fail(id, `site.heroArt.${key} must be a plain image file name`);
  if (!nonEmpty(art.alt)) fail(id, "site.heroArt.alt is missing");
  if (!Number.isInteger(art.width) || !Number.isInteger(art.height)) fail(id, "site.heroArt needs whole-number width and height");
}

/** content.order: the display order of guides and categories, ids from shared/data.js and the faculty's data.js (D5). */
function checkContentOrder(id, content) {
  const order = (content || {}).order;
  if (!order || typeof order !== "object") fail(id, "content.order is missing");
  for (const key of ["guides", "categories"]) {
    const list = order[key];
    if (!Array.isArray(list) || !list.length) fail(id, `content.order.${key} must be a non-empty list of ids`);
    for (const entry of list) if (!CONTENT_ID_RE.test(entry || "")) fail(id, `content.order.${key} has an id that is not lowercase English: ${JSON.stringify(entry)}`);
    if (new Set(list).size !== list.length) fail(id, `content.order.${key} lists an id twice`);
  }
}

const isPositiveNumber = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;
// A plain text token may be only spaces (an indent), so it is not trimmed.
const isToken = (token) => (typeof token === "string" && token.length > 0) || (Array.isArray(token) && token.length === 2 && TERMINAL_TOKEN_KINDS.includes(token[0]) && typeof token[1] === "string");

/** hero: the variant the prerender renders, its bar label and, for the terminal, the typed lines (D8). */
function checkHero(id, hero) {
  if (!hero || typeof hero !== "object") fail(id, "hero is missing");
  if (!HERO_VARIANTS.includes(hero.variant)) fail(id, `hero.variant must be one of ${HERO_VARIANTS.join(", ")}`);
  if (!nonEmpty(hero.path)) fail(id, "hero.path is missing");
  if (!Array.isArray(hero.lines) || !hero.lines.length) fail(id, "hero.lines must be a non-empty list");
  hero.lines.forEach((line, i) => {
    const where = `hero.lines[${i}]`;
    if (!line || typeof line !== "object") fail(id, `${where} is not an object`);
    if (!Number.isInteger(line.steps) || line.steps <= 0) fail(id, `${where}.steps must be a positive whole number`);
    if (!isPositiveNumber(line.start) && line.start !== 0) fail(id, `${where}.start must be a number of seconds`);
    if (line.duration !== undefined && !isPositiveNumber(line.duration)) fail(id, `${where}.duration must be a positive number of seconds`);
    if (!Array.isArray(line.tokens) || !line.tokens.length || !line.tokens.every(isToken)) fail(id, `${where}.tokens must be texts or [kind, text] pairs with a kind from ${TERMINAL_TOKEN_KINDS.join(", ")}`);
  });
}

/**
 * courses: the files api/_lib/courses/model.js reads, the published name and how the content calls it ({coursesFile}
 * in shared/data.js, faculties/content.js), the categories (an optional `short` for the chips of the courses page)
 * and the source line (D9).
 */
function checkCourses(id, courses) {
  if (!courses || typeof courses !== "object") fail(id, "courses is missing");
  for (const key of ["catalog", "yearbook"]) if (!JSON_PATH_RE.test(courses[key] || "")) fail(id, `courses.${key} must be a relative .json path inside faculties/${id}/`);
  if (!JSON_NAME_RE.test(courses.download || "")) fail(id, "courses.download must be a plain .json file name");
  for (const key of ["fileLabel", "fileLabelEn"]) if (!nonEmpty(courses[key])) fail(id, `courses.${key} is missing`);
  if (!Array.isArray(courses.categories) || !courses.categories.length) fail(id, "courses.categories must be a non-empty list");
  courses.categories.forEach((category, i) => {
    if (!category || typeof category !== "object") fail(id, `courses.categories[${i}] is not an object`);
    if (!nonEmpty(category.id)) fail(id, `courses.categories[${i}].id is missing`);
    if (!nonEmpty(category.label)) fail(id, `courses.categories[${i}].label is missing`);
    if (category.short !== undefined && !nonEmpty(category.short)) fail(id, `courses.categories[${i}].short must be a text when present`);
  });
  const ids = courses.categories.map((c) => c.id);
  if (new Set(ids).size !== ids.length) fail(id, "courses.categories lists an id twice");
  if (!nonEmpty(courses.officialSource)) fail(id, "courses.officialSource is missing");
}

/** search.synonyms: groups of at least two words, merged into the page's synonym table. */
function checkSearch(id, search) {
  const groups = (search || {}).synonyms;
  if (!Array.isArray(groups)) fail(id, "search.synonyms must be a list of word groups");
  groups.forEach((group, i) => {
    if (!Array.isArray(group) || group.length < 2 || !group.every(nonEmpty)) fail(id, `search.synonyms[${i}] must be a list of at least two words`);
  });
}

/** An egg's effect: a known type, and colors that are plain #rrggbb values, because the page writes them into a style attribute. */
function checkEffect(id, effect, where) {
  if (!effect || typeof effect !== "object") fail(id, `${where} must be an object`);
  if (!EFFECT_TYPES.includes(effect.type)) fail(id, `${where}.type must be one of ${EFFECT_TYPES.join(", ")}`);
  if (effect.colors !== undefined && (!Array.isArray(effect.colors) || !effect.colors.length || !effect.colors.every((c) => COLOR_RE.test(c)))) fail(id, `${where}.colors must be a list of #rrggbb colors`);
  if (effect.glyphs !== undefined && (!Array.isArray(effect.glyphs) || !effect.glyphs.length || !effect.glyphs.every(nonEmpty))) fail(id, `${where}.glyphs must be a non-empty list of texts`);
  if (effect.code !== undefined && typeof effect.code !== "boolean") fail(id, `${where}.code must be true or false`);
}

/** eggs: the words that trigger each one, its toast and an optional effect for index.html's playEffect(). */
function checkEggs(id, eggs) {
  if (!Array.isArray(eggs)) fail(id, "eggs must be a list");
  eggs.forEach((egg, i) => {
    const where = `eggs[${i}]`;
    if (!egg || typeof egg !== "object") fail(id, `${where} is not an object`);
    if (!Array.isArray(egg.words) || !egg.words.length || !egg.words.every(nonEmpty)) fail(id, `${where}.words must be a non-empty list of texts`);
    if (!nonEmpty(egg.toast)) fail(id, `${where}.toast is missing`);
    if (egg.effect !== undefined) checkEffect(id, egg.effect, `${where}.effect`);
  });
}

/**
 * tracks (optional): the faculty's study tracks, unique ids, Hebrew labels and an optional `short` for the course cards.
 * The courses page offers them as a picker and filters by "<track>:<year>" categories; the chat accepts the chosen
 * one in the request (api/_lib/chat/handler.js). A faculty without tracks (CS) has none of that (D9).
 */
function checkTracks(id, tracks) {
  if (tracks === undefined) return;
  if (!Array.isArray(tracks) || !tracks.length) fail(id, "tracks must be a non-empty list when present");
  tracks.forEach((track, i) => {
    if (!track || typeof track !== "object") fail(id, `tracks[${i}] is not an object`);
    if (!ID_RE.test(track.id || "")) fail(id, `tracks[${i}].id must be lowercase English letters`);
    if (!nonEmpty(track.label)) fail(id, `tracks[${i}].label is missing`);
    if (track.short !== undefined && !nonEmpty(track.short)) fail(id, `tracks[${i}].short must be a text when present`);
  });
  const ids = tracks.map((track) => track.id);
  if (new Set(ids).size !== ids.length) fail(id, "tracks lists an id twice");
}

/** decor (optional): known places, each with a known style (DECOR_STYLES); the values land in an attribute of <html>. */
function checkDecor(id, decor) {
  if (decor === undefined) return;
  if (!decor || typeof decor !== "object" || Array.isArray(decor)) fail(id, "decor must be an object when present");
  const places = Object.keys(DECOR_STYLES);
  for (const [place, style] of Object.entries(decor)) {
    if (!Object.hasOwn(DECOR_STYLES, place)) fail(id, `decor.${place} is not a known place (known: ${places.join(", ")})`);
    const styles = Object.keys(DECOR_STYLES[place]);
    if (typeof style !== "string" || !Object.hasOwn(DECOR_STYLES[place], style)) fail(id, `decor.${place} must be one of ${styles.join(", ")}`);
  }
}

/** Throws with the field's name when the manifest is not usable; returns it otherwise. */
export function validateFaculty(faculty) {
  const id = faculty && faculty.id;
  if (!ID_RE.test(id || "")) throw new Error(`faculty: id must be lowercase English letters, got ${JSON.stringify(id)}`);
  for (const key of ["he", "en"]) if (!nonEmpty((faculty.name || {})[key])) fail(id, `name.${key} is missing`);
  const site = faculty.site || {};
  if (!/^https:\/\/[a-z0-9.-]+(:\d+)?$/.test(site.url || "")) fail(id, "site.url must be an https origin (host only, no trailing slash)");
  for (const key of ["brand", "name", "title", "description"]) if (!nonEmpty(site[key])) fail(id, `site.${key} is missing`);
  const department = faculty.department || {};
  if (!nonEmpty(department.name) || !/^https:\/\/[^\s"'<>]+$/.test(department.url || "")) fail(id, "department needs a name and an https url");
  const og = site.ogImage || {};
  if (!IMAGE_RE.test(og.file || "")) fail(id, "site.ogImage.file must be a plain image file name");
  if (!/^[\w-]+(\/[\w-]+)*\.(webp|jpg|png)$/.test(og.path || "")) fail(id, "site.ogImage.path must be a relative image path inside public/");
  if (!Number.isInteger(og.width) || !Number.isInteger(og.height) || !nonEmpty(og.alt)) fail(id, "site.ogImage needs width, height and alt");
  checkHeroArt(id, site.heroArt);
  const pwa = faculty.pwa || {};
  for (const key of ["name", "shortName", "description"]) if (!nonEmpty(pwa[key])) fail(id, `pwa.${key} is missing`);
  if (!COLOR_RE.test(pwa.themeColor || "")) fail(id, "pwa.themeColor must be a #rrggbb color");
  checkTheme(id, faculty.theme);
  if (!nonEmpty((faculty.labels || {}).chatPath)) fail(id, "labels.chatPath is missing");
  checkHero(id, faculty.hero);
  checkCourses(id, faculty.courses);
  checkSearch(id, faculty.search);
  checkEggs(id, faculty.eggs);
  checkContentOrder(id, faculty.content);
  checkTracks(id, faculty.tracks);
  checkDecor(id, faculty.decor);
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
