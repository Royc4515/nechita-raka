/**
 * The CS courses, shaped once for every reader: the chat (api/_lib/chat/courses.js), the courses page
 * (course-browser.js reads public/course-list.json, written by scripts/build-public.mjs) and their tests.
 * Two inputs: the catalog scan (courses-cs-2027.json, unofficial) and the department yearbook
 * (courses-yearbook.json), which says which year each course belongs to.
 */
import { existsSync, readFileSync } from "node:fs";

export const CATALOG_FILE = new URL("../../../courses-cs-2027.json", import.meta.url);
export const YEARBOOK_FILE = new URL("../../../courses-yearbook.json", import.meta.url);

/** Year values on a course: 1-3 from the yearbook, "elective" for its elective groups, null for the rest. */
export const ELECTIVE = "elective";

const clean = (s) => String(s ?? "").replace(/\s*\n\s*/g, ", ").trim();
/** "סמסטר א'סמסטר ב'" and "סמסטר א'\nסמסטר ב'" both mean a year-long group. */
const semester = (s) => clean(s).replace(/'(?=סמסטר)/g, "', ");
/** 28/06/2027 -> 2027-06-28 */
const isoDate = (d) => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(d ?? "").trim());
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : "";
};

function yearOf(code, yearbook) {
  for (const [year, codes] of Object.entries(yearbook?.years || {})) if (codes.includes(code)) return Number(year);
  return (yearbook?.electives || []).includes(code) ? ELECTIVE : null;
}

/**
 * Teacher names glued together by the catalog ("מר אבי כדריהמר הראל...") are split before each title,
 * but only after a whole name (title, first name, last name), so "גב' תמר" or "מר עומר" stay intact.
 */
const TITLES = `(?:מר|גב'|ד"ר|פרופ'|עו"ד|הרב)`;
const TITLE = new RegExp(`(?<=${TITLES} [^\\s,]+(?: [^\\s,]+)* [^\\s,]+)(?=${TITLES} )`, "g");
/** A title stays on the same line as its name ("פרופ' משה", not "פרופ'" then "משה"). */
const ATTACH_TITLE = /(^|, )(מר|גב'|ד"ר|פרופ'|עו"ד|הרב) /g;
const teachersOf = (s) => clean(s).replace(TITLE, ", ").replace(ATTACH_TITLE, "$1$2 ");

const PENDING = "טרם שובץ";
/** The catalog's placeholder room for "the department arranges it". */
const DEPARTMENT_ROOM = "999";
/** "משפטים-304" -> "משפטים 304"; several buildings glued together are split ("יהדות-402חברה-905"). */
// Only the dash between a name and its number becomes a space; "טבע 211-2" is a hall and keeps its dash.
const buildingsOf = (s) => clean(s).split(/(?<=\d)(?=[א-ת])/).map((b) => b.replace(/(?<=[א-ת])-(?=\d)/, " ").trim()).filter(Boolean);
const timesOf = (s) => [...String(s ?? "").matchAll(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/g)].map((m) => [m[1].padStart(5, "0"), m[2].padStart(5, "0")]);

/**
 * A group's weekly meetings: [{ day, start, end, building, room }]. A group can meet on several days
 * ("ב',ג'" with one time per day). With several meetings the catalog glues their rooms into one number,
 * which can't be split, so each meeting keeps its building and the room is left to Inbar.
 */
function slotsOf(section, row) {
  const days = clean(section?.day || row.day).split(/\s*,\s*/).filter(Boolean);
  const times = timesOf(section?.session_hours || row.hours);
  const pending = [section?.building, section?.room, row.location].some((v) => String(v ?? "").includes(PENDING));
  const buildings = pending ? [] : buildingsOf(section?.building ?? String(row.location || "").split(" / ")[0]);
  const rawRoom = pending ? "" : clean(section?.room ?? String(row.location || "").split(" / ")[1]);
  const room = rawRoom === DEPARTMENT_ROOM ? "" : rawRoom;
  const count = Math.max(days.length, days.length ? 0 : times.length ? 1 : 0);
  return Array.from({ length: count }, (_, i) => {
    const [start, end] = times[i] || times[0] || ["", ""];
    return { day: days[i] || "", start, end, building: buildings[i] || (buildings.length === 1 ? buildings[0] : ""), room: count === 1 ? room : "" };
  });
}

const placeText = (slot) => [slot.building, slot.room && `חדר ${slot.room}`].filter(Boolean).join(", ");

function groupOf(row, section) {
  const slots = slotsOf(section, row);
  const pending = [section?.building, section?.room, row.location].some((v) => String(v ?? "").includes(PENDING));
  return {
    kind: clean(row.kind),
    group: clean(row.group),
    semester: semester(row.semester),
    slots,
    pending,
    // Plain-text forms, for the chat
    day: slots.map((sl) => sl.day).filter(Boolean).join(", "),
    hours: slots.filter((sl) => sl.start).map((sl) => `${sl.start} - ${sl.end}`).join(", "),
    place: pending ? PENDING : [...new Set(slots.map(placeText).filter(Boolean))].join("; "),
    teachers: teachersOf(section?.teachers || row.teachers),
  };
}

/** Exam dates in January to April belong to semester A, the rest to semester B (and the summer). */
const examSemester = (iso) => (Number(iso.slice(5, 7)) <= 4 ? "סמסטר א'" : "סמסטר ב'");

/** The course's credit points: its lecture's when it has one (exercise sections list their own). */
function pointsOf(rows, sections) {
  const lecture = rows.find((r) => clean(r.kind) === "הרצאה" && sections[r.lid]?.points);
  const all = rows.map((r) => Number(sections[r.lid]?.points)).filter((n) => n > 0);
  const value = lecture ? Number(sections[lecture.lid].points) : all.length ? Math.max(...all) : 0;
  return value > 0 ? [value] : [];
}

/** { scannedAt, courses: [{ code, name, nameEn, points, year, exams, groups }] }, courses in catalog order. */
export function buildCourses(catalog, yearbook = null) {
  if (!catalog || !Array.isArray(catalog.rows)) return { scannedAt: "", courses: [] };
  const sections = catalog.sections || {};
  const byCode = new Map();
  for (const row of catalog.rows) {
    if (!row || !row.code) continue;
    byCode.set(row.code, [...(byCode.get(row.code) || []), row]);
  }
  const courses = [...byCode].map(([code, rows]) => {
    const info = rows.map((r) => sections[r.lid]).find(Boolean);
    const points = pointsOf(rows, sections);
    const exams = new Map();
    for (const r of rows) {
      for (const t of sections[r.lid]?.terms || []) {
        const date = isoDate(t.date);
        if (date) exams.set(`${t.type}|${date}|${t.hour}`, { type: clean(t.type), date, hour: clean(t.hour), semester: examSemester(date) });
      }
    }
    return {
      code,
      name: clean(info?.title || rows[0].name),
      nameEn: clean(info?.name_en),
      points,
      year: yearOf(code, yearbook),
      exams: [...exams.values()].sort((a, b) => a.date.localeCompare(b.date)),
      groups: rows.map((r) => groupOf(r, sections[r.lid])),
    };
  });
  return { scannedAt: String(catalog.meta?.scraped_at || "").slice(0, 10), courses };
}

function readJson(file) {
  if (!existsSync(file)) throw new Error(`${file.pathname.split("/").pop()} is missing`);
  return JSON.parse(readFileSync(file, "utf8"));
}

/** The courses from the files in the repo. A missing yearbook only drops the years; a missing catalog throws. */
export function loadCourses(catalogFile = CATALOG_FILE, yearbookFile = YEARBOOK_FILE) {
  let yearbook = null;
  try {
    yearbook = readJson(yearbookFile);
  } catch (err) {
    console.error(`courses: ${err.message}; courses will have no year`);
  }
  return buildCourses(readJson(catalogFile), yearbook);
}
