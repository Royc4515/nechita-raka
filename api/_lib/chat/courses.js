/**
 * Course chunks for the chat: one per course code with its yearbook categories, groups, days, hours, rooms,
 * teachers and exam dates (from api/_lib/courses/model.js). Unofficial, so every chunk carries the
 * scan date and says where the official answer is. Its link opens the course's card on /courses.
 */
import { buildCourses, CATEGORIES, loadCourses } from "../courses/model.js";
import { SITE_URL } from "./site.js";

const MAX_GROUP_LINES = 24;
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

const dmy = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return y && m && d ? `${Number(d)}.${Number(m)}.${y}` : "";
};

function groupLine(g) {
  // Each weekly meeting with its own day and hours ("יום ב' 09:00 - 11:00, יום ג' 10:00 - 12:00").
  const meetings = (g.slots || []).filter((s) => s.day && s.start).map((s) => `יום ${s.day} ${s.start} - ${s.end}`).join(", ");
  const when = [meetings || (g.day && `יום ${g.day}`), g.place && `מיקום: ${g.place}`].filter(Boolean).join(" ");
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
    const categories = (c.categories || []).map((id) => CATEGORY_LABEL[id]).filter(Boolean).join(", ");
    const text = [
      `קורס ${c.code} ${c.name}${c.nameEn ? ` (${c.nameEn})` : ""}${c.points.length === 1 ? `, ${c.points[0]} נ"ז` : ""}.`,
      categories ? `בידיעון מדעי המחשב: ${categories}.` : "",
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
      keywords: [c.code, c.name, c.nameEn, categories, "קורס", "מערכת שעות", "הרצאה", "תרגיל", "מרצה", "שעות", "קבוצה", "מועד", "חדר"].filter(Boolean),
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
