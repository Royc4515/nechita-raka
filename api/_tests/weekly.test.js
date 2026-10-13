import assert from "node:assert/strict";
import { test } from "node:test";
import { allowlists, buildChunks, loadSiteData } from "../_lib/chat/knowledge.js";
import { handleStats } from "../_lib/admin/handler.js";
import { createSession, readAdminConfig } from "../_lib/admin/auth.js";
import { calendarEvents, change, insights, previousRange } from "../_lib/admin/insights.js";
import { buildReport } from "../_lib/admin/report.js";
import { buildWeeklyEmail, handleWeekly, lastWeek, readWeeklyConfig } from "../_lib/admin/weekly.js";
import { buildCatalog } from "../_lib/stats/catalog.js";

const SITE = "https://nechita-raka.vercel.app";
const data = loadSiteData();
const catalog = buildCatalog(data, buildChunks(data), allowlists(data).urls);
const ENV = { GOOGLE_CLIENT_ID: "c.apps.googleusercontent.com", ADMIN_EMAILS: "roy@example.com", CHAT_SALT: "s".repeat(64), DATABASE_URL: "postgres://x" };
const rowsFor = (day, views, extra = []) => [{ day, kind: "view", key: "/", count: views }, ...extra];

// ---------- insights ----------

test("the previous period has the same length and ends the day before", () => {
  assert.deepEqual(previousRange({ from: "2026-10-08", to: "2026-10-14" }), { from: "2026-10-01", to: "2026-10-07" });
  assert.deepEqual(previousRange({ from: "2026-10-12", to: "2026-10-12" }), { from: "2026-10-11", to: "2026-10-11" });
  assert.equal(change(150, 100), 50);
  assert.equal(change(5, 0), null);
});

test("calendar events overlapping the range come from data.js, with term starts", () => {
  const events = calendarEvents(data, "2026-10-20", "2026-10-31");
  assert.ok(events.some((e) => e.title.includes("תקופת השינויים") && e.until === "2026-10-28"));
  assert.ok(events.every((e) => (e.until || e.date) >= "2026-10-20" && e.date <= "2026-10-31"));
  assert.deepEqual(calendarEvents({}, "2026-10-01", "2026-10-31"), []);
});

test("insights compare with the period before and point at content gaps", () => {
  const now = buildReport([
    ...rowsFor("2026-10-08", 150),
    { day: "2026-10-08", kind: "view", key: "/exams", count: 60 },
    { day: "2026-10-08", kind: "search_miss", key: "מלגות", count: 4 },
    { day: "2026-10-08", kind: "chat", key: "out_of_scope", count: 3 },
    { day: "2026-10-08", kind: "source", key: "whatsapp", count: 8 },
    { day: "2026-10-08", kind: "source", key: "direct", count: 2 },
  ], { from: "2026-10-08", to: "2026-10-08" }, catalog);
  const before = buildReport(rowsFor("2026-10-07", 100), { from: "2026-10-07", to: "2026-10-07" }, catalog);
  const lines = insights(now, before);
  assert.match(lines[0], /צפיות: עלייה של 110%/);
  assert.ok(lines.some((l) => l.includes(data.guides.find((g) => g.id === "exams").title)));
  assert.ok(lines.some((l) => l.includes('"מלגות"')));
  assert.ok(lines.some((l) => l.includes("3 פעמים")));
  assert.ok(lines.some((l) => l.includes("וואטסאפ: 80%")));
  assert.ok(insights(now, null).every((l) => !l.startsWith("צפיות:")));
});

test("the stats API leaves out a previous period that starts before the history", async () => {
  const config = readAdminConfig(ENV);
  const now = new Date("2026-10-12T10:00:00Z");
  const store = { read: async (from) => (from < "2026-10-07" ? assert.fail("read before the history") : rowsFor("2026-10-10", 5)) };
  const req = new Request(`${SITE}/api/admin/stats?from=2026-10-07&to=2026-10-12`, { headers: { cookie: `nr_admin=${await createSession("roy@example.com", config, now)}` } });
  const report = await (await handleStats(req, { config, store, catalog, now: () => now })).json();
  assert.equal(report.previous, null);
});

test("the stats API adds the previous totals, the events and the insights", async () => {
  const config = readAdminConfig(ENV);
  const now = new Date("2026-10-20T10:00:00Z");
  const store = { read: async () => [...rowsFor("2026-10-13", 80), ...rowsFor("2026-10-20", 120)] };
  const deps = { config, store, catalog, now: () => now };
  const req = new Request(`${SITE}/api/admin/stats?from=2026-10-14&to=2026-10-20`, { headers: { cookie: `nr_admin=${await createSession("roy@example.com", config, now)}` } });
  const report = await (await handleStats(req, deps)).json();
  assert.equal(report.totals.views, 120);
  assert.deepEqual(report.previous, { from: "2026-10-07", to: "2026-10-13", totals: { ...report.previous.totals, views: 80 } });
  assert.ok(report.events.length > 0);
  assert.match(report.insights[0], /עלייה של 50%/);
});

// ---------- weekly email ----------

test("last week is Sunday to Saturday before today", () => {
  assert.deepEqual(lastWeek("2026-10-25").week, { from: "2026-10-18", to: "2026-10-24" }); // a Sunday
  assert.deepEqual(lastWeek("2026-10-27").week, { from: "2026-10-18", to: "2026-10-24" }); // a Tuesday
  assert.deepEqual(lastWeek("2026-10-25").before, { from: "2026-10-11", to: "2026-10-17" });
});

test("the email escapes what visitors typed and lists the upcoming events", () => {
  const week = { from: "2026-10-18", to: "2026-10-24" };
  const report = buildReport([...rowsFor("2026-10-18", 50), { day: "2026-10-18", kind: "search_miss", key: "<img src=x onerror=alert(1)>", count: 2 }], week, catalog);
  const email = buildWeeklyEmail({ week, report, previous: null, upcoming: [{ date: "2026-10-27", until: null, title: "חופש יום בחירות" }] });
  assert.match(email.subject, /18\.10 עד 24\.10/);
  assert.ok(!email.html.includes("<img src=x"));
  assert.ok(email.html.includes("&lt;img src=x"));
  assert.match(email.html, /dir="rtl"/);
  assert.match(email.text, /27\.10: חופש יום בחירות/);
  assert.match(email.html, /\/admin/);
});

test("the email has a home-screen section only in a week that has home-screen events", () => {
  const week = { from: "2026-10-18", to: "2026-10-24" };
  const quiet = buildWeeklyEmail({ week, report: buildReport(rowsFor("2026-10-18", 50), week, catalog), previous: null, upcoming: [] });
  assert.ok(!quiet.text.includes("מסך הבית:"));
  const rows = [...rowsFor("2026-10-18", 50), { day: "2026-10-18", kind: "app", key: "launch", count: 7 }, { day: "2026-10-19", kind: "app", key: "button", count: 3 }];
  const email = buildWeeklyEmail({ week, report: buildReport(rows, week, catalog), previous: null, upcoming: [] });
  assert.match(email.text, /מסך הבית:\n- כניסות ממסך הבית: 7\n- לחיצות על "הוספה למסך הבית": 3/);
  assert.match(email.html, /כניסות ממסך הבית/);
});

/** The same claim rules as PgStatsStore.claimOnce: count is the claim minute, 0 once done. */
function claimStore() {
  const marks = new Map();
  return {
    marks,
    claimOnce: async (day, key, nowMinutes, staleMinutes) => {
      const at = marks.get(key);
      if (at === undefined || (at > 0 && at < nowMinutes - staleMinutes)) {
        marks.set(key, nowMinutes);
        return true;
      }
      return false;
    },
    markDone: async (day, key) => { marks.set(key, 0); },
    read: async () => rowsFor("2026-10-20", 30),
  };
}

function weeklyDeps(overrides = {}) {
  const sent = [];
  return {
    sent,
    config: readWeeklyConfig({ ...ENV, RESEND_API_KEY: "re_test" }),
    store: claimStore(),
    catalog,
    send: async (message) => { sent.push(message); },
    now: () => new Date("2026-10-25T05:00:00Z"),
    ...overrides,
  };
}

const cron = (deps, headers = {}) => handleWeekly(new Request(`${SITE}/api/cron/weekly`, { headers }), deps);

test("the weekly email is sent once a week, by the first call after the week ends", async () => {
  const deps = weeklyDeps();
  assert.deepEqual(await (await cron(deps)).json(), { sent: true, week: { from: "2026-10-18", to: "2026-10-24" } });
  assert.deepEqual(await (await cron(deps)).json(), { sent: false, reason: "already_sent" });
  // The daily cron on Monday finds the week done.
  assert.equal((await (await cron({ ...deps, now: () => new Date("2026-10-26T05:00:00Z") })).json()).sent, false);
  assert.equal(deps.sent.length, 1);
});

test("a failed send is retried only once its claim is 6 hours old", async () => {
  const store = claimStore();
  const failing = weeklyDeps({ store, send: async () => { throw new Error("resend_500"); } });
  assert.equal((await cron(failing)).status, 503);
  // Calls in between (a stranger, or a retry loop) don't hammer Resend.
  const sent = [];
  const working = { ...failing, send: async (m) => { sent.push(m); } };
  assert.equal((await (await cron({ ...working, now: () => new Date("2026-10-25T07:00:00Z") })).json()).sent, false);
  assert.equal((await (await cron({ ...working, now: () => new Date("2026-10-26T05:00:00Z") })).json()).sent, true);
  assert.equal(sent.length, 1);
  assert.equal(store.marks.get("weekly-email:2026-10-18"), 0);
});

test("the first weeks are not compared with a week before the history started", async () => {
  const sent = [];
  const deps = weeklyDeps({ send: async (m) => { sent.push(m); }, now: () => new Date("2026-10-18T05:00:00Z") });
  await cron(deps);
  // Week 11.10-17.10 against 4.10-10.10, which started before 7.10: no "rise" from missing days.
  assert.ok(!sent[0].text.includes("▲"));
  assert.ok(!sent[0].text.includes("עלייה"));
  assert.ok(!sent[0].html.includes("לעומת השבוע שלפני"));
});

test("the weekly job needs Resend, and the cron secret when one is set", async () => {
  assert.equal(readWeeklyConfig(ENV), null);
  assert.equal(readWeeklyConfig({ ...ENV, RESEND_API_KEY: "re_x" }).to, "roy@example.com");
  assert.equal(readWeeklyConfig({ ...ENV, RESEND_API_KEY: "re_x", REPORT_EMAIL: "Other@Example.com" }).to, "other@example.com");
  assert.equal((await cron(weeklyDeps({ config: null }))).status, 503);
  const secret = weeklyDeps({ config: readWeeklyConfig({ ...ENV, RESEND_API_KEY: "re_x", CRON_SECRET: "cron-secret" }) });
  assert.equal((await cron(secret)).status, 403);
  assert.equal((await cron(secret, { authorization: "Bearer cron-secreX" })).status, 403);
  assert.equal((await cron(secret, { authorization: "Bearer cron-secret" })).status, 200);
});
