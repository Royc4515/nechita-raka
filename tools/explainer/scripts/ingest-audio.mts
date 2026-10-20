// Builds src/audio-manifest.json from audio files that were made elsewhere (for example with the ElevenLabs
// connector in Claude, which returns finished MP3s but no per-character timing):
//   public/audio/lines/<line key>.mp3   one file per line, named by lineKey() (hello-01, problem-02, ...)
//   public/audio/sfx/<name>.mp3         one file per sound in src/sounds.ts
//   public/audio/music/bed.mp3          optional music bed
// Optional: a TSV of "<name>\t<url>" lines as the first argument downloads each URL to the matching path first
// (a name with a dash and two digits is a line, anything else a sound effect, "music" the bed).
// Without character timing, captions and board cues are placed proportionally along each line's real duration.
//
// Usage (from tools/explainer): node --experimental-strip-types scripts/ingest-audio.mts [urls.tsv]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENES, lineKey } from "../src/script.ts";
import { SFX } from "../src/sounds.ts";

const FPS = 30;
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");
for (const d of ["lines", "sfx", "music"]) mkdirSync(join(pub, "audio", d), { recursive: true });

const tsv = process.argv[2];
if (tsv) {
  for (const row of readFileSync(tsv, "utf8").split("\n").filter(Boolean)) {
    const [name, url] = row.split("\t");
    const rel = /-\d\d$/.test(name) ? `audio/lines/${name}.mp3` : name === "music" ? "audio/music/bed.mp3" : `audio/sfx/${name}.mp3`;
    if (existsSync(join(pub, rel))) continue;
    execFileSync("curl", ["-sSf", "-o", join(pub, rel), url]);
    console.log(`downloaded ${rel}`);
  }
}

const duration = (file: string) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());
function envelope(file: string): number[] {
  const rate = 8000, win = rate / FPS;
  const pcm = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(rate), "-f", "s16le", "-"], { maxBuffer: 1 << 28 });
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length >> 1);
  const out: number[] = [];
  // win is fractional (8000 / 30), so frame boundaries are rounded to whole samples
  for (let f = 0; Math.round(f * win) < samples.length; f++) {
    const start = Math.round(f * win), end = Math.min(Math.round((f + 1) * win), samples.length);
    let sum = 0;
    for (let j = start; j < end; j++) sum += samples[j] * samples[j];
    out.push(Math.sqrt(sum / Math.max(1, end - start)) / 32768);
  }
  const peak = Math.max(...out, 1e-6);
  return out.map((v) => Math.round(Math.min(1, v / (peak * 0.8)) * 100) / 100);
}

const manifest: Record<string, unknown> = { lines: {}, sfx: {} };
const lines = manifest.lines as Record<string, unknown>;
const sfx = manifest.sfx as Record<string, unknown>;
let missing = 0;
for (const s of SCENES) s.lines.forEach((_, i) => {
  const k = lineKey(s.id, i);
  const rel = `audio/lines/${k}.mp3`;
  if (!existsSync(join(pub, rel))) { missing++; return; }
  lines[k] = { file: rel, duration: Math.round(duration(join(pub, rel)) * 1000) / 1000, charTimes: null, env: envelope(join(pub, rel)) };
});
for (const name of Object.keys(SFX)) {
  const rel = `audio/sfx/${name}.mp3`;
  if (existsSync(join(pub, rel))) sfx[name] = { file: rel, duration: duration(join(pub, rel)) };
}
if (existsSync(join(pub, "audio/music/bed.mp3"))) manifest.music = { file: "audio/music/bed.mp3", duration: duration(join(pub, "audio/music/bed.mp3")) };
writeFileSync(join(root, "src", "audio-manifest.json"), JSON.stringify(manifest, null, 1));
console.log(`${Object.keys(lines).length} lines (${missing} missing), ${Object.keys(sfx).length} sounds, music: ${manifest.music ? "yes" : "no"}`);
