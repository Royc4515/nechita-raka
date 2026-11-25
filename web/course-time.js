/*
  Time logic for the courses page, with no DOM: which semester it is, when a group meets next,
  the order groups are shown in, and which picked groups clash. Imported by course-browser.js and
  course-schedule.js, and by the tests (api/_tests/course-browser.test.js).
  A group has slots: [{ day: "ג'", start: "15:00", end: "18:00", building, room }].
*/
export const DAYS = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'"];
const DAY_INDEX = Object.fromEntries(DAYS.map((d, i) => [d, i]));
const DAY_MIN = 24 * 60;
const WEEK_MIN = 7 * DAY_MIN;

const toMin = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Slots that have a day and a start time. */
export const timedSlots = (group) => (group.slots || []).filter((s) => DAY_INDEX[s.day] !== undefined && toMin(s.start) !== null);
export const hasTime = (group) => timedSlots(group).length > 0;

/** The semester whose groups meet now or next: the first semester (not exam period) that hasn't ended. */
export function currentSemester(terms, now) {
  const today = isoDay(now);
  const term = (terms || []).filter((t) => t && t.kind === "semester" && t.to >= today).sort((a, b) => a.from.localeCompare(b.from))[0];
  return term ? term.label : "";
}

/** Whether a group meets in `semester` ("סמסטר א'"); year-long groups meet in both. Empty semester = any. */
export const inSemester = (group, semester) => !semester || group.semester.split(", ").includes(semester);

/** Minutes from `now` until the slot's next weekly start (0 while it is on). */
function slotMinutes(slot, now) {
  const start = DAY_INDEX[slot.day] * DAY_MIN + toMin(slot.start);
  const end = DAY_INDEX[slot.day] * DAY_MIN + (toMin(slot.end) ?? toMin(slot.start));
  const nowMin = now.getDay() * DAY_MIN + now.getHours() * 60 + now.getMinutes();
  if (nowMin >= start && nowMin < end) return 0;
  return (start - nowMin + WEEK_MIN) % WEEK_MIN;
}

/** The group's next meeting: { slot, minutes } (minutes 0 while on), or null without a time. */
export function nextMeeting(group, now) {
  let best = null;
  for (const slot of timedSlots(group)) {
    const minutes = slotMinutes(slot, now);
    if (!best || minutes < best.minutes) best = { slot, minutes };
  }
  return best;
}

/** Minutes until the group next meets, or null without a time. */
export const minutesUntil = (group, now) => nextMeeting(group, now)?.minutes ?? null;

/** Groups soonest first (the one on now leads), groups with no time last, ties in catalog order. */
export function bySoonest(groups, now) {
  return groups
    .map((group, i) => ({ group, i, minutes: minutesUntil(group, now) }))
    .sort((a, b) => ((a.minutes ?? Infinity) - (b.minutes ?? Infinity)) || (a.i - b.i))
    .map((e) => e.group);
}

/** Kept for the tests and older callers: this semester first, then soonest. */
export function groupsByNext(groups, now, semester) {
  return groups
    .map((group, i) => ({ group, i, minutes: minutesUntil(group, now), current: Boolean(semester) && inSemester(group, semester) }))
    .sort((a, b) => (b.current - a.current) || ((a.minutes ?? Infinity) - (b.minutes ?? Infinity)) || (a.i - b.i))
    .map(({ group, minutes, current }) => ({ group, minutes, current }));
}

/** Whether two groups meet at the same time somewhere in a semester they share. */
export function clash(a, b, semester) {
  if (!inSemester(a, semester) || !inSemester(b, semester)) return false;
  for (const x of timedSlots(a)) {
    for (const y of timedSlots(b)) {
      if (x.day !== y.day) continue;
      const [xs, xe, ys, ye] = [toMin(x.start), toMin(x.end) ?? toMin(x.start), toMin(y.start), toMin(y.end) ?? toMin(y.start)];
      if (xs < ye && ys < xe) return true;
    }
  }
  return false;
}

/** "עכשיו", "היום 15:00", "מחר 09:00" or "יום ג' 15:00" for a next meeting from `nextMeeting`. */
export function whenText(next, now, { tr, dayName }) {
  if (!next) return "";
  if (next.minutes === 0) return tr("עכשיו");
  const days = Math.floor((now.getHours() * 60 + now.getMinutes() + next.minutes) / DAY_MIN);
  if (days === 0) return tr("היום {time}", { time: next.slot.start });
  if (days === 1) return tr("מחר {time}", { time: next.slot.start });
  return `${dayName(next.slot.day)} ${next.slot.start}`;
}

/**
 * Exams on or after today (in `semester` when given), soonest first, each { course, exam, close }.
 * `close` marks a first sitting (מועד א') within 3 days of another course's first sitting: the pair a
 * student actually has to plan around. Second sittings are only a fallback, so they aren't flagged.
 */
export function upcomingExams(courses, now, semester = "") {
  const today = isoDay(now);
  const list = courses.flatMap((course) => course.exams.filter((e) => e.date >= today && (!semester || e.semester === semester)).map((exam) => ({ course, exam })))
    .sort((a, b) => a.exam.date.localeCompare(b.exam.date));
  const dayNum = (iso) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / 86_400_000;
  const first = (e) => e.exam.type === "מועד א'";
  return list.map((e, i) => {
    const others = list.filter((o, j) => j !== i && o.course !== e.course);
    // Two exams on the same day matter at any sitting; within 3 days only for first sittings.
    if (others.some((o) => o.exam.date === e.exam.date)) return { ...e, close: "same-day" };
    return { ...e, close: first(e) && others.some((o) => first(o) && Math.abs(dayNum(o.exam.date) - dayNum(e.exam.date)) <= 3) };
  });
}
