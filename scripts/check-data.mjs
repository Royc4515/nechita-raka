// Checks data.js before it reaches the site. Run: node scripts/check-data.mjs
// Errors (exit code 1) are things that break or hide content on the site.
// Warnings are worth a look but do not fail the check.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const DATA_FILE = "data.js";
const ICS_FILE = "biu-5787.ics";
const source = readFileSync(DATA_FILE, "utf8");
const lines = source.split("\n");
const errors = [];
const warnings = [];

// The line where a value first appears, so the message points at it.
function lineOf(needle, last = false) {
  if (!needle) return 0;
  const i = last ? lines.findLastIndex((l) => l.includes(needle)) : lines.findIndex((l) => l.includes(needle));
  return i + 1;
}
const error = (msg, needle) => errors.push({ msg, line: lineOf(needle) });
const warn = (msg, needle) => warnings.push({ msg, line: lineOf(needle) });

function report() {
  const gh = process.env.GITHUB_ACTIONS === "true";
  for (const [kind, list] of [["error", errors], ["warning", warnings]]) {
    for (const { msg, line } of list) {
      if (gh) console.log(`::${kind} file=${DATA_FILE}${line ? `,line=${line}` : ""}::${msg}`);
      else console.log(`${kind === "error" ? "שגיאה" : "אזהרה"}${line ? ` (שורה ${line})` : ""}: ${msg}`);
    }
  }
  console.log(errors.length ? `\nנמצאו ${errors.length} שגיאות.` : "\ndata.js תקין.");
  process.exit(errors.length ? 1 : 0);
}

// ---------- 1. Does it run at all? ----------
lines.forEach((l, i) => {
  if (/[‘’“”]/.test(l) && !l.trim().startsWith("//")) {
    const outside = l.replace(/`[^`]*`/g, "");
    if (/[‘’“”]/.test(outside)) errors.push({ msg: "גרשיים \"חכמים\" (‘ ’ או “ ”) מחוץ לטקסט. מחליפים אותם בגרש הפוך `.", line: i + 1 });
  }
});
const sandbox = { window: {} };
try {
  vm.runInNewContext(source, sandbox, { filename: DATA_FILE });
} catch (err) {
  const m = String(err.stack || "").match(/data\.js:(\d+)/);
  errors.push({ msg: `הקובץ לא נטען: ${err.message}. בדרך כלל זה פסיק חסר או גרש הפוך חסר, בשורה הזו או בזו שלפניה.`, line: m ? Number(m[1]) : 0 });
  report();
}
const data = sandbox.window.SITE_DATA;
if (!data || typeof data !== "object") {
  error("חסר window.SITE_DATA בתחילת הקובץ.");
  report();
}

// ---------- 2. Shape ----------
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
if (!isList(data.categories)) error("categories צריך להיות רשימה בתוך [ ].", "categories:");
for (const cat of data.categories || []) {
  if (!isText(cat.id) || !isText(cat.title)) error("לקטגוריה חסר id או title.", cat.title || cat.id);
  if (!isList(cat.items)) { error(`בקטגוריה "${cat.title}" השדה items צריך להיות רשימה.`, cat.title); continue; }
  for (const item of cat.items) {
    const where = item.id || item.name;
    if (!isText(item.id)) error(`לפריט "${item.name || item.desc}" חסר id.`, item.name || item.desc);
    else if (itemIds.has(item.id)) errors.push({ msg: `המזהה "${item.id}" מופיע פעמיים. כל id חייב להיות ייחודי.`, line: lineOf(`id: \`${item.id}\``, true) });
    itemIds.add(item.id);
    if (!isText(item.desc)) error(`לפריט "${where}" חסר desc, ולכן הוא לא יוצג.`, where);
    if (!isText(item.name)) warn(`לפריט "${where}" חסר name.`, where);
    if (!isHttps(item.url)) error(`הקישור של "${where}" לא מתחיל ב-https://, ולכן הפריט לא יוצג.`, where);
  }
}

for (const id of data.featured || []) {
  if (!itemIds.has(id)) error(`"${id}" ברשימת featured לא קיים באף קטגוריה.`, `\`${id}\``);
}

// "mentor" is the private WhatsApp link built from site.whatsapp
const site = data.site || {};
const hasMentor = /^\d{9,15}$/.test(String(site.whatsapp || "").replace(/\D/g, ""));
if (site.whatsapp && !hasMentor) error("site.whatsapp צריך להיות מספר בפורמט בינלאומי, למשל 972501234567.", "whatsapp:");

const guideIds = new Set((data.guides || []).map((g) => g && g.id));
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

const seenGuides = new Set();
if (data.guides != null && !isList(data.guides)) error("guides צריך להיות רשימה בתוך [ ].", "guides:");
for (const g of data.guides || []) {
  const where = g.title || g.id;
  if (!/^[a-z0-9-]+$/.test(g.id || "")) error(`למדריך "${where}" צריך id באנגלית קטנה, בלי רווחים.`, where);
  else if (seenGuides.has(g.id)) error(`המזהה של המדריך "${g.id}" מופיע פעמיים.`, `\`${g.id}\``);
  seenGuides.add(g.id);
  if (!isText(g.title)) error(`למדריך "${g.id}" חסר title.`, g.id);
  if (!isList(g.steps) || !g.steps.length) error(`למדריך "${where}" חסרים steps, ולכן הוא לא יוצג.`, where);
  else g.steps.forEach((s, i) => { if (!isText(s)) error(`בצעד ${i + 1} של "${where}" אין טקסט.`, where); });
  if (g.tips != null && !isList(g.tips)) error(`ב"${where}" השדה tips צריך להיות רשימה.`, where);
  checkLinks(g.links, `מדריך "${where}"`, where);
  for (const src of g.sources || []) if (!isHttps(src.url)) error(`מקור עם כתובת לא תקינה במדריך "${where}".`, src.label || where);
  if (!isList(g.sources) || !g.sources.length) warn(`למדריך "${where}" אין sources. כדאי לציין מאיפה המידע.`, where);
}

const cal = data.calendar || {};
for (const t of cal.terms || []) {
  if (!isRealDate(t.from) || !isRealDate(t.to)) error(`תאריך לא תקין בתקופה "${t.label}". הפורמט: שנה-חודש-יום.`, t.label);
  else if (t.to < t.from) error(`בתקופה "${t.label}" תאריך הסיום לפני תאריך ההתחלה.`, t.label);
}
const events = isList(cal.events) ? cal.events : (error("calendar.events צריך להיות רשימה.", "events:"), []);
for (const ev of events) {
  const where = ev.title || ev.date;
  if (!isText(ev.title)) error(`לתאריך ${ev.date} חסר title.`, ev.date);
  if (!isRealDate(ev.date)) error(`התאריך "${ev.date}" של "${where}" לא תקין. הפורמט: שנה-חודש-יום, למשל 2027-03-01.`, where);
  if (ev.until != null && !isRealDate(ev.until)) error(`תאריך הסיום "${ev.until}" של "${where}" לא תקין.`, where);
  if (isRealDate(ev.date) && isRealDate(ev.until) && ev.until < ev.date) error(`ב"${where}" תאריך הסיום לפני תאריך ההתחלה.`, where);
  if (ev.time != null && !/^\d{1,2}:\d{2}$/.test(ev.time)) error(`השעה "${ev.time}" של "${where}" לא תקינה. הפורמט: 14:00.`, where);
  if (ev.guide && !guideIds.has(ev.guide)) error(`"${where}" מקושר למדריך "${ev.guide}" שלא קיים.`, where);
}

if (data.faq != null && !isList(data.faq)) error("faq צריך להיות רשימה בתוך [ ].", "faq:");
for (const f of data.faq || []) {
  if (!isText(f.q) || !isText(f.a)) error(`לשאלה "${f.q || f.a || "?"}" חסר q או a, ולכן היא לא תוצג.`, f.q || f.a);
  checkLinks(f.links, `שאלה "${f.q}"`, f.q);
  if (f.guide && !guideIds.has(f.guide)) error(`השאלה "${f.q}" מקושרת למדריך "${f.guide}" שלא קיים.`, f.q);
}

// ---------- 3. Calendar file drift (a warning: the .ics is edited separately) ----------
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

report();
