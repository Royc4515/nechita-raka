import assert from "node:assert/strict";
import { test } from "node:test";
import { bySoonest, clash, currentSemester, groupsByNext, minutesUntil, nextMeeting, upcomingExams } from "../../course-time.js";
import { createStore } from "../../course-store.js";

// Thursday 15.10.2026, 10:30 (Thursday is day 4; Sunday is 0, like ב' is Monday)
const now = new Date(2026, 9, 15, 10, 30);
const TERMS = [
  { label: "סמסטר א'", kind: "semester", from: "2026-10-11", to: "2027-01-17" },
  { label: "בחינות סמסטר א'", kind: "exams", from: "2027-01-18", to: "2027-02-28" },
  { label: "סמסטר ב'", kind: "semester", from: "2027-03-01", to: "2027-06-25" },
];
const slot = (day, start, end) => ({ day, start, end, building: "", room: "" });
const g = (group, slots, semester = "סמסטר א'") => ({ kind: "תרגיל", group, semester, slots, pending: false, teachers: "" });

test("the current semester is the first one that hasn't ended, skipping exam periods", () => {
  assert.equal(currentSemester(TERMS, now), "סמסטר א'");
  assert.equal(currentSemester(TERMS, new Date(2027, 1, 1)), "סמסטר ב'"); // during exams: semester B is next
  assert.equal(currentSemester(TERMS, new Date(2027, 7, 1)), "");
  assert.equal(currentSemester([], now), "");
});

test("minutes until a group's next start wrap around the week, and are 0 while it is on", () => {
  assert.equal(minutesUntil(g("01", [slot("ה'", "12:00", "14:00")]), now), 90); // later today
  assert.equal(minutesUntil(g("02", [slot("ה'", "10:00", "12:00")]), now), 0); // on now
  assert.equal(minutesUntil(g("03", [slot("ו'", "09:00", "11:00")]), now), 24 * 60 - 90); // tomorrow
  assert.equal(minutesUntil(g("04", [slot("ה'", "08:00", "10:00")]), now), 7 * 24 * 60 - 150); // ended today: next week
  assert.equal(minutesUntil(g("05", []), now), null);
});

test("a group that meets twice a week counts its sooner meeting", () => {
  const twice = g("01", [slot("ב'", "09:00", "11:00"), slot("ו'", "10:00", "12:00")]);
  assert.equal(nextMeeting(twice, now).slot.day, "ו'");
});

test("groups come soonest first and timeless last; the older helper still puts this semester first", () => {
  const groups = [g("01", [slot("א'", "09:00", "11:00")]), g("02", []), g("03", [slot("ה'", "12:00", "14:00")]), g("05", [slot("ה'", "10:00", "12:00")])];
  assert.deepEqual(bySoonest(groups, now).map((x) => x.group), ["05", "03", "01", "02"]);
  const mixed = [...groups, g("04", [slot("ה'", "12:00", "14:00")], "סמסטר ב'")];
  assert.equal(groupsByNext(mixed, now, "סמסטר א'").at(-1).group.group, "04");
});

test("two groups clash only when they overlap on the same day in a shared semester", () => {
  const a = g("01", [slot("ב'", "14:00", "16:00")]);
  assert.equal(clash(a, g("02", [slot("ב'", "15:00", "17:00")]), "סמסטר א'"), true);
  assert.equal(clash(a, g("03", [slot("ב'", "16:00", "18:00")]), "סמסטר א'"), false); // back to back
  assert.equal(clash(a, g("04", [slot("ג'", "14:00", "16:00")]), "סמסטר א'"), false);
  assert.equal(clash(a, g("05", [slot("ב'", "14:00", "16:00")], "סמסטר ב'"), "סמסטר א'"), false);
  assert.equal(clash(a, g("06", [slot("ב'", "15:00", "16:00")], "סמסטר א', סמסטר ב'"), "סמסטר א'"), true);
});

test("upcoming exams are in date order, by semester, and flag first sittings within 3 days of each other", () => {
  const ex = (date, type = "מועד א'", semester = "סמסטר א'") => ({ type, date, hour: "09:00", semester });
  const course = (code, exams) => ({ code, exams });
  const courses = [course("1", [ex("2027-01-21"), ex("2026-09-01")]), course("2", [ex("2027-01-23"), ex("2027-01-22", "מועד ב'")]), course("3", [ex("2027-02-10"), ex("2027-06-30", "מועד א'", "סמסטר ב'")])];
  const list = upcomingExams(courses, now, "סמסטר א'");
  assert.deepEqual(list.map((e) => [e.course.code, e.exam.date, e.close]), [["1", "2027-01-21", true], ["2", "2027-01-22", false], ["2", "2027-01-23", true], ["3", "2027-02-10", false]]);
  assert.equal(upcomingExams(courses, now).length, 5);
  const sameDay = upcomingExams([course("4", [ex("2027-02-17", "מועד ב'")]), course("5", [ex("2027-02-17", "מועד ב'")])], now);
  assert.deepEqual(sameDay.map((e) => e.close), ["same-day", "same-day"]);
});

test("the store stars, picks (which also stars) and unstars (which drops picks), and survives blocked storage", () => {
  globalThis.localStorage = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  const store = createStore();
  store.togglePick("89110", "03");
  assert.equal(store.isStarred("89110"), true);
  assert.equal(store.isPicked("89110", "03"), true);
  store.toggleStar("89110");
  assert.equal(store.isStarred("89110"), false);
  assert.deepEqual(store.picks("89110"), []);
  delete globalThis.localStorage;
});

test("malformed saved state is cleaned, not trusted, and an empty catalog drops nothing", () => {
  globalThis.localStorage = { getItem: () => JSON.stringify({ starred: ["89110", 5], picks: { "89110": 3, "891200": ["15", null] } }), setItem: () => {} };
  const store = createStore();
  assert.deepEqual(store.get().starred, ["89110"]);
  assert.deepEqual(store.picks("89110"), []);
  assert.deepEqual(store.picks("891200"), ["15"]);
  assert.deepEqual(store.reconcile([], "2026-10-14"), []);
  assert.deepEqual(store.get().starred, ["89110"]);
  delete globalThis.localStorage;
});

test("every module of the courses page loads (catches a syntax error the browser would hit)", async () => {
  for (const file of ["course-ai.js", "course-browser.js", "course-card.js", "course-schedule.js", "course-store.js", "course-time.js"]) {
    await assert.doesNotReject(import(`../../${file}`), file);
  }
});
