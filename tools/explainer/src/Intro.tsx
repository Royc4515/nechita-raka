import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, img } from "./lib";
import { INTRO } from "./timeline";

/** Opening: the parachute badge floats down and lands softly, then the name appears. */
export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame > INTRO + 4) return null;
  const fall = interpolate(frame, [0, 34], [-620, 0], { extrapolateRight: "clamp", easing: Easing.bezier(0.25, 0.8, 0.3, 1) });
  const land = spring({ frame: frame - 30, fps, config: { damping: 7, stiffness: 160, mass: 0.6 } });
  const squash = frame < 30 ? 1 : 1 - Math.sin(Math.min(1, (frame - 30) / 10) * Math.PI) * 0.06;
  const sway = frame < 34 ? Math.sin(frame / 5) * (1 - frame / 34) * 9 : 0;
  const out = interpolate(frame, [INTRO - 22, INTRO + 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  const title = ["נחיתה", "רכה"];
  const shine = interpolate(frame, [78, 112], [-30, 130], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ring = interpolate(frame, [30, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", direction: "rtl", opacity: 1 - out, transform: `scale(${1 + out * 0.25})`, filter: `blur(${out * 14}px)` }}>
      {/* landing ripple */}
      <div style={{ position: "absolute", top: 610, width: 900 * ring, height: 120 * ring, borderRadius: "50%", border: `3px solid rgba(92,184,240,${0.6 * (1 - ring)})` }} />
      <div style={{ position: "absolute", top: 120, transform: `translateY(${fall}px) rotate(${sway}deg) scale(${(0.92 + 0.08 * land) * squash}, ${(0.92 + 0.08 * land) / squash})`, transformOrigin: "50% 100%" }}>
        <div style={{ width: 430, height: 430, borderRadius: "50%", overflow: "hidden", boxShadow: "0 40px 100px rgba(0,0,0,.55), 0 0 0 8px rgba(255,255,255,.08)" }}>
          <img src={img("soft-landing.webp")} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div style={{ position: "absolute", top: 600, display: "flex", gap: 36 }}>
        {title.map((w, i) => {
          const p = spring({ frame: frame - 40 - i * 6, fps, config: { damping: 14, stiffness: 110 } });
          return (
            <div key={i} style={{ overflow: "hidden", paddingBottom: 14 }}>
              <div
                style={{
                  fontFamily: FONT.display, fontWeight: 900, fontSize: 170, lineHeight: 1.05, transform: `translateY(${(1 - p) * 110}%)`,
                  backgroundImage: `linear-gradient(100deg, #fff ${shine - 12}%, ${C.csLight} ${shine}%, #fff ${shine + 12}%)`,
                  WebkitBackgroundClip: "text", color: "transparent",
                }}
              >{w}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 820, fontFamily: FONT.body, fontWeight: 600, fontSize: 46, color: "rgba(255,255,255,.85)", opacity: interpolate(frame, [62, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), transform: `translateY(${interpolate(frame, [62, 80], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)` }}>
        איך בונים אתר לסטודנטים, עם בינה מלאכותית
      </div>
    </AbsoluteFill>
  );
};
