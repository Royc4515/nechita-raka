/*
  "My courses": the courses a student starred and the groups they picked, kept in this browser only
  (localStorage, like the guides' checkboxes). Nothing is sent anywhere. Storage can be blocked
  (private mode), so every read and write is guarded and the page works without it, just unsaved.
*/
const KEY = "nr-courses";

const EMPTY = { starred: [], picks: {}, custom: {}, year: "all" };
const DAY_NAMES = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'"];
const isTime = (t) => typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
/** A manual meeting is kept only if it is a real weekday with a start before its end. */
const cleanSlot = (s) => (s && DAY_NAMES.includes(s.day) && isTime(s.start) && isTime(s.end) && s.start < s.end
  ? { day: s.day, start: s.start, end: s.end, building: typeof s.building === "string" ? s.building.slice(0, 60) : "", room: "", custom: true }
  : null);
const strings = (list) => (Array.isArray(list) ? list.filter((x) => typeof x === "string") : []);

/** Saved state, cleaned: anything malformed (an old version, a hand edit) is dropped, never trusted. */
function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!raw || typeof raw !== "object") return EMPTY;
    const picks = raw.picks && typeof raw.picks === "object" && !Array.isArray(raw.picks)
      ? Object.fromEntries(Object.entries(raw.picks).map(([code, groups]) => [code, strings(groups)]))
      : {};
    const custom = raw.custom && typeof raw.custom === "object" && !Array.isArray(raw.custom)
      ? Object.fromEntries(Object.entries(raw.custom).map(([key, slots]) => [key, (Array.isArray(slots) ? slots : []).map(cleanSlot).filter(Boolean)]).filter(([, slots]) => slots.length))
      : {};
    return {
      starred: strings(raw.starred),
      picks,
      custom,
      year: typeof raw.year === "string" ? raw.year : "all",
      ...(typeof raw.semester === "string" ? { semester: raw.semester } : {}),
      ...(typeof raw.scan === "string" ? { scan: raw.scan } : {}),
    };
  } catch (err) {
    console.warn("courses: could not read saved courses", err);
    return EMPTY;
  }
}

/** A small store: get state, change it immutably, and tell listeners. */
export function createStore() {
  let state = read();
  const listeners = new Set();
  function save(next) {
    state = next;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("courses: could not save (storage blocked?)", err);
    }
    listeners.forEach((fn) => fn(state));
  }
  return {
    get: () => state,
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    isStarred: (code) => state.starred.includes(code),
    picks: (code) => state.picks[code] || [],
    isPicked: (code, group) => (state.picks[code] || []).includes(group),
    toggleStar(code) {
      const starred = state.starred.includes(code) ? state.starred.filter((c) => c !== code) : [...state.starred, code];
      // Unstarring a course drops its picks too, so the schedule never shows a course that isn't "mine".
      const picks = starred.includes(code) ? state.picks : Object.fromEntries(Object.entries(state.picks).filter(([c]) => c !== code));
      save({ ...state, starred, picks });
    },
    /**
     * Picking a group stars its course. `replaces` are the course's other groups of the same type and
     * semester: a student takes one lecture group and one exercise group, so a new pick replaces them.
     */
    togglePick(code, group, replaces = []) {
      const current = state.picks[code] || [];
      const nextGroups = current.includes(group) ? current.filter((g) => g !== group) : [...current.filter((g) => !replaces.includes(g)), group];
      const starred = state.starred.includes(code) ? state.starred : [...state.starred, code];
      save({ ...state, starred, picks: { ...state.picks, [code]: nextGroups } });
    },
    /**
     * After a new catalog scan, drops picks whose group no longer exists and returns them as
     * [{ code, group }] so the page can say so. Remembers which scan the picks were made on.
     */
    reconcile(courses, scannedAt) {
      // An empty list means the catalog failed to load, not that every course is gone.
      if (state.scan === scannedAt || !courses.length) return [];
      const byCode = new Map(courses.map((c) => [c.code, c]));
      const dropped = [];
      const picks = Object.fromEntries(Object.entries(state.picks).map(([code, groups]) => {
        const course = byCode.get(code);
        const kept = groups.filter((g) => course && course.groups.some((x) => x.group === g));
        groups.filter((g) => !kept.includes(g)).forEach((group) => dropped.push({ code, group }));
        return [code, kept];
      }));
      const starred = state.starred.filter((code) => byCode.has(code));
      save({ ...state, starred, picks, scan: scannedAt });
      return dropped;
    },
    /**
     * Saves a schedule read by course-ai.js (an AI's answer or a backup). Its courses (and `starred`,
     * from a backup) are starred; nothing is ever unstarred. With `replace`, the current picks the import
     * covers are dropped first: `covers(code, group)` says which (this semester's, or the named courses');
     * picks it doesn't cover, like the other semester's, stay. Without `replace`, picks are only added.
     */
    importPicks(picks, { replace = true, semester = "", starred: extra = [], covers = () => true, custom: extraCustom = {} } = {}) {
      const codes = Object.keys(picks);
      const kept = Object.fromEntries(Object.entries(state.picks).map(([code, groups]) => [code, replace ? groups.filter((g) => !covers(code, g)) : groups]));
      const merged = { ...kept };
      for (const [code, groups] of Object.entries(picks)) merged[code] = [...new Set([...(merged[code] || []), ...groups])];
      const starred = [...new Set([...state.starred, ...codes, ...extra])];
      // Manual times from a backup, each checked like one typed here.
      const custom = { ...(state.custom || {}) };
      for (const [key, slots] of Object.entries(extraCustom || {})) {
        const clean = (Array.isArray(slots) ? slots : []).map(cleanSlot).filter(Boolean);
        if (clean.length) custom[key] = clean;
      }
      save({ ...state, starred, picks: merged, custom, ...(semester ? { semester } : {}) });
    },
    /** A time added by hand to a group the catalog has none for; `slots` null or [] removes it. */
    customSlots: (code, group) => (state.custom || {})[`${code}|${group}`] || [],
    setCustom(code, group, slots) {
      const key = `${code}|${group}`;
      const clean = (slots || []).map(cleanSlot).filter(Boolean);
      const custom = { ...(state.custom || {}) };
      if (clean.length) custom[key] = clean; else delete custom[key];
      save({ ...state, custom });
    },
    setYear: (year) => save({ ...state, year }),
    setSemester: (semester) => save({ ...state, semester }),
  };
}

/**
 * The courses with the times a student added by hand: a group with no time in the catalog takes its manual
 * meetings (marked custom), so the card, the week, clashes and the calendar treat it like any other.
 * Returns new objects; the catalog list is never changed.
 */
export function applyCustom(courses, custom) {
  if (!custom || !Object.keys(custom).length) return courses;
  return courses.map((course) => {
    // Only groups the catalog has no time for: once a rescan brings a real time, the catalog wins.
    const fills = (g) => custom[`${course.code}|${g.group}`] && !(g.slots || []).some((s) => s.day && s.start);
    if (!course.groups.some(fills)) return course;
    return { ...course, groups: course.groups.map((g) => (fills(g) ? { ...g, slots: custom[`${course.code}|${g.group}`], customTime: true } : g)) };
  });
}
