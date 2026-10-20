import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SPEAKER, img } from "./lib";
import { useTL } from "./context";
import { lastLineOf, lineAt, placeAt, type Timeline } from "./timeline";
import type { Pose, Who } from "./script";


/** How much `who` is speaking around this frame, 0..1, smoothed so the glow fades instead of blinking. */
function speakAmount(tl: Timeline, who: Who, frame: number) {
  let s = 0;
  for (let k = -5; k <= 5; k++) { const l = lineAt(tl, frame + k); if (l?.who === who) s++; }
  return s / 11;
}
function envAt(tl: Timeline, who: Who, frame: number) {
  const l = lineAt(tl, frame);
  if (!l || l.who !== who) return 0;
  const i = frame - l.from;
  const v = (l.env[i - 1] ?? 0) * 0.25 + (l.env[i] ?? 0) * 0.5 + (l.env[i + 1] ?? 0) * 0.25;
  return v;
}

export const Character: React.FC<{ who: Who; enterAt: number }> = ({ who, enterAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = SPEAKER[who];
  const tl = useTL();
  const mid = tl.width / 2;

  const place = placeAt(tl, who, frame);
  const enter = spring({ frame: frame - enterAt, fps, config: { damping: 13, stiffness: 90, mass: 1 } });
  if (!place.on || frame < enterAt - 2) return null;
  const x = place.x, HEIGHT = place.h;
  // lean toward whoever is speaking
  const speaker = lineAt(tl, frame);
  const side = speaker && speaker.who !== who ? Math.sign(placeAt(tl, speaker.who, frame).x - x) || 1 : 0;
  const walk = Math.abs(Math.sin(frame / 3.2)) * place.moving * 22;
  const last = lastLineOf(tl, who, frame);
  const pose: Pose = last?.pose ?? "wave";
  // the pose before the current one, to cross-fade
  const prevLine = last ? [...tl.lines].reverse().find((l) => l.who === who && l.from < last.from) : undefined;
  const prevPose: Pose = prevLine?.pose ?? "wave";
  const since = last ? frame - last.from : 999;
  const swap = spring({ frame: since, fps, config: { damping: 12, stiffness: 200, mass: 0.6 } });
  const fadeOld = interpolate(since, [0, 5], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const talk = envAt(tl, who, frame);
  const amount = speakAmount(tl, who, frame);
  const other = lineAt(tl, frame);
  const listening = other && other.who !== who ? 1 : 0;

  const breathe = Math.sin(frame / 20 + (who === "bit" ? 1 : 0)) * 0.006;
  const y = -talk * 16 + (1 - enter) * 120 - walk;
  const scaleY = 1 + breathe + talk * 0.03;
  const scaleX = 1 - talk * 0.01;
  const rot = Math.sin(frame / 6.5) * talk * 1.6 + listening * side * 1.4 + Math.sin(frame / 37) * 0.6 + Math.sin(frame / 3.2) * place.moving * 3;
  const tx = (1 - enter) * (x < mid ? -560 : 560);
  // Noi and Ron are drawn facing screen-right and Bit facing screen-left. Face the way you walk, otherwise face the board.
  const dx = placeAt(tl, who, frame + 1).x - x;
  const facesRight = place.moving > 0.05 && Math.abs(dx) > 0.5 ? dx > 0 : x < mid;
  const flip = (who === "bit" ? !facesRight : facesRight) ? 1 : -1;

  const file = (p: Pose) => img(`${sp.prefix}-${p}.webp`);
  return (
    <div style={{ position: "absolute", left: x - 300, bottom: 0, width: 600, height: HEIGHT + 120, transform: `translateX(${tx}px)`, opacity: Math.min(1, enter * 2) }}>
      {/* spotlight */}
      <div
        style={{
          position: "absolute", left: 300 - 260, bottom: 10, width: 520, height: 520, borderRadius: "50%",
          background: `radial-gradient(circle at 50% 70%, ${sp.color}88 0%, ${sp.color}00 62%)`, opacity: 0.25 + amount * 0.75, filter: "blur(10px)",
        }}
      />
      {/* floor shadow */}
      <div style={{ position: "absolute", left: 300 - 150 - talk * 10, bottom: 30, width: 300 + talk * 20, height: 44, borderRadius: "50%", background: "rgba(0,0,0,.45)", filter: "blur(10px)" }} />
      <div
        style={{
          position: "absolute", left: 0, right: 0, bottom: 40, height: HEIGHT, display: "flex", justifyContent: "center", alignItems: "flex-end",
          transform: `translateY(${y}px) rotate(${rot}deg) scale(${scaleX * flip}, ${scaleY})`, transformOrigin: "50% 100%",
          filter: `drop-shadow(0 18px 30px rgba(0,0,0,.35)) brightness(${1 - (1 - amount) * 0.06 * listening})`,
        }}
      >
        {since < 6 && prevPose !== pose && (
          <img src={file(prevPose)} style={{ position: "absolute", bottom: 0, height: HEIGHT, opacity: fadeOld }} />
        )}
        <img
          src={file(pose)}
          style={{ height: HEIGHT, transform: `scale(${0.9 + 0.1 * swap}) translateY(${(1 - swap) * 18}px)`, transformOrigin: "50% 100%" }}
        />
      </div>
      <NameTag name={sp.name} site={sp.site} color={sp.color} deep={sp.deep} active={amount} bottom={26} />
    </div>
  );
};

/** The pill under a character; `active` (0..1) lights it up while that character speaks. */
const NameTag: React.FC<{ name: string; site: string; color: string; deep: string; active: number; bottom: number }> = ({ name, site, color, deep, active, bottom }) => (
  <div
    style={{
      position: "absolute", bottom, left: "50%", transform: `translateX(-50%) scale(${1 + active * 0.06})`,
      display: "flex", alignItems: "center", gap: 10, padding: "8px 18px", borderRadius: 999, whiteSpace: "nowrap",
      background: active > 0.5 ? deep : "rgba(10,16,32,.72)", border: `1.5px solid ${color}88`,
      boxShadow: active > 0.5 ? `0 8px 30px ${deep}aa` : "none", fontFamily: FONT.display, color: "#fff", direction: "rtl",
    }}
  >
    <span style={{ fontWeight: 800, fontSize: 26 }}>{name}</span>
    <span style={{ fontWeight: 500, fontSize: 20, opacity: 0.8 }}>{site}</span>
  </div>
);

/** A character who only appears for the goodbye (Byte), with the same name tag as the cast. */
export const Cameo: React.FC<{ file: string; x: number; at: number; height?: number; flip?: boolean; tag?: { name: string; site: string } }> = ({ file, x, at, height = 400, flip, tag }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 110 } });
  if (frame < at) return null;
  const bob = Math.sin((frame - at) / 7) * 6;
  return (
    <>
      <div style={{ position: "absolute", left: x - 200, bottom: 60, width: 400, height, display: "flex", justifyContent: "center", alignItems: "flex-end", transform: `translateY(${(1 - p) * 300 + bob}px)`, opacity: Math.min(1, p * 2) }}>
        <img src={img(file)} style={{ height, transform: flip ? "scaleX(-1)" : undefined, filter: "drop-shadow(0 18px 30px rgba(0,0,0,.35)) brightness(.92)" }} />
      </div>
      {tag && (
        <div style={{ position: "absolute", left: x - 200, bottom: 0, width: 400, height: 80, opacity: Math.min(1, p * 2) }}>
          <NameTag name={tag.name} site={tag.site} color={C.csLight} deep={C.cs} active={0} bottom={26} />
        </div>
      )}
    </>
  );
};

export const COLORS = C;
