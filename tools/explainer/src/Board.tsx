import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, isCsChapter } from "./lib";
import { CHAPTERS } from "./script";
import { useTL } from "./context";
import type { SceneT } from "./timeline";
import { BOARDS } from "./boards";

export const PANEL = { x: 400, y: 128, w: 1120, h: 640 };
/** In the short the same 1120x640 board is scaled to the phone's width, under the header. */
const TALL_PANEL = { x: 36, y: 330, scale: 0.9 };

/** The chapter title card: a colored wipe that covers the board, then opens onto the next scene. */
const ChapterCard: React.FC<{ chapter: number; dur: number }> = ({ chapter, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const neuro = !isCsChapter(chapter);
  const a = neuro ? C.neuro : C.cs;
  const b = neuro ? "#8b5cf6" : "#1d8fe0";
  const open = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp", easing: Easing.bezier(0.7, 0, 0.2, 1) });
  const close = interpolate(frame, [dur - 12, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.7, 0, 0.2, 1) });
  const r = 150 * open;
  const clip = close > 0 ? `circle(${150 * (1 - close)}% at 0% 100%)` : `circle(${r}% at 100% 0%)`;
  const title = CHAPTERS[chapter];
  const words = title.title.split(" ");
  const line = interpolate(frame, [18, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.22, 1, 0.36, 1) });
  return (
    <AbsoluteFill style={{ clipPath: clip, background: `linear-gradient(135deg, ${b} 0%, ${a} 55%, #1b1446 130%)`, direction: "rtl" }}>
      {/* moving rings */}
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          position: "absolute", left: -120 + i * 60 - frame * (0.6 + i * 0.3), top: 300 - i * 140 + frame * 0.4, width: 520 + i * 160, height: 520 + i * 160,
          borderRadius: "50%", border: "2px solid rgba(255,255,255,.12)",
        }} />
      ))}
      <div style={{ position: "absolute", right: 110, top: 150, color: "#fff" }}>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 34, opacity: interpolate(frame, [6, 16], [0, 0.85], { extrapolateRight: "clamp" }), letterSpacing: 1 }}>
          פרק {chapter + 1}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", columnGap: 28, marginTop: 6, maxWidth: 900 }}>
          {words.map((w, i) => {
            const p = spring({ frame: frame - 8 - i * 4, fps, config: { damping: 13, stiffness: 120 } });
            return (
              <div key={i} style={{ overflow: "hidden", paddingBottom: 12 }}>
                <div style={{ fontFamily: FONT.display, fontWeight: 900, fontSize: title.title.length > 9 ? 124 : 150, lineHeight: 1.05, transform: `translateY(${(1 - p) * 110}%)` }}>{w}</div>
              </div>
            );
          })}
        </div>
        <div style={{ height: 8, width: 380 * line, background: "rgba(255,255,255,.9)", borderRadius: 8, marginTop: 6 }} />
        <div style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 44, marginTop: 26, opacity: interpolate(frame, [22, 34], [0, 0.95], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>{title.sub}</div>
      </div>
    </AbsoluteFill>
  );
};

/** One scene's board content, with its own enter and exit. */
const SceneBoard: React.FC<{ s: SceneT; next?: SceneT }> = ({ s, next }) => {
  const frame = useCurrentFrame(); // relative to s.boardFrom
  const { fps } = useVideoConfig();
  const Comp = BOARDS[s.board];
  const tl = useTL();
  const end = (next ? next.from : tl.total) - s.boardFrom;
  const enter = spring({ frame, fps, config: { damping: 16, stiffness: 110 } });
  const exit = interpolate(frame, [end - 10, end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  const cues = s.cues.map((c) => c - s.boardFrom);
  return (
    <AbsoluteFill
      style={{
        opacity: Math.min(1, enter * 1.6) * (1 - exit),
        transform: `translateY(${(1 - enter) * 50 - exit * 30}px) scale(${0.94 + 0.06 * enter + exit * 0.04})`,
        filter: `blur(${(1 - Math.min(1, enter)) * 10 + exit * 10}px)`,
        direction: "rtl",
      }}
    >
      {Comp ? <Comp cues={cues} dur={end} /> : null}
    </AbsoluteFill>
  );
};

export const Board: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tl = useTL();
  const tall = tl.format === "tall";
  const enter = tall ? spring({ frame, fps, config: { damping: 15, stiffness: 80 } }) : spring({ frame: frame - (tl.intro - 14), fps, config: { damping: 15, stiffness: 80 } });
  if (!tall && frame < tl.intro - 16) return null;
  const float = Math.sin(frame / 55) * 5;
  const tilt = Math.sin(frame / 90) * 0.8;
  return (
    <div
      style={{
        position: "absolute", left: tall ? TALL_PANEL.x : PANEL.x, top: tall ? TALL_PANEL.y : PANEL.y, width: PANEL.w, height: PANEL.h, transformOrigin: "0 0",
        transform: `${tall ? `scale(${TALL_PANEL.scale}) ` : ""}perspective(2400px) translateY(${float + (1 - enter) * 120}px) rotateX(${tilt}deg) scale(${0.85 + 0.15 * enter})`,
        opacity: Math.min(1, enter * 1.5),
      }}
    >
      {/* glow behind the panel */}
      <div style={{ position: "absolute", inset: -40, borderRadius: 80, background: "radial-gradient(closest-side, rgba(92,184,240,.25), transparent)", filter: "blur(30px)" }} />
      <div
        style={{
          position: "absolute", inset: 0, borderRadius: 40, overflow: "hidden",
          background: `linear-gradient(180deg, #ffffff 0%, ${C.mist} 100%)`,
          boxShadow: "0 50px 120px rgba(0,0,0,.55), 0 0 0 1.5px rgba(255,255,255,.65) inset, 0 0 0 1px rgba(255,255,255,.08)",
        }}
      >
        {tl.scenes.map((s, i) => (
          <Sequence key={s.id} from={s.boardFrom} durationInFrames={(tl.scenes[i + 1]?.from ?? tl.total) - s.boardFrom + 1} layout="none">
            <SceneBoard s={s} next={tl.scenes[i + 1]} />
          </Sequence>
        ))}
        {tl.scenes.filter((s) => s.card).map((s) => (
          <Sequence key={"card-" + s.id} from={s.card!.from} durationInFrames={s.card!.dur + 2} layout="none">
            <ChapterCard chapter={s.chapter} dur={s.card!.dur + 2} />
          </Sequence>
        ))}
        {/* glass highlight */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(115deg, rgba(255,255,255,.35) 0%, rgba(255,255,255,0) 30%)", pointerEvents: "none" }} />
      </div>
    </div>
  );
};
