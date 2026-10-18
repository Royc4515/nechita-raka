/*
  The study track a student picked, for faculties whose manifest has tracks (faculty.js, MULTI-FACULTY-PLAN.md D9):
  remembered in this browser like the theme (localStorage, never sent anywhere but the chat request), read by
  the courses page (course-browser.js) and the chat (chat.js). Storage can be blocked (private mode), so every
  read and write is guarded: the page then works for the visit, just unsaved, and never nags about choosing.
  A faculty without tracks (CS) has an empty list and no choice.
*/
export const TRACK_KEY = "nr-track";
const ASKED_KEY = "nr-track-asked";

/** The faculty's tracks ({ id, label, short? }) from faculty.js, or none. */
export function facultyTracks(faculty = globalThis.window && globalThis.window.FACULTY) {
  return faculty && Array.isArray(faculty.tracks) ? faculty.tracks : [];
}

/** The saved track id when it is one of the faculty's, else "" (no choice). */
export function readTrack(tracks = facultyTracks()) {
  if (!tracks.length) return "";
  try {
    const id = localStorage.getItem(TRACK_KEY);
    return tracks.some((t) => t.id === id) ? id : "";
  } catch {
    return "";
  }
}

/** Saves the choice ("" clears it) and remembers that the student was asked, so the first-visit prompt shows once. */
export function saveTrack(id) {
  try {
    if (id) localStorage.setItem(TRACK_KEY, id);
    else localStorage.removeItem(TRACK_KEY);
    localStorage.setItem(ASKED_KEY, "1");
  } catch {
    /* storage blocked: the choice lives for this page only */
  }
}

/** true once the student chose or dismissed the prompt; also true when storage is blocked, so the prompt never repeats. */
export function trackAsked() {
  try {
    return localStorage.getItem(ASKED_KEY) === "1";
  } catch {
    return true;
  }
}

/** The track's text for the page: its short form when it has one. */
export function trackName(tracks, id, { short = false } = {}) {
  const track = tracks.find((t) => t.id === id);
  return track ? (short && track.short) || track.label : "";
}
