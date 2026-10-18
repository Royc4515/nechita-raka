import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FACULTIES } from "../../faculties/index.js";

const read = (file) => readFileSync(new URL(`../../${file}`, import.meta.url));
const pngSize = (buf) => [buf.readUInt32BE(16), buf.readUInt32BE(20)];
const jpegSize = (buf) => {
  for (let i = 2; i < buf.length;) {
    if (buf[i] !== 0xff) { i += 1; continue; }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xc3) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error("no JPEG size");
};

test("neuro has its own icons (tab, home screen, installed app), not the shared CS brand set", () => {
  const sizes = { "favicon-32.png": 32, "apple-touch-icon.png": 180, "icon-192.png": 192, "icon-512.png": 512, "icon-maskable-512.png": 512 };
  for (const [file, size] of Object.entries(sizes)) {
    const own = read(`faculties/neuro/icons/${file}`);
    assert.deepEqual(pngSize(own), [size, size], file);
    assert.ok(!own.equals(read(`icons/${file}`)), `${file} differs from the shared one`);
  }
  assert.match(read("faculties/neuro/icons/icon.svg").toString("utf8"), /^<svg[^>]*viewBox="0 0 512 512"/);
});

test("neuro's link preview is its own image at the size the manifest declares", () => {
  const { ogImage } = FACULTIES.neuro.site;
  const own = read(`faculties/neuro/${ogImage.file}`);
  assert.deepEqual(jpegSize(own), [ogImage.width, ogImage.height]);
  assert.ok(!own.equals(read(`faculties/cs/${FACULTIES.cs.site.ogImage.file}`)), "not the CS image");
});
