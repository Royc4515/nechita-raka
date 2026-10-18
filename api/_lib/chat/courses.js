/**
 * Course chunks for the chat: one per course code with its yearbook categories, groups, days, hours, rooms,
 * teachers and exam dates (from api/_lib/courses/model.js). Unofficial, so every chunk carries the
 * scan date and says where the official answer is. Its link opens the course's card on /courses.
 * The categories line names each category by the manifest's label; on a faculty with tracks the labels
 * already say the track and the year ("מדעי המוח ופסיכולוגיה: שנה א'"), and the chunk also lists the
 * tracks that take the course, so retrieval can prefer the student's (retrieve.js, handler.js).
 */
import { buildCourses, loadCourses, tracksOf } from "../courses/model.js";
import { FACULTY } from "../../../faculties/index.js";
import { SITE_URL } from "./site.js";

const MAX_GROUP_LINES = 24;

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

/** Chunks from shaped courses ({ scannedAt, courses }); `faculty` gives the category labels, the source and whether it has tracks. */
export function courseChunks({ scannedAt, courses }, faculty = FACULTY) {
  const scanned = dmy(scannedAt);
  const labelOf = Object.fromEntries(faculty.courses.categories.map((c) => [c.id, c.label]));
  const hasTracks = Array.isArray(faculty.tracks);
  return courses.map((c) => {
    const lines = c.groups.map(groupLine);
    const shown = lines.slice(0, MAX_GROUP_LINES);
    const categories = (c.categories || []).map((id) => labelOf[id]).filter(Boolean).join(", ");
    const text = [
      `קורס ${c.code} ${c.name}${c.nameEn ? ` (${c.nameEn})` : ""}${c.points.length === 1 ? `, ${c.points[0]} נ"ז` : ""}.`,
      categories ? `ב${faculty.courses.officialSource}: ${categories}.` : "",
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
      // On a faculty with tracks: the tracks that take the course (empty when the yearbook lacks it), for retrieval.
      ...(hasTracks ? { tracks: tracksOf(c.categories) } : {}),
    };
  });
}

/** Kept for the tests: chunks straight from a catalog object, for the active faculty or a named one. */
export function buildCourseChunks(catalog, yearbook = null, faculty = FACULTY) {
  return courseChunks(buildCourses(catalog, yearbook), faculty);
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
