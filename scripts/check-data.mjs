// Checks the content before it reaches the site. Run: node scripts/check-data.mjs
// The content lives in two files, shared/data.js and faculties/<id>/data.js (FACULTY env, default cs),
// merged at build time (faculties/content.js). Each file is checked on its own first, so a missing
// comma or backtick is reported with its file and line; then the merged result is checked the way the
// page sees it, and every message points at the file and line where the value is written.
// Errors (exit code 1) are things that break or hide content on the site.
// Warnings are worth a look but do not fail the check.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { contentFiles, mergeContent, mergeEnglish } from "../faculties/content.js";
import { FACULTIES, FACULTY } from "../faculties/index.js";

const FILES = contentFiles(FACULTY);
const ICS_FILE = "biu-5787.ics";
const errors = [];
const warnings = [];

// The source text of every content file, by path, so a message can point at a line.
const sources = Object.fromEntries([...FILES.data, ...FILES.english].map((file) => [file, readFileSync(file, "utf8").split("\n")]));
// Searched faculty file first: when both files have the value, the faculty's entry is the one the page shows.
const DATA_FILES = [...FILES.data].reverse();

/** The file and line where a value first appears (or last, with `last`), so the message points at it. */
function locate(needle, last = false, files = DATA_FILES) {
  if (!needle) return {};
  for (const file of files) {
    const lines = sources[file];
    const i = last ? lines.findLastIndex((l) => l.includes(needle)) : lines.findIndex((l) => l.includes(needle));
    if (i >= 0) return { file, line: i + 1 };
  }
  return {};
}
const error = (msg, needle) => errors.push({ msg, ...locate(needle) });
const warn = (msg, needle) => warnings.push({ msg, ...locate(needle) });

function report() {
  const gh = process.env.GITHUB_ACTIONS === "true";
  for (const [kind, list] of [["error", errors], ["warning", warnings]]) {
    for (const { msg, file, line } of list) {
      const where = file ? `${file}${line ? ` (שורה ${line})` : ""}` : "";
      if (gh) console.log(`::${kind} ${file ? `file=${file}${line ? `,line=${line}` : ""}` : ""}::${msg}`);
      else console.log(`${kind === "error" ? "שגיאה" : "אזהרה"}${where ? ` ב-${where}` : ""}: ${msg}`);
    }
  }
  console.log(errors.length ? `\nנמצאו ${errors.length} שגיאות.` : `\n${FILES.data.join(" ו-")} תקינים.`);
  process.exit(errors.length ? 1 : 0);
}

// ---------- 1. Does each file run at all? ----------
function loadFile(file, globalName) {
  const lines = sources[file];
  // Smart quotes (a phone keyboard's) outside a text break the Hebrew content files; English texts may use them.
  if (globalName === "SITE_DATA") lines.forEach((l, i) => {
    if (/[‘’“”]/.test(l) && !l.trim().startsWith("//")) {
      const outside = l.replace(/`[^`]*`/g, "");
      if (/[‘’“”]/.test(outside)) errors.push({ msg: "גרשיים \"חכמים\" (‘ ’ או “ ”) מחוץ לטקסט. מחליפים אותם בגרש הפוך `.", file, line: i + 1 });
    }
  });
  const sandbox = { window: {} };
  try {
    vm.runInNewContext(lines.join("\n"), sandbox, { filename: file });
  } catch (err) {
    const m = String(err.stack || "").match(new RegExp(`${file.replace(/[./]/g, "\\$&")}:(\\d+)`));
    errors.push({ msg: `הקובץ לא נטען: ${err.message}. בדרך כלל זה פסיק חסר או גרש הפוך חסר, בשורה הזו או בזו שלפניה.`, file, line: m ? Number(m[1]) : 0 });
    return null;
  }
  const value = sandbox.window[globalName];
  if (!value || typeof value !== "object") {
    errors.push({ msg: `חסר window.${globalName} בתחילת הקובץ.`, file });
    return null;
  }
  for (const key of ["guides", "categories", "faq"]) {
    if (globalName === "SITE_DATA" && value[key] != null && !Array.isArray(value[key])) errors.push({ msg: `${key} צריך להיות רשימה בתוך [ ].`, file, line: locate(`${key}:`, false, [file]).line });
  }
  // The same id twice in one file is a pasted copy, and the merge would keep only the last one.
  for (const key of ["guides", "categories"]) {
    const ids = Array.isArray(value[key]) ? value[key].map((entry) => entry && entry.id) : [];
    for (const id of new Set(ids.filter((id, i) => id && ids.indexOf(id) !== i))) errors.push({ msg: `המזהה "${id}" מופיע פעמיים ב-${key} של הקובץ הזה. כל id חייב להיות ייחודי.`, file, line: locate(`id: \`${id}\``, true, [file]).line });
  }
  return value;
}

const [sharedData, facultyData] = FILES.data.map((file) => loadFile(file, "SITE_DATA"));
if (!sharedData || !facultyData) report();

// ---------- 2. The merge (the rules in faculties/content.js, named there when one is broken) ----------
let data;
try {
  data = mergeContent(sharedData, facultyData, FACULTY.content.order);
} catch (err) {
  errors.push({ msg: err.message });
  report();
}

// ---------- 3. Shape of the merged content ----------
const isList = (v) => Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim().length > 0;
const isHttps = (v) => typeof v === "string" && /^https:\/\/[^\s]+$/.test(v);
const ISO = /^\d{4}-\d{2}-\d{2}$/;
function isRealDate(v) {
  if (typeof v !== "string" || !ISO.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const itemIds = new Set();
for (const cat of data.categories) {
  if (!isText(cat.id) || !isText(cat.title)) error("לקטגוריה חסר id או title.", cat.title || cat.id);
  if (!isList(cat.items)) { error(`בקטגוריה "${cat.title}" השדה items צריך להיות רשימה.`, cat.title); continue; }
  for (const item of cat.items) {
    const where = item.id || item.name;
    if (!isText(item.id)) error(`לפריט "${item.name || item.desc}" חסר id.`, item.name || item.desc);
    else if (itemIds.has(item.id)) errors.push({ msg: `המזהה "${item.id}" מופיע פעמיים. כל id חייב להיות ייחודי.`, ...locate(`id: \`${item.id}\``, true) });
    itemIds.add(item.id);
    if (!isText(item.desc)) error(`לפריט "${where}" חסר desc, ולכן הוא לא יוצג.`, where);
    if (!isText(item.name)) warn(`לפריט "${where}" חסר name.`, where);
    if (!isHttps(item.url)) error(`הקישור של "${where}" לא מתחיל ב-https://, ולכן הפריט לא יוצג.`, where);
  }
}

for (const id of data.featured) {
  if (!itemIds.has(id)) error(`"${id}" ברשימת featured לא קיים באף קטגוריה.`, `\`${id}\``);
}

// "mentor" is the private WhatsApp link built from site.whatsapp
const site = data.site;
const hasMentor = /^\d{9,15}$/.test(String(site.whatsapp || "").replace(/\D/g, ""));
if (site.whatsapp && !hasMentor) error("site.whatsapp צריך להיות מספר בפורמט בינלאומי, למשל 972501234567.", "whatsapp:");

const guideIds = new Set(data.guides.map((g) => g && g.id));
function checkLinks(links, owner, at) {
  if (links == null) return;
  if (!isList(links)) { error(`ב${owner} השדה links צריך להיות רשימה.`, owner); return; }
  for (const link of links) {
    if (link === "mentor") {
      if (!hasMentor) warn(`ב${owner} יש כפתור "mentor", והוא יופיע רק כשימולא site.whatsapp.`, at);
    } else if (typeof link === "string") {
      if (!itemIds.has(link)) error(`ב${owner} הקישור "${link}" לא קיים באף קטגוריה.`, `\`${link}\``);
    } else if (link && link.guide) {
      if (!guideIds.has(link.guide)) error(`ב${owner} יש קישור למדריך "${link.guide}" שלא קיים.`, link.guide);
      if (!isText(link.label)) error(`ב${owner} לקישור למדריך "${link.guide}" חסר label.`, link.guide);
    } else if (!link || !isText(link.label) || !isHttps(link.url)) {
      error(`ב${owner} יש קישור בלי label, או עם כתובת שלא מתחילה ב-https://.`, (link && (link.label || link.url)) || owner);
    }
  }
}

function checkGuide(g) {
  const where = g.title || g.id;
  if (!/^[a-z0-9-]+$/.test(g.id || "")) error(`למדריך "${where}" צריך id באנגלית קטנה, בלי רווחים.`, where);
  if (!isText(g.title)) error(`למדריך "${g.id}" חסר title.`, g.id);
  if (!isList(g.steps) || !g.steps.length) error(`למדריך "${where}" חסרים steps, ולכן הוא לא יוצג.`, where);
  else g.steps.forEach((s, i) => { if (!isText(s)) error(`בצעד ${i + 1} של "${where}" אין טקסט.`, where); });
  if (g.tips != null && !isList(g.tips)) error(`ב"${where}" השדה tips צריך להיות רשימה.`, where);
  checkLinks(g.links, `מדריך "${where}"`, where);
  if (g.stepLinks != null) checkStepLinks(g, where);
  if (g.map != null && (!isHttps(g.map.url) || !isHttps(g.map.embed))) error(`במדריך "${where}" ל-map צריך url ו-embed שמתחילים ב-https://.`, where);
  for (const src of g.sources || []) if (!isHttps(src.url)) error(`מקור עם כתובת לא תקינה במדריך "${where}".`, src.label || where);
  if (g.courses != null && g.courses !== true) error(`במדריך "${where}" השדה courses הוא true או שלא כותבים אותו.`, where);
  if (!isList(g.sources) || !g.sources.length) warn(`למדריך "${where}" אין sources. כדאי לציין מאיפה המידע.`, where);
}

function checkStepLinks(g, where) {
  if (typeof g.stepLinks !== "object" || Array.isArray(g.stepLinks)) { error(`ב"${where}" השדה stepLinks צריך להיות { מספר צעד: [קישורים] }.`, where); return; }
  for (const [n, stepLinks] of Object.entries(g.stepLinks)) {
    const number = Number(n);
    if (!Number.isInteger(number) || number < 1 || number > (g.steps || []).length) error(`ב-stepLinks של "${where}" אין צעד ${n}. מספרים את הצעדים מ-1.`, where);
    const owner = `צעד ${n} של "${where}"`;
    if (!isList(stepLinks)) { error(`ב${owner} הקישורים צריכים להיות רשימה.`, where); continue; }
    checkLinks(stepLinks.map((link) => (link && typeof link === "object" && link.id ? link.id : link)), owner, where);
    for (const link of stepLinks) {
      if (link && typeof link === "object" && link.at != null && !String((g.steps || [])[number - 1] || "").includes(link.at)) error(`ב${owner} הביטוי at "${link.at}" לא מופיע בטקסט הצעד.`, link.at);
    }
  }
}

data.guides.forEach(checkGuide);
if (data.guides.filter((g) => g.courses === true).length > 1) error("רק מדריך אחד יכול להציג את רשימת הקורסים (courses: true).", "courses: true");

const cal = data.calendar;
for (const t of cal.terms || []) {
  if (!isRealDate(t.from) || !isRealDate(t.to)) error(`תאריך לא תקין בתקופה "${t.label}". הפורמט: שנה-חודש-יום.`, t.label);
  else if (t.to < t.from) error(`בתקופה "${t.label}" תאריך הסיום לפני תאריך ההתחלה.`, t.label);
}
const events = cal.events;
for (const ev of events) {
  const where = ev.title || ev.date;
  if (!isText(ev.title)) error(`לתאריך ${ev.date} חסר title.`, ev.date);
  if (!isRealDate(ev.date)) error(`התאריך "${ev.date}" של "${where}" לא תקין. הפורמט: שנה-חודש-יום, למשל 2027-03-01.`, where);
  if (ev.until != null && !isRealDate(ev.until)) error(`תאריך הסיום "${ev.until}" של "${where}" לא תקין.`, where);
  if (isRealDate(ev.date) && isRealDate(ev.until) && ev.until < ev.date) error(`ב"${where}" תאריך הסיום לפני תאריך ההתחלה.`, where);
  if (ev.time != null && !/^\d{1,2}:\d{2}$/.test(ev.time)) error(`השעה "${ev.time}" של "${where}" לא תקינה. הפורמט: 14:00.`, where);
  if (ev.guide && !guideIds.has(ev.guide)) error(`"${where}" מקושר למדריך "${ev.guide}" שלא קיים.`, where);
  if (ev.link != null && (!isText(ev.link.label) || !isHttps(ev.link.url))) error(`ב"${where}" השדה link צריך להיות { label, url } עם קישור שמתחיל ב-https://.`, where);
  if (ev.kind != null && ev.kind !== "birthday") error(`ב"${where}" הערך של kind צריך להיות birthday (או בלי kind בכלל).`, where);
  if (ev.celebrate != null && !isRealDate(ev.celebrate)) error(`תאריך החגיגה "${ev.celebrate}" של "${where}" לא תקין.`, where);
}

for (const f of data.faq) {
  if (!isText(f.q) || !isText(f.a)) error(`לשאלה "${f.q || f.a || "?"}" חסר q או a, ולכן היא לא תוצג.`, f.q || f.a);
  checkLinks(f.links, `שאלה "${f.q}"`, f.q);
  if (f.guide && !guideIds.has(f.guide)) error(`השאלה "${f.q}" מקושרת למדריך "${f.guide}" שלא קיים.`, f.q);
  if (f.more != null && !isText(f.more)) error(`בשאלה "${f.q}" השדה more צריך להיות טקסט.`, f.q);
  if (f.sources != null && !isList(f.sources)) error(`בשאלה "${f.q}" השדה sources צריך להיות רשימה.`, f.q);
  for (const src of isList(f.sources) ? f.sources : []) if (!isHttps(src.url) || !isText(src.label)) error(`בשאלה "${f.q}" יש מקור בלי label או עם כתובת שלא מתחילה ב-https://.`, f.q);
  // Search engines and AI answers quote the question as-is, so it should read like one.
  if (isText(f.q) && !/\?$/.test(f.q.trim())) warn(`השאלה "${f.q}" לא מסתיימת בסימן שאלה.`, f.q);
}

// ---------- 3b. Shared content is for every faculty (a warning: the other faculty's site shows it as is) ----------
const SHARED_FILE = FILES.data[0];
// The name as a whole word, with an optional "and" prefix (ובייט; other prefixes would match words such as בנוי); escaped, the manifest is hand-edited.
const hebrewWord = (name) => new RegExp(`(?<![\\u0590-\\u05ff])ו?${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\u0590-\\u05ff])`);
const sharedTexts = [];
const collect = (value) => { if (typeof value === "string") sharedTexts.push(value); else if (Array.isArray(value)) value.forEach(collect); else if (value && typeof value === "object") Object.values(value).forEach(collect); };
collect(sharedData);
for (const faculty of Object.values(FACULTIES)) {
  const needles = [...faculty.mascots.map((m) => [hebrewWord(m.name), `הקמע "${m.name}" של ${faculty.name.he}`]), [new RegExp(faculty.site.url.replace(/[.]/g, "\\$&")), `הכתובת ${faculty.site.url} של ${faculty.name.he}`]];
  for (const [re, what] of needles) {
    if (!sharedTexts.some((text) => re.test(text))) continue;
    const line = sources[SHARED_FILE].findIndex((l) => !l.trim().startsWith("//") && re.test(l)) + 1;
    warnings.push({ msg: `${SHARED_FILE} מזכיר את ${what}. התוכן המשותף מוצג גם באתר של פקולטה אחרת, לכן כדאי להעביר את הפריט לקובץ של הפקולטה או לנסח בלי השם.`, file: SHARED_FILE, line });
  }
}

// ---------- 4. Calendar file drift (a warning: the .ics is edited separately) ----------
try {
  const ics = readFileSync(ICS_FILE, "utf8").replace(/\r\n /g, "");
  const icsRanges = new Set([...ics.matchAll(/DTSTART;VALUE=DATE:(\d{8})\r?\nDTEND;VALUE=DATE:(\d{8})/g)].map((m) => `${m[1]}-${m[2]}`));
  const icsStarts = new Set([...ics.matchAll(/DTSTART(?:;[^:]*)?:(\d{8})/g)].map((m) => m[1]));
  const compact = (iso) => iso.replaceAll("-", "");
  const dayAfter = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  };
  for (const ev of events) {
    if (!isRealDate(ev.date) || (ev.until != null && !isRealDate(ev.until))) continue;
    const found = ev.time
      ? icsStarts.has(compact(ev.date))
      : icsRanges.has(`${compact(ev.date)}-${compact(dayAfter(ev.until || ev.date))}`);
    if (!found) warn(`"${ev.title}" (${ev.date}) לא מופיע בקובץ היומן ${ICS_FILE}. מי שמוריד את היומן לא יראה אותו.`, `\`${ev.date}\``);
  }
} catch (err) {
  warn(`לא הצלחתי לקרוא את ${ICS_FILE}: ${err.message}`);
}

// ---------- 5. English (a warning: a string without a pair shows in Hebrew) ----------
const [sharedEn, facultyEn] = FILES.english.map((file) => loadFile(file, "SITE_EN"));
if (sharedEn && facultyEn) checkEnglish(sharedEn, facultyEn);

function checkEnglish(sharedEn, facultyEn) {
  const EN_FILES = [...FILES.english].reverse();
  const warnEn = (msg, needle) => warnings.push({ msg, ...locate(needle, false, EN_FILES) });
  let ui;
  let content;
  try {
    ({ ui, content } = mergeEnglish(sharedEn, facultyEn));
  } catch (err) {
    errors.push({ msg: err.message });
    return;
  }
  const sample = (list) => list.slice(0, 5).map((s) => `"${s.length > 60 ? `${s.slice(0, 60)}…` : s}"`).join(", ");
  // Every Hebrew text in the content, except keywords (they stay Hebrew so Hebrew searches still work).
  const hebrew = new Set();
  const walk = (value, key) => {
    if (typeof value === "string") { if (/[֐-׿]/.test(value)) hebrew.add(value); }
    else if (Array.isArray(value)) { if (key !== "keywords") value.forEach((v) => walk(v)); }
    else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, k);
  };
  walk(data);
  const paired = new Set(content.map(([he]) => he));
  const missing = [...hebrew].filter((s) => !paired.has(s));
  const unused = [...paired].filter((s) => !hebrew.has(s));
  const seen = new Set();
  const twice = content.map(([he]) => he).filter((he) => seen.size === seen.add(he).size);
  const enOf = new Map(content);
  for (const g of data.guides) for (const [n, links] of Object.entries(g.stepLinks || {})) for (const link of isList(links) ? links : []) {
    if (!link || typeof link !== "object" || !link.at) continue;
    const enStep = enOf.get((g.steps || [])[n - 1]);
    const enAt = enOf.get(link.at);
    if (enStep && enAt && !enStep.includes(enAt)) warnEn(`ב"${g.title}", צעד ${n}: הביטוי "${enAt}" לא מופיע בנוסח האנגלי של הצעד, ולכן הקישור יופיע מתחת לצעד.`, link.at);
  }
  if (missing.length) warnEn(`${missing.length} טקסטים בלי תרגום לאנגלית (יופיעו בעברית במצב אנגלית): ${sample(missing)}`);
  if (unused.length) warnEn(`${unused.length} תרגומים שהטקסט העברי שלהם כבר לא קיים (כנראה שונה): ${sample(unused)}`);
  if (twice.length) warnEn(`${twice.length} טקסטים עם שני תרגומים (האחרון קובע): ${sample(twice)}`, `\`${twice[0]}\``);
  // The page's own text: every tr("...") in the page, the chat and the launcher, plus the mascots' lines
  // that the chat and the launcher take from the faculty manifest (faculties/<id>/faculty.js).
  const keys = new Set(ui.map(([he]) => he));
  const used = ["index.html", "chat.js", "peek.js"].flatMap((f) => [...readFileSync(f, "utf8").matchAll(/\btr\("((?:[^"\\]|\\.)*)"/g)].map((m) => JSON.parse(`"${m[1]}"`)));
  const mascotLines = FACULTY.mascots.flatMap((m) => [m.joined, m.thinking, ...m.hellos, ...Object.values(m.timely), ...m.peekLines]);
  const missingUi = [...new Set([...used, ...mascotLines])].filter((s) => !keys.has(s));
  if (missingUi.length) warnEn(`${missingUi.length} טקסטים של הדף בלי תרגום (ui): ${sample(missingUi)}`);
}

report();
