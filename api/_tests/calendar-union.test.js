import { test } from "node:test";
import assert from "node:assert/strict";
import { loadContent, readScript } from "../../faculties/content.js";
import { FACULTIES } from "../../faculties/index.js";

const { cs, neuro } = FACULTIES;
const isCsEvent = (ev) => /^בחינה:/.test(ev.title) || /מפגש פתיחת שנה במחלקה למדעי המחשב/.test(ev.title);

test("the shared calendar holds only the university's dates, the CS opening and exams are in the CS file", () => {
  const shared = readScript("shared/data.js", "SITE_DATA").calendar.events;
  const own = readScript("faculties/cs/data.js", "SITE_DATA").calendar.events;
  assert.equal(shared.filter(isCsEvent).length, 0);
  assert.equal(own.length, 17);
  assert.ok(own.every(isCsEvent));
});

test("CS shows the 17 CS events merged into the shared calendar, sorted by date; neuro shows none of them", () => {
  const csEvents = loadContent(cs).calendar.events;
  const neuroEvents = loadContent(neuro).calendar.events;
  assert.equal(csEvents.filter(isCsEvent).length, 17);
  assert.equal(neuroEvents.filter(isCsEvent).length, 0);
  assert.equal(csEvents.length, neuroEvents.length + 17, "the two calendars differ by exactly the CS events");
  for (const events of [csEvents, neuroEvents]) {
    assert.deepEqual(events.map((e) => e.date), events.map((e) => e.date).sort(), "sorted by date");
  }
  assert.ok(neuroEvents.every((e) => !/503|forms\.gle/.test(`${e.note || ""}${e.link ? e.link.url : ""}`)), "no CS room or form on neuro");
});

test("the terms and the first events are the same on both builds (the university's year)", () => {
  assert.equal(JSON.stringify(loadContent(cs).calendar.terms), JSON.stringify(loadContent(neuro).calendar.terms));
  assert.equal(loadContent(neuro).calendar.events[0].title, "יום ראשון ללימודים");
});
