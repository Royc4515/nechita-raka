/*
  One course on the courses page: a calm dropdown. Closed, it shows the name, number, points and one
  useful line (the groups you picked, or the next meeting). Open, its groups are split by type
  (lectures, exercises...) as compact rows: day and time first, then building and teacher. Each group
  can be picked for "my schedule"; a pick that clashes with another pick says so. Exams are a small table.
*/
import { bySoonest, clash, DAYS, hasTime, inSemester, nextMeeting, timedSlots, whenText } from "./course-time.js";

const DAY_EN = { "א'": "Sun", "ב'": "Mon", "ג'": "Tue", "ד'": "Wed", "ה'": "Thu", "ו'": "Fri" };
const KIND_HEADINGS = [
  ["הרצאה", "הרצאות"],
  ["תרגיל", "תרגולים"],
  ["תגבור", "תגבור"],
  ["סדנה", "סדנאות"],
  ["סמינריון", "סמינריונים"],
];
const TEACHERS_SHOWN = 2;

export function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "text") node.textContent = value;
    else node.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children) if (child !== null && child !== undefined && child !== false) node.append(child);
  return node;
}

export const dayName = (day, { tr, en }) => (en ? DAY_EN[day] || day : tr("יום {day}", { day }));
export const dayShort = (day, { en }) => (en ? DAY_EN[day] || day : day);
/** "15:00–18:00", kept left to right inside Hebrew text. */
export const timeRange = (slot) => el("bdi", { dir: "ltr", class: "cb-time", text: slot.end ? `${slot.start}–${slot.end}` : slot.start });
export const placeText = (slot, { tr }) => [slot.building, slot.room && tr("חדר {n}", { n: slot.room })].filter(Boolean).join(", ");
export const courseName = (course, { en }) => (en && course.nameEn) || course.name;
const dm = (iso) => `${Number(iso.slice(8, 10))}.${Number(iso.slice(5, 7))}`;

/** The groups a card shows: this semester's, and, with a day filter, only those meeting on those days. */
export function visibleGroups(course, { semester, days }) {
  return course.groups.filter((g) => inSemester(g, semester) && (!days.size || (hasTime(g) && timedSlots(g).every((s) => days.has(s.day)))));
}

/** Teacher names; each is a button that searches for everything they teach (when the page offers it). */
function teachersNode(teachers, ctx) {
  const names = teachers.split(", ").filter(Boolean);
  if (!names.length) return null;
  const shown = names.slice(0, TEACHERS_SHOWN);
  const extra = names.length - shown.length;
  const nameNode = (name) => {
    if (!ctx.onTeacher) return el("span", { text: name });
    const b = el("button", { type: "button", class: "cb-teacher-link", "data-key": `teacher|${name}`, text: name, title: ctx.helpers.tr("כל הקורסים של {name}", { name }) });
    b.addEventListener("click", () => ctx.onTeacher(name));
    return b;
  };
  return el("span", { class: "cb-teacher", title: extra > 0 ? names.join(", ") : null },
    ...shown.flatMap((n, i) => (i ? [", ", nameNode(n)] : [nameNode(n)])), extra > 0 ? ` +${extra}` : "");
}

/**
 * Picks this group would clash with. Another group of the same course and type is an alternative,
 * not a clash (picking exercise 09 instead of 04), so it doesn't count.
 */
function clashesFor(course, group, ctx) {
  return ctx.picked.filter((p) => !(p.course.code === course.code && (p.group.group === group.group || p.group.kind === group.kind)) && clash(group, p.group, ctx.semester));
}

function groupRow(course, group, ctx, isNext) {
  const { helpers, store } = ctx;
  const { tr } = helpers;
  const picked = store.isPicked(course.code, group.group);
  const clashesWith = clashesFor(course, group, ctx);
  const slots = timedSlots(group);
  const places = [...new Set(slots.map((s) => placeText(s, helpers)).filter(Boolean))];
  // No room in the catalog is the common case for exercises: say nothing rather than repeat it on every row.
  const whereText = group.pending ? tr("טרם שובץ חדר") : places.join(" · ");
  const label = [tr(group.kind), tr("קבוצה {n}", { n: group.group }), ...slots.map((s) => `${dayName(s.day, helpers)} ${s.start}`)].join(", ");
  const pick = el("button", { type: "button", class: "cb-pick", "data-key": `pick|${course.code}|${group.group}`, "aria-pressed": String(picked), "aria-label": tr("בחירת {label}", { label }), title: picked ? tr("הסרה מהמערכת שלי") : tr("הוספה למערכת שלי") });
  // One group per type and semester: picking exercise 09 replaces exercise 04.
  const replaces = course.groups.filter((g) => g !== group && g.kind === group.kind && g.semester.split(", ").some((s) => group.semester.split(", ").includes(s))).map((g) => g.group);
  pick.addEventListener("click", () => store.togglePick(course.code, group.group, replaces));
  const clashNames = clashesWith.map((p) => `${courseName(p.course, helpers)} (${tr(p.group.kind)} ${p.group.group})`).join(", ");
  return el("li", { class: `cb-row${picked ? " is-picked" : ""}${isNext ? " is-next" : ""}${clashesWith.length ? (picked ? " is-clash" : " is-would-clash") : ""}` },
    pick,
    el("div", { class: "cb-row-main" },
      el("p", { class: "cb-row-when" },
        ...(slots.length
          ? slots.map((s) => el("span", { class: "cb-slot" }, el("span", { class: "cb-day", text: dayShort(s.day, helpers) }), timeRange(s)))
          : [el("span", { class: "cb-missing", text: tr("בלי שעה בקטלוג") })])),
      el("p", { class: "cb-row-sub" },
        ...[
          el("span", { class: "cb-group-no", text: tr("קבוצה {n}", { n: group.group }) }),
          whereText ? el("span", { class: group.pending ? "cb-missing" : null, text: whereText }) : null,
          teachersNode(group.teachers, ctx),
        ].filter(Boolean).flatMap((n, i) => (i ? [el("span", { class: "cb-sep", "aria-hidden": "true", text: " · " }), n] : [n])),
        isNext ? el("span", { class: "cb-next-tag", text: tr("הבא") }) : null),
      clashesWith.length ? el("p", { class: picked ? "cb-clash" : "cb-would-clash" },
        el("span", { class: "cb-clash-icon", "aria-hidden": "true", text: "⚠" }),
        ` ${picked ? tr("חפיפה עם {names}", { names: clashNames }) : tr("חופף ל{names}", { names: clashNames })}`) : null));
}

function kindSections(course, groups, ctx) {
  const timed = groups.filter(hasTime);
  const known = new Set(KIND_HEADINGS.map(([k]) => k));
  const kinds = [...KIND_HEADINGS, ...[...new Set(timed.map((g) => g.kind))].filter((k) => !known.has(k)).map((k) => [k, k])];
  const soonest = bySoonest(timed, ctx.now)[0];
  return kinds.map(([kind, heading]) => {
    const list = bySoonest(timed.filter((g) => g.kind === kind), ctx.now);
    if (!list.length) return null;
    return el("section", { class: "cb-kind-block" },
      el("h5", { class: "cb-kind-h" }, ctx.helpers.tr(heading), el("span", { class: "cb-count", text: ` ${list.length}` })),
      el("ul", { class: "cb-rows" }, ...list.map((g) => groupRow(course, g, ctx, g === soonest && ctx.semesterIsNow))));
  });
}

function examTable(course, { tr }) {
  if (!course.exams.length) return el("p", { class: "cb-muted", text: tr("אין מועדי בחינה בקטלוג") });
  const semesters = [...new Set(course.exams.map((e) => e.semester))];
  const types = [...new Set(course.exams.map((e) => e.type))];
  const cell = (sem, type) => {
    const e = course.exams.find((x) => x.semester === sem && x.type === type);
    return el("td", {}, ...(e ? [el("bdi", { dir: "ltr", class: "cb-exam-date", text: dm(e.date) }), e.hour ? el("bdi", { dir: "ltr", class: "cb-exam-hour", text: e.hour }) : null].filter(Boolean) : ["–"]));
  };
  return el("table", { class: "cb-exams" },
    el("caption", { text: tr("מועדי בחינה ({year})", { year: course.exams[0].date.slice(0, 4) }) }),
    el("thead", {}, el("tr", {}, el("td", {}), ...types.map((t) => el("th", { scope: "col", text: tr(t) })))),
    el("tbody", {}, ...semesters.map((sem) => el("tr", {}, el("th", { scope: "row", text: tr(sem) }), ...types.map((t) => cell(sem, t))))));
}

/** Groups with no time, folded away; the fold stays open across redraws once opened. */
function untimedFold(course, untimed, ctx) {
  const fold = el("details", { class: "cb-untimed", open: ctx.untimedOpen || undefined },
    el("summary", { text: ctx.helpers.tr("בלי שעה בקטלוג ({n})", { n: untimed.length }) }),
    el("ul", { class: "cb-rows" }, ...untimed.map((g) => groupRow(course, g, ctx, false))));
  fold.addEventListener("toggle", () => ctx.onUntimed && ctx.onUntimed(course.code, fold.open));
  return fold;
}

/** The one line under the name: your picks, else the next meeting, else why there's nothing. */
function summaryLine(course, groups, ctx) {
  const { helpers, store, now } = ctx;
  const { tr } = helpers;
  const mine = groups.filter((g) => store.isPicked(course.code, g.group) && hasTime(g));
  if (mine.length) {
    const parts = bySoonest(mine, now).map((g) => {
      const n = nextMeeting(g, now);
      return `${tr(g.kind)} ${dayShort(n.slot.day, helpers)} ${n.slot.start}`;
    });
    return el("span", { class: "cb-line is-mine" }, el("span", { class: "cb-line-label", text: tr("שלך:") }), ` ${parts.join(" · ")}`);
  }
  const soonest = bySoonest(groups.filter(hasTime), now)[0];
  if (soonest && ctx.semesterIsNow) {
    return el("span", { class: "cb-line" }, `${tr("הקרוב:")} ${whenText(nextMeeting(soonest, now), now, { tr, dayName: (d) => dayName(d, helpers) })} · ${tr(soonest.kind)}`);
  }
  if (soonest) {
    const days = [...new Set(groups.filter(hasTime).flatMap((g) => timedSlots(g).map((s) => s.day)))].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));
    return el("span", { class: "cb-line" }, `${tr("בימים:")} ${days.map((d) => dayShort(d, helpers)).join(" ")}`);
  }
  return el("span", { class: "cb-line cb-missing", text: groups.length ? tr("אין שעות בקטלוג עדיין") : tr("לא נלמד בסמסטר הזה") });
}

/**
 * The card. ctx: { helpers, store, now, semester, semesterIsNow, days, picked: [{ course, group }],
 * open, highlight, yearLabel, onToggle(code, open) }.
 */
export function courseCard(course, ctx) {
  const { helpers, store } = ctx;
  const { tr } = helpers;
  const groups = visibleGroups(course, ctx);
  const untimed = groups.filter((g) => !hasTime(g));
  // Summer groups ("סמסטר ק'") aren't in either semester's planning; they get a note of their own.
  const summer = course.groups.filter((g) => g.semester === "סמסטר ק'").length;
  const otherSemester = course.groups.length - course.groups.filter((g) => inSemester(g, ctx.semester)).length - summer;
  const starred = store.isStarred(course.code);
  const name = courseName(course, helpers);
  const star = el("button", { type: "button", class: "cb-star", "data-key": `star|${course.code}`, "aria-pressed": String(starred), "aria-label": tr("סימון {name} כקורס שלי", { name }), title: starred ? tr("הסרה מהקורסים שלי") : tr("הוספה לקורסים שלי") });
  star.addEventListener("click", () => store.toggleStar(course.code));
  const details = el("details", { class: "cb-card", id: `course-${course.code}`, open: ctx.open || undefined },
    el("summary", { class: "cb-head" },
      el("span", { class: "cb-head-main" },
        el("h4", { class: "cb-name", text: name }),
        el("span", { class: "cb-meta" },
          el("bdi", { dir: "ltr", text: course.code }),
          ctx.yearLabel ? el("span", { class: "cb-year", text: ctx.yearLabel }) : null,
          course.points.length ? el("span", { text: tr("{n} נ\"ז", { n: course.points[0] }) }) : null,
          el("span", { text: groups.length === 1 ? tr("קבוצה אחת") : tr("{n} קבוצות", { n: groups.length }) })),
        summaryLine(course, groups, ctx)),
      el("span", { class: "cb-chevron", "aria-hidden": "true" })),
    el("div", { class: "cb-body" },
      groups.some((g) => g.kind === "הרצאה") && groups.some((g) => g.kind === "תרגיל")
        ? el("p", { class: "cb-hint", text: tr("בוחרים הרצאה אחת ותרגול אחד. העיגול מוסיף את הקבוצה למערכת שלי.") }) : null,
      ...kindSections(course, groups, ctx),
      untimed.length ? untimedFold(course, untimed, ctx) : null,
      otherSemester > 0 && ctx.semester && ctx.onOtherSemester ? (() => {
        const b = el("button", { type: "button", class: "cb-link", "data-key": `other|${course.code}`, text: tr("ועוד {n} קבוצות בסמסטר האחר: הצגה", { n: otherSemester }) });
        b.addEventListener("click", () => ctx.onOtherSemester(course.code));
        return b;
      })() : null,
      summer ? el("p", { class: "cb-muted", text: summer === 1 ? tr("ועוד קבוצה אחת בסמסטר קיץ (בודקים באינ-בר)") : tr("ועוד {n} קבוצות בסמסטר קיץ (בודקים באינ-בר)", { n: summer }) }) : null,
      examTable(course, helpers)));
  details.addEventListener("toggle", () => ctx.onToggle && ctx.onToggle(course.code, details.open));
  return el("div", { class: `cb-item${ctx.highlight ? " is-target" : ""}${starred ? " is-starred" : ""}` }, star, details);
}
