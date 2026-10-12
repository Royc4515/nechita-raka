/**
 * The weekly summary email: a Vercel cron job asks for it every morning (it goes out on Sunday's
 * call, later calls only retry a failed send), and the site's
 * own server sends it through Resend (free tier). It covers the last full week (Sunday to
 * Saturday, Israel's date) against the week before, the insights the dashboard shows, and what
 * is coming up in the calendar.
 */
import { timingSafeEqual } from "node:crypto";
import { getKnowledge, israelToday, SITE_URL } from "../chat/knowledge.js";
import { errors, json } from "../http.js";
import { getCatalog } from "../stats/catalog.js";
import { statsStoreFor } from "../stats/store.js";
import { addDays, calendarEvents, change, dmy, insights, isComparable } from "./insights.js";
import { buildReport } from "./report.js";
import { readAdminConfig } from "./auth.js";

const RESEND_URL = "https://api.resend.com/emails";
/** Resend's shared sender: it may only write to the Resend account's own address, which is the point. */
const DEFAULT_FROM = "נחיתה רכה <onboarding@resend.dev>";
const TOP = 5;
/** A claim this old that never finished (an error, or the function was cut off) may be retried. */
const STALE_MINUTES = 6 * 60;

/** `null` (503) unless the dashboard is configured and RESEND_API_KEY is set. */
export function readWeeklyConfig(env = process.env) {
  const admin = readAdminConfig(env);
  const resendApiKey = env.RESEND_API_KEY?.trim();
  if (!admin || !resendApiKey) return null;
  const to = (env.REPORT_EMAIL?.trim() || [...admin.admins][0]).toLowerCase();
  return { databaseUrl: admin.databaseUrl, resendApiKey, to, from: env.REPORT_FROM?.trim() || DEFAULT_FROM, cronSecret: env.CRON_SECRET?.trim() || null };
}

export function defaultWeeklyDeps() {
  const config = readWeeklyConfig();
  return {
    config,
    store: config ? statsStoreFor(config.databaseUrl) : null,
    catalog: getCatalog(getKnowledge()),
    send: (message) => sendWithResend(message, config),
    now: () => new Date(),
  };
}

/** The last full Sunday-to-Saturday week before `today` (Israel's date), and the week before it. */
export function lastWeek(today) {
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  const to = addDays(today, -(weekday + 1)); // the Saturday before
  const from = addDays(to, -6);
  return { week: { from, to }, before: { from: addDays(from, -7), to: addDays(from, -1) } };
}

const escape = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fmt = new Intl.NumberFormat("he-IL");

function delta(now, before) {
  const pct = change(now, before);
  if (pct === null) return "";
  return pct === 0 ? "ללא שינוי" : `${pct > 0 ? "▲" : "▼"} ${Math.abs(pct)}%`;
}

/** { subject, html, text } for the week. Every value from the counters is escaped. */
export function buildWeeklyEmail({ week, report, previous, upcoming }) {
  const t = report.totals;
  const p = previous?.totals;
  // "עד" rather than a dash: a dash between two dates reads backwards in right-to-left text.
  const range = `${dmy(week.from)} עד ${dmy(week.to)}`;
  const subject = `נחיתה רכה: סיכום שבועי ${range} · ${fmt.format(t.visitors || t.views)} ${t.visitors ? "מבקרים" : "צפיות"}`;
  const tiles = [
    ["מבקרים", t.visitors, p?.visitors],
    ["צפיות", t.views, p?.views],
    ["לחיצות על קישורים", t.clicks, p?.clicks],
    ["חיפושים באתר", t.searches, p?.searches],
    ["הודעות בצ'אט", t.chatMessages, p?.chatMessages],
    ...(t.googleImpressions ? [["חשיפות בגוגל", t.googleImpressions, p?.googleImpressions], ["קליקים מגוגל", t.googleClicks, p?.googleClicks]] : []),
  ];
  const lists = [
    ["העמודים הכי נצפים", report.pages],
    ["הקישורים הכי נלחצים", report.links],
    ["מה חיפשו", report.searches],
    ["חיפשו ולא מצאו", report.searchMisses],
    ["מאיפה הגיעו", report.sources],
    ["מה חיפשו בגוגל (קליקים)", (report.googleQueries ?? []).map((q) => ({ label: `${q.label} · ${fmt.format(q.impressions)} חשיפות`, count: q.clicks }))],
  ].filter(([, rows]) => rows.length);
  const notes = insights(report, previous);

  const cell = "padding:6px 0;border-bottom:1px solid #e3e9f1";
  const html = `<!doctype html><html lang="he" dir="rtl"><body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#0f1b2d">
<div style="max-width:560px;margin:0 auto;padding:24px 16px" dir="rtl">
<h1 style="font-size:20px;margin:0 0 4px">סיכום שבועי · נחיתה רכה</h1>
<p style="margin:0 0 16px;color:#46566e">${escape(range)}${p ? ", לעומת השבוע שלפני" : ""}</p>
<table role="presentation" style="width:100%;border-collapse:collapse;background:#fff;border-radius:12px;margin-bottom:16px">
${tiles.map(([label, now, before]) => `<tr><td style="${cell};padding-inline:12px">${escape(label)}</td><td style="${cell};font-weight:bold;text-align:left">${fmt.format(now)}</td><td style="${cell};color:#46566e;text-align:left;padding-inline:12px;width:90px">${escape(delta(now, before))}</td></tr>`).join("\n")}
</table>
${notes.length ? `<h2 style="font-size:16px;margin:16px 0 8px">מה בולט</h2><ul style="margin:0;padding-inline-start:20px">${notes.map((n) => `<li style="margin-bottom:6px">${escape(n)}</li>`).join("")}</ul>` : ""}
${lists.map(([title, rows]) => `<h2 style="font-size:16px;margin:20px 0 8px">${escape(title)}</h2><table role="presentation" style="width:100%;border-collapse:collapse">${rows.slice(0, TOP).map((r) => `<tr><td style="${cell}">${escape(r.label)}</td><td style="${cell};text-align:left">${fmt.format(r.count)}</td></tr>`).join("")}</table>`).join("\n")}
${upcoming.length ? `<h2 style="font-size:16px;margin:20px 0 8px">בשבועיים הקרובים</h2><ul style="margin:0;padding-inline-start:20px">${upcoming.map((e) => `<li style="margin-bottom:6px">${escape(dmy(e.date))}${e.until ? ` עד ${escape(dmy(e.until))}` : ""}: ${escape(e.title)}</li>`).join("")}</ul>` : ""}
<p style="margin:24px 0 0"><a href="${SITE_URL}/admin" style="color:#0a57a0">לוח הבקרה המלא</a></p>
</div></body></html>`;

  const text = [
    `סיכום שבועי · נחיתה רכה (${range})`,
    "",
    ...tiles.map(([label, now, before]) => `${label}: ${fmt.format(now)} ${delta(now, before)}`.trim()),
    ...(notes.length ? ["", "מה בולט:", ...notes.map((n) => `- ${n}`)] : []),
    ...lists.flatMap(([title, rows]) => ["", `${title}:`, ...rows.slice(0, TOP).map((r) => `- ${r.label}: ${fmt.format(r.count)}`)]),
    ...(upcoming.length ? ["", "בשבועיים הקרובים:", ...upcoming.map((e) => `- ${dmy(e.date)}${e.until ? ` עד ${dmy(e.until)}` : ""}: ${e.title}`)] : []),
    "",
    `${SITE_URL}/admin`,
  ].join("\n");
  return { subject, html, text };
}

async function sendWithResend({ subject, html, text }, config, fetchFn = fetch) {
  const res = await fetchFn(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: config.from, to: [config.to], subject, html, text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`resend_${res.status}`);
}

/**
 * GET /api/cron/weekly  (Vercel cron, every morning)
 * Sends last week's summary once. The first call after the week ends sends it (normally Sunday's
 * cron); later calls find it done and send nothing, so a stranger calling the address can at most
 * send it a few hours early. A send that failed or was cut off is retried by a call 6+ hours later
 * (the next morning's cron). With CRON_SECRET set, only Vercel's cron may call it.
 */
export async function handleWeekly(request, deps) {
  const { config } = deps;
  if (!config) return errors.notConfigured();
  if (config.cronSecret && !sameSecret(request.headers.get("authorization"), `Bearer ${config.cronSecret}`)) return errors.forbidden();

  const today = israelToday(deps.now());
  const { week, before } = lastWeek(today);
  const mark = `weekly-email:${week.from}`;
  try {
    const nowMinutes = Math.floor(deps.now().getTime() / 60_000);
    if (!(await deps.store.claimOnce(week.to, mark, nowMinutes, STALE_MINUTES))) return json({ sent: false, reason: "already_sent" });
    const rows = await deps.store.read(before.from, week.to);
    const report = buildReport(rows.filter((r) => r.day >= week.from), week, deps.catalog);
    const earlier = rows.filter((r) => r.day < week.from);
    const previous = isComparable(before) ? buildReport(earlier, before, deps.catalog) : null;
    const upcoming = calendarEvents(deps.catalog.data ?? {}, today, addDays(today, 13));
    await deps.send(buildWeeklyEmail({ week, report, previous, upcoming }));
    await deps.store.markDone(week.to, mark);
    return json({ sent: true, week });
  } catch (err) {
    // The claim stays: the send is retried once it is stale, not by every call in between.
    console.error(JSON.stringify({ weekly: "failed", error: err instanceof Error ? err.message.slice(0, 40) : "unknown" }));
    return json({ sent: false, reason: "failed" }, 503);
  }
}

function sameSecret(given, expected) {
  const a = Buffer.from(String(given ?? ""));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
