import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

// The page's own scripts have no tests of their own; a syntax error in one of them breaks the site
// (or the chat) for everyone, so at least make sure each one parses.
const SCRIPTS = ["chat.js", "peek.js", "track.js", "admin.js"];

for (const file of SCRIPTS) {
  test(`${file} parses`, () => {
    assert.doesNotThrow(() => execFileSync(process.execPath, ["--check", file], { stdio: "pipe" }));
  });
}
