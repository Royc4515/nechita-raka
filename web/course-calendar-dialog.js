/*
  The "add to calendar" sheet on the courses page: choose what goes in (classes by type and course, with
  holidays skipped; exams by sitting and course; the year's dates by type; reminders), then download one
  .ics file. The file itself is built by course-calendar.js.
*/
import { courseName, el } from "./course-card.js";
import { choice, download, primary, sheet } from "./course-ai-dialog.js";
import { buildIcs, CLASS_KINDS, EVENT_TYPES, eventType } from "./course-calendar.js";

const KIND_LABELS = { lecture: "הרצאות", exercise: "תרגולים", other: "אחר (סדנה, תגבור...)" };
const EVENT_LABELS = { holiday: "חופשות וימים בלי לימודים", semester: "תחילת וסוף סמסטר, תקופות בחינות", payment: "תשלומי שכר לימוד", other: "רישום ואירועים" };

/** A titled block of the sheet, with an on/off switch when `toggle` is given. */
function section(title, body, toggle) {
  const node = el("section", { class: "cb-cal-section" },
    el("div", { class: "cb-cal-head" }, el("h4", { text: title }), toggle ? toggle.node : null),
    el("div", { class: "cb-cal-body" }, ...body.filter(Boolean)));
  if (toggle) {
    const sync = () => node.classList.toggle("is-off", !toggle.get());
    toggle.input.addEventListener("change", sync);
    sync();
  }
  return node;
}

function switchInput(label, on) {
  const input = el("input", { type: "checkbox", role: "switch", class: "cb-switch", checked: on || undefined, "aria-label": label });
  return { node: input, input, get: () => input.checked };
}

/**
 * ctx: { helpers: { tr, en }, store, courses (with manual times), semester, terms, events, scannedAt, now }.
 */
export function openCalendar(ctx) {
  const { tr } = ctx.helpers;
  const ui = sheet(tr);
  const title = tr("הוספה ליומן");
  const starred = ctx.courses.filter((c) => ctx.store.isStarred(c.code));
  const picked = starred.flatMap((course) => course.groups.filter((g) => ctx.store.isPicked(course.code, g.group)).map((group) => ({ course, group })));

  const semester = choice("סמסטר", ["סמסטר א'", "סמסטר ב'"].map((s) => ({ id: s, label: s })), ctx.semester, { tr });
  // Classes
  const classesOn = switchInput(tr("השיעורים שלי"), true);
  const kinds = choice("סוגי שיעורים", CLASS_KINDS.map((k) => ({ id: k, label: KIND_LABELS[k] })), CLASS_KINDS, { tr, multi: true });
  const pickedCourses = [...new Set(picked.map((p) => p.course))];
  const classCourses = pickedCourses.length
    ? choice("קורסים", pickedCourses.map((c) => ({ id: c.code, label: courseName(c, ctx.helpers) })), pickedCourses.map((c) => c.code), { tr, multi: true })
    : null;
  const skipHolidays = el("input", { type: "checkbox", checked: true, id: "cb-cal-holidays" });
  const reminder = choice("תזכורת לפני שיעור", [{ id: "0", label: "בלי" }, { id: "10", label: "10 דקות" }, { id: "30", label: "30 דקות" }], "0", { tr });
  // Exams
  const examsOn = switchInput(tr("המבחנים שלי"), true);
  const sittings = choice("מועדים", [{ id: "מועד א'", label: "מועד א'" }, { id: "מועד ב'", label: "מועד ב'" }], ["מועד א'"], { tr, multi: true });
  const examCourses = starred.length
    ? choice("קורסים", starred.map((c) => ({ id: c.code, label: courseName(c, ctx.helpers) })), starred.map((c) => c.code), { tr, multi: true })
    : null;
  const dayBefore = el("input", { type: "checkbox", checked: true, id: "cb-cal-daybefore" });
  // The year's dates
  const types = choice("סוגי אירועים", EVENT_TYPES.map((t) => ({ id: t, label: EVENT_LABELS[t] })), ["holiday"], { tr, multi: true });
  const counts = Object.fromEntries(EVENT_TYPES.map((t) => [t, (ctx.events || []).filter((ev) => eventType(ev) === t).length]));

  const summary = el("p", { class: "cb-cal-summary", role: "status", "aria-live": "polite" });
  const save = primary(tr("הורדת הקובץ ליומן"), () => {
    const { text, count } = make();
    download(`my-schedule-${semester.get() === "סמסטר ב'" ? "b" : "a"}.ics`, text, "text/calendar;charset=utf-8");
    done(count);
  });

  function options() {
    return {
      classes: { on: classesOn.get(), kinds: new Set(kinds.get()), courses: new Set(classCourses ? classCourses.get() : []), skipHolidays: skipHolidays.checked, reminder: Number(reminder.get()) },
      exams: { on: examsOn.get(), sittings: new Set(sittings.get()), courses: new Set(examCourses ? examCourses.get() : []), dayBefore: dayBefore.checked, extra: starred },
      events: { types: new Set(types.get()) },
    };
  }
  const make = () => buildIcs({ picked, semester: semester.get(), terms: ctx.terms, events: ctx.events, scannedAt: ctx.scannedAt, now: ctx.now, options: options() });

  /** What the file will hold, updated as choices change, so nothing surprising lands in the calendar. */
  function refresh() {
    const { count, skipped } = make();
    const total = count.classes + count.exams + count.events;
    summary.replaceChildren(...[
      el("span", { class: "cb-cal-total", text: total ? tr("{n} אירועים בקובץ", { n: total }) : tr("עוד לא נבחר כלום") }),
      el("span", { class: "cb-cal-split", text: tr("{c} שיעורים שבועיים · {e} מבחנים · {o} תאריכים", { c: count.classes, e: count.exams, o: count.events }) }),
      skipped.length ? el("span", { class: "cb-warn", text: tr("בלי שעה ולכן לא נכנסו: {list}. אפשר להוסיף שעה ידנית בכרטיס הקורס.", { list: skipped.map((p) => `${courseName(p.course, ctx.helpers)} (${tr(p.group.kind)} ${p.group.group})`).join(", ") }) }) : null,
    ].filter(Boolean));
    save.disabled = total === 0;
  }
  ui.dialog.addEventListener("click", () => requestAnimationFrame(refresh));
  ui.dialog.addEventListener("change", refresh);

  function done(count) {
    ui.show({
      title,
      body: [
        el("div", { class: "cb-ready" }, el("span", { class: "cb-ready-badge", "aria-hidden": "true", text: "✓" }),
          el("div", {}, el("p", { class: "cb-ready-title", text: tr("הקובץ ירד") }), el("p", { class: "cb-ready-sub", text: tr("{n} אירועים", { n: count.classes + count.exams + count.events }) }))),
        el("ol", { class: "cb-how" },
          el("li", { text: tr("בטלפון: פותחים את הקובץ (מההורדות) ובוחרים \"הוספה ליומן\".") }),
          el("li", { text: tr("ב-Google Calendar במחשב: הגדרות ← ייבוא, ובוחרים את הקובץ.") }),
          el("li", { text: tr("שיניתם קבוצה? מורידים קובץ חדש. כדאי למחוק קודם את האירועים הישנים.") })),
        el("p", { class: "cb-note-line", text: tr("השעות והחדרים מסריקה לא רשמית. את המערכת הסופית בודקים באינ-בר.") }),
      ],
      footer: [primary(tr("סגירה"), () => ui.dialog.close())],
      back: choose,
    });
  }

  function choose() {
    const noPicks = !picked.length;
    ui.show({
      title,
      body: [
        el("p", { class: "cb-sheet-lead", text: tr("בוחרים מה להוסיף, ויורד קובץ אחד שנפתח ב-Google Calendar, ביומן של האייפון או ב-Outlook.") }),
        semester.node,
        section(tr("השיעורים שלי"), noPicks
          ? [el("p", { class: "cb-note-line", text: tr("עוד לא בחרתם קבוצות. בוחרים קבוצה בכרטיס הקורס כדי שהשיעורים ייכנסו.") })]
          : [kinds.node, classCourses && classCourses.node, reminder.node,
            el("label", { class: "cb-check", for: "cb-cal-holidays" }, skipHolidays, tr("בלי שיעורים בחופשות (חנוכה, פסח וכו')"))], classesOn),
        section(tr("המבחנים שלי"), starred.length
          ? [sittings.node, examCourses && examCourses.node, el("label", { class: "cb-check", for: "cb-cal-daybefore" }, dayBefore, tr("תזכורת יום לפני כל מבחן"))]
          : [el("p", { class: "cb-note-line", text: tr("מסמנים ☆ קורסים כדי שהמבחנים שלהם ייכנסו.") })], examsOn),
        section(tr("תאריכים של השנה"), [types.node, el("p", { class: "cb-note-line", text: EVENT_TYPES.map((t) => `${tr(EVENT_LABELS[t])}: ${counts[t]}`).join(" · ") })]),
        summary,
      ],
      footer: [save],
    });
    refresh();
  }

  choose();
}
