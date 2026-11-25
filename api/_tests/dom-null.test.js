import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

// The DOM's own insertion methods (append, replaceChildren...) turn a null or undefined argument into
// the text "null" or "undefined" on the page; only the page's el() helper skips them. This is how a stray
// "null" showed under the notices. A conditional argument to one of these calls must spread an array instead.
const DOM_INSERT = /\.(append|prepend|replaceChildren|before|after|replaceWith)\(/g;

/** The argument text of the call whose "(" is at `open`, up to its matching ")"; strings and template literals skipped. */
function callArgs(source, open) {
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      for (i += 1; i < source.length && source[i] !== ch; i += 1) if (source[i] === "\\") i += 1;
      continue;
    }
    if (ch === "(") depth += 1;
    if (ch === ")" && (depth -= 1) === 0) return source.slice(open + 1, i);
  }
  return "";
}

/** The arguments of a call split at the top level (not inside brackets), trimmed. */
function topLevelArgs(args) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < args.length; i += 1) {
    const ch = args[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      for (i += 1; i < args.length && args[i] !== ch; i += 1) if (args[i] === "\\") i += 1;
      continue;
    }
    if ("([{".includes(ch)) depth += 1;
    else if (")]}".includes(ch)) depth -= 1;
    else if (ch === "," && depth === 0) { out.push(args.slice(start, i).trim()); start = i + 1; }
  }
  out.push(args.slice(start).trim());
  return out;
}

const files = ["index.html", ...readdirSync(new URL("../../web/", import.meta.url)).filter((f) => f.endsWith(".js"))];

test("no DOM insertion call in web/ can receive null or undefined from a conditional", () => {
  const offenders = [];
  for (const file of files) {
    const source = readFileSync(new URL(`../../web/${file}`, import.meta.url), "utf8");
    for (const match of source.matchAll(DOM_INSERT)) {
      const open = match.index + match[0].length - 1;
      for (const arg of topLevelArgs(callArgs(source, open))) {
        if (/:\s*(null|undefined)$/.test(arg) || /^(null|undefined)$/.test(arg)) {
          offenders.push(`web/${file}:${source.slice(0, open).split("\n").length}: ${match[1]}(... ${arg.slice(-40)})`);
        }
      }
    }
  }
  assert.deepEqual(offenders, []);
});
