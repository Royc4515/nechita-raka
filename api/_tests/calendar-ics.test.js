import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { loadContent } from "../../faculties/content.js";
import { FACULTIES, validateFaculty } from "../../faculties/index.js";
import { buildIcs, foldLine, loadIcs, mergeBlocks, parseFragment } from "../../scripts/calendar-ics.mjs";
import { withCalendarFile } from "../../scripts/prerender.mjs";

const { cs, neuro } = FACULTIES;
// The sha256 of the hand-written biu-5787.ics this generator replaced (faculty PR 6g): the CS file must not change by a byte.
const CS_ICS_SHA256 = "349dc81621dcf66b63c21dc16e05a6b32f74cab470b1bb1014c732386ca67355";
const sha = (text) => createHash("sha256").update(text, "utf8").digest("hex");
const events = (ics) => ics.split("\r\n").filter((l) => l === "BEGIN:VEVENT").length;
const block = (uid, extra = []) => ["BEGIN:VEVENT", `UID:${uid}`, ...extra, "END:VEVENT"].join("\r\n") + "\r\n";

// ---------- the generator ----------

test("the CS calendar file is byte-identical to the hand-written file it replaced", () => {
  const ics = loadIcs(cs);
  assert.equal(sha(ics), CS_ICS_SHA256);
  assert.equal(events(ics), 43);
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//BIU CS Year 1//"), "CS keeps its producer name");
  assert.ok(ics.endsWith("END:VEVENT\r\nEND:VCALENDAR\r\n"));
});

test("the neuro calendar file has its own name and producer, the university's dates and nothing of CS", () => {
  const ics = loadIcs(neuro);
  assert.match(ics, /PRODID:-\/\/BIU Brain Sciences\/\//);
  assert.match(ics.replaceAll("\r\n ", ""), /X-WR-CALNAME:בר אילן - לוח אקדמי תשפ"ז\\, מדעי המוח/);
  assert.equal(events(ics), 26, "the 26 university-wide events, none of CS's 17");
  assert.ok(!/BIU CS|biu-cs|exam-|cs-year-opening|בחינה:|למדעי המחשב|503|forms\.gle/.test(ics), "no CS wording in the neuro file");
  assert.ok(ics.includes("@biu-neuro-5787"), "UIDs carry the faculty's own suffix");
  assert.ok(!ics.includes("{uidDomain}"), "every placeholder is filled");
});

test("the calendar file's address comes from the manifest, in the content and in index.html", () => {
  assert.equal(loadContent(cs).calendar.file, "./biu-5787.ics");
  assert.equal(loadContent({ ...neuro, calendar: { ...neuro.calendar, file: "neuro-cal.ics" } }).calendar.file, "./neuro-cal.ics");
  const html = `<a id="ics-link" href="./biu-5787.ics"></a><script>link.setAttribute("download", "biu-5787.ics")</script>`;
  assert.equal(withCalendarFile(html, "biu-5787.ics"), html, "the default name changes nothing");
  assert.equal(withCalendarFile(html, "x.ics"), `<a id="ics-link" href="./x.ics"></a><script>link.setAttribute("download", "x.ics")</script>`);
});

test("the manifest's calendar block is validated", () => {
  const bad = (change) => validateFaculty({ ...structuredClone(cs), calendar: { ...cs.calendar, ...change } });
  assert.throws(() => validateFaculty({ ...structuredClone(cs), calendar: undefined }), /calendar is missing/);
  assert.throws(() => bad({ file: "../x.ics" }), /calendar.file/);
  assert.throws(() => bad({ file: "x.txt" }), /calendar.file/);
  assert.throws(() => bad({ prodId: "a//b\nX:y" }), /calendar.prodId/);
  assert.throws(() => bad({ name: "a\r\nb" }), /calendar.name/);
  assert.throws(() => bad({ uidDomain: "a b@c" }), /calendar.uidDomain/);
});

// ---------- the pieces ----------

test("a faculty block goes after the shared block its #after names, else to the end", () => {
  const shared = block("a@{uidDomain}") + block("b@{uidDomain}") + block("c@{uidDomain}");
  const own = `#after b\r\n${block("own-1@{uidDomain}")}${block("own-2@{uidDomain}")}`;
  const ics = buildIcs({ prodId: "P", name: "N", uidDomain: "d" }, shared, own);
  assert.deepEqual(ics.split("\r\n").filter((l) => l.startsWith("UID:")), ["UID:a@d", "UID:b@d", "UID:own-1@d", "UID:c@d", "UID:own-2@d"]);
  assert.throws(() => mergeBlocks(parseFragment(shared), parseFragment(`#after nope\r\n${block("x")}`)), /no shared block/);
});

test("a fragment with stray text, a cut-off block or a repeated UID is rejected", () => {
  assert.throws(() => parseFragment("hello\r\n"), /unexpected line/);
  assert.throws(() => parseFragment("BEGIN:VEVENT\r\nUID:x\r\n"), /ends inside/);
  assert.throws(() => parseFragment("#after x\r\n"), /ends inside/);
  assert.throws(() => buildIcs({ prodId: "P", name: "N", uidDomain: "d" }, block("a") + block("a")), /appears twice/);
  assert.equal(parseFragment("").length, 0, "an empty fragment is fine");
  assert.equal(parseFragment(block("a").replaceAll("\r\n", "\n")).length, 1, "LF fragments are read too, the output is always CRLF");
});

test("long lines fold at 75 octets without cutting a character, and unfold back", () => {
  const long = `X-WR-CALNAME:${"בר אילן ".repeat(12)}`;
  const folded = foldLine(long);
  const lines = folded.split("\r\n");
  assert.ok(lines.length > 1 && lines.slice(1).every((l) => l.startsWith(" ")));
  assert.ok(lines.every((l) => new TextEncoder().encode(l).length <= 75));
  assert.equal(folded.replace(/\r\n /g, ""), long);
  assert.equal(foldLine("SHORT:line"), "SHORT:line");
});
