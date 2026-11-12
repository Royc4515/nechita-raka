import React from "react";
import { Easing, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FACES } from "./fonts";

// Load the bundled fonts before the first frame is rendered.
if (typeof document !== "undefined") {
  const handle = delayRender("fonts");
  Promise.all(
    FACES.map(([family, weight, file, unicodeRange]) =>
      new FontFace(family, `url(${staticFile(`fonts/${file}`)}) format("woff2")`, { weight, unicodeRange }).load().then((f) => document.fonts.add(f)),
    ),
  ).then(() => continueRender(handle), (e) => { console.error(e); continueRender(handle); });
}

export const FONT = {
  display: '"Rubik", "Assistant", sans-serif',
  body: '"Assistant", "Rubik", sans-serif',
  mono: '"JetBrains Mono", monospace',
};

export const C = {
  night: "#070c18",
  navy: "#0d1730",
  ink: "#121c34",
  paper: "#ffffff",
  mist: "#f4f6fb",
  line: "#e2e7f1",
  muted: "#66728c",
  cs: "#0b5fae",
  csLight: "#5cb8f0",
  csSoft: "#e6f1fb",
  neuro: "#6434cc",
  neuroLight: "#b89df6",
  neuroSoft: "#eee8fb",
  mint: "#17b890",
  amber: "#ffb547",
  red: "#e5484d",
};
export const SPEAKER = {
  bit: { name: "ביט", site: "מדעי המחשב", color: C.csLight, deep: C.cs, prefix: "mascot" },
  noi: { name: "נוי", site: "מדעי המוח", color: C.neuroLight, deep: C.neuro, prefix: "noi" },
  ron: { name: "רון", site: "מדעי המוח", color: "#6fd6b8", deep: "#178a6c", prefix: "ron" },
} as const;

export const img = (name: string) => staticFile(`img/${name}`);
/** Chapters 1-3 tell the story of the first (CS) site, in its blue; everything else is the brain sciences violet. */
export const isCsChapter = (chapter: number) => chapter >= 1 && chapter <= 3;
export const shot = (name: string) => staticFile(`shots/${name}`);

/** Spring 0..1 that starts at `at` (frames). */
export function usePop(at: number, config: { damping?: number; stiffness?: number; mass?: number } = {}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config: { damping: 14, stiffness: 140, mass: 0.8, ...config } });
}
/** Linear 0..1 between two frames, eased. */
export function useRamp(from: number, to: number, ease = Easing.bezier(0.22, 1, 0.36, 1)) {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
}

/** Board cue helper: at(0) is the board start, at(i) the i-th cue. */
export type BoardProps = { cues: number[]; dur: number };
export const cueAt = (cues: number[], i: number) => (i <= 0 ? 0 : cues[Math.min(i, cues.length) - 1] ?? 0);

/** Fade + rise + scale in, driven by a spring. */
export const Appear: React.FC<{ at: number; children: React.ReactNode; y?: number; x?: number; scale?: number; style?: React.CSSProperties; blur?: boolean }> = ({
  at, children, y = 40, x = 0, scale = 0.9, style, blur = true,
}) => {
  const p = usePop(at);
  const frame = useCurrentFrame();
  if (frame < at) return null;
  return (
    <div
      style={{
        opacity: Math.min(1, p * 1.4),
        transform: `translate(${(1 - p) * x}px, ${(1 - p) * y}px) scale(${scale + (1 - scale) * p})`,
        filter: blur ? `blur(${(1 - Math.min(1, p)) * 8}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/* ---------- icons (24x24 strokes) ---------- */
const paths: Record<string, React.ReactNode> = {
  doc: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>,
  code: <><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16" /></>,
  phone: <><rect x="6" y="2.5" width="12" height="19" rx="3" /><path d="M10.5 18.5h3" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></>,
  shield: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  bot: <><rect x="4" y="8" width="16" height="12" rx="4" /><path d="M12 4v4M9 14h.01M15 14h.01" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  folder: <><path d="M3 6h6l2 2h10v11H3z" /></>,
  check: <><path d="M5 12.5l4.5 4.5L19 7.5" /></>,
  x: <><path d="M6 6l12 12M18 6L6 18" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></>,
  rocket: <><path d="M5 19c0-3 1-5 3-6l3 3c-1 2-3 3-6 3z" /><path d="M9 13c2-6 6-9 11-9 0 5-3 9-9 11" /><circle cx="15" cy="9" r="1.5" /></>,
  paint: <><path d="M4 20c3 0 4-1 4-3a2 2 0 00-4 0c0 1-.5 2-1 3" /><path d="M9 15L20 4" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>,
  chat: <><path d="M4 5h16v11H9l-5 4z" /></>,
  sparkle: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></>,
  terminal: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9l3 3-3 3M12 15h5" /></>,
  book: <><path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z" /><path d="M12 6v14" /></>,
  crown: <><path d="M4 18h16M5 18l-1-10 5 4 3-6 3 6 5-4-1 10" /></>,
  link: <><path d="M10 14a4 4 0 006 0l3-3a4 4 0 00-6-6l-1 1" /><path d="M14 10a4 4 0 00-6 0l-3 3a4 4 0 006 6l1-1" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  whatsapp: <><path d="M4 20l1.3-4A8 8 0 1112 20a8 8 0 01-4-1z" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V4H4v12h4" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" /></>,
};
export const Icon: React.FC<{ name: keyof typeof paths | string; size?: number; color?: string; stroke?: number; style?: React.CSSProperties }> = ({
  name, size = 32, color = "currentColor", stroke = 2.2, style,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {paths[name]}
  </svg>
);

/** A round icon badge. */
export const Badge: React.FC<{ icon: string; color: string; size?: number; soft?: string; style?: React.CSSProperties }> = ({ icon, color, size = 88, soft, style }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.3, background: soft ?? `${color}1f`, display: "grid", placeItems: "center", flexShrink: 0, ...style }}>
    <Icon name={icon} size={size * 0.5} color={color} stroke={2.4} />
  </div>
);

/** A phone frame around a screenshot; scroll is 0..1 of the image height that is hidden. */
export const Phone: React.FC<{ src: string; width?: number; scroll?: number; tilt?: number; glow?: string; style?: React.CSSProperties }> = ({
  src, width = 300, scroll = 0, tilt = 0, glow, style,
}) => {
  const h = width * 2.05;
  return (
    <div
      style={{
        width, height: h, borderRadius: width * 0.14, padding: width * 0.035, background: "#0b0f19",
        boxShadow: `0 30px 80px rgba(5,10,25,.45)${glow ? `, 0 0 0 2px ${glow}55, 0 20px 90px ${glow}55` : ""}`,
        transform: `perspective(1600px) rotateY(${tilt}deg)`, ...style,
      }}
    >
      <div style={{ width: "100%", height: "100%", borderRadius: width * 0.11, overflow: "hidden", position: "relative", background: "#fff" }}>
        <img src={src} style={{ width: "100%", position: "absolute", top: 0, transform: `translateY(${-scroll * 100}%)` }} />
        <div style={{ position: "absolute", top: width * 0.03, left: "50%", width: width * 0.3, height: width * 0.075, marginLeft: -width * 0.15, borderRadius: 99, background: "#0b0f19" }} />
      </div>
    </div>
  );
};

/** Animated check mark in a circle. */
export const CheckDot: React.FC<{ at: number; color?: string; size?: number }> = ({ at, color = C.mint, size = 56 }) => {
  const p = usePop(at, { damping: 11 });
  const draw = useRamp(at + 4, at + 16);
  const frame = useCurrentFrame();
  if (frame < at) return null;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "grid", placeItems: "center", transform: `scale(${p})`, boxShadow: `0 10px 30px ${color}66` }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray={24} strokeDashoffset={24 * (1 - draw)} />
      </svg>
    </div>
  );
};

/** A line drawn between two points, revealed from 0 to 1. */
export const DrawLine: React.FC<{ d: string; progress: number; color: string; width?: number; dash?: boolean; w: number; h: number }> = ({ d, progress, color, width = 4, dash, w, h }) => (
  <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
    <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" pathLength={1}
      strokeDasharray={dash ? "0.012 0.02" : "1 1"} strokeDashoffset={dash ? 0 : 1 - progress} opacity={dash ? progress : 1} />
  </svg>
);

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
