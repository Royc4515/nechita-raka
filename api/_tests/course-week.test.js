import assert from "node:assert/strict";
import { test } from "node:test";
import { dayTimeline, weekLayout } from "../../course-week.js";

const entry = (code, day, start, end) => ({ course: { code }, group: { kind: "הרצאה", group: "01" }, slot: { day, start, end } });

test("the grid spans whole hours around the week's classes, and Friday shows only when used", () => {
  const layout = weekLayout([entry("1", "ב'", "09:30", "11:00"), entry("2", "ד'", "16:00", "18:15")]);
  assert.equal(layout.from, 9 * 60);
  assert.equal(layout.to, 19 * 60);
  assert.deepEqual(layout.days, ["א'", "ב'", "ג'", "ד'", "ה'"]);
  assert.ok(weekLayout([entry("1", "ו'", "08:00", "10:00")]).days.includes("ו'"));
  assert.deepEqual(weekLayout([]).items, []);
});

test("overlapping classes share the column side by side; back-to-back ones don't", () => {
  const { items } = weekLayout([
    entry("1", "ב'", "14:00", "16:00"),
    entry("2", "ב'", "15:00", "17:00"),
    entry("3", "ב'", "16:00", "18:00"), // overlaps 2 only
    entry("4", "ב'", "18:00", "20:00"), // back to back with 3
  ]);
  const by = Object.fromEntries(items.map((i) => [i.course.code, i]));
  assert.deepEqual([by[1].lane, by[2].lane, by[3].lane], [0, 1, 0]);
  assert.equal(by[1].lanes, 2);
  assert.equal(by[1].overlaps, true);
  assert.equal(by[4].lanes, 1);
  assert.equal(by[4].overlaps, false);
});

test("a day's timeline lists the classes in order with the breaks between them", () => {
  const { items } = weekLayout([entry("2", "ג'", "13:00", "15:00"), entry("1", "ג'", "09:00", "11:00"), entry("3", "ג'", "15:10", "16:00")]);
  const line = dayTimeline(items).map((e) => (e.break ? `break ${e.break}` : e.course.code));
  assert.deepEqual(line, ["1", "break 120", "2", "3"]); // a 10-minute gap is not a break
});
