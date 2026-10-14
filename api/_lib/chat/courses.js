/**
 * Course chunks for the chat, built from the scanned catalog JSON (courses-cs-2027.json): one chunk
 * per course code with its groups, days, hours, rooms, teachers and exam dates. Unofficial, so every
 * chunk carries the scan date and says where the official answer is.
 */
import { existsSync, readFileSync } from "node:fs";

const COURSES_URL = new URL("../../../courses-cs-2027.json", import.meta.url);
/** The catalog's own page, already on the site's link list (data.js), so the chunk's link is allowed. */
const CATALOG_URL = "https://shoham.biu.ac.il/BiuCoursesViewer/MainPage.aspx";
const MAX_GROUP_LINES = 24;

const clean = (s) => String(s ?? "").replace(/\s*\n\s*/g, ", ").trim();
const semesterLabel = (s) => clean(s).replace(/'(?=סמסטר)/g, "' + ").replace(/, /g, " + ");
const dmy = (d) => d.replace(/^0/, "").replace(/\/0/, ".").replace(/\//, ".");
const scanDate = (iso) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${Number(d)}.${Number(m)}.${y}`;
};

function groupLine(row, section) {
  const day = section?.day || row.day;
  const hours = section?.session_hours || row.hours;
  const place = clean(section?.location || row.location);
  const when = [day && `יום ${day}`, hours, place && `מיקום: ${place}`].filter(Boolean).join(" ");
  const teachers = clean(section?.teachers || row.teachers);
  return `${row.kind} קבוצה ${row.group}, ${semesterLabel(row.semester)}${when ? `, ${when}` : ""}${teachers ? `, ${teachers}` : ""}`;
}

export function buildCourseChunks(catalog) {
  if (!catalog || !Array.isArray(catalog.rows)) return [];
  const sections = catalog.sections || {};
  const scanned = catalog.meta?.scraped_at ? scanDate(catalog.meta.scraped_at) : "";
  const byCode = new Map();
  for (const row of catalog.rows) {
    if (!row.code) continue;
    byCode.set(row.code, [...(byCode.get(row.code) || []), row]);
  }
  const chunks = [];
  for (const [code, rows] of byCode) {
    const info = rows.map((r) => sections[r.lid]).find(Boolean);
    const name = info?.title || rows[0].name;
    const points = [...new Set(rows.map((r) => sections[r.lid]?.points).filter(Boolean))].map((p) => Number(p)).join(" או ");
    const exams = [...new Set(rows.flatMap((r) => (sections[r.lid]?.terms || []).map((t) => `${t.type} ${dmy(t.date)} ${t.hour}`)))];
    const lines = rows.map((r) => groupLine(r, sections[r.lid]));
    const shown = lines.slice(0, MAX_GROUP_LINES);
    const text = [
      `קורס ${code} ${name}${info?.name_en ? ` (${info.name_en})` : ""}${points ? `, ${points} נ"ז` : ""}.`,
      exams.length ? `מועדי בחינה: ${exams.join("; ")}.` : "",
      ...shown.map((l) => `- ${l}`),
      lines.length > shown.length ? `- ועוד ${lines.length - shown.length} קבוצות בקטלוג.` : "",
      `מקור: קטלוג הקורסים של בר אילן${scanned ? `, נסרק ב-${scanned}` : ""}. לא רשמי והשעות עשויות להשתנות: תמיד לומר את תאריך הסריקה ולהפנות לבדוק באינ-בר או בשהם.`,
    ].filter(Boolean).join("\n");
    chunks.push({
      id: `course:${code}`,
      title: `${name} (${code})`,
      url: CATALOG_URL,
      text,
      keywords: [code, name, info?.name_en, "קורס", "מערכת שעות", "הרצאה", "תרגיל", "מרצה", "שעות", "קבוצה", "מועד"].filter(Boolean),
    });
  }
  return chunks;
}

/** [] when the file is missing or broken: the chat then just doesn't know courses. */
export function loadCourseChunks(file = COURSES_URL) {
  try {
    if (!existsSync(file)) throw new Error("file is missing");
    return buildCourseChunks(JSON.parse(readFileSync(file, "utf8")));
  } catch (err) {
    console.error(`courses: ${err.message}; the chat will not answer course questions`);
    return [];
  }
}
