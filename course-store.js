/*
  "My courses": the courses a student starred and the groups they picked, kept in this browser only
  (localStorage, like the guides' checkboxes). Nothing is sent anywhere. Storage can be blocked
  (private mode), so every read and write is guarded and the page works without it, just unsaved.
*/
const KEY = "nr-courses";

const EMPTY = { starred: [], picks: {}, year: "all" };
const strings = (list) => (Array.isArray(list) ? list.filter((x) => typeof x === "string") : []);

/** Saved state, cleaned: anything malformed (an old version, a hand edit) is dropped, never trusted. */
function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!raw || typeof raw !== "object") return EMPTY;
    const picks = raw.picks && typeof raw.picks === "object" && !Array.isArray(raw.picks)
      ? Object.fromEntries(Object.entries(raw.picks).map(([code, groups]) => [code, strings(groups)]))
      : {};
    return {
      starred: strings(raw.starred),
      picks,
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
    setYear: (year) => save({ ...state, year }),
    setSemester: (semester) => save({ ...state, semester }),
  };
}
