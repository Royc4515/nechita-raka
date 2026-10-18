// The site's content, merged from two hand-edited files (MULTI-FACULTY-PLAN.md D3 and D5):
// shared/data.js (general Bar-Ilan content) and faculties/<id>/data.js (the faculty's own). The same
// for the English pairs in data.en.js. Every reader of the content (the build, the prerender, the
// chat's knowledge base, the tests) goes through loadContent(), so they all see the same merged data;
// the build writes the merged result to public/data.js, the one file the browser reads.
//
// Merge rules:
// - guides and categories: the union of both files, in the order of content.order in the manifest.
//   A faculty entry with a shared id replaces the shared one whole (no deep merge).
// - featured and site: faculty only.
// - calendar: the shared calendar, with the faculty's events added and everything sorted by date.
// - faq: the shared questions in their order; a faculty question goes after the shared question its
//   `after` names, before the one its `before` names, or at the end when it has neither. Neither is published.
// - placeholders: shared text may say {mascots} (the faculty's two names, "ביט ובייט") and {coursesFile}
//   (how the faculty calls its courses file, courses.fileLabel); loadContent and loadEnglish fill them from
//   the manifest, in Hebrew and in English, so the shared files never name one faculty.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { FACULTY } from "./index.js";

const ROOT = new URL("../", import.meta.url);
const SHARED_KEYS = new Set(["guides", "categories", "calendar", "faq"]);
const FACULTY_KEYS = new Set(["site", "featured", "guides", "categories", "calendar", "faq"]);
const FACULTY_CALENDAR_KEYS = new Set(["events"]);
const ENGLISH_KEYS = new Set(["ui", "content"]);

const fail = (what) => { throw new Error(`content: ${what}`); };
const asList = (value) => (value == null ? [] : Array.isArray(value) ? value : fail("expected a list"));

/** The repo-relative paths of the content files for a faculty, in merge order (shared first). */
export function contentFiles(faculty = FACULTY) {
  return {
    data: ["shared/data.js", `faculties/${faculty.id}/data.js`],
    english: ["shared/data.en.js", `faculties/${faculty.id}/data.en.js`],
  };
}

/** Runs one data file (it sets window.<globalName>) in an empty sandbox and returns the value. */
export function evalScript(source, globalName, filename = "data.js") {
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename, timeout: 1000 });
  const value = sandbox.window[globalName];
  if (!value || typeof value !== "object") fail(`${filename} did not set window.${globalName}`);
  return value;
}

/** Reads a repo-relative data file, resolved from this module so it works from any directory and on Vercel. */
export function readScript(file, globalName) {
  return evalScript(readFileSync(new URL(file, ROOT), "utf8"), globalName, file);
}

function checkKeys(value, allowed, where) {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) fail(`${where} has fields the site does not know: ${unknown.join(", ")} (allowed: ${[...allowed].join(", ")})`);
}

/** The union of two entry lists by id, faculty entries replacing shared ones, in the order of `order`. */
function mergeById(sharedList, facultyList, order, what) {
  const byId = new Map();
  // Within one file a repeated id is a mistake (a pasted copy), never an override; only across files it is.
  for (const list of [asList(sharedList), asList(facultyList)]) {
    const ids = list.map((entry) => entry && entry.id);
    const twice = ids.find((id, i) => ids.indexOf(id) !== i);
    if (twice !== undefined) fail(`${what}: the id "${twice}" appears twice in the same file`);
    for (const entry of list) byId.set(entry.id, entry);
  }
  if (!Array.isArray(order) || !order.length) fail(`the manifest's content.order.${what} is missing`);
  const seen = new Set();
  const merged = order.map((id) => {
    if (seen.has(id)) fail(`content.order.${what} lists "${id}" twice`);
    seen.add(id);
    return byId.get(id) || fail(`content.order.${what} names "${id}", which neither shared/data.js nor the faculty's data.js has`);
  });
  const unordered = [...byId.keys()].filter((id) => !seen.has(id));
  if (unordered.length) fail(`${what} ${unordered.map((id) => `"${id}"`).join(", ")} must be added to content.order.${what} in the faculty manifest, or they would not show`);
  return merged;
}

/** Shared events plus the faculty's, sorted by date (stable: equal dates keep file order, shared first). */
function mergeCalendar(shared, faculty) {
  if (!shared || typeof shared !== "object") fail("shared/data.js has no calendar");
  const extra = faculty || {};
  checkKeys(extra, FACULTY_CALENDAR_KEYS, "the faculty's calendar");
  const events = [...asList(shared.events), ...asList(extra.events)];
  const dated = events.every((ev) => ev && typeof ev.date === "string");
  return { ...shared, events: dated ? [...events].sort((a, b) => a.date.localeCompare(b.date)) : events };
}

/** Shared questions in order; a faculty question goes after (or before) the shared question it names, else last. */
function mergeFaq(shared, faculty) {
  const sharedList = asList(shared);
  const heads = sharedList.map(() => []);
  const merged = sharedList.map((entry) => [entry]);
  const tail = [];
  for (const entry of asList(faculty)) {
    const { after, before, ...rest } = entry;
    if (after != null && before != null) fail(`the FAQ "${rest.q}" says both after and before; pick one`);
    if (after == null && before == null) { tail.push(entry); continue; }
    const [key, name] = after != null ? ["after", after] : ["before", before];
    const at = sharedList.findIndex((shared) => shared && shared.q === name);
    if (at < 0) fail(`the FAQ "${rest.q}" says ${key}: "${name}", but no shared question has that exact text`);
    (key === "after" ? merged : heads)[at].push(rest);
  }
  return [...merged.flatMap((group, i) => [...heads[i], ...group]), ...tail];
}

// ---------- Placeholders: what shared text may say about the faculty without naming it ----------

const PLACEHOLDER_RE = /\{(mascots|coursesFile)\}/g;

/** The values of {mascots} and {coursesFile} for a faculty, in Hebrew (he) and English (en). */
export function contentPlaceholders(faculty = FACULTY) {
  return {
    he: { mascots: faculty.mascots.map((m) => m.name).join(" ו"), coursesFile: faculty.courses.fileLabel },
    en: { mascots: faculty.mascots.map((m) => m.nameEn).join(" and "), coursesFile: faculty.courses.fileLabelEn },
  };
}

/** A text with the known placeholders filled; anything else in braces ({n}, {name}) is left for the page. */
export const fillText = (text, values) => (values ? text.replace(PLACEHOLDER_RE, (m, key) => values[key]) : text);

/** The same value with every string filled, as a new object (lists and objects are copied, never changed in place). */
export function fillPlaceholders(value, values) {
  if (!values) return value;
  if (typeof value === "string") return fillText(value, values);
  if (Array.isArray(value)) return value.map((v) => fillPlaceholders(v, values));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fillPlaceholders(v, values)]));
  return value;
}

/**
 * The merged content, as index.html has always read it from data.js, with the placeholders filled when
 * `placeholders` (contentPlaceholders) is given. Throws on anything the rules reject.
 */
export function mergeContent(shared, faculty, order, placeholders = null) {
  checkKeys(shared, SHARED_KEYS, "shared/data.js");
  checkKeys(faculty, FACULTY_KEYS, "the faculty's data.js");
  if (!faculty.site || typeof faculty.site !== "object") fail("the faculty's data.js has no site block");
  if (!order || typeof order !== "object") fail("the manifest has no content.order");
  return fillPlaceholders({
    site: faculty.site,
    featured: asList(faculty.featured),
    guides: mergeById(shared.guides, faculty.guides, order.guides, "guides"),
    categories: mergeById(shared.categories, faculty.categories, order.categories, "categories"),
    calendar: mergeCalendar(shared.calendar, faculty.calendar),
    faq: mergeFaq(shared.faq, faculty.faq),
  }, placeholders && placeholders.he);
}

/** The merged English pairs: ui and content from both files, shared first; each pair filled in its own language. */
export function mergeEnglish(shared, faculty, placeholders = null) {
  checkKeys(shared, ENGLISH_KEYS, "shared/data.en.js");
  checkKeys(faculty, ENGLISH_KEYS, "the faculty's data.en.js");
  const pair = ([he, en]) => [fillText(he, placeholders && placeholders.he), fillText(en, placeholders && placeholders.en)];
  return { ui: [...asList(shared.ui), ...asList(faculty.ui)].map(pair), content: [...asList(shared.content), ...asList(faculty.content)].map(pair) };
}

/** The site's content for a faculty, merged from its two files, placeholders filled. */
export function loadContent(faculty = FACULTY) {
  const [shared, own] = contentFiles(faculty).data.map((file) => readScript(file, "SITE_DATA"));
  return mergeContent(shared, own, faculty.content && faculty.content.order, contentPlaceholders(faculty));
}

/** The site's English pairs for a faculty, merged from its two files, placeholders filled. */
export function loadEnglish(faculty = FACULTY) {
  const [shared, own] = contentFiles(faculty).english.map((file) => readScript(file, "SITE_EN"));
  return mergeEnglish(shared, own, contentPlaceholders(faculty));
}

// ---------- Serialization: the merged data as a script the browser runs ----------

/** A template literal: the build hides WhatsApp links by their opening backtick, so strings keep that form. */
const literal = (text) => `\`${text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${").replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`)}\``;
const KEY_RE = /^[A-Za-z_$][\w$]*$/;

function toJs(value, indent) {
  if (typeof value === "string") return literal(value);
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean" || value === null) return String(value);
  const inner = `${indent}  `;
  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    // A list of texts or numbers (keywords, steps, featured) stays on one line, like the hand-written files.
    if (value.every((v) => typeof v !== "object" || v === null)) return `[${value.map((v) => toJs(v, inner)).join(", ")}]`;
    return `[\n${value.map((v) => `${inner}${toJs(v, inner)},`).join("\n")}\n${indent}]`;
  }
  if (value && typeof value === "object") {
    const fields = Object.entries(value).filter(([, v]) => v !== undefined);
    // In a browser object literal `__proto__:` sets the prototype instead of a field; the content never needs it.
    if (fields.some(([k]) => k === "__proto__")) fail("a field named __proto__ cannot be written to the browser's data file");
    return fields.length ? `{\n${fields.map(([k, v]) => `${inner}${KEY_RE.test(k) ? k : JSON.stringify(k)}: ${toJs(v, inner)},`).join("\n")}\n${indent}}` : "{}";
  }
  fail(`cannot write a ${typeof value} to the browser's data file`);
}

/** The text of public/data.js or public/data.en.js: `window.<name> = {...};`, strings in backticks. */
export function siteScript(globalName, value) {
  return `window.${globalName} = ${toJs(value, "")};\n`;
}

/** The repo-relative path of the generated browser file for a global name. */
export const BROWSER_FILES = Object.freeze({ SITE_DATA: "data.js", SITE_EN: "data.en.js" });
