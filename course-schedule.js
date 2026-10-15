/*
  "My schedule" on the courses page: built from the courses a student starred and the groups they
  picked (course-store.js). It shows the next class with its room, the week day by day with clashes
  marked, picks with no time yet, upcoming exams in date order, and the starred courses themselves.
  It is a planning aid from an unofficial scan; the page says Inbar is where the real schedule lives.
*/
import { courseName, dayName, el, placeText, timeRange } from "./course-card.js";
import { clash, DAYS, inSemester, nextMeeting, timedSlots, upcomingExams, whenText } from "./course-time.js";

const toMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const dmy = (iso) => `${Number(iso.slice(8, 10))}.${Number(iso.slice(5, 7))}.${iso.slice(0, 4)}`;
/** Inbar, where the official schedule and rooms are (the same link as the "inbar" item in data.js). */
const INBAR_URL = "https://inbar.biu.ac.il/live/Login.aspx";

function nextClass(picked, ctx) {
  const { helpers, now } = ctx;
  let best = null;
  for (const p of picked) {
    const n = nextMeeting(p.group, now);
    if (n && (!best || n.minutes < best.n.minutes)) best = { ...p, n };
  }
  if (!best) return null;
  const { tr } = helpers;
  const place = placeText(best.n.slot, helpers);
  return el("section", { class: "cs-next", "aria-label": tr("השיעור הבא") },
    el("p", { class: "cs-next-when", text: whenText(best.n, now, { tr, dayName: (d) => dayName(d, helpers) }) }),
    el("p", { class: "cs-next-name", text: courseName(best.course, helpers) }),
    el("p", { class: "cs-next-sub" }, timeRange(best.n.slot), ` · ${tr(best.group.kind)}, ${tr("קבוצה {n}", { n: best.group.group })}`),
    best.group.teachers ? el("p", { class: "cs-next-sub", text: best.group.teachers }) : null,
    place && !best.group.pending
      ? el("p", { class: "cs-next-place", text: place })
      : el("p", { class: "cs-next-place is-missing" },
        `${best.group.pending ? tr("טרם שובץ חדר") : tr("החדר עוד לא פורסם בקטלוג")} · `,
        el("a", { href: INBAR_URL, target: "_blank", rel: "noopener noreferrer", text: tr("בודקים באינ-בר") })));
}

function weekAgenda(picked, ctx) {
  const { helpers, semester } = ctx;
  const { tr } = helpers;
  const entries = picked.flatMap((p) => timedSlots(p.group).map((slot) => ({ ...p, slot })));
  const clashing = new Set();
  picked.forEach((a, i) => picked.forEach((b, j) => { if (i < j && clash(a.group, b.group, semester)) { clashing.add(a); clashing.add(b); } }));
  const days = DAYS.map((day) => ({ day, rows: entries.filter((e) => e.slot.day === day).sort((a, b) => toMin(a.slot.start) - toMin(b.slot.start)) })).filter((d) => d.rows.length);
  if (!days.length) return null;
  const clashCount = [...clashing].length;
  return el("section", { class: "cs-week", "aria-labelledby": "cs-week-h" },
    el("h3", { id: "cs-week-h", class: "cs-h", text: tr("השבוע שלי") }),
    clashCount ? el("p", { class: "cs-alert", role: "status" }, el("span", { "aria-hidden": "true", text: "⚠ " }), tr("יש חפיפה בין {n} קבוצות.", { n: clashCount })) : null,
    ...days.map(({ day, rows }) => el("div", { class: "cs-day" },
      el("h4", { class: "cs-day-h", text: dayName(day, helpers) }),
      el("ul", { class: "cs-rows" }, ...rows.map((r) => {
        const isClash = [...clashing].some((c) => c.course === r.course && c.group === r.group);
        return el("li", { class: `cs-row${isClash ? " is-clash" : ""}` },
          timeRange(r.slot),
          el("span", { class: "cs-row-main" },
            el("span", { class: "cs-row-name", text: courseName(r.course, helpers) }),
            el("span", { class: "cs-row-sub", text: [`${tr(r.group.kind)} ${r.group.group}`, r.group.pending ? tr("טרם שובץ חדר") : placeText(r.slot, helpers) || tr("חדר: באינ-בר")].filter(Boolean).join(" · ") }),
            // The word, not only the color, so it reads for everyone.
            isClash ? el("span", { class: "cs-clash-tag", text: tr("⚠ חפיפה") }) : null));
      })))));
}

function examsList(courses, ctx) {
  const { helpers, now } = ctx;
  const { tr } = helpers;
  const list = upcomingExams(courses, now, ctx.semester);
  if (!list.length) return null;
  return el("section", { class: "cs-exams", "aria-labelledby": "cs-exams-h" },
    el("h3", { id: "cs-exams-h", class: "cs-h", text: tr("המבחנים שלי ב{semester}", { semester: tr(ctx.semester) }) }),
    el("p", { class: "cs-hint", text: tr("מועדים מתוכננים לפי הקטלוג, עשויים להשתנות.") }),
    el("ul", { class: "cs-rows" }, ...list.map(({ course, exam, close }) => el("li", { class: `cs-row${close ? " is-close" : ""}` },
      el("bdi", { dir: "ltr", class: "cb-time", text: dmy(exam.date) }),
      el("span", { class: "cs-row-main" },
        el("span", { class: "cs-row-name", text: courseName(course, helpers) }),
        el("span", { class: "cs-row-sub", text: [tr(exam.type), exam.hour, close === "same-day" ? tr("⚠ באותו יום כמו מבחן אחר") : close ? tr("⚠ צמוד למבחן אחר") : ""].filter(Boolean).join(" · ") }))))));
}

/**
 * The whole view. ctx: { helpers, store, now, semester, semesterIsNow, courses (all), card(course, open),
 * goToAll() }.
 */
export function scheduleView(ctx) {
  const { helpers, store, semester } = ctx;
  const { tr } = helpers;
  const starred = ctx.courses.filter((c) => store.isStarred(c.code));
  if (!starred.length) {
    const go = el("button", { type: "button", class: "btn cs-go", text: tr("לכל הקורסים") });
    go.addEventListener("click", ctx.goToAll);
    return el("section", { class: "cs-empty" },
      el("h3", { class: "cs-h", text: tr("עוד לא בחרתם קורסים") }),
      el("p", { text: tr("מסמנים ☆ ליד קורס, פותחים אותו ובוחרים קבוצה בכל סוג (הרצאה, תרגול). המערכת נבנית כאן, ומסמנת חפיפות.") }),
      go);
  }
  const picked = starred.flatMap((course) => course.groups.filter((g) => store.isPicked(course.code, g.group) && inSemester(g, semester)).map((group) => ({ course, group })));
  const untimed = picked.filter((p) => !timedSlots(p.group).length);
  const noPicks = starred.filter((c) => !store.picks(c.code).length);
  return el("div", { class: "cs-view" },
    ctx.semesterIsNow ? nextClass(picked, ctx) : null,
    weekAgenda(picked, ctx),
    untimed.length ? el("p", { class: "cb-muted", text: tr("בלי שעה בקטלוג: {list}", { list: untimed.map((p) => `${courseName(p.course, helpers)} (${tr(p.group.kind)} ${p.group.group})`).join(", ") }) }) : null,
    noPicks.length ? el("p", { class: "cs-hint", text: tr("עוד לא בחרתם קבוצה ב: {list}. פותחים את הקורס למטה ולוחצים על העיגול ליד קבוצה.", { list: noPicks.map((c) => courseName(c, helpers)).join(", ") }) }) : null,
    examsList(starred, ctx),
    el("section", { class: "cs-courses", "aria-labelledby": "cs-courses-h" },
      el("h3", { id: "cs-courses-h", class: "cs-h", text: tr("הקורסים שלי") }),
      el("div", { class: "cb-list" }, ...starred.map((c) => ctx.card(c, !store.picks(c.code).length)))),
    el("p", { class: "cb-muted cs-foot", text: tr("נבנה מסריקה לא רשמית. את המערכת הסופית בודקים באינ-בר, במערכת שעות. הבחירות נשמרות רק במכשיר הזה.") }),
    ctx.backup ? (() => {
      const b = el("button", { type: "button", class: "cb-link", text: tr("גיבוי המערכת לקובץ (לייבוא בטלפון אחר)") });
      b.addEventListener("click", ctx.backup);
      return b;
    })() : null);
}
