import React from "react";
import { Audio, Sequence, interpolate, staticFile } from "remotion";
import { BOARD_SFX } from "./boards";
import type { SfxName } from "./sounds";
import { useTL } from "./context";
import { AUDIO, type Timeline } from "./timeline";

type Hit = { at: number; name: SfxName; volume: number };

/** Every sound effect in the video, placed from the timeline. */
function hits(tl: Timeline): Hit[] {
  const out: Hit[] = tl.format === "wide" ? [{ at: 0, name: "riser", volume: 0.45 }, { at: 30, name: "logo", volume: 0.6 }] : [];
  tl.scenes.forEach((s, i) => {
    if (s.card) out.push({ at: s.card.from, name: "whoosh", volume: 0.55 });
    else if (i > 0) out.push({ at: s.boardFrom - 4, name: "swoosh", volume: 0.4 });
    const map = BOARD_SFX[s.board] ?? [];
    s.cues.forEach((c, k) => {
      const name = map[k] ?? "pop";
      if (name) out.push({ at: c, name, volume: name === "pop" ? 0.32 : 0.45 });
    });
  });
  tl.lines.forEach((l) => { if (l.term) out.push({ at: (l.cues[0] ?? l.from) - 2, name: "chime", volume: 0.4 }); });
  return out;
}

export const Sound: React.FC = () => {
  const tl = useTL();
  const sfx = AUDIO.sfx ?? {};
  const music = AUDIO.music;
  // Music: up at the start and between lines, down under the voices, fading out at the end.
  const talkWindows = tl.lines.map((l) => [l.from - 6, l.from + l.dur + 4] as const);
  const musicVolume = (f: number) => {
    const fadeIn = interpolate(f, [0, 45], [0, 1], { extrapolateRight: "clamp" });
    const fadeOut = interpolate(f, [tl.total - 90, tl.total], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    let duck = 0;
    for (const [a, b] of talkWindows) {
      duck = Math.max(duck, interpolate(f, [a - 8, a, b, b + 12], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    }
    return (0.32 - duck * 0.22) * fadeIn * fadeOut;
  };
  return (
    <>
      {music && <Audio src={staticFile(music.file)} loop volume={musicVolume} />}
      {tl.lines.filter((l) => l.audio).map((l) => (
        <Sequence key={l.key} from={l.from} durationInFrames={l.dur + 15} layout="none">
          <Audio src={staticFile(l.audio!)} volume={1} />
        </Sequence>
      ))}
      {hits(tl).filter((h) => sfx[h.name]).map((h, i) => (
        <Sequence key={i} from={Math.max(0, h.at)} durationInFrames={Math.ceil(sfx[h.name].duration * 30) + 2} layout="none">
          <Audio src={staticFile(sfx[h.name].file)} volume={h.volume} />
        </Sequence>
      ))}
    </>
  );
};
