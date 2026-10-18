/*
  A course's years and tracks from its yearbook categories, shared by the server (api/_lib/courses/model.js,
  the chat) and the courses page (course-browser.js, course-card.js). Pure functions, no DOM and no files.

  Two id shapes (MULTI-FACULTY-PLAN.md D9): a plain year, "1", "2", "3" (the CS yearbook), and a track
  with a year, "<track>:<year>" (the brain sciences yearbook: "cs:1", "single-comp:1"). Anything else
  ("cluster1", "ai") is a pool, not a year.
*/
const PLAIN_YEAR = /^[123]$/;
const TRACK_YEAR = /^([a-z][a-z0-9-]*):([123])$/;

/** The track of a "<track>:<year>" id, or "" for a plain year or a pool. */
export function trackOf(id) {
  const m = TRACK_YEAR.exec(String(id ?? ""));
  return m ? m[1] : "";
}

/** The year (1-3) of a plain year id or a "<track>:<year>" id, or null for a pool. */
export function yearOfId(id) {
  const text = String(id ?? "");
  if (PLAIN_YEAR.test(text)) return Number(text);
  const m = TRACK_YEAR.exec(text);
  return m ? Number(m[2]) : null;
}

/** The distinct tracks the categories name, in their order ("cs:1", "cs:2", "single:1" -> ["cs", "single"]). */
export function tracksOf(categories) {
  return [...new Set((categories || []).map(trackOf).filter(Boolean))];
}

/**
 * The course's years, sorted and unique. With a track, only the years of that track's categories;
 * without, every year the categories name, plain ids and track ids alike.
 */
export function yearsOf(categories, track = "") {
  const years = (categories || [])
    .filter((id) => (track ? trackOf(id) === track : true))
    .map(yearOfId)
    .filter((year) => year !== null);
  return [...new Set(years)].sort((a, b) => a - b);
}

/** The course's one year when the categories (of the track, when given) agree on it, else null. */
export function yearOf(categories, track = "") {
  const years = yearsOf(categories, track);
  return years.length === 1 ? years[0] : null;
}

/** true when the course is in the track (any "<track>:<year>" category); every course matches the empty track. */
export function inTrack(categories, track) {
  return !track || (categories || []).some((id) => trackOf(id) === track);
}
