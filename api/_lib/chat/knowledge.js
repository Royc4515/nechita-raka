/**
 * What Bit and Byte know: built from data.js, the same file the page renders, so the chat can
 * never say something the site doesn't. Chunks are fixed per deploy; the "core" (today's date,
 * where we are in the year) is rebuilt per request.
 */
import { readFileSync } from "node:fs";
import vm from "node:vm";

export const SITE_URL = (process.env.SITE_URL || "https://nechita-raka.vercel.app").replace(/\/+$/, "");
const DATA_URL = new URL("../../../data.js", import.meta.url);
const TIME_ZONE = "Asia/Jerusalem";
const DAY_MS = 86_400_000;

/** data.js sets window.SITE_DATA; run it in an empty sandbox (it is our own, reviewed file). */
export function loadSiteData(source = readFileSync(DATA_URL, "utf8")) {
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { timeout: 1000 });
  const data = sandbox.window.SITE_DATA;
  if (!data || !Array.isArray(data.guides)) throw new Error("data.js did not set window.SITE_DATA");
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
  const extra = [ev.time, ev.note].filter(Boolean).join(", ");
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
  return chunks;
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
    `האתר "נחיתה רכה - מדמ"ח בר אילן" (${SITE_URL}) הוא מרכז מידע לסטודנטים בשנה א' במדעי המחשב באוניברסיטת בר אילן, שנת הלימודים תשפ"ז.`,
    `בנה אותו ${data.site.author}, חונך בתוכנית נחיתה רכה. זה אתר עצמאי, לא אתר רשמי של האוניברסיטה.`,
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
    cached = { data, chunks: buildChunks(data), allowedUrls: urls, allowedEmails: emails, core: (today) => buildCore(data, today) };
  }
  return cached;
}
