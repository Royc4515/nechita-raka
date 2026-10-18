import assert from "node:assert/strict";
import { test } from "node:test";
import { inTrack, trackOf, tracksOf, yearOf, yearOfId, yearsOf } from "../../course-years.js";

test("a plain year id and a track:year id both give a year; pools give none", () => {
  assert.equal(yearOfId("1"), 1);
  assert.equal(yearOfId("3"), 3);
  assert.equal(yearOfId("cs:1"), 1);
  assert.equal(yearOfId("single-comp:1"), 1);
  assert.equal(yearOfId("psychology:2"), 2);
  assert.equal(yearOfId("cluster1"), null);
  assert.equal(yearOfId("ai"), null);
  assert.equal(yearOfId("4"), null);
  assert.equal(yearOfId("cs:4"), null);
  assert.equal(yearOfId("CS:1"), null);
  assert.equal(yearOfId(undefined), null);
});

test("the track of an id is the part before the colon, and only for track:year ids", () => {
  assert.equal(trackOf("cs:1"), "cs");
  assert.equal(trackOf("single-comp:1"), "single-comp");
  assert.equal(trackOf("1"), "");
  assert.equal(trackOf("cluster1"), "");
  assert.deepEqual(tracksOf(["cs:1", "cs:2", "single:1", "psychology:1"]), ["cs", "single", "psychology"]);
  assert.deepEqual(tracksOf(["1", "cluster2"]), []);
  assert.deepEqual(tracksOf([]), []);
});

test("CS ids keep working: the year list is the course's year, pools give none", () => {
  assert.deepEqual(yearsOf(["1"]), [1]);
  assert.equal(yearOf(["1"]), 1);
  assert.equal(yearOf(["2"]), 2);
  assert.deepEqual(yearsOf(["cluster2", "ai"]), []);
  assert.equal(yearOf(["cluster2", "ai"]), null);
  assert.equal(yearOf([]), null);
  assert.equal(yearOf(undefined), null);
});

test("track:year ids give the set of years without a track, and the chosen track's year with one", () => {
  const categories = ["cs:1", "single:1", "psychology:2", "biology:2"];
  assert.deepEqual(yearsOf(categories), [1, 2]);
  assert.equal(yearOf(categories), null, "two years: no single year");
  assert.deepEqual(yearsOf(categories, "cs"), [1]);
  assert.equal(yearOf(categories, "cs"), 1);
  assert.equal(yearOf(categories, "psychology"), 2);
  assert.deepEqual(yearsOf(categories, "physics"), [], "not in that track");
  assert.equal(yearOf(categories, "physics"), null);
  assert.equal(yearOf(["cs:1", "single:1", "psychology:1"]), 1, "every track agrees: one year");
});

test("a course is in a track when any of its categories names it; the empty track matches everything", () => {
  assert.equal(inTrack(["cs:1", "single:1"], "cs"), true);
  assert.equal(inTrack(["cs:1", "single:1"], "biology"), false);
  assert.equal(inTrack(["1"], "cs"), false);
  assert.equal(inTrack(["1"], ""), true);
  assert.equal(inTrack([], ""), true);
  assert.equal(inTrack([], "cs"), false);
});
