import assert from "node:assert/strict";
import { test } from "node:test";
import { exportJWK, generateKeyPair, createLocalJWKSet, SignJWT } from "jose";
import { adminFromGoogleToken, adminFromRequest, createSession, readAdminConfig, readCookie, sessionCookie } from "../_lib/admin/auth.js";
import { handleSession, handleStats } from "../_lib/admin/handler.js";
import { buildReport, parseRange, toCsv } from "../_lib/admin/report.js";
import { handleChat } from "../_lib/chat/handler.js";
import { allowlists, buildChunks, buildCore, loadSiteData } from "../_lib/chat/knowledge.js";
import { buildCatalog, deviceOf, HOME_LABEL, normalizeUrl, searchKey } from "../_lib/stats/catalog.js";
import { MAX_FREE_KEYS_PER_DAY, PgStatsStore } from "../_lib/stats/store.js";
import { BurstLimiter, handleTrack, visitorHash } from "../_lib/stats/track.js";

const SITE = "https://nechita-raka.vercel.app";
const data = loadSiteData();
const chunks = buildChunks(data);
const { urls, emails } = allowlists(data);
const catalog = buildCatalog(data, chunks, urls);
const firstItem = data.categories[0].items[0];
const ENV = {
  GOOGLE_CLIENT_ID: "client-123.apps.googleusercontent.com",
  ADMIN_EMAILS: " Roy@Example.com , not-an-email ",
  ADMIN_SESSION_SECRET: "s".repeat(40),
  DATABASE_URL: "postgres://x",
};
const CONFIG = readAdminConfig(ENV);
const NOW = new Date("2026-10-20T10:00:00Z");

/** A store that keeps counters in memory, with the same interface as PgStatsStore. */
function memoryStore(rows = []) {
  const counts = new Map();
  return {
    counts,
    bump: async (day, kind, keys) => {
      for (const key of new Set(keys)) counts.set(`${day}|${kind}|${key}`, (counts.get(`${day}|${kind}|${key}`) ?? 0) + 1);
    },
    bumpCapped: async (day, kind, key) => {
      counts.set(`${day}|${kind}|${key}`, (counts.get(`${day}|${kind}|${key}`) ?? 0) + 1);
    },
    seen: new Set(),
    async registerVisitor(day, hash) {
      const fresh = !this.seen.has(`${day}|${hash}`);
      this.seen.add(`${day}|${hash}`);
      return fresh;
    },
    forgetOldVisitors: async () => {},
    read: async () => rows,
  };
}

// ---------- catalog ----------

test("the catalog counts only pages and links that data.js has", () => {
  assert.equal(catalog.page("/"), "/");
  assert.equal(catalog.page(`/${data.guides[0].id}`), `/${data.guides[0].id}`);
  assert.equal(catalog.page("/admin"), null);
  assert.equal(catalog.page("/../etc"), null);
  assert.equal(catalog.link(firstItem.url), normalizeUrl(firstItem.url));
  assert.equal(catalog.link(`${firstItem.url}#part`), normalizeUrl(firstItem.url));
  assert.equal(catalog.link("https://evil.example/"), null);
  assert.equal(catalog.link("javascript:alert(1)"), null);
  assert.equal(catalog.link("/biu-5787.ics"), `${SITE}/biu-5787.ics`);
  // The private WhatsApp button adds ?text=..., which is not part of the key.
  assert.equal(catalog.link(`https://wa.me/${data.site.whatsapp}?text=hi`), `https://wa.me/${data.site.whatsapp}`);
});

test("the catalog names pages, links and chat sources for the dashboard", () => {
  assert.equal(catalog.label("view", "/"), HOME_LABEL);
  assert.equal(catalog.label("view", `/${data.guides[0].id}`), data.guides[0].title);
  assert.equal(catalog.label("click", normalizeUrl(firstItem.url)), firstItem.name);
  assert.equal(catalog.label("topic", chunks[0].id), chunks[0].title);
  assert.equal(catalog.label("chat", "ok"), "נענו");
  assert.equal(catalog.label("view", "/gone"), "/gone");
});

// ---------- store ----------

test("the store adds one per key in a single upsert and reads both tables", async () => {
  const calls = [];
  const query = async (text, params) => {
    calls.push({ text, params });
    if (text.includes("from site_stats")) return [{ day: "2026-10-20", kind: "view", key: "/", count: "3" }];
    if (text.includes("from chat_usage")) return [{ day: "2026-10-20", key: "global", count: 5 }, { day: "2026-10-20", key: "visitors", count: 2 }];
    return [];
  };
  const store = new PgStatsStore(query);
  await store.bump("2026-10-20", "topic", ["a", "a", "b"]);
  await store.bump("2026-10-20", "topic", []);
  const inserts = calls.filter((c) => c.text.includes("insert"));
  assert.equal(inserts.length, 1);
  assert.deepEqual(inserts[0].params, ["2026-10-20", "topic", ["a", "b"]]);
  assert.deepEqual(await store.read("2026-10-01", "2026-10-31"), [
    { day: "2026-10-20", kind: "view", key: "/", count: 3 },
    { day: "2026-10-20", kind: "chat_day", key: "messages", count: 5 },
    { day: "2026-10-20", kind: "chat_day", key: "visitors", count: 2 },
  ]);
});

test("the store reads without chat totals before the chat table exists", async () => {
  const query = async (text) => {
    if (text.includes("from chat_usage")) throw Object.assign(new Error("missing"), { code: "42P01" });
    return [];
  };
  assert.deepEqual(await new PgStatsStore(query).read("2026-10-01", "2026-10-31"), []);
});

// ---------- /api/track ----------

const track = (body, { origin = SITE, ua = "Mozilla/5.0" } = {}) =>
  new Request(`${SITE}/api/track`, { method: "POST", headers: { "content-type": "application/json", origin, "user-agent": ua }, body: JSON.stringify(body) });

test("track counts a known page and link under today's Israeli date", async () => {
  const store = memoryStore();
  const deps = { store, catalog, now: () => new Date("2026-10-20T22:30:00Z") };
  assert.equal((await handleTrack(track({ kind: "view", key: "/" }), deps)).status, 204);
  assert.equal((await handleTrack(track({ kind: "click", key: firstItem.url }), deps)).status, 204);
  assert.equal(store.counts.get("2026-10-21|view|/"), 1);
  assert.equal(store.counts.get(`2026-10-21|click|${normalizeUrl(firstItem.url)}`), 1);
});

test("track ignores bots and unknown keys, and refuses other sites", async () => {
  const store = memoryStore();
  const deps = { store, catalog, now: () => NOW };
  assert.equal((await handleTrack(track({ kind: "view", key: "/" }, { ua: "Googlebot/2.1" }), deps)).status, 204);
  assert.equal((await handleTrack(track({ kind: "view", key: "/not-a-guide" }), deps)).status, 204);
  assert.equal((await handleTrack(track({ kind: "nope", key: "/" }), deps)).status, 204);
  assert.equal(store.counts.size, 0);
  assert.equal((await handleTrack(track({ kind: "view", key: "/" }, { origin: "https://evil.example" }), deps)).status, 403);
  assert.equal((await handleTrack(track({ kind: "view", key: "/" }), { ...deps, store: null })).status, 503);
});

test("track still answers when the database is down", async () => {
  const deps = { store: { bump: async () => { throw new Error("down"); } }, catalog, now: () => NOW };
  assert.equal((await handleTrack(track({ kind: "view", key: "/" }), deps)).status, 204);
});

test("track stops counting one IP after a burst, until its window ends", async () => {
  const store = memoryStore();
  let now = NOW.getTime();
  const deps = { store, catalog, burst: new BurstLimiter(2, 60_000), now: () => new Date(now) };
  const fromIp = () => new Request(`${SITE}/api/track`, { method: "POST", headers: { "content-type": "application/json", origin: SITE, "x-real-ip": "1.2.3.4" }, body: JSON.stringify({ kind: "view", key: "/" }) });
  for (let i = 0; i < 4; i += 1) assert.equal((await handleTrack(fromIp(), deps)).status, 204);
  assert.equal(store.counts.get("2026-10-20|view|/"), 2);
  now += 60_000;
  await handleTrack(fromIp(), deps);
  assert.equal(store.counts.get("2026-10-20|view|/"), 3);
});

test("a search is cleaned before it is counted, and personal-looking text is dropped", () => {
  assert.equal(searchKey("  מילואים!! "), "מילואים");
  assert.equal(searchKey("רישום ‏  לקורסים"), "רישום לקורסים");
  assert.equal(searchKey("Moodle"), "moodle");
  assert.equal(searchKey("a"), null);
  assert.equal(searchKey("x".repeat(41)), null);
  assert.equal(searchKey("054-1234567"), null);
  assert.equal(searchKey("ת.ז 123456789"), null);
  // However the digits are separated, or in another script, 7+ of them never get stored.
  assert.equal(searchKey("050.123.4567"), null);
  assert.equal(searchKey("050_123_4567"), null);
  assert.equal(searchKey("\u0660\u0665\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667"), null);
  assert.equal(searchKey("89-110"), "89-110");
  // Invisible characters can't make a second copy of the same search.
  assert.equal(searchKey("\u200bמילואים\u200b"), "מילואים");
  assert.equal(searchKey("roy@example.com"), null);
  assert.equal(searchKey(42), null);
});

test("devices are bucketed from the user agent", () => {
  assert.equal(deviceOf("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148"), "mobile");
  assert.equal(deviceOf("Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari"), "mobile");
  assert.equal(deviceOf("Mozilla/5.0 (Linux; Android 13; SM-X200) Safari"), "tablet");
  assert.equal(deviceOf("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130"), "desktop");
});

test("track counts searches, misses, and each visitor once a day with their device and source", async () => {
  const store = memoryStore();
  const deps = { store, catalog, salt: "s".repeat(40), searchBurst: new BurstLimiter(4, 60_000), now: () => NOW };
  const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148";
  const send = (body, ip = "1.2.3.4") =>
    handleTrack(new Request(`${SITE}/api/track`, { method: "POST", headers: { "content-type": "application/json", origin: SITE, "user-agent": iphone, "x-real-ip": ip }, body: JSON.stringify(body) }), deps);
  await send({ kind: "search", key: "מילואים", results: 3 });
  await send({ kind: "search", key: "חניה בלילה", results: 0 });
  await send({ kind: "search", key: "054-1234567", results: 0 });
  await send({ kind: "search", key: "ספריה", results: "lots" });
  await send({ kind: "search", key: "over the limit", results: 1 });
  await send({ kind: "view", key: "/", source: "whatsapp" });
  await send({ kind: "view", key: "/exams", source: "whatsapp" });
  await send({ kind: "view", key: "/", source: "evil.example" }, "5.6.7.8");
  const c = (k) => store.counts.get(`2026-10-20|${k}`);
  assert.equal(c("search|מילואים"), 1);
  assert.equal(c("search_miss|מילואים"), undefined);
  assert.equal(c("search_miss|חניה בלילה"), 1);
  assert.equal([...store.counts.keys()].some((k) => k.includes("1234567")), false);
  assert.equal(c("search|ספריה"), undefined);
  assert.equal(c("search|over the limit"), undefined);
  // The source counts once per visitor per day, and only from the list.
  assert.equal(c("source|whatsapp"), 1);
  assert.equal(c("source|evil.example"), undefined);
  assert.equal(c("visitors|all"), 2);
  assert.equal(c("device|mobile"), 2);
  assert.equal(c("view|/"), 2);
  // The visitor hash is salted per day and never the IP itself.
  assert.notEqual(visitorHash("1.2.3.4", "2026-10-20", "s".repeat(40)), visitorHash("1.2.3.4", "2026-10-21", "s".repeat(40)));
  assert.ok(!visitorHash("1.2.3.4", "2026-10-20", "s".repeat(40)).includes("1.2.3.4"));
});

test("without a salt, views still count but visitors don't", async () => {
  const store = memoryStore();
  await handleTrack(track({ kind: "view", key: "/" }), { store, catalog, salt: null, now: () => NOW });
  assert.equal(store.counts.get("2026-10-20|view|/"), 1);
  assert.equal(store.counts.get("2026-10-20|visitors|all"), undefined);
});

test("free-text keys are capped per day in SQL, an existing key still counts", async () => {
  const calls = [];
  const store = new PgStatsStore(async (text, params) => { calls.push({ text, params }); return []; });
  await store.bumpCapped("2026-10-20", "search", "מילואים");
  const insert = calls.find((c) => c.text.includes("insert into site_stats"));
  assert.deepEqual(insert.params, ["2026-10-20", "search", "מילואים", MAX_FREE_KEYS_PER_DAY]);
  assert.match(insert.text, /where exists[\s\S]*or \(select count\(\*\)/);
});

// ---------- chat stats ----------

test("the chat records how the answer ended and which sources it used", async () => {
  const store = memoryStore();
  const knowledge = { data, chunks, allowedUrls: urls, allowedEmails: emails, core: (today) => buildCore(data, today) };
  const deps = {
    config: { groqApiKey: "k", models: ["m"], guardModel: null, databaseUrl: "postgres://x", salt: "x".repeat(40) },
    knowledge,
    limiter: () => ({ take: async () => "ok" }),
    stats: () => store,
    guard: () => null,
    chain: () => ({ run: async () => ({ ok: true, value: { answer: "באינ-בר.", inScope: true, sources: ["guide:registration"] }, completion: { model: "m", promptTokens: 1, cachedTokens: 0 } }) }),
    now: () => NOW,
  };
  const ask = () => new Request(`${SITE}/api/chat`, { method: "POST", headers: { "content-type": "application/json", origin: SITE }, body: JSON.stringify({ messages: [{ role: "user", content: "איך נרשמים?" }] }) });
  assert.equal((await handleChat(ask(), deps)).status, 200);
  assert.equal(store.counts.get("2026-10-20|chat|ok"), 1);
  assert.equal(store.counts.get("2026-10-20|topic|guide:registration"), 1);

  const outOfScope = () => ({ run: async () => ({ ok: true, value: { answer: "אין לי מידע על זה, כדאי לשאול את רועי.", inScope: false, sources: [] }, completion: { model: "m", promptTokens: 1, cachedTokens: 0 } }) });
  await handleChat(ask(), { ...deps, chain: outOfScope });
  assert.equal(store.counts.get("2026-10-20|chat|out_of_scope"), 1);

  await handleChat(ask(), { ...deps, limiter: () => ({ take: async () => "daily_cap" }) });
  assert.equal(store.counts.get("2026-10-20|chat|daily_cap"), 1);
  // A broken stats store never costs the student an answer.
  assert.equal((await handleChat(ask(), { ...deps, stats: () => ({ bump: async () => { throw new Error("down"); } }) })).status, 200);
});

// ---------- admin auth ----------

test("admin config needs every variable and a long secret", () => {
  assert.deepEqual([...CONFIG.admins], ["roy@example.com"]);
  assert.equal(readAdminConfig({ ...ENV, ADMIN_SESSION_SECRET: "short" }), null);
  assert.equal(readAdminConfig({ ...ENV, ADMIN_EMAILS: "nope" }), null);
  assert.equal(readAdminConfig({ ...ENV, GOOGLE_CLIENT_ID: "" }), null);
  // Without its own secret, the session key comes from the chat's salt, and differs from the salt itself.
  const derived = readAdminConfig({ ...ENV, ADMIN_SESSION_SECRET: "", CHAT_SALT: "c".repeat(64) });
  assert.ok(derived);
  assert.notEqual(new TextDecoder().decode(derived.sessionKey), "c".repeat(64));
  assert.equal(readAdminConfig({ ...ENV, ADMIN_SESSION_SECRET: "", CHAT_SALT: "short" }), null);
});

async function googleSigner() {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256" };
  const sign = (claims, { aud = ENV.GOOGLE_CLIENT_ID, iss = "https://accounts.google.com", exp = "1h" } = {}) =>
    new SignJWT(claims).setProtectedHeader({ alg: "RS256", kid: "k1" }).setIssuer(iss).setAudience(aud).setIssuedAt().setExpirationTime(exp).sign(privateKey);
  return { jwks: createLocalJWKSet({ keys: [jwk] }), sign };
}

test("only a verified admin email from a real Google token signs in", async () => {
  const { jwks, sign } = await googleSigner();
  const roy = { email: "ROY@example.com", email_verified: true };
  assert.equal(await adminFromGoogleToken(await sign(roy), CONFIG, jwks), "roy@example.com");
  assert.equal(await adminFromGoogleToken(await sign({ ...roy, email_verified: false }), CONFIG, jwks), null);
  assert.equal(await adminFromGoogleToken(await sign({ email: "someone@example.com", email_verified: true }), CONFIG, jwks), null);
  assert.equal(await adminFromGoogleToken(await sign(roy, { aud: "other-client" }), CONFIG, jwks), null);
  assert.equal(await adminFromGoogleToken(await sign(roy, { iss: "https://evil.example" }), CONFIG, jwks), null);
  assert.equal(await adminFromGoogleToken(await sign(roy, { exp: "-1m" }), CONFIG, jwks), null);
  const other = await googleSigner();
  assert.equal(await adminFromGoogleToken(await other.sign(roy), CONFIG, jwks), null);
  assert.equal(await adminFromGoogleToken("not.a.token", CONFIG, jwks), null);
});

const withSession = async (url, email = "roy@example.com", now = NOW, init = {}) =>
  new Request(url, { ...init, headers: { ...init.headers, cookie: `other=1; nr_admin=${await createSession(email, CONFIG, now)}` } });

test("the session cookie is httpOnly, scoped to /api/admin, and expires", async () => {
  assert.match(sessionCookie("t"), /^nr_admin=t; Path=\/api\/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=604800$/);
  assert.match(sessionCookie(null), /Max-Age=0/);
  assert.equal(readCookie(new Request(SITE, { headers: { cookie: "a=1; nr_admin=xyz" } }), "nr_admin"), "xyz");
  assert.equal(await adminFromRequest(await withSession(SITE), CONFIG, NOW), "roy@example.com");
  assert.equal(await adminFromRequest(await withSession(SITE), CONFIG, new Date("2026-10-28T10:00:00Z")), null);
  assert.equal(await adminFromRequest(await withSession(SITE), readAdminConfig({ ...ENV, ADMIN_EMAILS: "new@example.com" }), NOW), null);
  assert.equal(await adminFromRequest(await withSession(SITE), readAdminConfig({ ...ENV, ADMIN_SESSION_SECRET: "t".repeat(40) }), NOW), null);
});

const adminDeps = (overrides = {}) => ({
  config: CONFIG,
  store: memoryStore([{ day: "2026-10-20", kind: "view", key: "/", count: 4 }]),
  catalog,
  verifyGoogle: async (token) => (token === "good" ? "roy@example.com" : null),
  now: () => NOW,
  ...overrides,
});

test("signing in sets the cookie; a refused token and other sites get 403", async () => {
  const post = (credential, origin = SITE) =>
    new Request(`${SITE}/api/admin/session`, { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ credential }) });
  const ok = await handleSession(post("good"), adminDeps());
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get("set-cookie"), /^nr_admin=ey/);
  assert.equal((await handleSession(post("bad"), adminDeps())).status, 403);
  assert.equal((await handleSession(post("good", "https://evil.example"), adminDeps())).status, 403);
  assert.equal((await handleSession(post("good"), adminDeps({ config: null }))).status, 503);

  const status = await handleSession(new Request(`${SITE}/api/admin/session`), adminDeps());
  assert.deepEqual(await status.json(), { signedIn: false, clientId: ENV.GOOGLE_CLIENT_ID });
  const out = await handleSession(new Request(`${SITE}/api/admin/session`, { method: "DELETE", headers: { origin: SITE } }), adminDeps());
  assert.match(out.headers.get("set-cookie"), /Max-Age=0/);
});

test("stats are for signed-in admins only, as JSON or CSV", async () => {
  const url = `${SITE}/api/admin/stats?from=2026-10-19&to=2026-10-20`;
  assert.equal((await handleStats(new Request(url), adminDeps())).status, 401);
  const res = await handleStats(await withSession(url), adminDeps());
  assert.equal(res.status, 200);
  const report = await res.json();
  assert.equal(report.totals.views, 4);
  assert.equal(report.days.length, 2);
  assert.equal(report.pages[0].label, HOME_LABEL);

  const csv = await handleStats(await withSession(`${url}&format=csv`), adminDeps());
  assert.match(csv.headers.get("content-disposition"), /attachment; filename="nechita-raka-stats_2026-10-19_2026-10-20\.csv"/);
  assert.match(await csv.text(), /2026-10-20,view,צפייה בעמוד,\/,דף הבית,4/);

  assert.equal((await handleStats(await withSession(`${SITE}/api/admin/stats?from=2026-10-21&to=2026-10-20`), adminDeps())).status, 400);
  const down = adminDeps({ store: { read: async () => { throw new Error("down"); } } });
  assert.equal((await handleStats(await withSession(url), down)).status, 503);
});

// ---------- report ----------

test("ranges must be real dates, in order, and at most about three years", () => {
  const p = (from, to) => parseRange(new URLSearchParams({ from, to }));
  assert.deepEqual(p("2026-10-01", "2026-10-31"), { from: "2026-10-01", to: "2026-10-31" });
  assert.equal(p("2026-02-30", "2026-03-01"), null);
  assert.equal(p("2026-10-31", "2026-10-01"), null);
  assert.equal(p("2020-01-01", "2026-10-01"), null);
  assert.equal(parseRange(new URLSearchParams()), null);
});

test("the report fills empty days and ranks pages, links, topics and chat outcomes", () => {
  const rows = [
    { day: "2026-10-01", kind: "view", key: "/", count: 2 },
    { day: "2026-10-03", kind: "view", key: "/", count: 1 },
    { day: "2026-10-03", kind: "view", key: `/${data.guides[0].id}`, count: 5 },
    { day: "2026-10-03", kind: "chat_day", key: "messages", count: 7 },
    { day: "2026-10-03", kind: "chat", key: "ok", count: 6 },
    { day: "2026-10-03", kind: "topic", key: chunks[0].id, count: 2 },
  ];
  const r = buildReport(rows, { from: "2026-10-01", to: "2026-10-03" }, catalog);
  assert.deepEqual(r.days.map((d) => d.views), [2, 0, 6]);
  assert.deepEqual(r.totals, { views: 8, visitors: 0, clicks: 0, searches: 0, chatMessages: 7, chatVisitors: 0, answered: 6 });
  assert.deepEqual(r.pages.map((x) => x.count), [5, 3]);
  assert.equal(r.topics[0].label, chunks[0].title);
});

test("the report adds visitors, searches, misses, sources and devices; out-of-scope answers count as answered", () => {
  const rows = [
    { day: "2026-10-01", kind: "visitors", key: "all", count: 4 },
    { day: "2026-10-01", kind: "search", key: "מילואים", count: 3 },
    { day: "2026-10-01", kind: "search_miss", key: "חניה בלילה", count: 2 },
    { day: "2026-10-01", kind: "source", key: "whatsapp", count: 5 },
    { day: "2026-10-01", kind: "device", key: "mobile", count: 4 },
    { day: "2026-10-01", kind: "chat", key: "ok", count: 2 },
    { day: "2026-10-01", kind: "chat", key: "out_of_scope", count: 1 },
  ];
  const r = buildReport(rows, { from: "2026-10-01", to: "2026-10-01" }, catalog);
  assert.equal(r.totals.visitors, 4);
  assert.equal(r.totals.searches, 3);
  assert.equal(r.totals.answered, 3);
  assert.equal(r.searchMisses[0].label, "חניה בלילה");
  assert.equal(r.sources[0].label, "וואטסאפ");
  assert.equal(r.devices[0].label, "טלפון");
  assert.match(toCsv(rows, catalog), /2026-10-01,source,מקור הגעה,whatsapp,וואטסאפ,5/);
});

test("the CSV escapes commas and quotes and defuses formulas", () => {
  const fake = { label: () => '=HYPERLINK("x"), y' };
  const csv = toCsv([{ day: "2026-10-01", kind: "view", key: "/", count: 1 }], fake);
  assert.ok(csv.startsWith("﻿date,metric,metric_name,key,label,count\r\n"));
  assert.ok(csv.includes(`"'=HYPERLINK(""x""), y"`));
});
