/**
 * What Bit and Byte know: built from the same content the page renders (shared/data.js and
 * faculties/<id>/data.js, merged by faculties/content.js exactly as the build merges them into
 * public/data.js), so the chat can never say something the site doesn't. Chunks are fixed per
 * deploy; the "core" (today's date, where we are in the year) is rebuilt per request.
 */
import { loadContent } from "../../../faculties/content.js";
import { FACULTY } from "../../../faculties/index.js";
import { loadCourseChunks } from "./courses.js";
import { hidePhones } from "./phones.js";
import { SITE_URL } from "./site.js";

export { SITE_URL };

const TIME_ZONE = "Asia/Jerusalem";
const DAY_MS = 86_400_000;

/** The merged site content (the files are our own, reviewed ones; they run in an empty sandbox). */
export function loadSiteData() {
  const data = loadContent();
  if (!Array.isArray(data.guides)) throw new Error("the merged content has no guides");
  return data;
}

const dmy = (iso) => {
  const [y, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.${y}`;
};

function resolveLinks(links, itemsById) {
  return (links || [])
    .map((link) => (typeof link === "string" ? itemsById.get(link) && { label: itemsById.get(link).name, url: itemsById.get(link).url } : link))
    .filter((link) => link && link.label && (link.url || link.guide))
    .map((link) => `${link.label}: ${link.url || `${SITE_URL}/#guide-${link.guide}`}`);
}

function eventLine(ev) {
  const when = ev.until ? `${dmy(ev.date)} עד ${dmy(ev.until)}` : dmy(ev.date);
  const extra = [ev.time, ev.note, ev.link && `${ev.link.label}: ${ev.link.url}`].filter(Boolean).join(", ");
  return `${when}: ${ev.title}${extra ? ` (${extra})` : ""}`;
}

/** One chunk per guide (steps), one for its tips, one per FAQ, link and the full calendar. */
export function buildChunks(data) {
  const items = data.categories.flatMap((c) => c.items.map((item) => ({ ...item, category: c.title })));
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const guideUrl = (id) => `${SITE_URL}/#guide-${id}`;
  const chunks = [];

  for (const g of data.guides) {
    const links = resolveLinks(g.links, itemsById);
    chunks.push({
      id: `guide:${g.id}`,
      title: g.title,
      url: guideUrl(g.id),
      text: [g.summary, ...(g.steps || []).map((s, i) => `${i + 1}. ${s}`), links.length ? `קישורים: ${links.join(" | ")}` : ""].filter(Boolean).join("\n"),
      keywords: [g.title, ...(g.keywords || [])],
    });
    if (g.tips?.length) {
      chunks.push({ id: `tips:${g.id}`, title: `${g.title}: כדאי לדעת`, url: guideUrl(g.id), text: g.tips.map((t) => `- ${t}`).join("\n"), keywords: [g.title, ...(g.keywords || [])] });
    }
  }
  data.faq.forEach((f, i) => {
    const links = resolveLinks(f.links, itemsById);
    chunks.push({
      id: `faq:${i + 1}`,
      title: f.q,
      url: f.guide ? guideUrl(f.guide) : `${SITE_URL}/#faq`,
      text: [f.a, links.length ? `קישורים: ${links.join(" | ")}` : ""].filter(Boolean).join("\n"),
      keywords: f.keywords || [],
    });
  });
  for (const item of items) {
    chunks.push({ id: `link:${item.id}`, title: item.name, url: item.url, text: [`${item.category}: ${item.desc}`, item.note].filter(Boolean).join("\n"), keywords: [item.name, ...(item.keywords || [])] });
  }
  const events = [...data.calendar.events].sort((a, b) => a.date.localeCompare(b.date));
  chunks.push({
    id: "calendar",
    title: data.calendar.title || "לוח השנה",
    url: `${SITE_URL}/#calendar`,
    text: [...data.calendar.terms.map((t) => `${t.label}: ${dmy(t.from)} עד ${dmy(t.to)}`), ...events.map(eventLine)].join("\n"),
    keywords: ["לוח שנה", "תאריכים", "מתי", "סמסטר", "חופשה", "חג", "בחינות", "מועד"],
  });
  // No phone number from data.js reaches the model (phones.js); the site itself still shows them.
  return chunks.map((c) => ({ ...c, text: hidePhones(c.text) }));
}

/** Today in Israel as YYYY-MM-DD. */
export function israelToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Always in the prompt: what the site is, today's date and where we are in the year. */
export function buildCore(data, today) {
  const t = Date.parse(today);
  const term = data.calendar.terms.find((x) => Date.parse(x.from) <= t && t <= Date.parse(x.to));
  const nextTerm = data.calendar.terms.find((x) => Date.parse(x.from) > t);
  const upcoming = [...data.calendar.events]
    .filter((ev) => Date.parse(ev.until || ev.date) >= t)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);
  const where = term
    ? `עכשיו ${term.label} (${dmy(term.from)} עד ${dmy(term.to)}), שבוע ${Math.floor((t - Date.parse(term.from)) / DAY_MS / 7) + 1}.`
    : nextTerm
      ? `עכשיו לא סמסטר. הבא: ${nextTerm.label}, מ-${dmy(nextTerm.from)}.`
      : "";
  return [
    `האתר "${FACULTY.site.name}" (${SITE_URL}) הוא מרכז מידע ל${FACULTY.site.audience.he} באוניברסיטת בר אילן${data.site.academicYear ? `, שנת הלימודים ${data.site.academicYear}` : ""}.`,
    `בנה אותו ${data.site.author}. זה אתר עצמאי, לא אתר רשמי של האוניברסיטה.`,
    "מי שלא מצא תשובה יכול לכתוב לרועי בקבוצת הוואטסאפ של נחיתה רכה.",
    `היום ${dmy(today)}. ${where}`,
    `תקופות השנה: ${data.calendar.terms.map((x) => `${x.label} ${dmy(x.from)} עד ${dmy(x.to)}`).join("; ")}.`,
    upcoming.length ? `הבא בלוח: ${upcoming.map(eventLine).join("; ")}.` : "",
  ].filter(Boolean).join("\n");
}

/** Every link and email in data.js: the only ones an answer may contain. */
export function allowlists(data) {
  const text = JSON.stringify(data);
  const urls = new Set([SITE_URL]);
  for (const m of text.matchAll(/https:\/\/[^\s"\\<>]+/g)) urls.add(m[0].replace(/[.,;:)]+$/, "").replace(/\/+$/, ""));
  const emails = new Set([...text.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)].map((m) => m[0].toLowerCase()).filter((e) => !e.startsWith("-")));
  return { urls: [...urls], emails: [...emails] };
}

let cached = null;

/** { chunks, data, allowedUrls, allowedEmails, core(today) }, built once per warm instance. */
export function getKnowledge() {
  if (!cached) {
    const data = loadSiteData();
    const { urls, emails } = allowlists(data);
    cached = { data, chunks: [...buildChunks(data), ...loadCourseChunks()], allowedUrls: urls, allowedEmails: emails, core: (today) => buildCore(data, today) };
  }
  return cached;
}
