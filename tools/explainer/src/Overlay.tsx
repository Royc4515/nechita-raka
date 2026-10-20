import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, Icon, SPEAKER, img, isCsChapter } from "./lib";
import { CHAPTERS } from "./script";
import { useTL } from "./context";
import { lineAt } from "./timeline";

/** Captions: the current chunk of the current line, word by word. */
export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tl = useTL();
  const tall = tl.format === "tall";
  const l = lineAt(tl, frame) ?? lineAt(tl, frame - 6);
  if (!l || frame < tl.intro) return null;
  const chunk = l.chunks.find((c) => frame >= c.from && frame < c.to) ?? (frame >= l.from + l.dur ? l.chunks[l.chunks.length - 1] : l.chunks[0]);
  const sp = SPEAKER[l.who];
  const inP = spring({ frame: frame - chunk.from, fps, config: { damping: 18, stiffness: 160 } });
  const outP = interpolate(frame, [l.from + l.dur, l.from + l.dur + 6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const words = chunk.text.split(" ");
  return (
    <div style={{ position: "absolute", ...(tall ? { left: 40, right: 40, top: 945 } : { left: 470, right: 470, bottom: 44 }), display: "flex", justifyContent: "center", direction: "rtl", opacity: outP }}>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 18, padding: "18px 30px", borderRadius: 26, maxWidth: 980,
          background: "rgba(8,13,28,.72)", border: `1.5px solid ${sp.color}55`, boxShadow: "0 20px 50px rgba(0,0,0,.45)",
          backdropFilter: "blur(14px)", transform: `translateY(${(1 - inP) * 16}px)`, opacity: Math.min(1, inP * 1.5),
        }}
      >
        <img src={img(`avatar-${l.who}.webp`)} style={{ width: tall ? 72 : 54, height: tall ? 72 : 54, borderRadius: "50%", border: `3px solid ${sp.color}`, flexShrink: 0 }} />
        <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: tall ? 50 : 38, lineHeight: 1.3, color: "#fff", textWrap: "balance" as never }}>
          {words.map((w, i) => {
            const said = frame >= chunk.wordStarts[i] - 2;
            return (
              <span key={i} style={{ opacity: said ? 1 : 0.42, color: said && frame - chunk.wordStarts[i] < 8 ? sp.color : "#fff", transition: "none" }}>
                {w}{i < words.length - 1 ? " " : ""}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/** The glossary card: a word and a one-line meaning, while the line that explains it plays. */
export const Glossary: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tl = useTL();
  const l = tl.lines.find((x) => x.term && frame >= (x.cues[0] ?? x.from) - 2 && frame < x.from + x.dur + 40);
  if (!l || !l.term) return null;
  const at = (l.cues[0] ?? l.from) - 2;
  const p = spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 130 } });
  const out = interpolate(frame, [l.from + l.dur + 28, l.from + l.dur + 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sp = SPEAKER[l.who];
  const ltr = /^[A-Za-z]/.test(l.term.word);
  return (
    <div
      style={{
        position: "absolute", direction: "rtl",
        ...(tl.format === "tall" ? { left: 40, right: 40, top: 56 } : { left: 22, top: 140, width: 370 }),
        transform: `translateY(${(1 - p) * -40 - out * 20}px) rotate(${(1 - p) * -6 - 2}deg) scale(${0.8 + 0.2 * p})`, opacity: Math.min(1, p * 1.5) * (1 - out),
        transformOrigin: "50% 0%",
      }}
    >
      <div style={{ background: "#fffaf0", borderRadius: 26, padding: "24px 30px 26px", boxShadow: "0 30px 70px rgba(0,0,0,.45)", border: `3px solid ${C.amber}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#b06d00", fontFamily: FONT.display, fontWeight: 700, fontSize: 24 }}>
          <Icon name="book" size={28} color="#b06d00" /> מילון קטן
        </div>
        <div style={{ fontFamily: FONT.display, fontWeight: 900, fontSize: 46, color: C.ink, marginTop: 4, direction: ltr ? "ltr" : "rtl", textAlign: "right" }}>{l.term.word}</div>
        <div style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 27, color: "#3b4660", lineHeight: 1.35, marginTop: 4 }}>{l.term.def}</div>
      </div>
      <div style={{ position: "absolute", top: -14, left: 40, width: 90, height: 30, background: `${sp.color}cc`, transform: "rotate(-4deg)", borderRadius: 4 }} />
    </div>
  );
};

/** The chapter bar above the board. */
export const TopBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tl = useTL();
  const p = spring({ frame: frame - tl.intro, fps, config: { damping: 16 } });
  if (frame < tl.intro - 2) return null;
  const cur = tl.scenes.filter((s) => s.from <= frame).pop()?.chapter ?? 0;
  const neuro = !isCsChapter(cur);
  return (
    <div style={{ position: "absolute", top: 38, left: 400, width: 1120, display: "flex", alignItems: "center", gap: 18, direction: "rtl", opacity: p, transform: `translateY(${(1 - p) * -30}px)` }}>
      <img src={img(neuro ? "neuro-mark.svg" : "cs-mark.svg")} style={{ width: 52, height: 52, borderRadius: 14 }} />
      <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 30, color: "#fff", whiteSpace: "nowrap" }}>נחיתה רכה</div>
      <div style={{ flex: 1, display: "flex", gap: 8 }}>
        {CHAPTERS.map((c, i) => {
          const active = i === cur;
          const done = i < cur;
          return (
            <div key={i} style={{ flex: active ? 2.2 : 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ height: 6, borderRadius: 6, background: done || active ? (neuro ? C.neuroLight : C.csLight) : "rgba(255,255,255,.18)", opacity: active ? 1 : done ? 0.7 : 1 }} />
              <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 22, color: active ? "#fff" : "rgba(255,255,255,.5)", whiteSpace: "nowrap", height: 28, overflow: "hidden" }}>{active ? c.title : ""}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** The short's header: the brand and what the video is about, so a viewer who lands mid-scroll knows where they are. */
export const ShortHeader: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tl = useTL();
  const p = spring({ frame, fps, config: { damping: 16 } });
  const cur = tl.scenes.filter((s) => s.from <= frame).pop()?.chapter ?? 1;
  const neuro = !isCsChapter(cur);
  return (
    <div style={{ position: "absolute", top: 70, left: 40, right: 40, direction: "rtl", opacity: p, transform: `translateY(${(1 - p) * -30}px)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <img src={img(neuro ? "neuro-mark.svg" : "cs-mark.svg")} style={{ width: 64, height: 64, borderRadius: 16 }} />
        <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 40, color: "#fff" }}>נחיתה רכה</div>
      </div>
      <div style={{ fontFamily: FONT.display, fontWeight: 900, fontSize: 64, lineHeight: 1.1, color: "#fff", marginTop: 26 }}>
        איך בונים אתר לסטודנטים <span style={{ color: neuro ? C.neuroLight : C.csLight }}>עם AI</span>
      </div>
    </div>
  );
};

/** Confetti burst, deterministic. */
export const Confetti: React.FC<{ at: number; count?: number; originX?: number; originY?: number }> = ({ at, count = 140, originX = 960, originY = 420 }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > 150) return null;
  const colors = [C.csLight, C.neuroLight, C.amber, C.mint, "#ff7aa8", "#ffffff"];
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, i) => {
        const r = (k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
        const ang = r(1) * Math.PI * 2;
        const v = 14 + r(2) * 22;
        const x = originX + Math.cos(ang) * v * t * 0.9;
        const y = originY + Math.sin(ang) * v * t * 0.7 + 0.32 * t * t;
        const rot = t * (r(3) * 20 - 10);
        const s = 10 + r(4) * 12;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: s, height: s * 0.45, background: colors[i % colors.length], transform: `rotate(${rot}deg) rotateX(${t * 12 * r(5)}deg)`, borderRadius: 2, opacity: interpolate(t, [110, 150], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }} />;
      })}
    </div>
  );
};
