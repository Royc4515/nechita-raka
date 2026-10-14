import assert from "node:assert/strict";
import { test } from "node:test";
import { allowlists, loadSiteData } from "../_lib/chat/knowledge.js";
import { buildCourseChunks, loadCourseChunks } from "../_lib/chat/courses.js";
import { retrieve } from "../_lib/chat/retrieve.js";

const courses = loadCourseChunks();
const { urls } = allowlists(loadSiteData());

test("every course code in the catalog becomes one chunk with the scan date", () => {
  assert.equal(new Set(courses.map((c) => c.id)).size, courses.length);
  assert.ok(courses.length > 100);
  for (const c of courses) assert.match(c.text, /נסרק ב-14\.10\.2026/);
});

test("course chunks only link to a page the site already lists", () => {
  for (const c of courses) assert.ok(urls.includes(c.url), c.url);
});

test("a question about a course finds it by name, with day, hours, room and teacher", () => {
  const top = retrieve(courses, "מי מרצה בהכנה למדעי המחשב ובאיזה יום")[0];
  assert.equal(top.id, "course:89080");
  assert.match(top.text, /יום ב' 09:00 - 11:00/);
  assert.match(top.text, /בן-ניסן/);
  assert.match(top.text, /מיקום: חדר מחלקה \/ 999/);
});

test("exam dates are listed when the catalog has them", () => {
  const c = courses.find((x) => x.id === "course:895224");
  assert.match(c.text, /מועד א' 28\.6\.2027 16:00/);
});

test("a missing or broken catalog gives no chunks instead of crashing", () => {
  assert.deepEqual(loadCourseChunks(new URL("file:///nope.json")), []);
  assert.deepEqual(buildCourseChunks({}), []);
});
