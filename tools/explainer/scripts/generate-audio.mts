// Generates every sound of the video with ElevenLabs and writes src/audio-manifest.json, which the video reads.
//   - a voice per line (Eleven v3, Hebrew), with per-character timing for the captions and the board cues
//   - a talking envelope per line (loudness per video frame) that moves the character while it speaks
//   - sound effects (whoosh, pop, chime...) and one instrumental music bed
// Everything is cached in public/audio: a file that exists is not generated again, so a second run only pays
// for what changed. Delete a file to regenerate it.
//
// Usage (from tools/explainer):  ELEVENLABS_API_KEY=... npm run audio
// Voices: VOICE_NOI, VOICE_RON and VOICE_BIT choose voices from your account. Without them the script designs the voices
// from the character descriptions (Voice Design, eleven_ttv_v3), saves them to the account, and remembers them
// in public/audio/voices.json. Previews of the designed voices are saved next to it, to listen to.
// Options: --only=lines|sfx|music   --skip-music
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENES, TOUR_SCENES, captionText, lineKey, ttsText } from "../src/script.ts";
import { MUSIC, SFX } from "../src/sounds.ts";

const FPS = 30;
const API = "https://api.elevenlabs.io";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");
const audioDir = join(pub, "audio");
const args = new Set(process.argv.slice(2));
const only = [...args].find((a) => a.startsWith("--only="))?.slice(7);
const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error("ELEVENLABS_API_KEY is not set. Add it to the environment and run again.");
  process.exit(1);
}
for (const d of ["lines", "sfx", "music", "voices"]) mkdirSync(join(audioDir, d), { recursive: true });

const manifestPath = join(root, "src", "audio-manifest.json");
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
manifest.lines ??= {};
manifest.sfx ??= {};
const save = () => writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));

async function call(path: string, body: unknown, accept = "application/json") {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(API + path, {
      method: "POST",
      headers: { "xi-api-key": key!, "Content-Type": "application/json", Accept: accept },
      body: JSON.stringify(body),
    });
    if (res.ok) return res;
    const text = await res.text();
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      console.warn(`  ${res.status}, retrying in ${attempt * 5}s`);
      await new Promise((r) => setTimeout(r, attempt * 5000));
      continue;
    }
    throw new Error(`${path}: ${res.status} ${text.slice(0, 400)}`);
  }
}
const sha = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 10);
const duration = (file: string) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());

/** Loudness per video frame, 0..1, from the decoded audio. */
function envelope(file: string): number[] {
  const rate = 8000, win = rate / FPS;
  const pcm = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(rate), "-f", "s16le", "-"], { maxBuffer: 1 << 28 });
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length >> 1);
  const out: number[] = [];
  for (let i = 0; i < samples.length; i += win) {
    let sum = 0, n = 0;
    for (let j = i; j < Math.min(i + win, samples.length); j++) { sum += samples[j] * samples[j]; n++; }
    out.push(Math.sqrt(sum / Math.max(1, n)) / 32768);
  }
  const peak = Math.max(...out, 1e-6);
  return out.map((v) => Math.round(Math.min(1, v / (peak * 0.8)) * 100) / 100);
}

/* ---------- voices ---------- */
const DESCRIPTIONS = {
  bit: "A cheerful, energetic young Israeli man in his early twenties, a computer science student. Warm, playful, slightly geeky, quick friendly delivery, native Hebrew speaker, clear studio-quality narration.",
  ron: "A calm, composed young Israeli man in his early twenties, a computational brain sciences student. Lower warm voice, dry understated humor, measured clear delivery, native Hebrew speaker, clear studio-quality narration.",
  noi: "An enthusiastic, curious young Israeli woman in her early twenties, a brain sciences student. Bright, warm and expressive, smiles while she talks, native Hebrew speaker, clear studio-quality narration.",
} as const;
const SAMPLE = {
  bit: "היי, אני ביט, סטודנט שנה א' במדעי המחשב בבר־אילן. אני אוהב קפה, קוד, ובעיקר להסביר דברים מסובכים בצורה פשוטה. בואו נראה יחד איך בונים אתר שלם, צעד אחר צעד, בלי מילים מפחידות.",
  ron: "היי, אני רון, סטודנט שנה א' במדעי המוח בבר־אילן, במגמה החישובית. אני אוהב טבלאות, תה עם נענע, והסברים מסודרים. היום אני אסביר לכם בשקט ובסדר איך נבנה האתר שלנו, צעד אחר צעד, בלי מילים מסובכות.",
  noi: "היי, אני נוי, סטודנטית שנה א' במדעי המוח בבר־אילן. אני מתלהבת מכל עובדה על המוח, ושואלת המון שאלות. היום אני רוצה להבין איך בנו את האתר שלנו, ואני בטוחה שגם אתם תבינו.",
} as const;

async function voices(): Promise<Record<"bit" | "noi" | "ron", string>> {
  const file = join(audioDir, "voices.json");
  const known = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  const out = { bit: process.env.VOICE_BIT || known.bit, noi: process.env.VOICE_NOI || known.noi, ron: process.env.VOICE_RON || known.ron };
  for (const who of ["noi", "ron", "bit"] as const) {
    if (out[who]) continue;
    console.log(`Designing a voice for ${who}...`);
    const res = await call("/v1/text-to-voice/design", { voice_description: DESCRIPTIONS[who], model_id: "eleven_ttv_v3", text: SAMPLE[who], guidance_scale: 4 });
    const { previews } = (await res.json()) as { previews: { generated_voice_id: string; audio_base_64?: string; audio_base64?: string }[] };
    previews.forEach((p, i) => {
      const b64 = p.audio_base_64 ?? p.audio_base64;
      if (b64) writeFileSync(join(audioDir, "voices", `${who}-preview-${i + 1}.mp3`), Buffer.from(b64, "base64"));
    });
    const created = await call("/v1/text-to-voice", {
      voice_name: `${{ bit: "Bit", noi: "Noi", ron: "Ron" }[who]} (נחיתה רכה)`,
      voice_description: DESCRIPTIONS[who],
      generated_voice_id: previews[0].generated_voice_id,
    });
    out[who] = ((await created.json()) as { voice_id: string }).voice_id;
    console.log(`  saved as ${out[who]} (previews in public/audio/voices/; set VOICE_${who.toUpperCase()} to use another)`);
  }
  writeFileSync(file, JSON.stringify(out, null, 1));
  return out;
}

/* ---------- lines ---------- */
async function lines() {
  const v = await voices();
  manifest.voices = v;
  const all = [...SCENES, ...TOUR_SCENES].flatMap((s) => s.lines.map((l, i) => ({ scene: s, l, i })));
  for (const [n, { scene, l, i }] of all.entries()) {
    const k = lineKey(scene.id, i);
    const text = ttsText(l.text);
    const id = `${k}-${sha([v[l.who], text].join("|"))}`;
    const file = join(audioDir, "lines", `${id}.mp3`);
    const rel = `audio/lines/${id}.mp3`;
    if (manifest.lines[k]?.file === rel && existsSync(file)) continue;
    console.log(`[${n + 1}/${all.length}] ${k} (${l.who})`);
    const prev = all[n - 1]?.l, next = all[n + 1]?.l;
    const res = await call(`/v1/text-to-speech/${v[l.who]}/with-timestamps?output_format=mp3_44100_128`, {
      text,
      model_id: "eleven_v3",
      language_code: "he",
      voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true },
      previous_text: prev ? ttsText(prev.text) : undefined,
      next_text: next ? ttsText(next.text) : undefined,
    });
    const j = (await res.json()) as { audio_base64: string; alignment?: { characters: string[]; character_start_times_seconds: number[] } };
    writeFileSync(file, Buffer.from(j.audio_base64, "base64"));
    // Per-character start times for the caption text (the acting tags at the start are not in the captions).
    const cap = captionText(l.text);
    const chars = j.alignment?.characters ?? [];
    const starts = j.alignment?.character_start_times_seconds ?? [];
    const offset = text.length - cap.length;
    const charTimes = chars.length === text.length ? starts.slice(offset).map((t) => Math.round(t * 100) / 100) : null;
    manifest.lines[k] = { file: rel, duration: Math.round(duration(file) * 1000) / 1000, charTimes, env: envelope(file) };
    save();
  }
}

/* ---------- sound effects and music ---------- */
async function sfx() {
  for (const [name, s] of Object.entries(SFX)) {
    const rel = `audio/sfx/${name}-${sha(s.prompt + s.seconds)}.mp3`;
    const file = join(pub, rel);
    if (manifest.sfx[name]?.file === rel && existsSync(file)) continue;
    console.log(`sfx ${name}`);
    const res = await call("/v1/sound-generation", { text: s.prompt, duration_seconds: s.seconds, prompt_influence: 0.6, model_id: "eleven_text_to_sound_v2" }, "audio/mpeg");
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    manifest.sfx[name] = { file: rel, duration: duration(file) };
    save();
  }
}
async function music() {
  const rel = `audio/music/bed-${sha(MUSIC.prompt + MUSIC.seconds)}.mp3`;
  const file = join(pub, rel);
  if (manifest.music?.file === rel && existsSync(file)) return;
  console.log("music (this one takes a minute)");
  const res = await call("/v1/music", { prompt: MUSIC.prompt, music_length_ms: MUSIC.seconds * 1000, force_instrumental: true }, "audio/mpeg");
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  manifest.music = { file: rel, duration: duration(file) };
  save();
}

try {
  if (!only || only === "lines") await lines();
  if (!only || only === "sfx") await sfx();
  if ((!only || only === "music") && !args.has("--skip-music")) {
    try { await music(); } catch (e) { console.warn(`Music failed (${String(e).slice(0, 200)}). The video works without it; run with --only=music to retry.`); }
  }
  save();
  console.log("Done. Preview with: npm run studio   Render with: npm run render");
} catch (e) {
  save();
  console.error(String(e));
  process.exit(1);
}
