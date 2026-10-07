// Copies only what the browser needs into public/, which is all Vercel serves.
// Everything else (api/ source, tests, scripts, README) stays private; the chat function is
// built from api/ separately.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";

const OUT = "public";
const FILES = [
  "index.html",
  "data.js",
  "chat.js",
  "chat.css",
  "peek.js",
  "manifest.webmanifest",
  "robots.txt",
  "biu-5787.ics",
  "assets",
  "icons",
];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
for (const file of FILES) {
  if (!existsSync(file)) throw new Error(`build-public: ${file} is missing`);
  cpSync(file, `${OUT}/${file}`, { recursive: true });
}
console.log(`build-public: copied ${FILES.length} entries to ${OUT}/`);
