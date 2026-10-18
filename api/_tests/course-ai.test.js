import assert from "node:assert/strict";
import { test } from "node:test";
import { aiLink, buildPrompt, courseDataText, exportSchedule, FORMAT, inYear, parseSchedule } from "../../course-ai.js";
import { createStore } from "../../course-store.js";
import { loadCourses } from "../_lib/courses/model.js";
import { FACULTIES, facultyFile } from "../../faculties/index.js";

// These tests describe course logic against the CS catalog as a fixture, whatever FACULTY the build runs for.
const csFile = (key) => facultyFile(FACULTIES.cs, FACULTIES.cs.courses[key]);
const { courses, scannedAt } = loadCourses(csFile("catalog"), csFile("yearbook"));
const byCode = new Map(courses.map((c) => [c.code, c]));
const A = "סמסטר א'";
const prefs = { semester: A, blockedDays: ["ה'"], earliest: "10:00", latest: "", shape: "compact", gaps: "none", notes: "", keep: [] };

test("a course's data lists this semester's groups with every weekly meeting, building and lecturer", () => {
  const text = courseDataText(byCode.get("891195"), A);
  assert.match(text, /^### 891195 מתמטיקה בדידה/);
  assert.match(text, /- הרצאה 01 \| ב' 09:00-11:00 \+ ג' 10:00-12:00 \| יהדות 402 \/ חברה 905 \| ד"ר עדי בן צבי/);
  assert.doesNotMatch(text, /הרצאה 12/); // a semester B group
  assert.match(text, /מבחנים: מועד א' 27\.1\.2027/);
});

test("the prompt carries the preferences, the rules, the return format and only the chosen courses", () => {
  const prompt = buildPrompt([byCode.get("89110"), byCode.get("891195")], prefs, { scannedAt });
  assert.match(prompt, /לא יכול\/ה להגיע בימים: ה'/);
  assert.match(prompt, /לא להתחיל לפני 10:00/);
  assert.match(prompt, /מעט ימים בקמפוס/);
  assert.match(prompt, /לא ממציאים קבוצות/);
  assert.match(prompt, new RegExp(`"format":"${FORMAT}"`));
  assert.equal(parseSchedule(prompt, courses).error, "empty"); // pasting the prompt back imports nothing
  assert.match(prompt, /### 89110/);
  assert.doesNotMatch(prompt, /### 891200/);
  assert.match(prompt, /נסרק ב-14\.10\.2026/);
  assert.match(buildPrompt([byCode.get("89110")], prefs, { en: true }), /I can't come on: ה'/);
});

test("AI links prefill a short prompt and fall back to an empty chat for a long one; Gemini always opens empty", () => {
  const short = aiLink("chatgpt", "שלום");
  assert.equal(short.prefilled, true);
  assert.ok(short.url.startsWith("https://chatgpt.com/?q="));
  const long = aiLink("claude", "א".repeat(5000));
  assert.deepEqual(long, { url: "https://claude.ai/new", prefilled: false });
  assert.deepEqual(aiLink("gemini", "שלום"), { url: "https://gemini.google.com/app", prefilled: false });
  assert.equal(aiLink("nope", "x"), null);
});

test("an AI answer is read from its last JSON block; codes and groups are checked against the catalog", () => {
  const answer = [
    "הנה המערכת:", "| יום | שעה |", "```json", '{"format":"nechita-raka-schedule","version":1,"semester":"סמסטר ב\'","picks":{"1":["01"]}}', "```",
    "ובסוף, המעודכנת:", "```json",
    JSON.stringify({ format: FORMAT, version: 1, semester: A, picks: { "89-110": ["1", "03", "99"], "891195": "04", "12345": ["01"] } }), "```",
  ].join("\n");
  const r = parseSchedule(answer, courses);
  assert.equal(r.semester, A);
  assert.deepEqual(r.picks, { 89110: ["01", "03"], 891195: ["04"] });
  assert.deepEqual(r.dropped.sort(), ["12345", "89110/99"]);
});

test("a schedule without a code block is still found; garbage and other formats are refused", () => {
  const r = parseSchedule('בסוף: {"picks":{"891200":["15"]}} תודה', courses);
  assert.deepEqual(r.picks, { 891200: ["15"] });
  assert.equal(r.semester, "");
  assert.equal(parseSchedule("אין פה כלום {לא json}", courses).error, "no-json");
  assert.equal(parseSchedule('{"format":"other","picks":{"89110":["01"]}}', courses).error, "format");
  assert.equal(parseSchedule('{"picks":{"55555":["01"]}}', courses).error, "empty");
});

test("a backup exports the starred picks and imports back to the same schedule", () => {
  globalThis.localStorage = { getItem: () => null, setItem: () => {} };
  const store = createStore();
  store.togglePick("89110", "01");
  store.togglePick("891195", "04");
  store.togglePick("891200", "15");
  store.toggleStar("891200"); // unstarred: not in the backup
  store.toggleStar("89133"); // starred, no pick yet: still backed up
  const text = exportSchedule(store.get());
  const back = parseSchedule(text, courses);
  assert.deepEqual(back.picks, { 89110: ["01"], 891195: ["04"] });
  assert.ok(back.starred.includes("89133"));

  const other = createStore();
  other.togglePick("89132", "01");
  other.importPicks(back.picks, { replace: false, starred: back.starred });
  assert.deepEqual(other.get().starred.sort(), ["89110", "891195", "89132", "89133"]);
  delete globalThis.localStorage;
});

test("replacing an imported semester keeps the other semester's picks and never unstars", () => {
  globalThis.localStorage = { getItem: () => null, setItem: () => {} };
  const store = createStore();
  store.togglePick("89110", "01"); // semester A
  store.togglePick("891195", "12"); // semester B
  const covers = (code, g) => byCode.get(code).groups.find((x) => x.group === g).semester.includes(A);
  store.importPicks({ 89112: ["01"] }, { replace: true, semester: A, covers });
  assert.deepEqual(store.picks("89110"), []); // A, replaced
  assert.deepEqual(store.picks("891195"), ["12"]); // B, kept
  assert.deepEqual(store.picks("89112"), ["01"]);
  assert.deepEqual(store.get().starred.sort(), ["89110", "89112", "891195"]);
  delete globalThis.localStorage;
});

test("a pasted unclosed code fence is read quickly (no regex freeze), and ```js blocks still count", () => {
  const start = Date.now();
  assert.equal(parseSchedule("```" + " ".repeat(200_000), courses).error, "no-json");
  assert.ok(Date.now() - start < 200, `took ${Date.now() - start} ms`);
  const r = parseSchedule('```js\n{"picks":{"89110":["01"]}}\n```', courses);
  assert.deepEqual(r.picks, { 89110: ["01"] });
});

test("JSON outside a code block is found even with braces in the prose after it; dashed codes with a group suffix work", () => {
  const r = parseSchedule('הנה: {"picks":{"89110":["01"]}} תודה {x} ועוד }', courses);
  assert.deepEqual(r.picks, { 89110: ["01"] });
  const s = parseSchedule('```json\n{"picks":{"89-110-01":["03"],"89-112":["01"]}}\n```', courses);
  assert.deepEqual(s.picks, { 89110: ["03"], 89112: ["01"] });
});

test("a prompt with no preferences says so (no questions back), and optional groups stay out unless asked", () => {
  const none = { semester: A, blockedDays: [], earliest: "", latest: "", shape: "any", gaps: "any", notes: "", keep: [] };
  const prompt = buildPrompt([byCode.get("89110")], none, { scannedAt });
  assert.match(prompt, /אין לי העדפות מיוחדות/);
  assert.match(prompt, /לא שואלים אותי שאלות/);
  assert.match(prompt, /אני לוקח\/ת את כולם/);
  assert.doesNotMatch(prompt, /- תגבור/); // 89110 has a reinforcement group
  assert.match(buildPrompt([byCode.get("89110")], { ...none, extras: true }), /- תגבור/);
});

test("the planner's year sets read the yearbook: a CS course by its plain year, a tracked course within the chosen track", () => {
  assert.equal(inYear(byCode.get("89110"), 1), true);
  assert.equal(inYear(byCode.get("89110"), 2), false);
  assert.equal(inYear(byCode.get("89005"), 1), false, "not in the yearbook");
  assert.equal(inYear(byCode.get("895656"), 1), false, "a pool is not a year");
  // CS: the same set as the old `year === y` rule for every course.
  for (const y of [1, 2, 3]) assert.deepEqual(courses.filter((c) => inYear(c, y)).map((c) => c.code), courses.filter((c) => c.year === y).map((c) => c.code));
  const neuroFile = (key) => facultyFile(FACULTIES.neuro, FACULTIES.neuro.courses[key]);
  const neuro = new Map(loadCourses(neuroFile("catalog"), neuroFile("yearbook")).courses.map((c) => [c.code, c]));
  const spread = neuro.get("27305"); // year 2 in most tracks, year 3 in linguistics and philosophy: no single year
  assert.equal(spread.year, null);
  assert.equal(inYear(spread, 2), true, "no track chosen: any track's year counts");
  assert.equal(inYear(spread, 3), true);
  assert.equal(inYear(spread, 2, "cs"), true);
  assert.equal(inYear(spread, 3, "cs"), false, "the chosen track's year only");
  assert.equal(inYear(spread, 3, "linguistics"), true);
  assert.equal(inYear(spread, 2, "single-comp"), false, "not in that track");
});

test("the yearbook says which semester each course is planned in", () => {
  assert.deepEqual(byCode.get("89110").plannedIn, ["סמסטר א'"]);
  assert.deepEqual(byCode.get("891200").plannedIn, ["סמסטר ב'"]); // Data Structures runs in A too, for retakes
  assert.deepEqual(byCode.get("89005").plannedIn, []);
});

test("the prompt says which faculty the student is in from the manifest's name, and none when it is not given", () => {
  const [csName, neuroName] = [FACULTIES.cs.name, FACULTIES.neuro.name];
  const one = [byCode.get("89110")];
  assert.match(buildPrompt(one, prefs, { faculty: csName }), /אני סטודנט\/ית למדעי המחשב באוניברסיטת בר-אילן/);
  assert.match(buildPrompt(one, prefs, { faculty: csName, en: true }), /I'm a Computer Science student at Bar-Ilan/);
  const neuro = buildPrompt(one, prefs, { faculty: neuroName });
  assert.match(neuro, /אני סטודנט\/ית למדעי המוח באוניברסיטת בר-אילן/);
  assert.doesNotMatch(neuro, /למדעי המחשב באוניברסיטת/);
  assert.match(buildPrompt(one, prefs, { faculty: neuroName, en: true }), /I'm a Brain Sciences student at Bar-Ilan/);
  assert.match(buildPrompt(one, prefs), /אני סטודנט\/ית באוניברסיטת בר-אילן/);
  assert.match(buildPrompt(one, prefs, { en: true }), /I'm a student at Bar-Ilan/);
});
