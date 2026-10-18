import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { buildCourseChunks, courseUrl, loadCourseChunks } from "../_lib/chat/courses.js";
import { SITE_URL } from "../_lib/chat/knowledge.js";
import { OTHER_TRACK_WEIGHT, retrieve } from "../_lib/chat/retrieve.js";
import { buildCourses, CATEGORIES, loadCourses, OFFICIAL_SOURCE, yearOf, yearsOf } from "../_lib/courses/model.js";
import { FACULTIES, FACULTY, facultyFile } from "../../faculties/index.js";

/** The label of a yearbook category of the active faculty, as the chat cites it. */
// Labels of the CS fixture's categories; CATEGORIES (the active faculty's) is what the chat chunks print.
const label = (id) => FACULTIES.cs.courses.categories.find((c) => c.id === id).label;

// These tests describe course logic against the CS catalog as a fixture, whatever FACULTY the build runs for.
const csFile = (key) => facultyFile(FACULTIES.cs, FACULTIES.cs.courses[key]);
const shaped = loadCourses(csFile("catalog"), csFile("yearbook"));
const byCode = new Map(shaped.courses.map((c) => [c.code, c]));
const chunks = loadCourseChunks(csFile("catalog"), csFile("yearbook"));

// ---------- the shared model ----------

test("every course code in the catalog becomes one course, with the scan date", () => {
  assert.equal(byCode.size, shaped.courses.length);
  assert.ok(shaped.courses.length > 100);
  assert.equal(shaped.scannedAt, "2026-10-14");
});

test("the CS yearbook gives each course its year, and the year list drives course.year and course.years", () => {
  assert.deepEqual(byCode.get("89110").categories, ["1"]); // מבוא למדעי המחשב
  assert.equal(byCode.get("89110").year, 1);
  assert.deepEqual(byCode.get("89110").years, [1]);
  assert.equal(byCode.get("891200").year, 1); // מבני נתונים
  assert.equal(byCode.get("89220").year, 2); // אלגוריתמים 1
  assert.equal(byCode.get("891111").year, 2); // תכנות מונחה עצמים
  assert.deepEqual(byCode.get("892322").categories, ["3"]); // אלגוריתמים מתקדמים
  assert.deepEqual(byCode.get("89005").categories, []); // not in the yearbook
  assert.equal(byCode.get("89005").year, null);
  assert.deepEqual(byCode.get("89005").years, []);
  assert.deepEqual(byCode.get("895656").years, [], "a pool is not a year"); // מבוא לקריפטוגרפיה
  assert.equal(yearOf(["1"]), 1, "the model exports the year helpers of course-years.js");
});

// The brain sciences yearbook: "<track>:<year>" categories (MULTI-FACULTY-PLAN.md D9), as a fixture whatever FACULTY runs.
const neuro = FACULTIES.neuro;
const neuroFile = (key) => facultyFile(neuro, neuro.courses[key]);
const neuroShaped = loadCourses(neuroFile("catalog"), neuroFile("yearbook"));
const neuroByCode = new Map(neuroShaped.courses.map((c) => [c.code, c]));
const readJson = (url) => JSON.parse(readFileSync(url, "utf8"));
const neuroChunks = buildCourseChunks(readJson(neuroFile("catalog")), readJson(neuroFile("yearbook")), neuro);
const neuroLabel = (id) => neuro.courses.categories.find((c) => c.id === id).label;

test("track:year categories give the set of years, one year when every track agrees, and the chosen track's year", () => {
  const intro = neuroByCode.get("27202"); // year 1 in every track that takes it
  assert.ok(intro.categories.includes("cs:1") && intro.categories.includes("psychology:1"), intro.categories.join());
  assert.deepEqual(intro.years, [1]);
  assert.equal(intro.year, 1);
  const spread = neuroByCode.get("27305"); // year 2 in most tracks, year 3 in linguistics and philosophy
  assert.deepEqual(spread.years, [2, 3]);
  assert.equal(spread.year, null, "no single year across the tracks");
  assert.equal(yearOf(spread.categories, "cs"), 2, "the chosen track's year");
  assert.equal(yearOf(spread.categories, "linguistics"), 3);
  assert.deepEqual(yearsOf(spread.categories, "single-comp"), [], "not in that track");
  const known = new Set(neuro.courses.categories.map((c) => c.id));
  for (const c of neuroShaped.courses) for (const id of c.categories) assert.ok(known.has(id), `${c.code}: ${id}`);
});

test("the chunks of a faculty with tracks name the track and year of each fact, and carry the tracks for retrieval", () => {
  const intro = neuroChunks.find((c) => c.id === "course:27202");
  assert.ok(intro.text.includes(`ב${neuro.courses.officialSource}: `), intro.text);
  assert.ok(intro.text.includes(neuroLabel("psychology:1")), "a track with its year, by the manifest's label");
  assert.match(neuroLabel("psychology:1"), /מדעי המוח ופסיכולוגיה: שנה א'/);
  assert.ok(intro.text.includes(neuroLabel("cs:1")));
  assert.ok(intro.tracks.includes("cs") && intro.tracks.includes("psychology"), intro.tracks.join());
  const spread = neuroChunks.find((c) => c.id === "course:27305");
  assert.ok(spread.text.includes(neuroLabel("cs:2")) && spread.text.includes(neuroLabel("linguistics:3")), "each track with its own year");
  const outside = neuroChunks.find((c) => !neuroByCode.get(c.id.slice(7)).categories.length);
  assert.deepEqual(outside.tracks, [], "a course the plans lack has no tracks");
  const csChunks = buildCourseChunks(readJson(csFile("catalog")), readJson(csFile("yearbook")), FACULTIES.cs);
  assert.ok(!("tracks" in csChunks[0]), "the CS chunks (no tracks in the manifest) keep their shape");
});

test("retrieval prefers the chosen track's course facts and leaves facts without tracks alone", () => {
  const fact = (id, tracks) => ({ id, title: "מבוא למדעי המוח", url: "https://x.example/" + id, text: "קורס מבוא למדעי המוח, יום ב' 10:00.", keywords: ["קורס"], ...(tracks ? { tracks } : {}) });
  const pool = [fact("course:a", ["cs", "single"]), fact("course:b", ["psychology"]), fact("guide:c"), fact("course:d", [])];
  const ids = (list) => list.map((c) => c.id);
  assert.deepEqual(ids(retrieve(pool, "מבוא למדעי המוח", 4)), ["course:a", "course:b", "guide:c", "course:d"], "without a track: index order on a tie");
  assert.deepEqual(ids(retrieve(pool, "מבוא למדעי המוח", 4, { track: "psychology" })), ["course:b", "guide:c", "course:d", "course:a"], "the other track's fact drops behind");
  assert.deepEqual(ids(retrieve(pool, "מבוא למדעי המוח", 4, { track: "cs" })), ["course:a", "guide:c", "course:d", "course:b"]);
  assert.ok(OTHER_TRACK_WEIGHT > 0 && OTHER_TRACK_WEIGHT < 1, "demoted, not dropped");
  assert.deepEqual(ids(retrieve(pool, "מבוא למדעי המוח", 4, { track: "physics" })), ["guide:c", "course:d", "course:a", "course:b"], "a track no fact names demotes every tracked fact");
});

test("a course listed in several parts of the yearbook carries every one of them", () => {
  assert.deepEqual(byCode.get("895656").categories, ["cluster2", "ai"]); // מבוא לקריפטוגרפיה
  assert.deepEqual(byCode.get("893210").categories, ["cluster1", "ai"]); // תכנות מערכות מתקדם
  assert.deepEqual(byCode.get("896877").categories, ["complement", "ai"]); // דיפ לרנינג
  assert.deepEqual(byCode.get("89200").categories, ["complement"]); // לוגיקה מתמטית
  assert.deepEqual(byCode.get("892512").categories, ["ai"]); // AI track only
  const known = new Set(FACULTIES.cs.courses.categories.map((c) => c.id));
  for (const c of shaped.courses) for (const id of c.categories) assert.ok(known.has(id), `${c.code}: ${id}`);
});

test("a group carries its weekly meetings, room and teacher; exam dates are ISO, sorted and tied to a semester", () => {
  const lecture = byCode.get("89080").groups.find((g) => g.group === "03");
  assert.deepEqual(lecture.slots, [{ day: "ב'", start: "09:00", end: "11:00", building: "חדר מחלקה", room: "" }]);
  assert.equal(lecture.teachers, "ד\"ר מרים בן-ניסן"); // the title stays on the name's line
  const exams = byCode.get("895224").exams;
  assert.deepEqual(exams[0], { type: "מועד א'", date: "2027-06-28", hour: "16:00", semester: "סמסטר ב'" });
  assert.deepEqual(exams.map((e) => e.date), [...exams.map((e) => e.date)].sort());
  assert.equal(byCode.get("89110").exams[0].semester, "סמסטר א'");
});

test("a course's points add its lecture and its exercise, each counted once", () => {
  assert.deepEqual(byCode.get("895656").points, [5]); // מבוא לקריפטוגרפיה: 3 + 2
  assert.deepEqual(byCode.get("89110").points, [5]); // two lecture groups and two exercise groups
  assert.deepEqual(byCode.get("89200").points, [3]); // לוגיקה מתמטית: 2 + 1
});

test("a group that meets on two days becomes two meetings, each in its own building", () => {
  const discrete = byCode.get("891195").groups.find((g) => g.group === "01");
  assert.deepEqual(discrete.slots.map((s) => [s.day, s.start, s.building]), [["ב'", "09:00", "יהדות 402"], ["ג'", "10:00", "חברה 905"]]);
  const room = byCode.get("89110").groups.find((g) => g.group === "01").slots[0];
  assert.deepEqual([room.building, room.room], ["משפטים 304", "1"]);
});

test("glued names split only after a whole name; first names ending in a title stay whole", () => {
  const one = (teachers) => buildCourses({ rows: [{ code: "1", name: "x", group: "01", kind: "הרצאה", semester: "סמסטר א'", teachers, day: "", hours: "", lid: "1" }] }).courses[0].groups[0].teachers;
  assert.equal(one("גב' תמר מייקלסון"), "גב'\u00a0תמר מייקלסון");
  assert.equal(one("מר עומר כהן"), "מר\u00a0עומר כהן");
  assert.equal(one("מר הראל רוזנפלדמר ידידיה בלונדרגב' טל אריאל סגל"), "מר\u00a0הראל רוזנפלד, מר\u00a0ידידיה בלונדר, גב'\u00a0טל אריאל סגל");
});

test("after splitting, every teacher in the catalog has one title, at the start", () => {
  const titleAtWord = /(?:^|[\s ])(?:מר|גב'|ד"ר|פרופ')[\s ]/g;
  const names = shaped.courses.flatMap((c) => c.groups.flatMap((g) => g.teachers.split(", ").filter(Boolean)));
  const bad = names.filter((n) => (n.match(titleAtWord) || []).length > 1);
  assert.deepEqual(bad, []);
});

test("a year-long semester reads as two semesters, and a missing yearbook only drops the years", () => {
  const catalog = {
    meta: { scraped_at: "2026-10-14T22:57:16.827Z" },
    rows: [{ code: "89999", name: "קורס", group: "01", kind: "הרצאה", semester: "סמסטר א'סמסטר ב'", teachers: "א\nב", day: "", hours: "", lid: "1" }],
    sections: {},
  };
  const [course] = buildCourses(catalog).courses;
  assert.equal(course.year, null);
  assert.deepEqual(course.categories, []);
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
  assert.match(top.text, /מיקום: חדר מחלקה/);
  assert.match(top.text, /בן-ניסן/);
  if (FACULTY.id === "cs") {
    assert.ok(chunks.find((c) => c.id === "course:89110").text.includes(`ב${OFFICIAL_SOURCE}: ${label("1")}.`), "the year is cited from the manifest's source");
    assert.ok(chunks.find((c) => c.id === "course:895656").text.includes(`${label("cluster2")}, ${label("ai")}`), "every category of the course, by its label");
  } else {
    // Another faculty's chunks print only the category ids its own manifest knows; CS ids are not among them.
    assert.ok(!CATEGORIES.some((c) => c.id === "cluster2"), "this run is not CS");
    assert.ok(!chunks.find((c) => c.id === "course:895656").text.includes(`ב${OFFICIAL_SOURCE}:`), "no category line for ids this faculty does not define");
  }
});

test("exam dates are listed when the catalog has them", () => {
  assert.match(chunks.find((x) => x.id === "course:895224").text, /מועד א' 28\.6\.2027 16:00/);
});

test("a missing or broken catalog gives no chunks instead of crashing", () => {
  assert.deepEqual(loadCourseChunks(new URL("file:///nope.json")), []);
  assert.deepEqual(buildCourseChunks({}), []);
});

test("a hall named with a dash keeps it, and the chat lists each weekly meeting with its own day", () => {
  const calc2 = byCode.get("89133").groups.find((g) => g.group === "01");
  assert.ok(calc2.slots.some((s) => s.building === "טבע 211-2"), JSON.stringify(calc2.slots));
  const discrete = chunks.find((c) => c.id === "course:891195").text;
  assert.match(discrete, /יום ב' 09:00 - 11:00, יום ג' 10:00 - 12:00/);
});
