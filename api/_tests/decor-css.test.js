import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FACULTIES } from "../../faculties/index.js";
import { withDecorCss } from "../../scripts/prerender.mjs";

const template = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const START = "/* decor:start */";
const END = "/* decor:end */";
const block = template.slice(template.indexOf(START), template.indexOf(END));
const eol = template.includes("\r\n") ? "\r\n" : "\n";

test("a faculty without decor gets a page without the decor rules, and nothing else changes", () => {
  const html = withDecorCss(template, FACULTIES.cs.decor);
  assert.ok(!/data-decor-|decor:start|decor:end|assets\/decor\//.test(html), "no decor rule or marker is left");
  assert.equal(html.length, template.length - block.length - (END + eol).length);
  assert.ok(html.includes("/* ---------- Navigation ---------- */") && html.includes('.tile.hero-tile::before { content: "{ }"'), "the rules around the block stay");
});

test("a faculty with decor keeps every rule; only the two marker comments go", () => {
  const html = withDecorCss(template, FACULTIES.neuro.decor);
  assert.ok(!/decor:start|decor:end/.test(html));
  assert.equal(html.length, template.length - (START + eol).length - (END + eol).length);
  for (const place of Object.keys(FACULTIES.neuro.decor)) assert.ok(html.includes(`data-decor-${place}=`), `the ${place} rule is kept`);
});

test("the template has exactly one decor block, and a missing or doubled one fails the build", () => {
  assert.throws(() => withDecorCss("<html></html>", {}), /exactly one/);
  assert.throws(() => withDecorCss(`${template}${eol}${START}${eol}${END}${eol}`, {}), /exactly one/);
});

test("the brain backdrop is clipped at the header, so it adds no sideways scroll at tablet widths", () => {
  assert.match(block, /@media \(min-width: 768px\) \{[^\n]*:root\[data-decor-backdrop="brain"\] \.site-header \{ overflow-x: clip; \}/);
});
