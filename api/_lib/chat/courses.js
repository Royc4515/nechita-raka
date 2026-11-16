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
      (c.contacts || []).length ? `מיילים של המרצים (מדף הסגל של המחלקה): ${c.contacts.map((x) => `${x.name} ${x.email}`).join("; ")}.` : "",
      `מקור: קטלוג הקורסים של בר אילן${scanned ? `, נסרק ב-${scanned}` : ""}. לא רשמי והשעות עשויות להשתנות: תמיד לומר את תאריך הסריקה ולהפנות לבדוק באינ-בר.`,
    ].filter(Boolean).join("\n");
    return {
      id: `course:${c.code}`,
      title: `${c.name} (${c.code})`,
      url: courseUrl(c.code),
      text,
      keywords: [c.code, c.name, c.nameEn, categories, "קורס", "מערכת שעות", "הרצאה", "תרגיל", "מרצה", "שעות", "קבוצה", "מועד", "חדר", ...((c.contacts || []).length ? ["מייל", "אימייל"] : [])].filter(Boolean),
      // On a faculty with tracks: the tracks that take the course (empty when the yearbook lacks it), for retrieval.
      ...(hasTracks ? { tracks: tracksOf(c.categories) } : {}),
    };
  });
}

/**
 * One chunk per lecturer with a published email ("מה המייל של נועה אגמון?"): the name, the email and the
 * courses they teach. The link is the lecturers' emails page. Emails come only from courses.lecturers.
 */
export function lecturerChunks({ courses, lecturersCheckedOn }) {
  const byEmail = new Map();
  for (const c of courses) {
    for (const contact of c.contacts || []) {
      const entry = byEmail.get(contact.email) || { ...contact, courses: [] };
      if (!entry.courses.some((x) => x.name === c.name)) entry.courses.push(c);
      byEmail.set(contact.email, entry);
    }
  }
  const checked = dmy(lecturersCheckedOn);
  return [...byEmail.values()].map((l) => ({
    id: `lecturer:${l.email}`,
    title: `המייל של ${l.name}`,
    url: `${SITE_URL}/lecturers`,
    text: [
      `${l.name}: המייל ${l.email}.`,
      `קורסים: ${l.courses.map((c) => `${c.name} (${c.code})`).join(", ")}.`,
      `מקור: דף הסגל של המחלקה${checked ? `, נבדק ב-${checked}` : ""}. כל המיילים של המרצים בדף המיילים של המרצים באתר.`,
    ].join("\n"),
    keywords: [l.name, l.name.replace(/^\S+\s/, ""), l.email, "מייל", "אימייל", "מרצה", ...l.courses.map((c) => c.name)],
  }));
}

/** Course and lecturer chunks for the chat, and the lecturer emails an answer may contain. Empty when the catalog is missing. */
export function loadCourseFacts() {
  try {
    const shaped = loadCourses();
    const lecturers = lecturerChunks(shaped);
    return { chunks: [...courseChunks(shaped), ...lecturers], emails: lecturers.map((c) => c.id.slice("lecturer:".length).toLowerCase()) };
  } catch (err) {
    console.error(`courses: ${err.message}; the chat will not answer course questions`);
    return { chunks: [], emails: [] };
  }
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
