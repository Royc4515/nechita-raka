import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { noise2D } from "@remotion/noise";
import { C } from "./lib";
import { TL } from "./timeline";

/** How "neuro" the current moment is (0 = CS blue, 1 = violet), eased between chapters. */
function neuroMix(frame: number) {
  const marks = TL.scenes.map((s) => ({ at: s.from, v: s.chapter === 4 ? 1 : s.chapter === 5 ? 0.6 : s.chapter === 6 ? 0.45 : 0 }));
  let v = 0;
  for (const m of marks) {
    const p = interpolate(frame, [m.at, m.at + 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    v = v + (m.v - v) * p;
  }
  return v;
}

const Blob: React.FC<{ seed: string; color: string; size: number; x: number; y: number; opacity: number }> = ({ seed, color, size, x, y, opacity }) => {
  const f = useCurrentFrame();
  const dx = noise2D(seed + "x", f / 260, 0) * 220;
  const dy = noise2D(seed + "y", 0, f / 260) * 160;
  return (
    <div
      style={{
        position: "absolute", left: x + dx - size / 2, top: y + dy - size / 2, width: size, height: size, borderRadius: "50%",
        background: `radial-gradient(circle, ${color} 0%, ${color}00 68%)`, opacity, filter: "blur(30px)",
      }}
    />
  );
};

export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const n = neuroMix(frame);
  const drift = (frame * 0.35) % 48;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 40%, ${C.navy} 0%, ${C.night} 70%)` }}>
      <Blob seed="a" color={C.cs} size={1300} x={1500} y={220} opacity={0.75 * (1 - n * 0.55)} />
      <Blob seed="b" color={C.neuro} size={1200} x={380} y={820} opacity={0.35 + n * 0.5} />
      <Blob seed="c" color="#14b8a6" size={900} x={980} y={1050} opacity={0.18} />
      <Blob seed="d" color={n > 0.5 ? C.neuroLight : C.csLight} size={700} x={260} y={120} opacity={0.18} />
      {/* dot grid drifting slowly */}
      <AbsoluteFill
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,.10) 1.4px, transparent 1.6px)",
          backgroundSize: "48px 48px", backgroundPosition: `${drift}px ${drift * 0.5}px`,
          maskImage: "radial-gradient(80% 70% at 50% 45%, black 30%, transparent 100%)",
        }}
      />
      {/* vignette */}
      <AbsoluteFill style={{ background: "radial-gradient(110% 100% at 50% 45%, transparent 55%, rgba(0,0,0,.55) 100%)" }} />
    </AbsoluteFill>
  );
};

/** Film grain on top of everything, very light. */
export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity: 0.09 }}>
      <svg width="100%" height="100%">
        <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 12} stitchTiles="stitch" /></filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};
