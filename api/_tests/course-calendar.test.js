import assert from "node:assert/strict";
import { test } from "node:test";
import { buildIcs, eventType } from "../../course-calendar.js";
import { applyCustom, createStore } from "../../course-store.js";
import { loadContent } from "../../faculties/content.js";
import { loadCourses } from "../_lib/courses/model.js";

const { courses, scannedAt } = loadCourses();
const byCode = new Map(courses.map((c) => [c.code, c]));
const { terms, events } = loadContent().calendar;
const A = "סמסטר א'";
const all = (list) => new Set(list);
const options = (over = {}) => ({
  classes: { on: true, kinds: all(["lecture", "exercise", "other"]), courses: all(["89110", "891195"]), skipHolidays: true, reminder: 10, ...over.classes },
  exams: { on: true, sittings: all(["מועד א'"]), courses: all(["89110", "891195"]), dayBefore: true, ...over.exams },
  events: { types: all(["holiday"]), ...over.events },
});
const pick = (code, group) => ({ course: byCode.get(code), group: byCode.get(code).groups.find((g) => g.group === group) });
const now = new Date(Date.UTC(2026, 9, 15, 8));

test("each event type is recognized, and site exams and birthdays are never offered", () => {
  assert.equal(eventType({ title: "חופשת חנוכה" }), "holiday");
  assert.equal(eventType({ title: "צום י' בטבת", note: "אין לימודים" }), "holiday");
  assert.equal(eventType({ title: "תשלום שכר לימוד", guide: "payments" }), "payment");
  assert.equal(eventType({ title: "תקופת בחינות סמסטר א'" }), "semester");
  assert.equal(eventType({ title: "יריד קריירה ותעסוקה" }), "other");
  assert.equal(eventType({ title: "בחינה: מבוא למדעי המחשב, מועד א'" }), null);
  assert.equal(eventType({ title: "יום ההולדת", kind: "birthday" }), null);
});

test("a picked group becomes a weekly event for the semester, skipping class days that fall on holidays", () => {
  // Discrete lecture 01 meets Monday and Tuesday: two weekly events.
  const { text, count } = buildIcs({ picked: [pick("891195", "01")], semester: A, terms, events, scannedAt, now, options: options({ exams: { on: false }, events: { types: all([]) } }) });
  assert.equal(count.classes, 2);
  assert.match(text, /DTSTART;TZID=Asia\/Jerusalem:20261012T090000/); // first Monday of the semester
  assert.match(text, /RRULE:FREQ=WEEKLY;UNTIL=20270118T000000Z/);
  assert.match(text, /EXDATE;TZID=Asia\/Jerusalem:[^\r]*20261207T090000/); // Hanukkah Monday
  assert.match(text, /BEGIN:VALARM[\s\S]*TRIGGER:-PT10M/);
  assert.match(text, /BEGIN:VTIMEZONE/);
  assert.ok(text.split("\r\n").every((line) => new TextEncoder().encode(line).length <= 75), "a line is longer than 75 bytes");
});

test("filters: kinds, courses, sittings and event types decide what goes in; untimed picks are reported", () => {
  const picked = [pick("89110", "01"), pick("89110", "03"), pick("89110", "02"), pick("891195", "03")];
  const lecturesOnly = buildIcs({ picked, semester: A, terms, events, now, options: options({ classes: { kinds: all(["lecture"]) } }) });
  assert.equal(lecturesOnly.count.classes, 1); // 89110 lecture 01 (lecture 02 has no time)
  assert.deepEqual(lecturesOnly.skipped.map((p) => p.group.group), ["02"]);
  const both = buildIcs({ picked, semester: A, terms, events, now, options: options({ exams: { sittings: all(["מועד א'", "מועד ב'"]) } }) });
  assert.equal(both.count.exams, 4); // two courses, two sittings each in semester A
  const none = buildIcs({ picked, semester: A, terms, events, now, options: options({ classes: { on: false }, exams: { on: false }, events: { types: all(["payment"]) } }) });
  assert.equal(none.count.classes + none.count.exams, 0);
  assert.ok(none.count.events >= 4);
  assert.match(none.text, /DTSTART;VALUE=DATE:20261115/);
});

test("a manual time makes an untimed group a real meeting everywhere, and is validated when saved", () => {
  globalThis.localStorage = { getItem: () => null, setItem: () => {} };
  const store = createStore();
  store.togglePick("89110", "02");
  store.setCustom("89110", "02", [{ day: "ה'", start: "10:00", end: "12:00", building: "בניין 604" }]);
  store.setCustom("89110", "03", [{ day: "שבת", start: "10:00", end: "09:00" }]); // invalid: dropped
  assert.deepEqual(Object.keys(store.get().custom), ["89110|02"]);
  const live = applyCustom(courses, store.get().custom);
  const group = live.find((c) => c.code === "89110").groups.find((g) => g.group === "02");
  assert.equal(group.customTime, true);
  assert.equal(group.slots[0].custom, true);
  assert.equal(courses.find((c) => c.code === "89110").groups.find((g) => g.group === "02").slots.length, 0); // catalog untouched
  const { count, text } = buildIcs({ picked: [{ course: live.find((c) => c.code === "89110"), group }], semester: A, terms, events, now, options: options({ exams: { on: false }, events: { types: all([]) } }) });
  assert.equal(count.classes, 1);
  assert.match(text, /השעה הוספה ידנית/);
  store.setCustom("89110", "02", null);
  assert.deepEqual(store.get().custom, {});
  delete globalThis.localStorage;
});

test("a manual time never overrides a catalog time, and travels with a backup", async () => {
  const { exportSchedule, parseSchedule } = await import("../../course-ai.js");
  // 89110 group 01 has a real time: a stale manual entry for it is ignored.
  const live = applyCustom(courses, { "89110|01": [{ day: "ו'", start: "08:00", end: "09:00", building: "", room: "", custom: true }] });
  assert.equal(live.find((c) => c.code === "89110").groups.find((g) => g.group === "01").slots[0].day, "ג'");

  globalThis.localStorage = { getItem: () => null, setItem: () => {} };
  const store = createStore();
  store.togglePick("89110", "02");
  store.setCustom("89110", "02", [{ day: "ה'", start: "10:00", end: "12:00", building: "604" }]);
  const back = parseSchedule(exportSchedule(store.get()), courses);
  const other = createStore();
  other.importPicks(back.picks, { replace: false, starred: back.starred, custom: back.custom });
  assert.deepEqual(other.customSlots("89110", "02").map((s) => [s.day, s.start, s.end]), [["ה'", "10:00", "12:00"]]);
  // A manual time for a group that doesn't exist is not imported.
  assert.deepEqual(parseSchedule('{"picks":{"89110":["02"]},"custom":{"89110|99":[{"day":"ה\'","start":"10:00","end":"12:00"}]}}', courses).custom, {});
  delete globalThis.localStorage;
});
