import assert from "node:assert/strict";
import { test } from "node:test";
import { facultyTracks, readTrack, saveTrack, trackAsked, TRACK_KEY, trackName } from "../../course-track.js";

const TRACKS = [{ id: "single", label: "חד-חוגי" }, { id: "cs", label: "משולב עם מדעי המחשב", short: "מדמ\"ח" }];

/** A localStorage stand-in for the tests, as a plain map. */
function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k), map };
}

test("the faculty's tracks come from the manifest the page holds; none for a faculty without them", () => {
  assert.deepEqual(facultyTracks({ tracks: TRACKS }), TRACKS);
  assert.deepEqual(facultyTracks({}), []);
  assert.deepEqual(facultyTracks(undefined), []);
  assert.equal(TRACK_KEY, "nr-track");
});

test("the choice is read only when it is one of the faculty's tracks, saved like the theme, and cleared on purpose", () => {
  globalThis.localStorage = fakeStorage();
  try {
    assert.equal(readTrack(TRACKS), "", "nothing saved yet");
    assert.equal(trackAsked(), false, "not asked yet: the page may offer the prompt once");
    saveTrack("cs");
    assert.equal(readTrack(TRACKS), "cs");
    assert.equal(trackAsked(), true);
    assert.equal(readTrack([]), "", "a faculty without tracks never has a choice");
    globalThis.localStorage.setItem(TRACK_KEY, "law");
    assert.equal(readTrack(TRACKS), "", "a saved id the faculty does not know is ignored");
    saveTrack("");
    assert.equal(globalThis.localStorage.getItem(TRACK_KEY), null, "cleared");
    assert.equal(trackAsked(), true, "dismissing counts as asked");
  } finally {
    delete globalThis.localStorage;
  }
});

test("blocked storage means no choice, no crash, and no prompt", () => {
  globalThis.localStorage = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); } };
  try {
    assert.equal(readTrack(TRACKS), "");
    assert.doesNotThrow(() => saveTrack("cs"));
    assert.equal(trackAsked(), true, "never nag when the answer could not be kept");
  } finally {
    delete globalThis.localStorage;
  }
});

test("a track's name is its label, or its short form when asked and it has one", () => {
  assert.equal(trackName(TRACKS, "single"), "חד-חוגי");
  assert.equal(trackName(TRACKS, "cs"), "משולב עם מדעי המחשב");
  assert.equal(trackName(TRACKS, "cs", { short: true }), "מדמ\"ח");
  assert.equal(trackName(TRACKS, "single", { short: true }), "חד-חוגי", "no short form: the label");
  assert.equal(trackName(TRACKS, "law"), "");
});
