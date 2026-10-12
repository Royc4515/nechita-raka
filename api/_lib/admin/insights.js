/**
 * Numbers into sentences: the comparison with the period before, the calendar events of the
 * range, and a few plain-language insights. Shared by the dashboard and the weekly email, so both
 * say the same thing.
 */

const DAY_MS = 86_400_000;
const dayNumber = (iso) => Date.parse(`${iso}T00:00:00Z`) / DAY_MS;
const isoOf = (n) => new Date(n * DAY_MS).toISOString().slice(0, 10);
const fmt = new Intl.NumberFormat("he-IL");
const dmy = (iso) => `${Number(iso.slice(8, 10))}.${Number(iso.slice(5, 7))}`;

/** The first day the site kept any counters (the chat's message total). admin.js has the same date. */
export const HISTORY_START = "2026-10-07";

/** A period can be compared with only when all of it lies within the history. */
export const isComparable = (range) => range.from >= HISTORY_START;

/** The same number of days, right before the range. */
export function previousRange({ from, to }) {
  const length = dayNumber(to) - dayNumber(from) + 1;
  return { from: isoOf(dayNumber(from) - length), to: isoOf(dayNumber(from) - 1) };
}

export function addDays(iso, n) {
  return isoOf(dayNumber(iso) + n);
}

/** Calendar events (data.js) that overlap the range, as [{ date, until, title }], by date. */
export function calendarEvents(data, from, to) {
  const events = (data.calendar?.events ?? [])
    .filter((ev) => ev.date && ev.title && (ev.until || ev.date) >= from && ev.date <= to)
    .map((ev) => ({ date: ev.date, until: ev.until ?? null, title: String(ev.title) }));
  const terms = (data.calendar?.terms ?? [])
    .filter((t) => t.from >= from && t.from <= to)
    .map((t) => ({ date: t.from, until: null, title: `תחילת ${t.label}` }));
  return [...events, ...terms].sort((a, b) => a.date.localeCompare(b.date));
}

/** Percent change, or null when there is nothing to compare with. */
export function change(now, before) {
  if (!before) return null;
  return Math.round(((now - before) / before) * 100);
}

function changeWords(now, before) {
  const pct = change(now, before);
  if (pct === null) return null;
  if (pct === 0) return "בדיוק כמו בתקופה הקודמת";
  return `${pct > 0 ? "עלייה" : "ירידה"} של ${Math.abs(pct)}% (${fmt.format(now)} לעומת ${fmt.format(before)})`;
}

function biggestRiser(current, previous) {
  const before = new Map(previous.map((r) => [r.key, r.count]));
  return current
    .map((r) => ({ ...r, gain: r.count - (before.get(r.key) ?? 0) }))
    .filter((r) => r.gain >= 3)
    .sort((a, b) => b.gain - a.gain)[0] ?? null;
}

const share = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

/**
 * Up to six short sentences about the range, most useful first. `previous` is the report of the
 * period right before (same length), or null when the range starts with the site's history.
 */
export function insights(report, previous) {
  const out = [];
  const t = report.totals;
  if (previous && previous.totals.views) {
    out.push(`צפיות: ${changeWords(t.views, previous.totals.views)}.`);
  }
  if (previous && previous.totals.visitors && t.visitors) {
    out.push(`מבקרים: ${changeWords(t.visitors, previous.totals.visitors)}.`);
  }
  const riser = previous && previous.totals.views ? biggestRiser(report.pages, previous.pages) : null;
  if (riser) out.push(`העמוד שהכי עלה: ${riser.label} (+${fmt.format(riser.gain)} צפיות).`);
  else if (report.pages[0]) out.push(`העמוד הכי נצפה: ${report.pages[0].label} (${fmt.format(report.pages[0].count)} צפיות).`);
  if (report.searchMisses[0]) {
    const misses = report.searchMisses.slice(0, 3).map((m) => `"${m.label}"`).join(", ");
    out.push(`חיפשו ולא מצאו: ${misses}. כדאי לבדוק אם חסר על זה תוכן.`);
  }
  const outOfScope = report.chat.find((c) => c.key === "out_of_scope")?.count ?? 0;
  if (outOfScope) out.push(`הצ'אט ענה ${fmt.format(outOfScope)} פעמים שאין לו על זה מידע מהאתר.`);
  const sources = report.sources.reduce((s, r) => s + r.count, 0);
  if (report.sources[0] && sources >= 5) {
    out.push(`הכי הרבה הגיעו מ${report.sources[0].label}: ${share(report.sources[0].count, sources)}% מהכניסות.`);
  }
  const google = report.googleQueries ?? [];
  if (google[0] && (google[0].clicks || google[0].impressions >= 5)) {
    const top = google[0];
    out.push(`בגוגל הכי הרבה חיפשו "${top.label}": ${fmt.format(top.impressions)} חשיפות, ${fmt.format(top.clicks)} קליקים.`);
  }
  const devices = report.devices.reduce((s, r) => s + r.count, 0);
  const phones = report.devices.find((d) => d.key === "mobile")?.count ?? 0;
  if (devices >= 5) out.push(`${share(phones, devices)}% מהמבקרים גלשו מטלפון.`);
  return out.slice(0, 7);
}

export { dmy };
