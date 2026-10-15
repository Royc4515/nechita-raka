/*
  "My week" in My schedule, two ways to look at it:
  - Week: a timetable grid for this week (dates on the days, holidays shaded), days across and hours down,
    each class a colored block at its time with a short name. On a wide screen, classes that overlap sit
    side by side; on a phone they become one block ("⚠ +1"). Tapping a block on a phone opens that day;
    on a wide screen it shows the details, with a way to switch group.
  - Day: day buttons (count, "פנוי", today and clash marks), then a timeline: classes with their room and
    lecturer, the breaks between them, classes at the same time grouped as a clash, and where "now" falls.
  Both show hours of class per day. The layout math has no DOM, so the tests can check it.
*/
import { courseName, dayName, el, placeText, timeRange } from "./course-card.js";
import { DAYS, timedSlots } from "./course-time.js";

const toMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const COLORS = 8;
const BREAK_MIN = 15;
const pad = (n) => String(n).padStart(2, "0");
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hoursText = (min) => Math.round((min / 60) * 10) / 10;

/**
 * Places the week's meetings: entries [{ course, group, slot }] → { days, from, to, items }. `from`/`to` are
 * whole hours around the earliest start and latest end; Friday appears only when something meets then.
 * Each item gets start/end minutes and a lane: meetings that overlap on a day share its width side by side,
 * and share a `cluster` id.
 */
export function weekLayout(entries) {
  const items = entries
    .filter((e) => e.slot && DAYS.includes(e.slot.day) && e.slot.start)
    .map((e) => {
      const start = toMin(e.slot.start);
      return { ...e, day: e.slot.day, start, end: e.slot.end ? Math.max(toMin(e.slot.end), start + 30) : start + 60 };
    });
  if (!items.length) return { days: [], from: 8 * 60, to: 18 * 60, items: [] };
  const from = Math.floor(Math.min(...items.map((i) => i.start)) / 60) * 60;
  const to = Math.ceil(Math.max(...items.map((i) => i.end)) / 60) * 60;
  const used = new Set(items.map((i) => i.day));
  const days = DAYS.filter((d) => d !== "ו'" || used.has(d));
  const placed = [];
  let clusterId = 0;
  for (const day of days) {
    const list = items.filter((i) => i.day === day).sort((a, b) => a.start - b.start || b.end - a.end);
    let cluster = [];
    let clusterEnd = -1;
    const flush = () => {
      const lanes = [];
      for (const item of cluster) {
        let lane = lanes.findIndex((end) => end <= item.start);
        if (lane === -1) { lane = lanes.length; lanes.push(item.end); } else lanes[lane] = item.end;
        item.lane = lane;
      }
      clusterId++;
      for (const item of cluster) { item.lanes = lanes.length; item.overlaps = lanes.length > 1; item.cluster = clusterId; placed.push(item); }
      cluster = [];
    };
    for (const item of list) {
      if (cluster.length && item.start >= clusterEnd) flush();
      cluster.push({ ...item });
      clusterEnd = Math.max(clusterEnd, item.end);
    }
    if (cluster.length) flush();
  }
  return { days, from, to, items: placed };
}

/** A day's meetings in order, with the breaks between them (15 minutes or more) as { break: minutes }. */
export function dayTimeline(items) {
  const sorted = [...items].sort((a, b) => a.start - b.start);
  const out = [];
  let lastEnd = null;
  for (const item of sorted) {
    if (lastEnd !== null && item.start - lastEnd >= BREAK_MIN) out.push({ break: item.start - lastEnd, from: lastEnd, to: item.start });
    out.push(item);
    lastEnd = lastEnd === null ? item.end : Math.max(lastEnd, item.end);
  }
  return out;
}

/** Minutes of class in a day (overlaps counted once) and the gaps between classes. */
export function dayHours(items) {
  const sorted = [...items].sort((a, b) => a.start - b.start);
  let busy = 0;
  let gaps = 0;
  let end = null;
  for (const i of sorted) {
    if (end === null) { busy += i.end - i.start; end = i.end; continue; }
    if (i.start > end) { gaps += i.start - end; busy += i.end - i.start; end = i.end; } else if (i.end > end) { busy += i.end - end; end = i.end; }
  }
  return { busy, gaps };
}

/** A short name for a narrow grid column ("חשבון אינפיניטסימלי 1" → "אינפי 1"). */
const SHORT = [
  [/^חשבון אינפיניטסימלי/, "אינפי"],
  [/^אלגברה לי?ניארית/, "לינארית"],
  [/^מתמטיקה בדידה/, "בדידה"],
  [/^מבוא למדעי המחשב/, "מבוא למ\"ח"],
  [/^מבוא לבינה מלאכותית חישובית/, "מבוא ל-AI"],
  [/^הסתברות.*/, "הסתברות"],
  [/^יסודות (?:ל)?בינה מלאכותית \((\d)\).*/, "יסודות AI $1"],
  [/^אלגוריתמים/, "אלגו'"],
];
export function shortName(course, { en } = {}) {
  if (en && course.nameEn) return course.nameEn.length > 18 ? `${course.nameEn.slice(0, 16)}…` : course.nameEn;
  for (const [re, short] of SHORT) if (re.test(course.name)) return course.name.replace(re, short).trim();
  const words = course.name.split(" ");
  return words.length > 2 ? `${words.slice(0, 2).join(" ")}…` : course.name;
}

/** A course's color, stable for the same set of courses (by code order). */
const colorOf = (codes, code) => (codes.indexOf(code) % COLORS) + 1;

function durationText(min, tr) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return tr("{m} דקות", { m });
  if (!m) return h === 1 ? tr("שעה") : h === 2 ? tr("שעתיים") : tr("{h} שעות", { h });
  return tr("{h}:{m} שעות", { h, m: String(m).padStart(2, "0") });
}

/** This week's date for each weekday (Saturday shows the coming week), and the holiday on it, if any. */
export function weekDates(now, holidays) {
  const start = new Date(now);
  start.setDate(start.getDate() - now.getDay() + (now.getDay() === 6 ? 7 : 0));
  return Object.fromEntries(DAYS.map((d, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const iso = isoOf(date);
    return [d, { iso, label: `${date.getDate()}.${date.getMonth() + 1}`, holiday: holidays.get(iso) || "" }];
  }));
}

/** The phone layout (merged blocks, day view by default) applies below this width. */
export const NARROW = "(max-width: 599px)";
const isNarrow = () => typeof matchMedia === "function" && matchMedia(NARROW).matches;
/** The view shown: the student's choice, else the day on a phone and the week otherwise. */
export const currentView = (store) => store.get().view || (isNarrow() ? "day" : "week");

/** The day to open on: today if a class is still ahead, else the next day with classes. */
export function defaultDay(layout, now, semesterIsNow) {
  if (!semesterIsNow) return { day: DAYS.find((d) => layout.items.some((i) => i.day === d)) || DAYS[0], moved: false };
  const today = DAYS[now.getDay()];
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (today && layout.items.some((i) => i.day === today && i.end > nowMin)) return { day: today, moved: false };
  const order = [...DAYS.slice(now.getDay() + 1), ...DAYS.slice(0, now.getDay() + 1)];
  const next = order.find((d) => layout.items.some((i) => i.day === d)) || DAYS[0];
  return { day: next, moved: Boolean(today) && next !== today };
}

/** Each clash: the day, the time span and the classes in it. */
function clashList(layout) {
  const byCluster = new Map();
  for (const i of layout.items.filter((x) => x.overlaps)) byCluster.set(i.cluster, [...(byCluster.get(i.cluster) || []), i]);
  return [...byCluster.values()].map((items) => ({ day: items[0].day, start: Math.min(...items.map((i) => i.start)), end: Math.max(...items.map((i) => i.end)), items }));
}

function swapButton(course, ctx) {
  if (!ctx.openCourse) return null;
  const b = el("button", { type: "button", class: "cb-link", text: ctx.helpers.tr("החלפת קבוצה ב{name}", { name: courseName(course, ctx.helpers) }) });
  b.addEventListener("click", () => ctx.openCourse(course.code));
  return b;
}

function details(item, ctx) {
  const { helpers } = ctx;
  const { tr } = helpers;
  const place = item.group.pending ? tr("טרם שובץ חדר") : placeText(item.slot, helpers);
  return el("div", { class: "cw-details" },
    el("p", { class: "cw-details-name", text: courseName(item.course, helpers) }),
    el("p", { class: "cw-details-when" }, `${dayName(item.day, helpers)} · `, timeRange(item.slot), ` · ${tr(item.group.kind)} ${item.group.group}`),
    place ? el("p", { class: "cw-details-place", text: place }) : null,
    item.group.teachers ? el("p", { class: "cw-details-sub", text: item.group.teachers }) : null,
    swapButton(item.course, ctx));
}

/** The week as a grid. */
function weekGrid(layout, ctx, codes, dates) {
  const { helpers, now, semesterIsNow, narrow } = ctx;
  const { tr } = helpers;
  const today = semesterIsNow ? DAYS[now.getDay()] : null;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const hours = [];
  for (let m = layout.from; m < layout.to; m += 60) hours.push(m);
  const span = layout.to - layout.from;
  const detail = el("div", { class: "cw-detail-slot", "aria-live": "polite" });
  let selected = null;
  const select = (b, item) => {
    if (narrow) { ctx.showDay(item.day); return; } // a phone opens the day: every detail, readable
    if (selected) selected.setAttribute("aria-pressed", "false");
    const again = selected === b;
    selected = again ? null : b;
    b.setAttribute("aria-pressed", String(!again));
    detail.replaceChildren(...(again ? [] : [details(item, ctx)]));
    const calm = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!again) detail.scrollIntoView({ block: "nearest", behavior: calm ? "auto" : "smooth" });
  };
  const columns = layout.days.map((day) => {
    const dayItems = layout.items.filter((i) => i.day === day);
    // On a phone, classes at the same time are one block that says so, instead of unreadable slivers.
    const shown = narrow
      ? [...new Map(dayItems.map((i) => [i.cluster, dayItems.filter((x) => x.cluster === i.cluster)])).values()].map((group) => ({
        ...group[0], start: Math.min(...group.map((g) => g.start)), end: Math.max(...group.map((g) => g.end)), lane: 0, lanes: 1, members: group,
      }))
      : dayItems.map((i) => ({ ...i, members: [i] }));
    const blocks = shown.map((item) => {
      const others = item.members.length - 1;
      const label = item.members.map((g) => `${courseName(g.course, helpers)}, ${tr(g.group.kind)} ${g.group.group}, ${g.slot.end ? `${g.slot.start}–${g.slot.end}` : g.slot.start}`).join("; ");
      const second = others ? `; --c2: var(--cw-${colorOf(codes, item.members[1].course.code)})` : "";
      const b = el("button", {
        type: "button",
        class: `cw-block${item.overlaps ? " is-clash" : ""}${others ? " is-merged" : ""}`,
        style: `--top: ${(item.start - layout.from) / 60}; --len: ${(item.end - item.start) / 60}; --lane: ${item.lane}; --lanes: ${item.lanes}; --c: var(--cw-${colorOf(codes, item.course.code)})${second}`,
        "aria-label": `${item.overlaps ? `${tr("חפיפה")}: ` : ""}${dayName(day, helpers)}, ${label}`,
        "aria-pressed": narrow ? null : "false",
      },
      el("span", { class: "cw-block-name", text: shortName(item.course, helpers) }),
      others ? el("span", { class: "cw-block-more" }, "⚠ ", el("bdi", { dir: "ltr", text: `+${others}` })) : item.overlaps ? el("span", { class: "cw-block-more", text: "⚠" }) : null,
      el("span", { class: "cw-block-meta", text: [item.slot.start, placeText(item.slot, helpers) || tr(item.group.kind)].filter(Boolean).join(" · ") }));
      b.addEventListener("click", () => select(b, item));
      return b;
    });
    const isToday = day === today;
    const holiday = semesterIsNow ? dates[day].holiday : "";
    const line = isToday && nowMin >= layout.from && nowMin <= layout.to
      ? el("span", { class: "cw-now", style: `--top: ${(nowMin - layout.from) / 60}`, "aria-hidden": "true" }) : null;
    return el("div", { class: `cw-col${isToday ? " is-today" : ""}${holiday ? " is-holiday" : ""}`, role: "group", "aria-label": `${dayName(day, helpers)}${holiday ? `, ${holiday}` : ""}` },
      holiday ? el("span", { class: "cw-holiday", text: holiday }) : null, ...blocks, line);
  });
  // Days with classes get the width; free days stay narrow.
  const weights = layout.days.map((d) => (layout.items.some((i) => i.day === d) ? "minmax(0, 1fr)" : "minmax(0, .5fr)")).join(" ");
  return el("div", { class: "cw-week" },
    el("div", { class: "cw-grid", style: `--hours: ${span / 60}; grid-template-columns: var(--hour-col) ${weights}` },
      el("div", { class: "cw-corner", "aria-hidden": "true" }),
      ...layout.days.map((d) => {
        const { busy } = dayHours(layout.items.filter((i) => i.day === d));
        return el("div", { class: `cw-day-h${d === today ? " is-today" : ""}`, "aria-hidden": "true" },
          el("span", { class: "cw-day-h-name", text: helpers.en ? dayName(d, helpers) : d }),
          semesterIsNow ? el("span", { class: "cw-day-h-date", text: dates[d].label }) : null,
          busy ? el("span", { class: "cw-day-h-hours", text: tr("{h} ש'", { h: hoursText(busy) }) }) : null);
      }),
      el("div", { class: "cw-hours", "aria-hidden": "true" }, ...hours.map((m, i) => el("span", { class: "cw-hour", style: `--i: ${i}`, text: narrow ? String(m / 60) : hhmm(m) }))),
      ...columns),
    detail,
    el("p", { class: "cw-tip", text: narrow ? tr("לוחצים על שיעור כדי לפתוח את היום עם כל הפרטים.") : tr("לוחצים על שיעור כדי לראות חדר ומרצה.") }));
}

/** One day as a timeline, with day buttons. */
function dayView(layout, ctx, codes, dates, state) {
  const { helpers, now, semesterIsNow } = ctx;
  const { tr } = helpers;
  const today = semesterIsNow ? DAYS[now.getDay()] : null;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const allDays = DAYS.filter((d) => d !== "ו'" || layout.days.includes(d));
  if (!allDays.includes(state.day)) state.day = allDays.find((d) => layout.items.some((i) => i.day === d)) || allDays[0];
  const itemsOf = (d) => layout.items.filter((i) => i.day === d);
  const buttons = el("div", { class: "cw-daybar", role: "group", "aria-label": tr("בחירת יום") }, ...allDays.map((d) => {
    const n = itemsOf(d).length;
    const clash = itemsOf(d).some((i) => i.overlaps);
    const holiday = semesterIsNow ? dates[d].holiday : "";
    const label = [dayName(d, helpers), d === today ? tr("היום") : "", holiday || (n ? (n === 1 ? tr("שיעור אחד") : tr("{n} שיעורים", { n })) : tr("פנוי")), clash ? tr("יש חפיפה") : ""].filter(Boolean).join(", ");
    const b = el("button", { type: "button", class: `cw-daybtn${d === today ? " is-today" : ""}${n && !holiday ? "" : " is-free"}`, "aria-pressed": String(d === state.day), "aria-label": label, "data-key": `day|${d}` },
      el("span", { class: "cw-daybtn-name", text: helpers.en ? dayName(d, helpers) : d }),
      el("span", { class: "cw-daybtn-count", text: holiday ? tr("חג") : n ? String(n) : tr("פנוי") }),
      clash ? el("span", { class: "cw-daybtn-clash", "aria-hidden": "true", text: "⚠" }) : null,
      d === today ? el("span", { class: "cw-daybtn-today", "aria-hidden": "true", text: tr("היום") }) : null);
    b.addEventListener("click", () => state.pick(d));
    return b;
  }));
  const items = itemsOf(state.day);
  const holiday = semesterIsNow ? dates[state.day].holiday : "";
  const live = state.day === today && !holiday;
  let nowShown = false;
  const nowRow = () => { nowShown = true; return el("li", { class: "cw-now-row", text: tr("עכשיו {time}", { time: hhmm(nowMin) }) }); };
  const card = (entry) => {
    const on = live && nowMin >= entry.start && nowMin < entry.end;
    if (on) nowShown = true;
    const place = entry.group.pending ? tr("טרם שובץ חדר") : placeText(entry.slot, helpers);
    return el("div", { class: `cw-item${on ? " is-now" : ""}`, style: `--c: var(--cw-${colorOf(codes, entry.course.code)})` },
      el("div", { class: "cw-item-time" }, el("bdi", { dir: "ltr", text: entry.slot.start }), el("bdi", { dir: "ltr", class: "cw-item-end", text: entry.slot.end || "" })),
      el("div", { class: "cw-item-card" },
        on ? el("span", { class: "cw-item-tag", text: tr("עכשיו") }) : null,
        el("p", { class: "cw-item-name", text: courseName(entry.course, helpers) }),
        el("p", { class: "cw-item-sub", text: `${tr(entry.group.kind)} ${entry.group.group}${entry.slot.end ? "" : ` · ${durationText(entry.end - entry.start, tr)}`}` }),
        el("p", { class: place ? "cw-item-place" : "cw-item-sub", text: place || tr("חדר: באינ-בר") }),
        entry.group.teachers ? el("p", { class: "cw-item-sub", text: entry.group.teachers }) : null));
  };
  const rows = [];
  const timeline = dayTimeline(items);
  for (let k = 0; k < timeline.length; k++) {
    const entry = timeline[k];
    if (entry.break) {
      if (live && !nowShown && nowMin < entry.from) rows.push(nowRow());
      rows.push(el("li", { class: "cw-break", text: tr("הפסקה של {d}", { d: durationText(entry.break, tr) }) }));
      if (live && !nowShown && nowMin >= entry.from && nowMin < entry.to) rows.push(nowRow());
      continue;
    }
    if (live && !nowShown && nowMin < entry.start) rows.push(nowRow());
    if (entry.overlaps) {
      // Classes at the same time: one group, so the clash reads as one problem to solve.
      const group = timeline.filter((e) => !e.break && e.cluster === entry.cluster);
      k = timeline.indexOf(group[group.length - 1]);
      const start = Math.min(...group.map((g) => g.start));
      const end = Math.max(...group.map((g) => g.end));
      rows.push(el("li", { class: "cw-clash" },
        el("p", { class: "cw-clash-h" }, el("span", { "aria-hidden": "true", text: "⚠ " }), tr("{n} שיעורים באותו זמן", { n: group.length }), " · ", el("bdi", { dir: "ltr", text: `${hhmm(start)}–${hhmm(end)}` })),
        ...group.map((g) => card(g)),
        // A way out for each course in the clash: the student decides which one moves.
        ...[...new Map(group.map((g) => [g.course.code, g.course])).values()].map((c) => swapButton(c, ctx))));
      continue;
    }
    rows.push(el("li", {}, card(entry)));
  }
  const { busy, gaps } = dayHours(items);
  const first = items.length ? Math.min(...items.map((i) => i.start)) : 0;
  const last = items.length ? Math.max(...items.map((i) => i.end)) : 0;
  return el("div", { class: "cw-dayview" },
    buttons,
    state.moved && state.day !== today ? el("p", { class: "cw-day-note", text: tr("להיום אין עוד שיעורים, אז מוצג {day}.", { day: dayName(state.day, helpers) }) }) : null,
    holiday ? el("p", { class: "cw-holiday-note", text: tr("{name}: אין לימודים.", { name: holiday }) }) : null,
    items.length
      ? el("p", { class: "cw-day-summary" },
        el("bdi", { dir: "ltr", text: `${hhmm(first)}–${hhmm(last)}` }),
        ` · ${tr("{h} שעות שיעור", { h: hoursText(busy) })}`,
        gaps >= BREAK_MIN ? ` · ${tr("חלונות: {d}", { d: durationText(gaps, tr) })}` : "")
      : null,
    items.length
      ? el("ol", { class: `cw-timeline${holiday ? " is-holiday" : ""}` }, ...rows)
      : el("p", { class: "cw-empty", text: tr("{day} פנוי: אין שיעורים.", { day: dayName(state.day, helpers) }) }));
}

/**
 * The section. picked: [{ course, group }] in the semester. ctx: { helpers, store, now, semesterIsNow,
 * holidays (Map date → title), pickedDay, onPickDay(day), openCourse(code), untimedCount }.
 * The chosen view (day / week) is kept in the store; the default is the day on a phone, the week otherwise.
 */
export function weekSection(picked, ctx) {
  const { helpers, store } = ctx;
  const { tr } = helpers;
  const entries = picked.flatMap((p) => timedSlots(p.group).map((slot) => ({ ...p, slot })));
  const layout = weekLayout(entries);
  if (!layout.items.length) return null;
  const codes = [...new Set(layout.items.map((i) => i.course.code))].sort();
  const narrow = isNarrow();
  const view = currentView(store);
  const dates = weekDates(ctx.now, ctx.holidays || new Map());
  const start = defaultDay(layout, ctx.now, ctx.semesterIsNow);
  const state = { day: ctx.pickedDay || start.day, moved: !ctx.pickedDay && start.moved, pick: (d) => ctx.onPickDay && ctx.onPickDay(d) };
  const local = { ...ctx, narrow, showDay: (d) => { if (store.get().view !== "day") store.setView("day"); state.pick(d); } };
  const clashes = clashList(layout);
  const toggle = el("div", { class: "cb-toggles is-segmented cw-toggle", role: "group", "aria-label": tr("תצוגה") },
    ...[["day", tr("יום")], ["week", tr("שבוע")]].map(([id, label]) => {
      const b = el("button", { type: "button", class: "cb-chip", "aria-pressed": String(view === id), "data-key": `view|${id}`, text: label });
      b.addEventListener("click", () => store.setView(id));
      return b;
    }));
  const busy = layout.days.reduce((sum, d) => sum + dayHours(layout.items.filter((i) => i.day === d)).busy, 0);
  const campusDays = layout.days.filter((d) => layout.items.some((i) => i.day === d)).length;
  // Each clash, named; a tap opens its day.
  const clashNode = clashes.length ? el("div", { class: "cw-clashes", role: "status" },
    el("p", { class: "cw-clashes-h" }, el("span", { "aria-hidden": "true", text: "⚠ " }), clashes.length === 1 ? tr("חפיפה אחת במערכת:") : tr("{n} חפיפות במערכת:", { n: clashes.length })),
    el("ul", {}, ...clashes.map((c) => {
      const b = el("button", { type: "button", class: "cw-clash-link", "data-key": `clash|${c.day}|${c.start}` },
        el("span", { class: "cw-clash-when" }, `${helpers.en ? dayName(c.day, helpers) : c.day} `, el("bdi", { dir: "ltr", text: hhmm(c.start) })),
        ` ${c.items.map((i) => `${shortName(i.course, helpers)} (${tr(i.group.kind)} ${i.group.group})`).join(" · ")}`);
      b.addEventListener("click", () => local.showDay(c.day));
      return el("li", {}, b);
    }))) : null;
  return el("section", { class: "cs-week", "aria-labelledby": "cs-week-h" },
    el("div", { class: "cw-head" },
      el("div", {},
        el("h3", { id: "cs-week-h", class: "cs-h", text: tr("השבוע שלי") }),
        el("p", { class: "cw-total", text: [tr("{h} שעות שיעור בשבוע", { h: hoursText(busy) }), campusDays === 1 ? tr("יום אחד בקמפוס") : tr("{n} ימים בקמפוס", { n: campusDays })].join(" · ") })),
      toggle),
    clashNode,
    view === "week" ? weekGrid(layout, local, codes, dates) : dayView(layout, local, codes, dates, state));
}
