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

function groupOf(row, section) {
  return {
    kind: clean(row.kind),
    group: clean(row.group),
    semester: semester(row.semester),
    day: clean(section?.day || row.day),
    hours: clean(section?.session_hours || row.hours),
    place: clean(section?.location || row.location),
    teachers: clean(section?.teachers || row.teachers),
  };
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
    const points = [...new Set(rows.map((r) => sections[r.lid]?.points).filter(Boolean).map(Number))];
    const exams = new Map();
    for (const r of rows) {
      for (const t of sections[r.lid]?.terms || []) {
        const date = isoDate(t.date);
        if (date) exams.set(`${t.type}|${date}|${t.hour}`, { type: clean(t.type), date, hour: clean(t.hour) });
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
