import assert from "node:assert/strict";
import { test } from "node:test";
import { buildReport } from "../_lib/admin/report.js";
import { allowlists, buildChunks, loadSiteData } from "../_lib/chat/knowledge.js";
import { pagePath, queryKey, readGscConfig, toCounters } from "../_lib/search/gsc.js";
import { GSC_KINDS, handleSync } from "../_lib/search/sync.js";
import { buildCatalog } from "../_lib/stats/catalog.js";
import { PgStatsStore } from "../_lib/stats/store.js";

const SITE_URL = "https://nechita-raka.vercel.app/";
const data = loadSiteData();
const catalog = buildCatalog(data, buildChunks(data), allowlists(data).urls);
const ENV = { GCP_PROJECT_NUMBER: "123", GCP_SERVICE_ACCOUNT_EMAIL: "gsc@p.iam.gserviceaccount.com", GCP_WORKLOAD_IDENTITY_POOL_ID: "vercel", GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: "vercel", GSC_SITE_URL: SITE_URL };

test("the sync is off until every federation setting is there", () => {
  assert.equal(readGscConfig(ENV).siteUrl, SITE_URL);
  assert.equal(readGscConfig({ ...ENV, GCP_PROJECT_NUMBER: "" }), null);
});

test("pages become the site's own paths and queries are cleaned", () => {
  assert.equal(pagePath("https://nechita-raka.vercel.app/", SITE_URL), "/");
  assert.equal(pagePath("https://nechita-raka.vercel.app/exams", SITE_URL), "/exams");
  assert.equal(pagePath("https://nechita-raka.vercel.app/exams/", SITE_URL), "/exams");
  assert.equal(pagePath("https://other.example/exams", SITE_URL), null);
  assert.equal(queryKey("  נחיתה ​ רכה  "), "נחיתה רכה");
  assert.equal(queryKey("x".repeat(200)).length, 120);
});

test("Search Console rows become daily counters, without zeros", () => {
  const counters = toCounters({
    byDate: [{ keys: ["2026-10-10"], clicks: 3, impressions: 40, position: 7.25 }, { keys: ["2026-10-11"], clicks: 0, impressions: 0, position: 0 }],
    byQuery: [{ keys: ["2026-10-10", "נחיתה רכה בר אילן"], clicks: 2, impressions: 10 }, { keys: ["2026-10-10", "מדמח"], clicks: 0, impressions: 6 }],
    byPage: [{ keys: ["2026-10-10", "https://nechita-raka.vercel.app/exams"], clicks: 1, impressions: 9 }, { keys: ["2026-10-10", "https://evil.example/"], clicks: 5, impressions: 5 }],
  }, SITE_URL);
  const find = (kind, key) => counters.find((c) => c.kind === kind && c.key === key)?.count;
  assert.equal(find("gsc_clicks", "all"), 3);
  assert.equal(find("gsc_impr", "all"), 40);
  assert.equal(find("gsc_pos", "all"), 73);
  assert.equal(find("gsc_q_clicks", "נחיתה רכה בר אילן"), 2);
  assert.equal(find("gsc_q_clicks", "מדמח"), undefined);
  assert.equal(find("gsc_q_impr", "מדמח"), 6);
  assert.equal(find("gsc_p_impr", "/exams"), 9);
  assert.ok(!counters.some((c) => c.day === "2026-10-11"));
  assert.ok(!counters.some((c) => c.key.includes("evil")));
});

test("the copy replaces the synced days in SQL, kind by kind", async () => {
  const calls = [];
  const store = new PgStatsStore(async (text, params) => { calls.push({ text, params }); return []; });
  await store.replaceRange("2026-10-01", "2026-10-11", GSC_KINDS, [{ day: "2026-10-10", kind: "gsc_impr", key: "all", count: 40 }]);
  const del = calls.find((c) => c.text.startsWith("delete"));
  assert.deepEqual(del.params, ["2026-10-01", "2026-10-11", GSC_KINDS]);
  const ins = calls.find((c) => c.text.includes("unnest($1::text[]"));
  assert.deepEqual(ins.params, [["2026-10-10"], ["gsc_impr"], ["all"], [40]]);
});

test("the sync asks for 30 days from the history start, and fails quietly", async () => {
  const asked = [];
  let replaced = null;
  const deps = {
    gsc: readGscConfig(ENV),
    store: { replaceRange: async (from, to, kinds, counters) => { replaced = { from, to, counters }; } },
    cronSecret: null,
    token: async () => "tok",
    query: async (args) => { asked.push(args); return args.dimensions.length === 1 ? [{ keys: ["2026-10-10"], clicks: 1, impressions: 5, position: 3 }] : []; },
    now: () => new Date("2026-10-12T04:00:00Z"),
  };
  const res = await (await handleSync(new Request("https://x/api/cron/search-console"), deps)).json();
  assert.deepEqual(res, { synced: true, from: "2026-10-07", to: "2026-10-11", rows: 3 });
  assert.equal(asked.length, 3);
  assert.ok(asked.every((a) => a.token === "tok" && a.siteUrl === SITE_URL));
  assert.equal(replaced.counters.length, 3);

  const later = await (await handleSync(new Request("https://x"), { ...deps, now: () => new Date("2026-12-01T04:00:00Z") })).json();
  assert.equal(later.from, "2026-11-01");
  assert.equal((await handleSync(new Request("https://x"), { ...deps, token: async () => { throw new Error("denied"); } })).status, 503);
  assert.equal((await handleSync(new Request("https://x"), { ...deps, gsc: null })).status, 503);
  assert.equal((await handleSync(new Request("https://x"), { ...deps, cronSecret: "s" })).status, 403);
});

test("the report adds Google totals, a weighted position, queries and pages", () => {
  const rows = [
    { day: "2026-10-10", kind: "gsc_impr", key: "all", count: 30 },
    { day: "2026-10-10", kind: "gsc_pos", key: "all", count: 50 },
    { day: "2026-10-11", kind: "gsc_impr", key: "all", count: 10 },
    { day: "2026-10-11", kind: "gsc_pos", key: "all", count: 90 },
    { day: "2026-10-10", kind: "gsc_clicks", key: "all", count: 4 },
    { day: "2026-10-10", kind: "gsc_q_clicks", key: "נחיתה רכה", count: 3 },
    { day: "2026-10-10", kind: "gsc_q_impr", key: "נחיתה רכה", count: 20 },
    { day: "2026-10-10", kind: "gsc_q_impr", key: "מדמח", count: 9 },
    { day: "2026-10-10", kind: "gsc_p_impr", key: "/exams", count: 9 },
  ];
  const r = buildReport(rows, { from: "2026-10-10", to: "2026-10-11" }, catalog);
  assert.equal(r.totals.googleImpressions, 40);
  assert.equal(r.totals.googleClicks, 4);
  assert.equal(r.totals.googlePosition, 6); // (5 x 30 + 9 x 10) / 40
  assert.deepEqual(r.googleQueries.map((q) => [q.key, q.clicks, q.impressions]), [["נחיתה רכה", 3, 20], ["מדמח", 0, 9]]);
  assert.equal(r.googlePages[0].label, data.guides.find((g) => g.id === "exams").title);
});
