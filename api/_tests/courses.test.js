import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCourseChunks, courseUrl, loadCourseChunks } from "../_lib/chat/courses.js";
import { SITE_URL } from "../_lib/chat/knowledge.js";
import { retrieve } from "../_lib/chat/retrieve.js";
import { buildCourses, ELECTIVE, loadCourses } from "../_lib/courses/model.js";

const shaped = loadCourses();
const byCode = new Map(shaped.courses.map((c) => [c.code, c]));
const chunks = loadCourseChunks();

// ---------- the shared model ----------

test("every course code in the catalog becomes one course, with the scan date", () => {
  assert.equal(byCode.size, shaped.courses.length);
  assert.ok(shaped.courses.length > 100);
  assert.equal(shaped.scannedAt, "2026-10-14");
});

test("the yearbook gives first-year courses year 1 and its elective groups 'elective'", () => {
  assert.equal(byCode.get("89110").year, 1); // מבוא למדעי המחשב
  assert.equal(byCode.get("891200").year, 1); // מבני נתונים
  assert.equal(byCode.get("89220").year, 2); // אלגוריתמים 1
  assert.equal(byCode.get("896885").year, ELECTIVE); // מודלי שפה גדולים
  assert.equal(byCode.get("89005").year, null); // not in the yearbook
});

test("a group carries its day, hours, room and teacher; exam dates are ISO and sorted", () => {
  const lecture = byCode.get("89080").groups.find((g) => g.group === "03");
  assert.deepEqual(lecture, { kind: "הרצאה", group: "03", semester: "סמסטר א'", day: "ב'", hours: "09:00 - 11:00", place: "חדר מחלקה / 999", teachers: "ד\"ר מרים בן-ניסן" });
  const exams = byCode.get("895224").exams;
  assert.deepEqual(exams[0], { type: "מועד א'", date: "2027-06-28", hour: "16:00" });
  assert.deepEqual(exams.map((e) => e.date), [...exams.map((e) => e.date)].sort());
});

test("a year-long semester reads as two semesters, and a missing yearbook only drops the years", () => {
  const catalog = {
    meta: { scraped_at: "2026-10-14T22:57:16.827Z" },
    rows: [{ code: "89999", name: "קורס", group: "01", kind: "הרצאה", semester: "סמסטר א'סמסטר ב'", teachers: "א\nב", day: "", hours: "", lid: "1" }],
    sections: {},
  };
  const [course] = buildCourses(catalog).courses;
  assert.equal(course.year, null);
  assert.equal(course.groups[0].semester, "סמסטר א', סמסטר ב'");
  assert.equal(course.groups[0].teachers, "א, ב");
  assert.deepEqual(buildCourses({}), { scannedAt: "", courses: [] });
});

// ---------- the chat ----------

test("course chunks carry the scan date and link to the course's card on the site", () => {
  assert.equal(chunks.length, shaped.courses.length);
  for (const c of chunks) {
    assert.match(c.text, /נסרק ב-14\.10\.2026/);
    assert.ok(c.url.startsWith(`${SITE_URL}/courses?c=`), c.url);
  }
  assert.equal(courseUrl("89080"), `${SITE_URL}/courses?c=89080`);
});

test("a question about a course finds it by name, with day, hours, room, teacher and year", () => {
  const top = retrieve(chunks, "מי מרצה בהכנה למדעי המחשב ובאיזה יום")[0];
  assert.equal(top.id, "course:89080");
  assert.match(top.text, /יום ב' 09:00 - 11:00/);
  assert.match(top.text, /מיקום: חדר מחלקה \/ 999/);
  assert.match(top.text, /בן-ניסן/);
  assert.match(chunks.find((c) => c.id === "course:89110").text, /שנה א'/);
});

test("exam dates are listed when the catalog has them", () => {
  assert.match(chunks.find((x) => x.id === "course:895224").text, /מועד א' 28\.6\.2027 16:00/);
});

test("a missing or broken catalog gives no chunks instead of crashing", () => {
  assert.deepEqual(loadCourseChunks(new URL("file:///nope.json")), []);
  assert.deepEqual(buildCourseChunks({}), []);
});
