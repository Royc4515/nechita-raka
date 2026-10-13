/**
 * What may be counted, and the name the dashboard shows for it, all from data.js: a page view is
 * the home page or a guide, a click is a link that data.js has, a topic is a chat source chunk.
 * Anything else is dropped, so a script posting junk can't fill the table with made-up keys.
 */
import { SITE_URL } from "../chat/knowledge.js";

export const HOME_LABEL = "דף הבית";
const WHATSAPP_LABEL = "וואטסאפ פרטי לרועי";

/** Chat outcomes the handler records under kind "chat", with their dashboard names. */
export const CHAT_OUTCOMES = Object.freeze({
  ok: "נענו",
  out_of_scope: "נענו: אין על זה מידע באתר",
  blocked: "נחסמו (ניסיון לעקוף)",
  rate_limited: "מבקר הגיע למגבלה היומית",
  daily_cap: "האתר הגיע למגבלה היומית",
  busy: "המודלים היו עמוסים",
  unavailable: "תקלה",
});

/** Where a visit came from, as a coarse category (from the referrer or a ?src= tag on shared links). */
export const SOURCES = Object.freeze({
  whatsapp: "וואטסאפ",
  linkedin: "לינקדאין",
  google: "גוגל",
  bing: "בינג",
  facebook: "פייסבוק",
  instagram: "אינסטגרם",
  telegram: "טלגרם",
  ai: "עוזרי AI (ChatGPT וכו')",
  direct: "ישיר (קישור שמור או הקלדה)",
  other: "אתר אחר",
});

/** The kind of device, counted once per visitor per day. */
export const DEVICES = Object.freeze({ mobile: "טלפון", tablet: "טאבלט", desktop: "מחשב" });

/** The add-to-home-screen events, each a plain count. */
export const APP_EVENTS = Object.freeze({
  launch: "כניסות ממסך הבית",
  installed: "התקנות (Chrome ו-Edge בלבד)",
  button: "לחיצות על \"הוספה למסך הבית\"",
});

export function deviceOf(userAgent = "") {
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(userAgent)) return "tablet";
  if (/Mobi|iPhone|iPod|Android/i.test(userAgent)) return "mobile";
  return "desktop";
}

const SEARCH_MIN = 2;
const SEARCH_MAX = 40;
/** 7+ digits anywhere (however they are separated) is a phone or an id number; a course code has 5. */
const MAX_DIGITS = 7;

/**
 * A site search as it is counted: lower case, single spaces, no edge punctuation. null when it is
 * too short or long, or looks like personal data (an email, or 7+ digits: a phone or an id number).
 */
export function searchKey(raw) {
  if (typeof raw !== "string") return null;
  const text = raw
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, "");
  if (text.length < SEARCH_MIN || text.length > SEARCH_MAX) return null;
  if (text.includes("@") || text.replace(/\P{Nd}/gu, "").length >= MAX_DIGITS) return null;
  return text;
}

/** An absolute URL without its #fragment or trailing slash, or null. */
export function normalizeUrl(raw) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.hash = "";
    return url.href.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

const withoutQuery = (url) => url.replace(/\?.*$/, "").replace(/\/+$/, "");

function linkLabels(data) {
  const labels = new Map();
  const add = (url, label) => {
    const key = url && normalizeUrl(url);
    if (key && label && !labels.has(key)) labels.set(key, String(label));
  };
  for (const cat of data.categories) for (const item of cat.items) add(item.url, item.name);
  for (const g of data.guides) {
    for (const link of g.links || []) if (typeof link === "object") add(link.url, link.label);
    for (const src of g.sources || []) add(src.url, src.label);
  }
  for (const f of data.faq) for (const link of f.links || []) if (typeof link === "object") add(link.url, link.label);
  add(data.site?.authorUrl, "לינקדאין של רועי");
  add(data.site?.portfolioUrl, "הפורטפוליו של רועי");
  const number = String(data.site?.whatsapp || "").replace(/\D/g, "");
  if (number) add(`https://wa.me/${number}`, WHATSAPP_LABEL);
  return labels;
}

/** Built once per warm instance from the parsed data.js and the chat's chunks. */
export function buildCatalog(data, chunks, allowedUrls = []) {
  const pages = new Map([["/", HOME_LABEL], ...data.guides.map((g) => [`/${g.id}`, g.title])]);
  const links = linkLabels(data);
  for (const url of allowedUrls) {
    const key = normalizeUrl(url);
    if (key && !links.has(key)) links.set(key, key);
  }
  const calendarFile = data.calendar?.file;
  if (calendarFile) links.set(normalizeUrl(new URL(calendarFile, `${SITE_URL}/`).href), "קובץ היומן (ics)");
  const topics = new Map(chunks.map((c) => [c.id, c.title]));

  return {
    /** data.js itself, for the calendar events the dashboard and the weekly email show. */
    data,
    /** The counted key for a page path, or null. */
    page: (path) => (typeof path === "string" && pages.has(path) ? path : null),
    /** The counted key for a clicked link (same-site links come as a path), or null. */
    link(raw) {
      if (typeof raw !== "string" || raw.length > 2000) return null;
      const url = normalizeUrl(raw.startsWith("/") ? `${SITE_URL}${raw}` : raw);
      if (!url) return null;
      if (links.has(url)) return url;
      const bare = withoutQuery(url);
      return links.has(bare) ? bare : null;
    },
    topic: (id) => (topics.has(id) ? id : null),
    source: (key) => (typeof key === "string" && Object.hasOwn(SOURCES, key) ? key : null),
    app: (key) => (typeof key === "string" && Object.hasOwn(APP_EVENTS, key) ? key : null),
    /** The dashboard name for a counted key; the key itself when data.js no longer has it (and for searches). */
    label(kind, key) {
      if (kind === "gsc_p_clicks" || kind === "gsc_p_impr") return pages.get(key) ?? key;
      const map = {
        view: pages,
        click: links,
        topic: topics,
        chat: new Map(Object.entries(CHAT_OUTCOMES)),
        source: new Map(Object.entries(SOURCES)),
        device: new Map(Object.entries(DEVICES)),
        app: new Map(Object.entries(APP_EVENTS)),
        visitors: new Map([["all", "מבקרים ייחודיים"]]),
      }[kind];
      return map?.get(key) ?? key;
    },
  };
}

let cached = null;

export function getCatalog(knowledge) {
  cached ??= buildCatalog(knowledge.data, knowledge.chunks, knowledge.allowedUrls);
  return cached;
}
