// The calendar file a student adds to their phone (public/<calendar.file>, "biu-5787.ics"), made per faculty.
//
// It used to be one hand-written file, the same on every build. Now it is assembled from two fragments of VEVENT
// blocks, like the site's content: shared/calendar.ics (the university's dates) and faculties/<id>/calendar.ics (the
// faculty's own, optional), under a header whose PRODID and calendar name come from the manifest (calendar.prodId,
// calendar.name). The UIDs say {uidDomain} in the fragments, filled from calendar.uidDomain, so a faculty's file
// never carries another faculty's name. The CS output is byte-identical to the file this replaced (api/_tests/calendar-ics.test.js).
//
// Fragment format: VEVENT blocks one after the other. A line `#after <uid>` before a block places it right after the
// block whose UID starts with <uid> (the shared block, in the merged file); a block without it goes to the end.
// Lines are joined with CRLF, as the format requires, whatever the fragment files hold.
import { existsSync, readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const CRLF = "\r\n";
const MAX_OCTETS = 75;
const fail = (what) => { throw new Error(`calendar-ics: ${what}`); };

/** Folds a content line at 75 octets without cutting a UTF-8 character (RFC 5545 3.1); a short line is returned as is. */
export function foldLine(line) {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= MAX_OCTETS) return line;
  const parts = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const width = encoder.encode(char).length;
    // The continuation lines start with a space, which counts toward their 75 octets.
    const limit = parts.length ? MAX_OCTETS - 1 : MAX_OCTETS;
    if (size + width > limit) { parts.push(current); current = ""; size = 0; }
    current += char;
    size += width;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

/** The blocks of a fragment: { after: uid prefix or null, lines: ["BEGIN:VEVENT", ..., "END:VEVENT"] }. */
export function parseFragment(text, where = "fragment") {
  const blocks = [];
  let after = null;
  let lines = null;
  for (const line of text.split(/\r?\n/)) {
    if (lines === null) {
      if (line.startsWith("#after ")) after = line.slice("#after ".length).trim();
      else if (line === "BEGIN:VEVENT") lines = [line];
      else if (line.trim() !== "") fail(`${where}: unexpected line outside a VEVENT: ${JSON.stringify(line)}`);
    } else {
      lines.push(line);
      if (line === "END:VEVENT") { blocks.push({ after, lines }); after = null; lines = null; }
    }
  }
  if (lines !== null || after !== null) fail(`${where}: ends inside a VEVENT or after a #after line with no block`);
  return blocks;
}

const uidOf = (block) => {
  const line = block.lines.find((l) => l.startsWith("UID:"));
  return line ? line.slice(4) : fail("a VEVENT has no UID");
};

/** The shared blocks with the faculty's blocks placed by their `#after` line, or at the end. */
export function mergeBlocks(shared, own) {
  const merged = shared.map((block) => ({ block, extras: [] }));
  const tail = [];
  for (const block of own) {
    if (block.after === null) { tail.push(block); continue; }
    const at = merged.findIndex(({ block: b }) => uidOf(b).startsWith(block.after));
    if (at < 0) fail(`a faculty block says #after ${block.after}, but no shared block has a UID starting so`);
    merged[at].extras.push(block);
  }
  return [...merged.flatMap(({ block, extras }) => [block, ...extras]), ...tail];
}

/** A TEXT value as RFC 5545 writes it: backslash, semicolon and comma are escaped. */
export const escapeText = (text) => text.replace(/[\\;,]/g, (c) => `\\${c}`);

/** The text of the .ics: the header for `calendar` (the manifest's calendar block), then the merged blocks. */
export function buildIcs(calendar, sharedText, ownText = "") {
  const blocks = mergeBlocks(parseFragment(sharedText, "shared/calendar.ics"), parseFragment(ownText, "the faculty's calendar.ics"));
  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${calendar.prodId}//Academic Calendar 5787//HE`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldLine(`X-WR-CALNAME:${escapeText(calendar.name)}`),
    "X-WR-TIMEZONE:Asia/Jerusalem",
  ];
  const body = blocks.flatMap((block) => block.lines.map((line) => line.replaceAll("{uidDomain}", calendar.uidDomain)));
  const uids = body.filter((l) => l.startsWith("UID:"));
  const twice = uids.find((uid, i) => uids.indexOf(uid) !== i);
  if (twice) fail(`the UID ${twice} appears twice`);
  return [...header, ...body, "END:VCALENDAR", ""].join(CRLF);
}

const read = (file) => readFileSync(new URL(file, ROOT), "utf8");

/** The calendar file of a faculty (its manifest), read from shared/calendar.ics and faculties/<id>/calendar.ics. */
export function loadIcs(faculty) {
  const own = `faculties/${faculty.id}/calendar.ics`;
  return buildIcs(faculty.calendar, read("shared/calendar.ics"), existsSync(new URL(own, ROOT)) ? read(own) : "");
}
