import assert from "node:assert/strict";
import { test } from "node:test";
import { currentSemester, groupsByNext, minutesUntil } from "../../course-browser.js";

// Thursday 15.10.2026, 10:30 (Thursday is day 4; Sunday is 0, like ב' is Monday)
const now = new Date(2026, 9, 15, 10, 30);
const TERMS = [
  { label: "סמסטר א'", kind: "semester", from: "2026-10-11", to: "2027-01-17" },
  { label: "בחינות סמסטר א'", kind: "exams", from: "2027-01-18", to: "2027-02-28" },
  { label: "סמסטר ב'", kind: "semester", from: "2027-03-01", to: "2027-06-25" },
];
const g = (group, day, hours, semester = "סמסטר א'") => ({ kind: "תרגיל", group, semester, day, hours, place: "", teachers: "" });

test("the current semester is the first one that hasn't ended, skipping exam periods", () => {
  assert.equal(currentSemester(TERMS, now), "סמסטר א'");
  assert.equal(currentSemester(TERMS, new Date(2027, 1, 1)), "סמסטר ב'"); // during exams: semester B is next
  assert.equal(currentSemester(TERMS, new Date(2027, 7, 1)), "");
  assert.equal(currentSemester([], now), "");
});

test("minutes until a group's next start wrap around the week, and are 0 while it is on", () => {
  assert.equal(minutesUntil(g("01", "ה'", "12:00 - 14:00"), now), 90); // later today
  assert.equal(minutesUntil(g("02", "ה'", "10:00 - 12:00"), now), 0); // on now
  assert.equal(minutesUntil(g("03", "ו'", "09:00 - 11:00"), now), 24 * 60 - 90); // tomorrow
  assert.equal(minutesUntil(g("04", "ה'", "08:00 - 10:00"), now), 7 * 24 * 60 - 150); // ended today: next week
  assert.equal(minutesUntil(g("05", "", ""), now), null);
});

test("groups come this semester first, soonest first, timeless last", () => {
  const groups = [g("01", "א'", "09:00 - 11:00"), g("02", "", ""), g("03", "ה'", "12:00 - 14:00"), g("04", "ה'", "12:00 - 14:00", "סמסטר ב'"), g("05", "ה'", "10:00 - 12:00"), g("06", "ו'", "08:00 - 10:00", "סמסטר א', סמסטר ב'")];
  const order = groupsByNext(groups, now, "סמסטר א'").map((e) => e.group.group);
  assert.deepEqual(order, ["05", "03", "06", "01", "02", "04"]);
  assert.equal(groupsByNext(groups, now, "סמסטר א'")[0].minutes, 0);
});
