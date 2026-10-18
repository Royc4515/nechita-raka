import assert from "node:assert/strict";
import { test } from "node:test";
import { CITY, candleLighting, clock, havdalah, parseClockOverride, shabbatReply, shabbatState } from "../_lib/chat/shabbat.js";
import { handleChat } from "../_lib/chat/handler.js";
import { FACULTIES, FACULTY, validateFaculty } from "../../faculties/index.js";
import { browserFaculty } from "../../scripts/faculty-public.mjs";

// Hebcal's published times for Ramat Gan (geonameid 293788), from
//   https://www.hebcal.com/hebcal?v=1&cfg=json&c=on&geonameid=293788&start=2026-10-16&end=2027-12-31
// (the "candles" and "havdalah" items; Hebcal's candle lighting is 20 minutes before sunset, havdalah at tzeit 8.5 degrees).
// [Friday, candle lighting, UTC offset on that Friday, Saturday, havdalah]. The rows cover the next eight Shabbatot from 16.10.2026
// (the last one on summer time is 24.10.2026, the clocks go back on Sunday 25.10), the winter, and the summer, and
// 26-27.03.2027, where summer time starts on the Friday itself (the Saturday is already +03:00).
const HEBCAL = [
  ["2026-10-16", "17:47", "+03:00", "2026-10-17", "18:43"],
  ["2026-10-23", "17:39", "+03:00", "2026-10-24", "18:35"],
  ["2026-10-30", "16:32", "+02:00", "2026-10-31", "17:29"],
  ["2026-11-06", "16:26", "+02:00", "2026-11-07", "17:24"],
  ["2026-11-13", "16:22", "+02:00", "2026-11-14", "17:20"],
  ["2026-11-20", "16:18", "+02:00", "2026-11-21", "17:17"],
  ["2026-11-27", "16:16", "+02:00", "2026-11-28", "17:15"],
  ["2026-12-04", "16:15", "+02:00", "2026-12-05", "17:15"],
  ["2026-12-18", "16:18", "+02:00", "2026-12-19", "17:19"],
  ["2027-01-22", "16:44", "+02:00", "2027-01-23", "17:44"],
  ["2027-03-19", "17:31", "+02:00", "2027-03-20", "18:28"],
  ["2027-03-26", "18:36", "+03:00", "2027-03-27", "19:33"],
  ["2027-04-02", "18:40", "+03:00", "2027-04-03", "19:38"],
  ["2027-06-25", "19:30", "+03:00", "2027-06-26", "20:33"],
  ["2027-07-23", "19:24", "+03:00", "2027-07-24", "20:24"],
  ["2027-09-03", "18:42", "+03:00", "2027-09-04", "19:39"],
  ["2027-10-22", "17:40", "+03:00", "2027-10-23", "18:37"],
  ["2027-10-29", "17:33", "+03:00", "2027-10-30", "18:30"],
];
// Summer time ends on the last Sunday of October: the Saturday of 2026-10-31 is +02:00 as well.
const SATURDAY_OFFSET = { "2027-03-27": "+03:00", "2026-10-31": "+02:00" };
const ymd = (iso) => iso.split("-").map(Number);
const at = (date, time, offset) => Date.parse(`${date}T${time}:00${offset}`);

test("computed candle lighting and havdalah equal Hebcal's to the minute, in winter, summer and across the DST changes", () => {
  for (const [friday, candle, offset, saturday, end] of HEBCAL) {
    assert.equal(candleLighting(...ymd(friday)), at(friday, candle, offset), `candle lighting ${friday}`);
    assert.equal(havdalah(...ymd(saturday)), at(saturday, end, SATURDAY_OFFSET[saturday] ?? offset), `havdalah ${saturday}`);
  }
});

test("the city and the offsets are the ones Hebcal uses for Ramat Gan", () => {
  assert.equal(CITY.geonameid, 293788);
  assert.equal(CITY.candleMinutes, 20);
  assert.equal(CITY.havdalahDegrees, 8.5);
  assert.equal(CITY.timeZone, "Asia/Jerusalem");
});

test("it works for any date, not only the ones tabulated (2030, a leap day, the far future)", () => {
  for (const [y, m, d] of [[2030, 6, 21], [2028, 2, 29], [2045, 12, 21]]) {
    const candle = candleLighting(y, m, d);
    const dusk = havdalah(y, m, d + 1);
    assert.ok(Number.isFinite(candle) && Number.isFinite(dusk));
    const hours = (dusk - candle) / 3_600_000;
    assert.ok(hours > 24 && hours < 27.5, `the closed stretch on ${y}-${m}-${d} is ${hours.toFixed(1)}h`);
  }
});

// Winter Shabbat 2027-01-22 (16:44 to 17:44, +02:00) and summer Shabbat 2027-06-25 (19:30 to 20:33, +03:00).
const IL = (date, time, offset) => Date.parse(`${date}T${time}:00${offset}`);
test("it is closed from candle lighting to havdalah and open before and after, in winter", () => {
  const state = (when) => shabbatState(IL(...when));
  assert.equal(state(["2027-01-22", "12:00", "+02:00"]).closed, false, "Friday noon");
  assert.equal(state(["2027-01-22", "16:43", "+02:00"]).closed, false, "a minute before candle lighting");
  assert.equal(state(["2027-01-22", "16:44", "+02:00"]).closed, true, "at candle lighting");
  assert.equal(state(["2027-01-22", "19:30", "+02:00"]).closed, true, "Friday evening");
  assert.equal(state(["2027-01-23", "03:00", "+02:00"]).closed, true, "the middle of the night");
  assert.equal(state(["2027-01-23", "10:00", "+02:00"]).closed, true, "Saturday morning");
  assert.equal(state(["2027-01-23", "17:43", "+02:00"]).closed, true, "a minute before havdalah");
  assert.equal(state(["2027-01-23", "17:44", "+02:00"]).closed, false, "at havdalah it reopens");
  assert.equal(state(["2027-01-23", "21:00", "+02:00"]).closed, false, "Saturday night");
  assert.equal(state(["2027-01-24", "09:00", "+02:00"]).closed, false, "Sunday");
  assert.equal(state(["2027-01-27", "13:00", "+02:00"]).closed, false, "midweek");
  assert.equal(state(["2027-01-23", "10:00", "+02:00"]).havdalah, IL("2027-01-23", "17:44", "+02:00"), "it names when it reopens");
});

test("the same in summer, on the other clock", () => {
  const state = (when) => shabbatState(IL(...when));
  assert.equal(state(["2027-06-25", "12:00", "+03:00"]).closed, false);
  assert.equal(state(["2027-06-25", "19:29", "+03:00"]).closed, false);
  assert.equal(state(["2027-06-25", "19:30", "+03:00"]).closed, true);
  assert.equal(state(["2027-06-26", "10:00", "+03:00"]).closed, true);
  assert.equal(state(["2027-06-26", "20:32", "+03:00"]).closed, true);
  assert.equal(state(["2027-06-26", "20:33", "+03:00"]).closed, false);
  assert.equal(state(["2027-06-26", "23:00", "+03:00"]).closed, false);
});

test("it is the same for a visitor on another clock: the decision is made on Israel's wall clock", () => {
  // Friday 19:30 in Israel is 17:30 UTC in winter and also 16:30 in New York: the instant decides, not the visitor's zone.
  const friday = IL("2027-01-22", "19:30", "+02:00");
  assert.equal(shabbatState(friday).closed, true);
  assert.equal(shabbatState(Date.parse("2027-01-22T17:30:00Z")).closed, true);
  assert.equal(shabbatState(Date.parse("2027-01-23T17:43:00+02:00")).closed, true);
  // Just after midnight UTC on Saturday is already Saturday morning in Israel (02:00): still Shabbat.
  assert.equal(shabbatState(Date.parse("2027-01-23T00:10:00Z")).closed, true);
});

test("the clocks changing on the Friday of 2027-03-26 and back on Sunday 2026-10-25 do not shift the window", () => {
  assert.equal(shabbatState(IL("2027-03-26", "18:35", "+03:00")).closed, false);
  assert.equal(shabbatState(IL("2027-03-26", "18:36", "+03:00")).closed, true);
  assert.equal(shabbatState(IL("2027-03-27", "19:32", "+03:00")).closed, true);
  assert.equal(shabbatState(IL("2027-03-27", "19:33", "+03:00")).closed, false);
  assert.equal(shabbatState(IL("2026-10-24", "18:35", "+03:00")).closed, false);
  assert.equal(shabbatState(IL("2026-10-24", "18:34", "+03:00")).closed, true);
  assert.equal(shabbatState(IL("2026-10-25", "09:00", "+02:00")).closed, false, "Sunday after the change");
});

test("clock() reads Israel's wall clock, summer and winter", () => {
  assert.equal(clock(IL("2027-06-26", "20:33", "+03:00")), "20:33");
  assert.equal(clock(IL("2027-01-23", "17:44", "+02:00")), "17:44");
  assert.equal(clock(Date.parse("2027-01-23T00:05:00Z")), "02:05");
});

test("the ?today=YYYY-MM-DDTHH:MM override is read on Israel's clock, and plain dates or junk are not an override", () => {
  assert.equal(parseClockOverride("2027-01-22T19:30"), IL("2027-01-22", "19:30", "+02:00"));
  assert.equal(parseClockOverride("2027-06-26T10:00"), IL("2027-06-26", "10:00", "+03:00"));
  assert.equal(parseClockOverride("2027-03-26T12:00"), IL("2027-03-26", "12:00", "+03:00"), "the day summer time starts");
  for (const bad of ["2027-01-22", "2027-13-01T10:00", "2027-02-30T10:00", "2027-01-22T25:00", "", null, undefined, "x"]) assert.equal(parseClockOverride(bad), null, String(bad));
});

test("the chat's Shabbat answer is short, in the mascot's own grammar, with the time it reopens, in both languages", () => {
  const reopens = IL("2027-01-23", "17:44", "+02:00");
  for (const mascot of FACULTY.mascots) {
    const he = shabbatReply(mascot.id, true, reopens);
    assert.ok(he.startsWith("שבת שלום! ") && he.includes(mascot.name) && he.includes("נדבר במוצאי שבת") && he.includes("17:44"), he);
    assert.ok(he.includes(mascot.gender === "f" ? " נחה " : " נח "), he);
    assert.ok(!/[—–]/.test(he));
    const en = shabbatReply(mascot.id, false, reopens);
    assert.ok(en.includes(mascot.nameEn) && en.includes("17:44"), en);
  }
  assert.ok(shabbatReply("nobody", true, reopens).includes(FACULTY.mascots.find((m) => m.id === FACULTY.defaultMascot).name), "an unknown persona falls back to the default");
});

test("the manifest's Shabbat block is validated like the rest and reaches the browser, and every faculty has one", () => {
  for (const faculty of Object.values(FACULTIES)) {
    assert.doesNotThrow(() => validateFaculty(faculty));
    const shabbat = browserFaculty(faculty).site.shabbat;
    assert.deepEqual(shabbat, { title: faculty.site.shabbat.title, lines: faculty.site.shabbat.lines, footer: faculty.site.shabbat.footer });
    assert.ok(shabbat.lines.length >= 2 && shabbat.lines.length <= 3);
  }
  const bad = (mutate) => {
    const copy = structuredClone(FACULTY);
    mutate(copy.site.shabbat);
    return () => validateFaculty(copy);
  };
  assert.throws(bad((s) => { s.title = ""; }), /site\.shabbat\.title/);
  assert.throws(bad((s) => { s.footer = " "; }), /site\.shabbat\.footer/);
  assert.throws(bad((s) => { s.lines = ["one"]; }), /two or three/);
  assert.throws(bad((s) => { s.lines = ["a", "b", "c", "d"]; }), /two or three/);
  assert.throws(bad((s) => { s.lines = ["a", ""]; }), /two or three/);
  assert.throws(bad((s) => { s.lines = ["a — b", "c"]; }), /long dash/);
  const missing = structuredClone(FACULTY);
  delete missing.site.shabbat;
  assert.throws(() => validateFaculty(missing), /site\.shabbat is missing/);
});

// ---------- the chat function ----------

const CONFIG = { groqApiKey: "k", models: ["m1"], guardModel: null, databaseUrl: "postgres://x", salt: "x".repeat(40) };
const post = (body) => new Request(`${FACULTY.site.url}/api/chat`, { method: "POST", headers: { "content-type": "application/json", origin: FACULTY.site.url }, body: JSON.stringify(body) });
const persona = FACULTY.mascots[0];

function depsAt(instant, calls) {
  return {
    config: CONFIG,
    knowledge: { chunks: [], allowedUrls: new Set(), allowedEmails: new Set(), core: () => "" },
    limiter: () => ({ take: async () => { calls.limiter++; return "ok"; } }),
    stats: () => ({ bump: async () => { calls.stats++; } }),
    guard: () => ({ score: async () => { calls.guard++; return 0; } }),
    chain: () => ({ run: async () => { calls.model++; return { ok: false, busy: true }; } }),
    now: () => new Date(instant),
  };
}

test("on Shabbat the chat answers in character without the limiter, the guard, the model or the stats", async () => {
  for (const [when, label] of [[IL("2027-01-22", "19:30", "+02:00"), "Friday evening"], [IL("2027-01-23", "10:00", "+02:00"), "Saturday morning"], [IL("2027-06-26", "20:00", "+03:00"), "summer Saturday"]]) {
    const calls = { limiter: 0, stats: 0, guard: 0, model: 0 };
    const res = await handleChat(post({ persona: persona.id, messages: [{ role: "user", content: "איך נרשמים לקורס?" }] }), depsAt(when, calls));
    assert.equal(res.status, 200, label);
    const body = await res.json();
    assert.equal(body.shabbat, true);
    assert.deepEqual(body.sources, []);
    assert.ok(body.reply.startsWith("שבת שלום") && body.reply.includes("נדבר במוצאי שבת"), body.reply);
    assert.deepEqual(calls, { limiter: 0, stats: 0, guard: 0, model: 0 }, label);
  }
});

test("on Shabbat an English question gets the English answer, and a bad request is still refused first", async () => {
  const calls = { limiter: 0, stats: 0, guard: 0, model: 0 };
  const when = IL("2027-01-23", "10:00", "+02:00");
  const english = await (await handleChat(post({ persona: persona.id, messages: [{ role: "user", content: "How do I register?" }] }), depsAt(when, calls))).json();
  assert.ok(english.reply.startsWith("Shabbat shalom!"), english.reply);
  assert.equal((await handleChat(post({ messages: [] }), depsAt(when, calls))).status, 400, "validation comes before the Shabbat answer");
  const foreign = new Request(`${FACULTY.site.url}/api/chat`, { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example" }, body: "{}" });
  assert.equal((await handleChat(foreign, depsAt(when, calls))).status, 403);
});

test("outside Shabbat the chat goes on as before (the limiter and the model are called)", async () => {
  for (const when of [IL("2027-01-22", "12:00", "+02:00"), IL("2027-01-23", "17:44", "+02:00"), IL("2027-01-24", "10:00", "+02:00")]) {
    const calls = { limiter: 0, stats: 0, guard: 0, model: 0 };
    const res = await handleChat(post({ persona: persona.id, messages: [{ role: "user", content: "איך נרשמים לקורס?" }] }), depsAt(when, calls));
    assert.equal(res.status, 503, "the fake model is busy");
    assert.equal(calls.limiter, 1);
    assert.equal(calls.model, 1);
  }
});
