/*
  "Add to calendar" for my schedule: one .ics file (Google Calendar, iPhone, Outlook) with exactly the kinds
  of things a student chose: their classes as weekly events for the semester (no class on holidays), their
  exams, and the year's dates from data.js by type. No DOM here (the tests import it); the sheet that asks
  what to include is in course-calendar-dialog.js.
*/
import { DAYS, inSemester, timedSlots } from "./course-time.js";

const TZ = "Asia/Jerusalem";
const DOMAIN = "nechita-raka";
/** Exams have a start time in the catalog but no length; three hours is the usual slot. */
const EXAM_HOURS = 3;

/** The year's events (data.js calendar.events) by type, for the filter. Exams and birthdays are not offered. */
export const EVENT_TYPES = ["holiday", "semester", "payment", "other"];
export function eventType(ev) {
  if (ev.kind === "birthday" || /^בחינה:/.test(ev.title)) return null;
  if (/^חופש|אין לימודים/.test(`${ev.title} ${ev.note || ""}`)) return "holiday";
  if (ev.guide === "payments" || /תשלום/.test(ev.title)) return "payment";
  if (/יום (ראשון|אחרון) ללימודים|תקופת בחינות|סמסטר קיץ/.test(ev.title)) return "semester";
  return "other";
}

/** Kinds of class, for the filter: lectures, exercises, and everything else (workshops, reinforcement...). */
export const CLASS_KINDS = ["lecture", "exercise", "other"];
export const classKind = (kind) => (kind === "הרצאה" ? "lecture" : kind === "תרגיל" ? "exercise" : "other");

// ---------- dates ----------
const pad = (n) => String(n).padStart(2, "0");
const parse = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const iso = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
const addDays = (isoDate, n) => { const d = parse(isoDate); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const compact = (isoDate) => isoDate.replace(/-/g, "");
const local = (isoDate, hhmm) => `${compact(isoDate)}T${hhmm.replace(":", "")}00`;
const addHours = (hhmm, h) => `${pad(Math.min(23, Number(hhmm.slice(0, 2)) + h))}:${hhmm.slice(3, 5)}`;
const utcStamp = (now) => `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

/** Every date from `from` to `until` (inclusive). */
function datesIn(from, until = from) {
  const out = [];
  for (let d = from; d <= until; d = addDays(d, 1)) out.push(d);
  return out;
}

/** The first date on or after `from` that falls on `day` ("ג'"; Sunday is א'). */
function firstOn(from, day) {
  const want = DAYS.indexOf(day);
  const d = parse(from);
  d.setUTCDate(d.getUTCDate() + ((want - d.getUTCDay() + 7) % 7));
  return iso(d);
}

// ---------- iCalendar text ----------
const escape = (text) => String(text ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Lines longer than 75 bytes are folded (RFC 5545), on character boundaries so Hebrew stays whole. */
function fold(line) {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    if (bytes + size > (parts.length ? 74 : 75)) { parts.push(current); current = ""; bytes = 0; }
    current += ch;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

const VTIMEZONE = [
  "BEGIN:VTIMEZONE", `TZID:${TZ}`,
  // Israel: summer time from the Friday before the last Sunday of March, to the last Sunday of October.
  "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0300", "TZNAME:IDT", "DTSTART:19700327T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=23,24,25,26,27,28,29;BYDAY=FR", "END:DAYLIGHT",
  "BEGIN:STANDARD", "TZOFFSETFROM:+0300", "TZOFFSETTO:+0200", "TZNAME:IST", "DTSTART:19701025T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
  "END:VTIMEZONE",
];

/** A short, stable id part from Hebrew text (a hash, so different titles never share it). */
function uidPart(text) {
  let h = 2166136261;
  for (const ch of String(text)) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  return h.toString(36);
}

const alarm = (trigger, text) => ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escape(text)}`, `TRIGGER:${trigger}`, "END:VALARM"];

/**
 * The .ics file. input: { courses (with any manual times applied), picked: [{ course, group }], semester,
 * terms, events, scannedAt, now, options }. options: {
 *   classes: { on, kinds: Set, courses: Set(code), skipHolidays, reminder: 0|10|30 },
 *   exams: { on, sittings: Set("מועד א'"...), courses: Set(code), dayBefore },
 *   events: { types: Set(EVENT_TYPES) } }.
 * Returns { text, count: { classes, exams, events }, skipped: [{ course, group }] } (picks with no time).
 */
export function buildIcs({ picked, semester, terms, events, scannedAt = "", now = new Date(), options }) {
  const stamp = utcStamp(now);
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//${DOMAIN}//courses//HE`, "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${escape(`המערכת שלי · ${semester}`)}`, `X-WR-TIMEZONE:${TZ}`, ...VTIMEZONE];
  const count = { classes: 0, exams: 0, events: 0 };
  const skipped = [];
  const source = `לפי סריקה לא רשמית של קטלוג הקורסים${scannedAt ? ` (${scannedAt.split("-").reverse().join(".")})` : ""}. את המערכת הסופית בודקים באינ-בר.`;
  const term = (terms || []).find((t) => t.label === semester && t.kind === "semester");
  const holidays = new Set((events || []).filter((ev) => eventType(ev) === "holiday").flatMap((ev) => datesIn(ev.date, ev.until || ev.date)));

  // Classes: one weekly event per meeting, from the semester's first day to its last.
  if (options.classes.on && term) {
    for (const { course, group } of picked) {
      if (!inSemester(group, semester) || !options.classes.courses.has(course.code) || !options.classes.kinds.has(classKind(group.kind))) continue;
      const slots = timedSlots(group);
      if (!slots.length) { skipped.push({ course, group }); continue; }
      for (const slot of slots) {
        const first = firstOn(term.from, slot.day);
        if (first > term.to) continue;
        const end = slot.end || addHours(slot.start, 2);
        const off = options.classes.skipHolidays ? datesIn(first, term.to).filter((d) => holidays.has(d) && parse(d).getUTCDay() === DAYS.indexOf(slot.day)) : [];
        const where = [slot.building, slot.room && `חדר ${slot.room}`].filter(Boolean).join(", ");
        lines.push("BEGIN:VEVENT",
          `UID:${course.code}-${group.group}-${DAYS.indexOf(slot.day)}-${slot.start.replace(":", "")}-${compact(term.from)}@${DOMAIN}`,
          `DTSTAMP:${stamp}`,
          `DTSTART;TZID=${TZ}:${local(first, slot.start)}`,
          `DTEND;TZID=${TZ}:${local(first, end)}`,
          `RRULE:FREQ=WEEKLY;UNTIL=${compact(addDays(term.to, 1))}T000000Z`,
          ...(off.length ? [`EXDATE;TZID=${TZ}:${off.map((d) => local(d, slot.start)).join(",")}`] : []),
          `SUMMARY:${escape(`${course.name} · ${group.kind} ${group.group}`)}`,
          ...(where ? [`LOCATION:${escape(where)}`] : []),
          `DESCRIPTION:${escape([group.teachers.replace(/\u00a0/g, " "), slot.custom ? "השעה הוספה ידנית." : "", source].filter(Boolean).join("\n"))}`,
          ...(options.classes.reminder ? alarm(`-PT${options.classes.reminder}M`, `${course.name} בעוד ${options.classes.reminder} דקות`) : []),
          "END:VEVENT");
        count.classes++;
      }
    }
  }

  // Exams of the courses chosen, in this semester, of the sittings chosen.
  if (options.exams.on) {
    const seen = new Set();
    for (const course of new Set(picked.map((p) => p.course).concat(options.exams.extra || []))) {
      if (!options.exams.courses.has(course.code) || seen.has(course.code)) continue;
      seen.add(course.code);
      for (const exam of course.exams.filter((e) => e.semester === semester && options.exams.sittings.has(e.type))) {
        const start = exam.hour || "09:00";
        lines.push("BEGIN:VEVENT",
          `UID:exam-${course.code}-${compact(exam.date)}-${uidPart(exam.type)}@${DOMAIN}`,
          `DTSTAMP:${stamp}`,
          `DTSTART;TZID=${TZ}:${local(exam.date, start)}`,
          `DTEND;TZID=${TZ}:${local(exam.date, addHours(start, EXAM_HOURS))}`,
          `SUMMARY:${escape(`מבחן: ${course.name}, ${exam.type}`)}`,
          `DESCRIPTION:${escape(`${exam.hour ? "" : "בלי שעה בקטלוג. "}המשך משוער, ${EXAM_HOURS} שעות.\n${source}`)}`,
          ...(options.exams.dayBefore ? alarm("-P1D", `מחר: מבחן ב${course.name}`) : []),
          "END:VEVENT");
        count.exams++;
      }
    }
  }

  // The year's dates by type, as all-day events.
  (events || []).forEach((ev, i) => {
    const type = eventType(ev);
    if (!type || !options.events.types.has(type)) return;
    lines.push("BEGIN:VEVENT",
      `UID:event-${compact(ev.date)}-${i}-${uidPart(ev.title)}@${DOMAIN}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(ev.date)}`,
      `DTEND;VALUE=DATE:${compact(addDays(ev.until || ev.date, 1))}`,
      `SUMMARY:${escape(ev.time ? `${ev.title} (${ev.time})` : ev.title)}`,
      ...(ev.note ? [`DESCRIPTION:${escape(ev.note)}`] : []),
      "TRANSP:TRANSPARENT",
      "END:VEVENT");
    count.events++;
  });

  lines.push("END:VCALENDAR");
  return { text: `${lines.map(fold).join("\r\n")}\r\n`, count, skipped };
}
