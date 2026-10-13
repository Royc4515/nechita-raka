/** Turns the raw daily counters into what the dashboard draws, and into a CSV for Excel. */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;
/** About three years: enough for "everything" on a site that started in 2026. */
export const MAX_RANGE_DAYS = 1_100;

const dayNumber = (iso) => Date.parse(`${iso}T00:00:00Z`) / DAY_MS;
const isoOf = (n) => new Date(n * DAY_MS).toISOString().slice(0, 10);

/** { from, to } when both are real dates in order and not too far apart, else null. */
export function parseRange(params) {
  const from = params.get("from");
  const to = params.get("to");
  if (!ISO_DATE.test(from ?? "") || !ISO_DATE.test(to ?? "")) return null;
  const a = dayNumber(from);
  const b = dayNumber(to);
  if (!Number.isFinite(a) || !Number.isFinite(b) || isoOf(a) !== from || isoOf(b) !== to) return null;
  if (b < a || b - a >= MAX_RANGE_DAYS) return null;
  return { from, to };
}

function ranked(rows, kind, catalog) {
  const totals = new Map();
  for (const r of rows) if (r.kind === kind) totals.set(r.key, (totals.get(r.key) ?? 0) + r.count);
  return [...totals]
    .map(([key, count]) => ({ key, label: catalog.label(kind, key), count }))
    .sort((x, y) => y.count - x.count || x.label.localeCompare(y.label, "he"));
}

/**
 * rows: [{ day, kind, key, count }] from PgStatsStore.read.
 * -> { from, to, totals, days: one entry per day (zeros included), and ranked lists: pages, links,
 *      topics, chat, searches, searchMisses, sources, devices, app }
 */
export function buildReport(rows, { from, to }, catalog) {
  const empty = () => ({ views: 0, visitors: 0, clicks: 0, searches: 0, chatMessages: 0, chatVisitors: 0, answered: 0, googleClicks: 0, googleImpressions: 0 });
  const byDay = new Map();
  for (let n = dayNumber(from); n <= dayNumber(to); n += 1) byDay.set(isoOf(n), empty());
  const field = (r) =>
    r.kind === "view" ? "views"
    : r.kind === "visitors" ? "visitors"
    : r.kind === "click" ? "clicks"
    : r.kind === "search" ? "searches"
    : r.kind === "chat_day" ? (r.key === "messages" ? "chatMessages" : "chatVisitors")
    : r.kind === "chat" && (r.key === "ok" || r.key === "out_of_scope") ? "answered"
    : r.kind === "gsc_clicks" ? "googleClicks"
    : r.kind === "gsc_impr" ? "googleImpressions"
    : null;
  const totals = empty();
  for (const r of rows) {
    const name = field(r);
    const day = byDay.get(r.day);
    if (!name || !day) continue;
    day[name] += r.count;
    totals[name] += r.count;
  }
  return {
    from,
    to,
    totals: { ...totals, googlePosition: averagePosition(rows) },
    days: [...byDay].map(([day, counts]) => ({ day, ...counts })),
    pages: ranked(rows, "view", catalog),
    links: ranked(rows, "click", catalog),
    topics: ranked(rows, "topic", catalog),
    chat: ranked(rows, "chat", catalog),
    searches: ranked(rows, "search", catalog),
    searchMisses: ranked(rows, "search_miss", catalog),
    sources: ranked(rows, "source", catalog),
    devices: ranked(rows, "device", catalog),
    app: ranked(rows, "app", catalog),
    googleQueries: pairs(rows, "gsc_q_clicks", "gsc_q_impr", () => null),
    googlePages: pairs(rows, "gsc_p_clicks", "gsc_p_impr", (key) => catalog.label("view", key)),
  };
}

/** Google's average position over the range, weighted by each day's impressions (one decimal), or null. */
function averagePosition(rows) {
  const impressions = new Map(rows.filter((r) => r.kind === "gsc_impr").map((r) => [r.day, r.count]));
  let weighted = 0;
  let total = 0;
  for (const r of rows) {
    if (r.kind !== "gsc_pos") continue;
    const n = impressions.get(r.day) ?? 0;
    weighted += (r.count / 10) * n;
    total += n;
  }
  return total ? Math.round((weighted / total) * 10) / 10 : null;
}

/** Search Console keys with both clicks and impressions, most clicked first, then most shown. */
function pairs(rows, clickKind, imprKind, labelOf) {
  const byKey = new Map();
  const at = (key) => byKey.get(key) ?? byKey.set(key, { key, label: labelOf(key) ?? key, clicks: 0, impressions: 0 }).get(key);
  for (const r of rows) {
    if (r.kind === clickKind) at(r.key).clicks += r.count;
    else if (r.kind === imprKind) at(r.key).impressions += r.count;
  }
  return [...byKey.values()].sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions || a.label.localeCompare(b.label, "he"));
}

const METRIC_NAMES = {
  view: "צפייה בעמוד",
  click: "לחיצה על קישור",
  topic: "נושא בצ'אט",
  chat: "תוצאת שאלה בצ'אט",
  chat_day: "צ'אט: סיכום יומי",
  search: "חיפוש באתר",
  search_miss: "חיפוש בלי תוצאות",
  source: "מקור הגעה",
  visitors: "מבקרים ייחודיים",
  gsc_clicks: "גוגל: קליקים",
  gsc_impr: "גוגל: חשיפות",
  gsc_pos: "גוגל: מיקום ממוצע (x10)",
  gsc_q_clicks: "גוגל: קליקים לחיפוש",
  gsc_q_impr: "גוגל: חשיפות לחיפוש",
  gsc_p_clicks: "גוגל: קליקים לעמוד",
  gsc_p_impr: "גוגל: חשיפות לעמוד",
  device: "סוג מכשיר",
  app: "מסך הבית",
};

/** Excel runs a cell that starts with = + - @ as a formula; a leading ' keeps it text. */
function cell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** One row per counter, with a BOM so Excel opens the Hebrew as UTF-8. */
export function toCsv(rows, catalog) {
  const chatDayLabel = { messages: "הודעות", visitors: "מבקרים ששאלו" };
  const lines = [["date", "metric", "metric_name", "key", "label", "count"].join(",")];
  const sorted = [...rows].sort((a, b) => a.day.localeCompare(b.day) || a.kind.localeCompare(b.kind) || b.count - a.count);
  for (const r of sorted) {
    const label = r.kind === "chat_day" ? chatDayLabel[r.key] ?? r.key : catalog.label(r.kind, r.key);
    lines.push([r.day, r.kind, METRIC_NAMES[r.kind] ?? r.kind, r.key, label, r.count].map(cell).join(","));
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}
