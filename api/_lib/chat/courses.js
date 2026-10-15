/**
 * Course chunks for the chat: one per course code with its year, groups, days, hours, rooms,
 * teachers and exam dates (from api/_lib/courses/model.js). Unofficial, so every chunk carries the
 * scan date and says where the official answer is. Its link opens the course's card on /courses.
 */
import { buildCourses, ELECTIVE, loadCourses } from "../courses/model.js";
import { SITE_URL } from "./site.js";

const MAX_GROUP_LINES = 24;
const YEAR_LABEL = { 1: "שנה א'", 2: "שנה ב'", 3: "שנה ג'", [ELECTIVE]: "קורס בחירה" };

const dmy = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return y && m && d ? `${Number(d)}.${Number(m)}.${y}` : "";
};

function groupLine(g) {
  const when = [g.day && `יום ${g.day}`, g.hours, g.place && `מיקום: ${g.place}`].filter(Boolean).join(" ");
  return `${g.kind} קבוצה ${g.group}, ${g.semester.replace(/, /g, " + ")}${when ? `, ${when}` : ""}${g.teachers ? `, ${g.teachers}` : ""}`;
}

export function courseUrl(code) {
  return `${SITE_URL}/courses?c=${encodeURIComponent(code)}`;
}

/** Chunks from shaped courses ({ scannedAt, courses }). */
export function courseChunks({ scannedAt, courses }) {
  const scanned = dmy(scannedAt);
  return courses.map((c) => {
    const lines = c.groups.map(groupLine);
    const shown = lines.slice(0, MAX_GROUP_LINES);
    const year = YEAR_LABEL[c.year];
    const text = [
      `קורס ${c.code} ${c.name}${c.nameEn ? ` (${c.nameEn})` : ""}${c.points.length === 1 ? `, ${c.points[0]} נ"ז` : ""}.`,
      year ? `בידיעון של בינה מלאכותית חישובית: ${year}.` : "",
      c.exams.length ? `מועדי בחינה: ${c.exams.map((e) => `${e.type} ${dmy(e.date)} ${e.hour}`).join("; ")}.` : "",
      ...shown.map((l) => `- ${l}`),
      lines.length > shown.length ? `- ועוד ${lines.length - shown.length} קבוצות בקטלוג.` : "",
      `מקור: קטלוג הקורסים של בר אילן${scanned ? `, נסרק ב-${scanned}` : ""}. לא רשמי והשעות עשויות להשתנות: תמיד לומר את תאריך הסריקה ולהפנות לבדוק באינ-בר.`,
    ].filter(Boolean).join("\n");
    return {
      id: `course:${c.code}`,
      title: `${c.name} (${c.code})`,
      url: courseUrl(c.code),
      text,
      keywords: [c.code, c.name, c.nameEn, year, "קורס", "מערכת שעות", "הרצאה", "תרגיל", "מרצה", "שעות", "קבוצה", "מועד", "חדר"].filter(Boolean),
    };
  });
}

/** Kept for the tests: chunks straight from a catalog object. */
export function buildCourseChunks(catalog, yearbook = null) {
  return courseChunks(buildCourses(catalog, yearbook));
}

/** [] when the catalog is missing or broken: the chat then just doesn't know courses. */
export function loadCourseChunks(catalogFile, yearbookFile) {
  try {
    return courseChunks(loadCourses(catalogFile, yearbookFile));
  } catch (err) {
    console.error(`courses: ${err.message}; the chat will not answer course questions`);
    return [];
  }
}
