import manifest from "./audio-manifest.json";
import { SCENES, captionText, cueOffsets, lineKey, type Line, type Who } from "./script";

export const FPS = 30;
const S = (sec: number) => Math.round(sec * FPS);

export const INTRO = S(5.2);
const CHAPTER_CARD = S(2.3);
const SCENE_LEAD = S(0.45);
const SCENE_TAIL = S(0.55);
const GAP_SWITCH = S(0.28);
const GAP_SAME = S(0.38);
export const OUTRO_TAIL = S(4.5);

type LineAudio = { file: string; duration: number; charTimes: number[] | null; env: number[] };
type Manifest = {
  lines?: Record<string, LineAudio>;
  music?: { file: string; duration: number };
  sfx?: Record<string, { file: string; duration: number }>;
};
export const AUDIO = manifest as Manifest;

export type Chunk = { text: string; from: number; to: number; wordStarts: number[] };
export type LineT = Line & {
  key: string;
  scene: number;
  from: number;
  dur: number;
  caption: string;
  audio?: string;
  env: number[];
  cues: number[];
  chunks: Chunk[];
};
export type SceneT = { id: string; board: string; chapter: number; from: number; end: number; boardFrom: number; cues: number[]; card?: { from: number; dur: number } };

/** Hebrew speech runs at roughly 13 characters a second; used until the real audio exists. */
const estimate = (caption: string) => caption.length / 13 + 0.35;

/** Synthetic talking envelope (until real audio exists): syllable-like bumps with pauses at punctuation. */
function fakeEnv(caption: string, frames: number): number[] {
  const out: number[] = [];
  for (let f = 0; f < frames; f++) {
    const ci = Math.floor((f / frames) * caption.length);
    const ch = caption[ci] ?? " ";
    const pause = /[,.?!:]/.test(ch) ? 0.15 : 1;
    const v = (0.55 + 0.45 * Math.sin(f * 1.9) * Math.sin(f * 0.53 + 1)) * pause;
    out.push(Math.max(0, Math.round(v * 100) / 100));
  }
  return out;
}

/** Split a caption into readable chunks (at most ~62 characters), preferring punctuation. */
function splitCaption(text: string): { text: string; start: number }[] {
  const words = text.split(" ");
  const chunks: { text: string; start: number }[] = [];
  let cur: string[] = [], start = 0, pos = 0;
  words.forEach((w, i) => {
    const next = [...cur, w].join(" ");
    if (cur.length && next.length > 62) { chunks.push({ text: cur.join(" "), start }); cur = []; start = pos; }
    cur.push(w);
    pos += w.length + 1;
    const punct = /[,.?!:]$/.test(w) && cur.join(" ").length > 34 && i < words.length - 1;
    if (punct) { chunks.push({ text: cur.join(" "), start }); cur = []; start = pos; }
  });
  if (cur.length) {
    // A short tail ("ועוד.") reads better glued to the chunk before it.
    const tail = cur.join(" ");
    if (chunks.length && tail.length < 14) chunks[chunks.length - 1].text += " " + tail;
    else chunks.push({ text: tail, start });
  }
  return chunks;
}

function build() {
  const lines: LineT[] = [];
  const scenes: SceneT[] = [];
  let t = INTRO;
  let chapter = -1;
  SCENES.forEach((sc, si) => {
    let card: SceneT["card"];
    if (sc.chapter !== chapter && si > 0) {
      card = { from: t, dur: CHAPTER_CARD };
      t += CHAPTER_CARD;
    }
    chapter = sc.chapter;
    const from = card ? card.from : t;
    const boardFrom = t;
    t += SCENE_LEAD;
    const sceneCues: number[] = [];
    sc.lines.forEach((l, li) => {
      const key = lineKey(sc.id, li);
      const caption = captionText(l.text);
      const a = AUDIO.lines?.[key];
      const sec = a ? a.duration : estimate(caption);
      const dur = Math.max(S(0.8), Math.round(sec * FPS));
      const timeOf = (charIndex: number) => {
        const ct = a?.charTimes;
        const s = ct && ct.length ? ct[Math.min(charIndex, ct.length - 1)] : (charIndex / Math.max(1, caption.length)) * sec * 0.96;
        return t + Math.round(s * FPS);
      };
      const cues = cueOffsets(l.text).map(timeOf);
      sceneCues.push(...cues);
      const raw = splitCaption(caption);
      const chunks: Chunk[] = raw.map((c, k) => {
        const wordStarts: number[] = [];
        let p = c.start;
        for (const w of c.text.split(" ")) { wordStarts.push(timeOf(p)); p += w.length + 1; }
        return { text: c.text, from: k === 0 ? t : timeOf(c.start), to: k === raw.length - 1 ? t + dur : timeOf(raw[k + 1].start), wordStarts };
      });
      lines.push({ ...l, key, scene: si, from: t, dur, caption, audio: a?.file, env: a?.env ?? fakeEnv(caption, dur), cues, chunks });
      t += dur;
      const next = sc.lines[li + 1];
      if (next) t += next.who === l.who ? GAP_SAME : GAP_SWITCH;
    });
    t += SCENE_TAIL;
    scenes.push({ id: sc.id, board: sc.board, chapter: sc.chapter, from, end: t, boardFrom, cues: sceneCues, card });
  });
  const total = t + OUTRO_TAIL;
  scenes[scenes.length - 1].end = total;
  return { lines, scenes, total };
}

export const TL = build();

export function lineAt(frame: number): LineT | undefined {
  return TL.lines.find((l) => frame >= l.from && frame < l.from + l.dur);
}
/** The last line a character said at or before this frame (for its pose), or undefined. */
export function lastLineOf(who: Who, frame: number): LineT | undefined {
  let found: LineT | undefined;
  for (const l of TL.lines) { if (l.who === who && l.from <= frame) found = l; }
  return found;
}
export const speaking = (frame: number) => TL.lines.some((l) => frame >= l.from && frame < l.from + l.dur);
