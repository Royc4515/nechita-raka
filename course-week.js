/*
  "My week" in My schedule, two ways to look at it:
  - Week: a timetable grid, days across and hours down, each class a colored block at its time. Classes
    that overlap sit side by side and are outlined in red. Today's column and the current time are marked.
    Tapping a block shows its details under the grid (on a phone the blocks only fit the name).
  - Day: one day at a time, picked from day buttons, as a timeline with every detail, the breaks between
    classes, and where "now" falls.
  The layout math (hours shown, lanes for overlaps, breaks) has no DOM, so the tests can check it.
*/
import { courseName, dayName, el, placeText, timeRange } from "./course-card.js";
import { DAYS, timedSlots } from "./course-time.js";

const toMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const COLORS = 8;
const BREAK_MIN = 15;

/**
 * Places the week's meetings: entries [{ course, group, slot }] → { days, from, to, items }. `from`/`to` are
 * whole hours around the earliest start and latest end; Friday appears only when something meets then.
 * Each item gets start/end minutes and a lane: meetings that overlap on a day share its width side by side.
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
  for (const day of days) {
    const list = items.filter((i) => i.day === day).sort((a, b) => a.start - b.start || b.end - a.end);
    // Clusters of meetings that overlap one another; each cluster splits the column into its lane count.
    let cluster = [];
    let clusterEnd = -1;
    const flush = () => {
      const lanes = [];
      for (const item of cluster) {
        let lane = lanes.findIndex((end) => end <= item.start);
        if (lane === -1) { lane = lanes.length; lanes.push(item.end); } else lanes[lane] = item.end;
        item.lane = lane;
      }
      for (const item of cluster) { item.lanes = lanes.length; item.overlaps = lanes.length > 1; placed.push(item); }
      cluster = [];
    };
    for (const item of list) {
      if (cluster.length && item.start >= clusterEnd) flush();
      cluster.push({ ...item });
      clusterEnd = Math.max(clusterEnd, item.end);
    }
    if (cluster.length) flush();
    clusterEnd = -1;
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

/** A course's color, stable for the same set of courses (by code order). */
const colorOf = (codes, code) => (codes.indexOf(code) % COLORS) + 1;

function durationText(min, tr) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return tr("{m} דקות", { m });
  if (!m) return h === 1 ? tr("שעה") : h === 2 ? tr("שעתיים") : tr("{h} שעות", { h });
  return tr("{h}:{m} שעות", { h, m: String(m).padStart(2, "0") });
}

function details(item, ctx) {
  const { helpers } = ctx;
  const { tr } = helpers;
  const place = item.group.pending ? tr("טרם שובץ חדר") : placeText(item.slot, helpers);
  return el("div", { class: "cw-details" },
    el("p", { class: "cw-details-name", text: courseName(item.course, helpers) }),
    el("p", { class: "cw-details-when" }, `${dayName(item.day, helpers)} · `, timeRange(item.slot), ` · ${tr(item.group.kind)} ${item.group.group}`),
    place ? el("p", { class: "cw-details-sub", text: place }) : null,
    item.group.teachers ? el("p", { class: "cw-details-sub", text: item.group.teachers }) : null,
    item.overlaps ? el("p", { class: "cb-warn", text: tr("⚠ חופף לשיעור אחר באותו זמן") }) : null);
}

/** The week as a grid. */
function weekGrid(layout, ctx, codes) {
  const { helpers, now, semesterIsNow } = ctx;
  const { tr } = helpers;
  const today = semesterIsNow ? DAYS[now.getDay()] : null;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const hours = [];
  for (let m = layout.from; m < layout.to; m += 60) hours.push(m);
  const span = layout.to - layout.from;
  const detail = el("div", { class: "cw-detail-slot", "aria-live": "polite" });
  let selected = null;
  const columns = layout.days.map((day) => {
    const blocks = layout.items.filter((i) => i.day === day).map((item) => {
      const b = el("button", {
        type: "button",
        class: `cw-block${item.overlaps ? " is-clash" : ""}${item.lanes > 1 ? " is-split" : ""}`,
        style: `--top: ${(item.start - layout.from) / 60}; --len: ${(item.end - item.start) / 60}; --lane: ${item.lane}; --lanes: ${item.lanes}; --c: var(--cw-${colorOf(codes, item.course.code)})`,
        "aria-label": `${courseName(item.course, helpers)}, ${tr(item.group.kind)} ${item.group.group}, ${dayName(day, helpers)} ${item.slot.end ? `${item.slot.start}–${item.slot.end}` : item.slot.start}`,
        "aria-pressed": "false",
      },
      el("span", { class: "cw-block-name", text: courseName(item.course, helpers) }),
      el("span", { class: "cw-block-meta", text: `${item.slot.start} · ${tr(item.group.kind)}` }));
      b.addEventListener("click", () => {
        if (selected) selected.setAttribute("aria-pressed", "false");
        const again = selected === b;
        selected = again ? null : b;
        b.setAttribute("aria-pressed", String(!again));
        detail.replaceChildren(...(again ? [] : [details(item, ctx)]));
      });
      return b;
    });
    const isToday = day === today;
    const line = isToday && nowMin >= layout.from && nowMin <= layout.to
      ? el("span", { class: "cw-now", style: `--top: ${(nowMin - layout.from) / 60}`, "aria-hidden": "true" }) : null;
    return el("div", { class: `cw-col${isToday ? " is-today" : ""}`, role: "group", "aria-label": dayName(day, helpers) }, ...blocks, line);
  });
  return el("div", { class: "cw-week" },
    el("div", { class: "cw-grid", style: `--hours: ${span / 60}; --days: ${layout.days.length}` },
      el("div", { class: "cw-corner", "aria-hidden": "true" }),
      ...layout.days.map((d) => el("div", { class: `cw-day-h${d === today ? " is-today" : ""}`, "aria-hidden": "true", text: helpers.en ? dayName(d, helpers) : d })),
      el("div", { class: "cw-hours", "aria-hidden": "true" }, ...hours.map((m, i) => el("span", { class: "cw-hour", style: `--i: ${i}`, text: hhmm(m) }))),
      ...columns),
    detail,
    el("p", { class: "cw-tip", text: tr("לוחצים על שיעור כדי לראות חדר ומרצה.") }));
}

/** One day as a timeline, with day buttons. */
function dayView(layout, ctx, codes, state) {
  const { helpers, now, semesterIsNow } = ctx;
  const { tr } = helpers;
  const today = semesterIsNow ? DAYS[now.getDay()] : null;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const allDays = DAYS.filter((d) => d !== "ו'" || layout.days.includes(d));
  const count = (d) => layout.items.filter((i) => i.day === d).length;
  // A day the week doesn't show (Friday with no Friday classes) falls back to the first day with classes.
  if (!allDays.includes(state.day)) state.day = allDays.find((d) => count(d)) || allDays[0];
  const buttons = el("div", { class: "cw-daybar", role: "group", "aria-label": tr("בחירת יום") }, ...allDays.map((d) => {
    const b = el("button", { type: "button", class: `cw-daybtn${d === today ? " is-today" : ""}`, "aria-pressed": String(d === state.day), "data-key": `day|${d}` },
      el("span", { class: "cw-daybtn-name", text: helpers.en ? dayName(d, helpers) : d }),
      el("span", { class: "cw-daybtn-count", text: count(d) ? String(count(d)) : "–" }));
    b.addEventListener("click", () => state.pick(d));
    return b;
  }));
  const items = layout.items.filter((i) => i.day === state.day);
  let nowShown = false;
  const nowRow = () => { nowShown = true; return el("li", { class: "cw-now-row", text: tr("עכשיו {time}", { time: hhmm(nowMin) }) }); };
  const rows = [];
  for (const entry of dayTimeline(items)) {
    const isToday = state.day === today && !nowShown;
    if (entry.break) {
      if (isToday && nowMin < entry.from) rows.push(nowRow());
      rows.push(el("li", { class: "cw-break", text: tr("הפסקה של {d}", { d: durationText(entry.break, tr) }) }));
      // Now is during the break: the line goes right after it.
      if (isToday && !nowShown && nowMin >= entry.from && nowMin < entry.to) rows.push(nowRow());
      continue;
    }
    if (isToday && nowMin < entry.start) rows.push(nowRow());
    const on = state.day === today && nowMin >= entry.start && nowMin < entry.end;
    if (on) nowShown = true;
    const place = entry.group.pending ? tr("טרם שובץ חדר") : placeText(entry.slot, helpers);
    rows.push(el("li", { class: `cw-item${entry.overlaps ? " is-clash" : ""}${on ? " is-now" : ""}`, style: `--c: var(--cw-${colorOf(codes, entry.course.code)})` },
      el("div", { class: "cw-item-time" }, el("bdi", { dir: "ltr", text: entry.slot.start }), el("bdi", { dir: "ltr", class: "cw-item-end", text: entry.slot.end || "" })),
      el("div", { class: "cw-item-card" },
        on ? el("span", { class: "cw-item-tag", text: tr("עכשיו") }) : null,
        el("p", { class: "cw-item-name", text: courseName(entry.course, helpers) }),
        el("p", { class: "cw-item-sub", text: [`${tr(entry.group.kind)} ${entry.group.group}`, durationText(entry.end - entry.start, tr)].join(" · ") }),
        place ? el("p", { class: "cw-item-place", text: place }) : null,
        entry.group.teachers ? el("p", { class: "cw-item-sub", text: entry.group.teachers }) : null,
        entry.overlaps ? el("p", { class: "cb-warn", text: tr("⚠ חופף לשיעור אחר באותו זמן") }) : null)));
  }
  const first = items.length ? Math.min(...items.map((i) => i.start)) : 0;
  const last = items.length ? Math.max(...items.map((i) => i.end)) : 0;
  return el("div", { class: "cw-dayview" },
    buttons,
    items.length
      ? el("p", { class: "cw-day-summary" }, items.length === 1 ? tr("שיעור אחד") : tr("{n} שיעורים", { n: items.length }), " · ", el("bdi", { dir: "ltr", text: `${hhmm(first)}–${hhmm(last)}` }))
      : null,
    items.length
      ? el("ol", { class: "cw-timeline" }, ...rows)
      : el("p", { class: "cw-empty", text: tr("אין שיעורים ב{day}.", { day: dayName(state.day, helpers) }) }));
}

/**
 * The section. picked: [{ course, group }] in the semester. ctx: { helpers, store, now, semesterIsNow }.
 * The chosen view (day / week) is kept in the store; the default is the day on a phone, the week otherwise.
 */
export function weekSection(picked, ctx) {
  const { helpers, store } = ctx;
  const { tr } = helpers;
  const entries = picked.flatMap((p) => timedSlots(p.group).map((slot) => ({ ...p, slot })));
  const layout = weekLayout(entries);
  if (!layout.items.length) return null;
  const codes = [...new Set(layout.items.map((i) => i.course.code))].sort();
  const narrow = typeof matchMedia === "function" && matchMedia("(max-width: 599px)").matches;
  const view = store.get().view || (narrow ? "day" : "week");
  // The day to show: today on a weekday, Sunday on Saturday, or one the student picked.
  const todayIdx = Math.min(ctx.now.getDay(), 6);
  const startDay = ctx.pickedDay || (todayIdx === 6 ? DAYS[0] : DAYS[todayIdx]);
  // Groups (not meetings) that clash, so a twice-a-week group counts once.
  const clashes = new Set(layout.items.filter((i) => i.overlaps).map((i) => `${i.course.code}|${i.group.group}`)).size;
  const toggle = el("div", { class: "cb-toggles is-segmented cw-toggle", role: "group", "aria-label": tr("תצוגה") },
    ...[["day", tr("יום")], ["week", tr("שבוע")]].map(([id, label]) => {
      const b = el("button", { type: "button", class: "cb-chip", "aria-pressed": String(view === id), "data-key": `view|${id}`, text: label });
      b.addEventListener("click", () => store.setView(id));
      return b;
    }));
  const state = { day: startDay, pick: (d) => ctx.onPickDay && ctx.onPickDay(d) };
  return el("section", { class: "cs-week", "aria-labelledby": "cs-week-h" },
    el("div", { class: "cw-head" }, el("h3", { id: "cs-week-h", class: "cs-h", text: tr("השבוע שלי") }), toggle),
    clashes ? el("p", { class: "cs-alert", role: "status" }, el("span", { "aria-hidden": "true", text: "⚠ " }), tr("יש חפיפה בין {n} קבוצות.", { n: clashes })) : null,
    view === "week" ? weekGrid(layout, ctx, codes) : dayView(layout, ctx, codes, state));
}
