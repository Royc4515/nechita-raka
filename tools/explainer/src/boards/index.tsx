/*
  The board of each scene: the animated picture in the white panel, 1120x640.
  Each board gets `cues` (frames, relative to its start) and reveals step i at cueAt(cues, i).
  BOARD_SFX picks the sound of each cue (default: a soft pop; null for silence).
*/
import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import { Appear, Badge, C, CheckDot, FONT, Icon, Phone, cueAt, img, shot, useRamp, type BoardProps } from "../lib";
import type { SfxName } from "../sounds";

const W = 1120, H = 640;
const title: React.CSSProperties = { fontFamily: FONT.display, fontWeight: 800, color: C.ink };
const body: React.CSSProperties = { fontFamily: FONT.body, fontWeight: 600, color: "#3b4660" };
const card: React.CSSProperties = { background: "#fff", borderRadius: 28, boxShadow: "0 18px 50px rgba(18,28,52,.12), 0 0 0 1px rgba(18,28,52,.06)" };
const abs = (x: number, y: number, w?: number, h?: number): React.CSSProperties => ({ position: "absolute", left: x, top: y, width: w, height: h });

export const BOARD_SFX: Record<string, (SfxName | null)[]> = {
  sites: ["swoosh", "pop"],
  scatter: ["pop", "pop", "success"],
  contentCode: ["pop", "pop", "typing", "success"],
  sources: ["pop", "stamp", "error"],
  aiLoop: ["typing", "pop", "pop", "pop", "success", "chime"],
  pipeline: ["swoosh", "pop", "error", "success"],
  smart: ["pop", "click", "pop", "pop"],
  twoSites: ["error", "pop", "swoosh", "click", "pop", "pop", "success"],
  neuroBuild: ["pop", "pop", "stamp", "success"],
  team: ["swoosh", "pop", "pop", "pop", "pop", "pop", "chime"],
  tips: ["pop", "pop", "pop"],
  outro: ["swoosh", "confetti"],
};

/* ---------- shared pieces ---------- */
const Pill: React.FC<{ text: string; icon?: string; color?: string; style?: React.CSSProperties; big?: boolean }> = ({ text, icon, color = C.cs, style, big }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: big ? "16px 26px" : "12px 20px", borderRadius: 999, background: "#fff", boxShadow: "0 12px 30px rgba(18,28,52,.14), 0 0 0 1px rgba(18,28,52,.06)", whiteSpace: "nowrap", ...style }}>
    {icon && <Icon name={icon} size={big ? 34 : 28} color={color} />}
    <span style={{ ...title, fontWeight: 700, fontSize: big ? 32 : 27 }}>{text}</span>
  </div>
);
const Arrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; p: number; color?: string; dashed?: boolean }> = ({ x1, y1, x2, y2, p, color = C.cs, dashed }) => {
  const x = x1 + (x2 - x1) * p, y = y1 + (y2 - y1) * p;
  const a = Math.atan2(y2 - y1, x2 - x1);
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}>
      <line x1={x1} y1={y1} x2={x} y2={y} stroke={color} strokeWidth={5} strokeLinecap="round" strokeDasharray={dashed ? "2 14" : undefined} />
      {p > 0.15 && <path d={`M${x} ${y} L${x - 18 * Math.cos(a - 0.5)} ${y - 18 * Math.sin(a - 0.5)} M${x} ${y} L${x - 18 * Math.cos(a + 0.5)} ${y - 18 * Math.sin(a + 0.5)}`} stroke={color} strokeWidth={5} strokeLinecap="round" fill="none" />}
    </svg>
  );
};
const Heading: React.FC<{ text: string; at?: number; color?: string }> = ({ text, at = 0, color = C.ink }) => (
  <Appear at={at} y={20} style={{ position: "absolute", right: 56, top: 40 }}>
    <div style={{ ...title, fontSize: 44, color }}>{text}</div>
  </Appear>
);

/** The opening question of a board, centered, until its first cue. */
const Lead: React.FC<{ cues: number[]; text: string; icon: string; color?: string }> = ({ cues, text, icon, color = C.cs }) => {
  const frame = useCurrentFrame();
  const end = cueAt(cues, 1);
  const out = interpolate(frame, [end - 8, end + 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (out >= 1) return null;
  const bob = Math.sin(frame / 14) * 6;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - out, transform: `scale(${1 - out * 0.15})` }}>
      <Appear at={2}><div style={{ transform: `translateY(${bob}px)` }}><Badge icon={icon} color={color} size={150} /></div></Appear>
      <Appear at={8}><div style={{ ...title, fontSize: 70, marginTop: 26 }}>{text}</div></Appear>
    </AbsoluteFill>
  );
};

/* ---------- 1. sites ---------- */
const Sites: React.FC<BoardProps> = ({ cues, dur }) => {
  const frame = useCurrentFrame();
  const c1 = cueAt(cues, 1), c2 = cueAt(cues, 2);
  const head = useRamp(c1 - 6, c1 + 14);
  const scroll = interpolate(frame, [c1, dur], [0, 0.22], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const feats = [["קישורים", "link"], ["מדריכים", "book"], ["לוח שנה", "calendar"], ["קורסים", "doc"], ["צ'אט", "chat"]];
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 150 - head * 140, display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${1 - head * 0.5})`, transformOrigin: "50% 0%" }}>
        <Appear at={4}><div style={{ display: "flex", gap: 22 }}><img src={img("cs-mark.svg")} style={{ width: 120, borderRadius: 30 }} /><img src={img("neuro-mark.svg")} style={{ width: 120, borderRadius: 30 }} /></div></Appear>
        <Appear at={10}><div style={{ ...title, fontSize: 96, fontWeight: 900, marginTop: 18 }}>נחיתה רכה</div></Appear>
        <Appear at={16}><div style={{ ...body, fontSize: 36, opacity: 1 - head }}>אתר לסטודנטים בבר־אילן</div></Appear>
      </div>
      <Appear at={c1} x={120} style={abs(760, 150)}><Phone src={shot("cs-scroll.webp")} width={220} scroll={scroll} tilt={-14} glow={C.cs} /></Appear>
      <Appear at={c1 + 8} x={-120} style={abs(140, 150)}><Phone src={shot("neuro-scroll.webp")} width={220} scroll={scroll} tilt={14} glow={C.neuro} /></Appear>
      <Appear at={c1 + 4} style={abs(780, 590)}><Pill text="מדעי המחשב" color={C.cs} style={{ padding: "8px 18px" }} /></Appear>
      <Appear at={c1 + 12} style={abs(170, 590)}><Pill text="מדעי המוח" color={C.neuro} style={{ padding: "8px 18px" }} /></Appear>
      <div style={{ position: "absolute", left: 400, width: 320, top: 175, display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
        {feats.map(([t, i], k) => (
          <Appear key={t} at={c2 + k * 5} x={0} y={24}><Pill text={t} icon={i} color={k % 2 ? C.neuro : C.cs} /></Appear>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 2. scatter ---------- */
const Scatter: React.FC<BoardProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c1 = cueAt(cues, 1), c2 = cueAt(cues, 2), c3 = cueAt(cues, 3);
  const chips: [string, string, number, number, number][] = [
    ["אתר האוניברסיטה", "globe", 760, 110, c1], ["המזכירות", "user", 300, 90, c1 + 8], ["למדה", "doc", 820, 470, c1 + 14],
    ["קבוצת המחזור", "whatsapp", 130, 300, c2], ["קבוצת קורס", "whatsapp", 560, 250, c2 + 5], ["עוד קבוצה...", "whatsapp", 420, 520, c2 + 10],
    ["דרייב משנה שעברה", "folder", 680, 360, c2 + 15], ["הידיעון", "book", 90, 500, c2 + 20],
  ];
  const gather = spring({ frame: frame - c3, fps, config: { damping: 16, stiffness: 70 } });
  const phone = spring({ frame: frame - c3 - 10, fps, config: { damping: 12, stiffness: 110 } });
  return (
    <AbsoluteFill>
      {chips.map(([t, i, x, y, at], k) => {
        const nx = noise2D("x" + k, frame / 70, 0) * 18, ny = noise2D("y" + k, 0, frame / 70) * 14;
        const tx = x + (560 - 120 - x) * gather, ty = y + (300 - y) * gather;
        return (
          <Appear key={k} at={at} style={{ position: "absolute", left: tx + nx * (1 - gather), top: ty + ny * (1 - gather), opacity: 1 - gather * 0.95, transform: `rotate(${(k % 3 - 1) * 4 * (1 - gather)}deg) scale(${1 - gather * 0.6})` }}>
            <Pill text={t} icon={i} color={i === "whatsapp" ? "#25a35a" : C.cs} />
          </Appear>
        );
      })}
      {frame >= c2 + 20 && frame < c3 + 10 && (
        <div style={{ position: "absolute", left: 470, top: 120, ...title, fontSize: 120, color: C.amber, opacity: interpolate(frame, [c2 + 20, c2 + 30, c3, c3 + 10], [0, 1, 1, 0]), transform: `rotate(${Math.sin(frame / 8) * 8}deg)` }}>?</div>
      )}
      {frame >= c3 + 10 && (
        <div style={{ position: "absolute", left: 445, top: 50, transform: `scale(${phone})` }}>
          <Phone src={shot("cs-mobile.webp")} width={250} glow={C.mint} />
        </div>
      )}
      <Appear at={c3 + 24} style={abs(740, 270)}>
        <div style={{ ...title, fontSize: 54, color: C.cs }}>מקום אחד.</div>
        <div style={{ ...body, fontSize: 30 }}>מסודר, ואפשר לסמוך עליו</div>
      </Appear>
    </AbsoluteFill>
  );
};

/* ---------- 3. content vs code ---------- */
const ContentCode: React.FC<BoardProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const c1 = cueAt(cues, 1), c2 = cueAt(cues, 2), c3 = cueAt(cues, 3), c4 = cueAt(cues, 4);
  const type = Math.floor(interpolate(frame, [c3 + 12, c3 + 34], [0, 9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const newDate = "22.1.2027".slice(0, type);
  const editing = frame >= c3;
  const codeLines = ["<header>{site.title}</header>", "guides.map(g => card(g))", "button.onClick(open)", "render(calendar)"];
  return (
    <AbsoluteFill>
      <Lead cues={cues} text="איך בונים אתר?" icon="code" color={C.cs} />
      <Appear at={c1} x={-60} style={{ ...abs(60, 50, 470, 330), ...card, background: C.ink, padding: 34 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}><Badge icon="code" color={C.csLight} soft="rgba(92,184,240,.15)" size={70} /><div style={{ ...title, color: "#fff", fontSize: 44 }}>הקוד</div></div>
        <div style={{ marginTop: 22, direction: "ltr", display: "flex", flexDirection: "column", gap: 10 }}>
          {codeLines.map((l, i) => <div key={i} style={{ fontFamily: FONT.mono, fontSize: 22, color: ["#8cc8ff", "#ffd58a", "#9be7c4", "#c9d2e3"][i], opacity: interpolate(frame, [c1 + 6 + i * 4, c1 + 12 + i * 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>{l}</div>)}
        </div>
        <div style={{ ...body, color: "rgba(255,255,255,.7)", fontSize: 26, marginTop: 18 }}>איך האתר נראה ומתנהג</div>
      </Appear>
      <Appear at={c2} x={60} style={{ ...abs(590, 50, 470, 330), ...card, padding: 34 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}><Badge icon="doc" color={C.cs} size={70} /><div style={{ ...title, fontSize: 44 }}>התוכן</div></div>
        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 12 }}>
          {["רישום לקורסים · קישור", "מועד ב' · ", "מזכירות · שעות קבלה"].map((t, i) => (
            <div key={i} style={{ ...body, fontSize: 28, padding: "6px 14px", borderRadius: 12, background: i === 1 && editing ? "#fff4d6" : C.mist, boxShadow: i === 1 && editing ? `0 0 0 3px ${C.amber}` : "none" }}>
              {i === 1 ? <>מועד ב' · <span style={{ direction: "ltr", unicodeBidi: "isolate" }}>{editing ? (type ? newDate : <s style={{ color: C.red }}>15.1.2027</s>) : "15.1.2027"}</span>{editing && type < 9 && frame % 16 < 8 ? "|" : ""}</> : t}
            </div>
          ))}
        </div>
      </Appear>
      <Appear at={c3} y={40} style={abs(820, 420)}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Badge icon="phone" color={C.cs} size={92} />
          <div><div style={{ ...title, fontSize: 34 }}>עורכים שורה</div><div style={{ ...body, fontSize: 26 }}>גם מהטלפון</div></div>
        </div>
      </Appear>
      <Arrow x1={790} y1={466} x2={560} y2={466} p={useRamp(c3 + 8, c3 + 30)} />
      <Appear at={c4} y={40} style={abs(170, 410)}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, ...card, padding: "20px 28px" }}>
          <CheckDot at={c4 + 4} size={70} />
          <div><div style={{ ...title, fontSize: 36 }}>האתר מעודכן</div><div style={{ ...body, fontSize: 26 }}>תוך דקה או שתיים</div></div>
        </div>
      </Appear>
    </AbsoluteFill>
  );
};

/* ---------- 4. sources ---------- */
const Sources: React.FC<BoardProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c1 = cueAt(cues, 1), c2 = cueAt(cues, 2), c3 = cueAt(cues, 3);
  const stamp = spring({ frame: frame - c2 - 18, fps, config: { damping: 9, stiffness: 220, mass: 0.6 } });
  const xDraw = useRamp(c3 + 10, c3 + 22);
  const shake = frame > c3 + 10 && frame < c3 + 24 ? Math.sin(frame * 2.2) * 8 : 0;
  return (
    <AbsoluteFill>
      <Lead cues={cues} text="איך יודעים שזה נכון?" icon="search" color={C.cs} />
      <Appear at={c1} x={60} style={{ ...abs(640, 50, 420, 300), ...card, overflow: "hidden" }}>
        <div style={{ background: C.mist, padding: "14px 20px", display: "flex", gap: 8, alignItems: "center" }}>
          {["#e86a5a", "#e9b949", "#5cc287"].map((c) => <div key={c} style={{ width: 13, height: 13, borderRadius: "50%", background: c }} />)}
          <div style={{ flex: 1, marginInlineStart: 10, background: "#fff", borderRadius: 10, padding: "4px 14px", fontFamily: FONT.mono, fontSize: 19, color: C.muted, direction: "ltr" }}>biu.ac.il</div>
        </div>
        <div style={{ padding: 26 }}>
          <div style={{ ...title, fontSize: 34 }}>אתר האוניברסיטה</div>
          {[0.9, 0.75, 0.85, 0.6].map((w, i) => <div key={i} style={{ height: 14, width: `${w * 100}%`, background: C.line, borderRadius: 8, marginTop: 16 }} />)}
        </div>
      </Appear>
      <Arrow x1={620} y1={200} x2={510} y2={200} p={useRamp(c2, c2 + 16)} />
      <Appear at={c2} x={-60} style={{ ...abs(60, 50, 430, 300), ...card, padding: 26 }}>
        <div style={{ ...title, fontSize: 34 }}>המדריך באתר</div>
        {[0.95, 0.8, 0.9].map((w, i) => <div key={i} style={{ height: 14, width: `${w * 100}%`, background: C.line, borderRadius: 8, marginTop: 16 }} />)}
        <div style={{ marginTop: 26, padding: "12px 16px", borderRadius: 14, background: C.csSoft, ...body, fontSize: 23, color: C.cs }}>
          מקור: אתר האוניברסיטה · נבדק 7.10.2026
        </div>
      </Appear>
      {frame >= c2 + 18 && (
        <div style={{ position: "absolute", left: 150, top: 150, transform: `rotate(-12deg) scale(${2.2 - 1.2 * stamp})`, opacity: Math.min(1, stamp * 2) }}>
          <div style={{ border: `5px solid ${C.mint}`, color: C.mint, borderRadius: 16, padding: "6px 18px", ...title, fontSize: 36, background: "rgba(255,255,255,.85)" }}>מקור רשמי ✓</div>
        </div>
      )}
      <Appear at={c3} y={30} style={abs(330, 420)}>
        <div style={{ display: "flex", alignItems: "center", gap: 26, transform: `translateX(${shake}px)` }}>
          <div style={{ position: "relative", background: "#dcf8c6", borderRadius: "22px 22px 4px 22px", padding: "18px 26px", ...body, fontSize: 30, color: "#1f3a2a", boxShadow: "0 12px 30px rgba(0,0,0,.1)" }}>
            שמעתי שהמבחן נדחה!!! 😱
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
              <path d="M8 12 L92 88" stroke={C.red} strokeWidth={4} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - xDraw} vectorEffect="non-scaling-stroke" />
              <path d="M92 12 L8 88" stroke={C.red} strokeWidth={4} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - xDraw} vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          <div style={{ ...title, fontSize: 36, color: C.red, opacity: xDraw }}>אין מקור? לא נכנס.</div>
        </div>
      </Appear>
    </AbsoluteFill>
  );
};

/* ---------- 5. the AI loop ---------- */
const AiLoop: React.FC<BoardProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const c = (i: number) => cueAt(cues, i);
  const cx = 560, cy = 330, rx = 400, ry = 230;
  const nodes = [
    { t: "רועי מסביר", s: "מה צריך, ולמה", icon: "user", a: -90, at: c(2), color: C.cs },
    { t: "קלוד קוד כותב", s: "קוד ובדיקות", icon: "code", a: 0, at: c(3), color: C.neuro },
    { t: "רועי בודק", s: "ומבקש תיקונים", icon: "search", a: 90, at: c(4), color: C.cs },
    { t: "נכנס לאתר", s: "רק כשברור", icon: "rocket", a: 180, at: c(5), color: C.mint },
  ];
  const pos = (deg: number) => ({ x: cx + rx * Math.cos((deg * Math.PI) / 180) * -1, y: cy + ry * Math.sin((deg * Math.PI) / 180) });
  const ringP = useRamp(c(2), c(5) + 20);
  const dotA = frame > c(5) ? ((frame - c(5)) * 3) % 360 : -1;
  const typed = Math.floor(Math.max(0, frame - c(1) - 6) / 1.4);
  const code = "function update(site) {\n  check(site.facts)\n  return publish(site)\n}";
  return (
    <AbsoluteFill>
      <Lead cues={cues} text="מי כותב את הקוד?" icon="user" color={C.neuro} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={C.line} strokeWidth={6} />
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={C.cs} strokeWidth={6} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ringP} strokeLinecap="round" />
        {dotA >= 0 && (() => { const p = pos(dotA - 90); return <circle cx={p.x} cy={p.y} r={14} fill={C.amber} style={{ filter: "drop-shadow(0 0 12px #ffb547)" }} />; })()}
      </svg>
      <Appear at={c(1)} style={{ ...abs(cx - 210, cy - 105, 420, 210), ...card, background: C.ink, overflow: "hidden" }}>
        <div style={{ padding: "12px 18px", display: "flex", gap: 8, alignItems: "center", background: "rgba(255,255,255,.06)" }}>
          {["#e86a5a", "#e9b949", "#5cc287"].map((x) => <div key={x} style={{ width: 11, height: 11, borderRadius: "50%", background: x }} />)}
          <div style={{ fontFamily: FONT.mono, fontSize: 17, color: "#9fb0cf", marginInlineStart: "auto", direction: "ltr" }}>Claude Code</div>
        </div>
        <pre style={{ margin: 0, padding: "12px 20px", fontFamily: FONT.mono, fontSize: 20, lineHeight: 1.5, color: "#ffd58a", direction: "ltr", textAlign: "left" }}>
          {code.slice(0, typed)}<span style={{ opacity: frame % 14 < 7 ? 1 : 0, color: "#fff" }}>▌</span>
        </pre>
      </Appear>
      {nodes.map((n, i) => {
        const p = pos(n.a);
        return (
          <Appear key={i} at={n.at} style={{ position: "absolute", left: p.x - 135, top: p.y - 52, width: 270 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, ...card, padding: "14px 16px", borderRadius: 22, boxShadow: frame >= n.at && dotA >= 0 && Math.abs(((dotA - [0, 90, 180, 270][i] + 540) % 360) - 180) < 20 ? `0 0 0 4px ${C.amber}, 0 18px 40px rgba(0,0,0,.15)` : (card.boxShadow as string) }}>
              <Badge icon={n.icon} color={n.color} size={60} />
              <div><div style={{ ...title, fontSize: 26 }}>{n.t}</div><div style={{ ...body, fontSize: 21 }}>{n.s}</div></div>
            </div>
          </Appear>
        );
      })}
      <Appear at={c(6)} style={abs(860, 470)}>
        <div style={{ ...card, background: `linear-gradient(135deg, ${C.cs}, ${C.neuro})`, padding: "18px 26px", textAlign: "center", transform: "rotate(4deg)" }}>
          <div style={{ ...title, color: "#fff", fontSize: 64, direction: "ltr" }}>100+</div>
          <div style={{ ...body, color: "rgba(255,255,255,.9)", fontSize: 24 }}>שינויים עד היום</div>
        </div>
      </Appear>
    </AbsoluteFill>
  );
};

/* ---------- 6. pipeline ---------- */
const Pipeline: React.FC<BoardProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const c = (i: number) => cueAt(cues, i);
  const tests = ["אין פסיק חסר", "כל הקישורים עובדים", "כל התאריכים תקינים"];
  const fail = frame >= c(3) && frame < c(4);
  const glow = interpolate(frame, [c(4), c(4) + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const packet = (from: number, x1: number, x2: number) => {
    const p = interpolate(frame, [from, from + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
    if (p <= 0 || p >= 1) return null;
    return <div style={{ position: "absolute", left: x1 + (x2 - x1) * p - 16, top: 244, width: 32, height: 32, borderRadius: 10, background: C.amber, boxShadow: "0 0 20px #ffb547" }} />;
  };
  return (
    <AbsoluteFill>
      <Lead cues={cues} text="מה קורה כששומרים?" icon="rocket" color={C.mint} />
      {/* GitHub */}
      <Appear at={c(1)} style={{ ...abs(790, 110, 280, 300), ...card, padding: 24, textAlign: "center" }}>
        <div style={{ position: "relative", height: 130, display: "flex", justifyContent: "center" }}>
          {[2, 1, 0].map((k) => <div key={k} style={{ position: "absolute", top: 10 + k * 12, transform: `translateX(${k * 12}px)`, opacity: 1 - k * 0.3 }}><Badge icon="folder" color={C.ink} size={104} soft={k ? "#eef1f7" : "#e6ebf5"} /></div>)}
        </div>
        <div style={{ ...title, fontSize: 32, direction: "ltr" }}>GitHub</div>
        <div style={{ ...body, fontSize: 22 }}>הקבצים, וכל גרסה קודמת</div>
      </Appear>
      <Arrow x1={770} y1={260} x2={690} y2={260} p={useRamp(c(2) - 4, c(2) + 10)} />
      {packet(c(2) - 10, 900, 560)}
      {/* tests */}
      <Appear at={c(2)} style={{ ...abs(420, 110, 280, 300), ...card, padding: 24, boxShadow: fail ? `0 0 0 4px ${C.red}, 0 18px 50px rgba(229,72,77,.3)` : (card.boxShadow as string), transform: fail ? `translateX(${Math.sin(frame * 2) * (frame - c(3) < 14 ? 6 : 0)}px)` : undefined }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Badge icon="shield" color={fail ? C.red : C.mint} size={64} /><div style={{ ...title, fontSize: 30 }}>בדיקה</div></div>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {tests.map((t, i) => {
            const at = c(2) + 14 + i * 9;
            const bad = fail && i === 0;
            return (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, ...body, fontSize: 22 }}>
                {bad ? <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.red, display: "grid", placeItems: "center" }}><Icon name="x" size={20} color="#fff" stroke={3} /></div> : frame >= at ? <CheckDot at={at} size={34} /> : <div style={{ width: 34, height: 34, borderRadius: "50%", border: `3px solid ${C.line}` }} />}
                {t}
              </div>
            );
          })}
        </div>
      </Appear>
      {fail && (
        <Appear at={c(3) + 4} style={abs(400, 440)}>
          <div style={{ ...card, background: "#fff0f0", border: `3px solid ${C.red}`, padding: "14px 22px", ...title, fontSize: 28, color: C.red }}>טעות? האתר לא מתעדכן, עד שמתקנים</div>
        </Appear>
      )}
      <Arrow x1={400} y1={260} x2={320} y2={260} p={useRamp(c(4) - 4, c(4) + 10)} color={C.mint} />
      {packet(c(4) - 6, 540, 180)}
      {/* Vercel */}
      <Appear at={c(4)} style={{ ...abs(50, 110, 260, 300), ...card, padding: 24, textAlign: "center", boxShadow: `0 0 0 ${4 * glow}px ${C.mint}, 0 20px ${50 + 40 * glow}px rgba(23,184,144,${0.15 + 0.3 * glow})` }}>
        <div style={{ display: "grid", placeItems: "center", height: 130 }}>
          <div style={{ position: "relative" }}>
            {[0, 1].map((k) => <div key={k} style={{ position: "absolute", inset: -20 - (((frame - c(4)) * 1.2 + k * 20) % 40), borderRadius: "50%", border: `3px solid ${C.mint}`, opacity: 1 - (((frame - c(4)) * 1.2 + k * 20) % 40) / 40 }} />)}
            <Badge icon="globe" color={C.mint} size={104} />
          </div>
        </div>
        <div style={{ ...title, fontSize: 32, direction: "ltr" }}>Vercel</div>
        <div style={{ ...body, fontSize: 22 }}>האתר באוויר</div>
      </Appear>
      <Appear at={c(4) + 18} style={abs(70, 450)}><Pill text="כל אחד יכול לפתוח בטלפון" icon="phone" color={C.mint} /></Appear>
    </AbsoluteFill>
  );
};

/* ---------- 7. smart parts ---------- */
const Smart: React.FC<BoardProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const c = (i: number) => cueAt(cues, i);
  const bars = [0.45, 0.8, 0.6, 0.95, 0.7];
  const grow = useRamp(c(3) + 4, c(3) + 30);
  const bot = interpolate(frame, [c(4) + 4, c(4) + 22, c(4) + 34], [0, 1, 0.55], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const colW = 330;
  return (
    <AbsoluteFill>
      {/* chat */}
      <Appear at={c(1)} style={{ ...abs(750, 50, colW, 540), ...card, padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Badge icon="chat" color={C.cs} size={56} /><div style={{ ...title, fontSize: 30 }}>הצ'אט</div></div>
        <div style={{ alignSelf: "flex-start", background: C.cs, color: "#fff", borderRadius: "20px 20px 20px 4px", padding: "12px 18px", ...body, fontSize: 24 }}>מתי נרשמים למועד ב'?</div>
        {frame >= c(2) - 2 && frame < c(2) + 18 && <div style={{ alignSelf: "flex-end", background: C.mist, borderRadius: 18, padding: "14px 20px", ...title, fontSize: 30, letterSpacing: 4 }}>{"•••".slice(0, 1 + (Math.floor(frame / 5) % 3))}</div>}
        {frame >= c(2) + 18 && (
          <Appear at={c(2) + 18} y={14} style={{ alignSelf: "flex-end", display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ background: C.mist, borderRadius: "20px 20px 4px 20px", padding: "12px 18px", ...body, fontSize: 23, color: C.ink, maxWidth: 230 }}>לפי המדריך באתר: יש הרשמה במערכת, עד מועד שמופיע שם.</div>
            <img src={img("avatar-bit.webp")} style={{ width: 44, height: 44, borderRadius: "50%" }} />
          </Appear>
        )}
        {frame >= c(2) + 30 && <Appear at={c(2) + 30} style={{ alignSelf: "flex-end" }}><Pill text="רק ממה שכתוב באתר" icon="book" color={C.mint} style={{ padding: "8px 14px" }} /></Appear>}
      </Appear>
      {/* dashboard */}
      <Appear at={c(3)} style={{ ...abs(395, 50, colW, 540), ...card, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Badge icon="chart" color={C.neuro} size={56} /><div style={{ ...title, fontSize: 30 }}>לוח בקרה</div></div>
        <div style={{ height: 200, display: "flex", alignItems: "flex-end", gap: 16, marginTop: 24, padding: "0 10px", borderBottom: `3px solid ${C.line}` }}>
          {bars.map((b, i) => <div key={i} style={{ flex: 1, height: `${b * 100 * Math.min(1, grow * 1.4 - i * 0.08)}%`, background: `linear-gradient(180deg, ${C.neuroLight}, ${C.neuro})`, borderRadius: "10px 10px 0 0" }} />)}
        </div>
        <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, background: C.neuroSoft }}>
          <Icon name="search" size={32} color={C.neuro} />
          <div style={{ ...title, fontSize: 24, color: C.neuro }}>מה חיפשו ולא מצאו</div>
        </div>
        <div style={{ ...body, fontSize: 21, marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}><Icon name="lock" size={24} color={C.muted} />בלי עוגיות, בלי לזהות אף אחד</div>
      </Appear>
      {/* shield */}
      <Appear at={c(4)} style={{ ...abs(40, 50, colW, 540), ...card, padding: 22, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Badge icon="shield" color={C.mint} size={56} /><div style={{ ...title, fontSize: 30 }}>קבוצות מוגנות</div></div>
        <div style={{ position: "relative", height: 300, marginTop: 20 }}>
          <div style={{ position: "absolute", left: 20 + bot * 120, top: 120 }}><Badge icon="bot" color={C.red} size={80} /></div>
          <div style={{ position: "absolute", left: 170, top: 40, width: 10, height: 240, borderRadius: 10, background: C.mint, boxShadow: `0 0 ${20 + Math.sin(frame / 4) * 8}px ${C.mint}` }} />
          <div style={{ position: "absolute", right: 0, top: 70, display: "flex", flexDirection: "column", gap: 12 }}>
            {[0, 1, 2].map((k) => <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 12, background: "#e9f9ef" }}><Icon name="whatsapp" size={24} color="#25a35a" /><div style={{ width: 70, height: 10, borderRadius: 6, background: "#25a35a55" }} /></div>)}
          </div>
        </div>
        <div style={{ ...body, fontSize: 21 }}>רובוטים לא רואים, סטודנטים כן</div>
      </Appear>
    </AbsoluteFill>
  );
};

/* ---------- 8. one code, two sites ---------- */
const TwoSites: React.FC<BoardProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const c = (i: number) => cueAt(cues, i);
  const copyOut = interpolate(frame, [c(2) - 4, c(2) + 8], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sw = interpolate(frame, [c(4) + 6, c(4) + 18, c(4) + 40, c(4) + 52], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "extend" });
  const toggle = frame < c(5) ? ((frame - c(4)) % 60 < 30 ? 0 : 1) * (frame > c(4) ? 1 : 0) : frame < c(6) ? 0 : 1;
  const pulse = frame >= c(7) ? ((frame - c(7)) % 40) / 40 : -1;
  const line = (x2: number, color: string, at: number) => <Arrow x1={560} y1={150} x2={x2} y2={300} p={useRamp(at, at + 16)} color={color} dashed />;
  return (
    <AbsoluteFill>
      <Lead cues={cues} text="איך נולד אתר שני?" icon="copy" color={C.neuro} />
      {frame < c(2) + 8 && (
        <Appear at={c(1)} style={{ ...abs(330, 60), opacity: copyOut }}>
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <Badge icon="code" color={C.cs} size={120} /><div style={{ ...title, fontSize: 64, color: C.red }}>×2</div><Badge icon="code" color={C.neuro} size={120} />
          </div>
          <div style={{ ...title, fontSize: 30, color: C.red, textAlign: "center", marginTop: 12 }}>כל תיקון פעמיים</div>
          <div style={{ position: "absolute", left: -20, right: -20, top: 60, height: 6, background: C.red, transform: `rotate(-8deg) scaleX(${interpolate(frame, [c(1) + 18, c(1) + 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`, borderRadius: 6 }} />
        </Appear>
      )}
      <Appear at={c(2)} style={{ ...abs(410, 40, 300, 110), ...card, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <Icon name="code" size={46} color="#fff" /><div style={{ ...title, color: "#fff", fontSize: 40 }}>קוד אחד</div>
      </Appear>
      {line(860, C.cs, c(3))}
      {line(260, C.neuro, c(3) + 6)}
      <Appear at={c(3)} style={{ ...abs(720, 175, 330), ...card, padding: "16px 20px", borderTop: `8px solid ${C.cs}` }}>
        <div style={{ ...title, fontSize: 26 }}>הגדרות מדעי המחשב</div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}><div style={{ width: 30, height: 30, borderRadius: 8, background: C.cs }} /><img src={img("avatar-bit.webp")} style={{ width: 34, borderRadius: "50%" }} /><img src={img("avatar-byte.webp")} style={{ width: 34, borderRadius: "50%" }} /><span style={{ ...body, fontSize: 20 }}>שם, צבעים, דמויות</span></div>
      </Appear>
      <Appear at={c(3) + 6} style={{ ...abs(70, 175, 330), ...card, padding: "16px 20px", borderTop: `8px solid ${C.neuro}` }}>
        <div style={{ ...title, fontSize: 26 }}>הגדרות מדעי המוח</div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}><div style={{ width: 30, height: 30, borderRadius: 8, background: C.neuro }} /><img src={img("avatar-noi.webp")} style={{ width: 34, borderRadius: "50%" }} /><img src={img("avatar-ron.webp")} style={{ width: 34, borderRadius: "50%" }} /><span style={{ ...body, fontSize: 20 }}>שם, צבעים, דמויות</span></div>
      </Appear>
      <Appear at={c(4)} style={abs(430, 190)}>
        <div style={{ ...card, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, borderRadius: 999 }}>
          <span style={{ ...title, fontSize: 22, color: toggle ? C.muted : C.cs }}>מדמ״ח</span>
          <div style={{ width: 84, height: 44, borderRadius: 99, background: toggle ? C.neuro : C.cs, position: "relative" }}>
            <div style={{ position: "absolute", top: 5, right: 5 + toggle * 40, width: 34, height: 34, borderRadius: "50%", background: "#fff", boxShadow: "0 3px 8px rgba(0,0,0,.2)" }} />
          </div>
          <span style={{ ...title, fontSize: 22, color: toggle ? C.neuro : C.muted }}>מוח</span>
        </div>
        <div style={{ ...body, fontSize: 21, textAlign: "center", marginTop: 8, opacity: sw ? 1 : 0.9 }}>בוחרים פקולטה</div>
      </Appear>
      <Appear at={c(5)} y={60} style={abs(800, 300)}><Phone src={shot("cs-mobile.webp")} width={150} tilt={-10} glow={C.cs} /></Appear>
      <Appear at={c(6)} y={60} style={abs(170, 300)}><Phone src={shot("neuro-mobile.webp")} width={150} tilt={10} glow={C.neuro} /></Appear>
      {pulse >= 0 && [860 - 0, 260].map((x, k) => (
        <div key={k} style={{ position: "absolute", left: 560 + (x - 560) * pulse - 14, top: 150 + 150 * pulse - 14, width: 28, height: 28, borderRadius: "50%", background: C.amber, boxShadow: "0 0 24px #ffb547", opacity: 1 - pulse * 0.3 }} />
      ))}
      <Appear at={c(7)} style={abs(395, 470)}>
        <div style={{ ...card, padding: "16px 24px", background: `linear-gradient(135deg, ${C.cs}, ${C.neuro})` }}>
          <div style={{ ...title, color: "#fff", fontSize: 30, textAlign: "center" }}>שיפור אחד</div>
          <div style={{ ...body, color: "rgba(255,255,255,.9)", fontSize: 24, textAlign: "center" }}>מגיע לשני האתרים</div>
        </div>
      </Appear>
    </AbsoluteFill>
  );
};

/* ---------- 9. what the brain site needed ---------- */
const NeuroBuild: React.FC<BoardProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const c = (i: number) => cueAt(cues, i);
  const scan = ((frame - c(3)) % 50) / 50;
  const items = [
    { at: c(1), t: "תוכן", s: "ממקורות רשמיים", icon: "book", el: <div style={{ display: "flex", gap: 8, marginTop: 14 }}>{["תוכניות", "מסלולים", "ידיעון"].map((x) => <div key={x} style={{ padding: "6px 10px", borderRadius: 10, background: C.neuroSoft, ...body, fontSize: 19, color: C.neuro }}>{x}</div>)}</div> },
    { at: c(2), t: "דמויות", s: "בכלי שיוצר תמונות", icon: "paint", el: <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 6, height: 170 }}><img src={img("noi-wave.webp")} style={{ height: 170 }} /><img src={img("ron-wave.webp")} style={{ height: 170 }} /></div> },
    { at: c(3), t: "בדיקה", s: "שום מילה של מדמ״ח", icon: "shield", el: (
      <div style={{ position: "relative", marginTop: 14, height: 150, borderRadius: 16, background: C.mist, overflow: "hidden" }}>
        {[0.8, 0.6, 0.9, 0.5].map((w, i) => <div key={i} style={{ height: 12, width: `${w * 80}%`, margin: "18px 18px 0", borderRadius: 6, background: C.line }} />)}
        {frame >= c(3) && <div style={{ position: "absolute", left: 0, right: 0, top: scan * 150, height: 4, background: C.mint, boxShadow: `0 0 16px ${C.mint}` }} />}
      </div>
    ) },
  ];
  return (
    <AbsoluteFill>
      <Appear at={0} style={abs(0, 30, W)}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 18 }}>
          <img src={img("hero-brain.webp")} style={{ width: 84, height: 84, borderRadius: "50%" }} />
          <div style={{ ...title, fontSize: 44, color: C.neuro }}>מה עוד היה צריך</div>
        </div>
      </Appear>
      {items.map((it, i) => (
        <Appear key={i} at={it.at} y={50} style={{ ...abs(760 - i * 350, 150, 320, 380), ...card, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Badge icon={it.icon} color={C.neuro} size={60} /><div><div style={{ ...title, fontSize: 30 }}>{it.t}</div><div style={{ ...body, fontSize: 21 }}>{it.s}</div></div></div>
          {it.el}
          {frame >= c(4) && <div style={{ position: "absolute", top: -18, left: -18 }}><CheckDot at={c(4) + i * 5} size={56} /></div>}
        </Appear>
      ))}
      <Appear at={c(4) + 10} style={abs(330, 555)}><div style={{ ...title, fontSize: 34, color: C.neuro }}>וככה נולד אתר מדעי המוח ✨</div></Appear>
    </AbsoluteFill>
  );
};

/* ---------- 10. the AI team ---------- */
const Team: React.FC<BoardProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const c = (i: number) => cueAt(cues, i);
  const roles = [
    { t: "מעצב", icon: "paint", at: c(2) }, { t: "מהנדס", icon: "code", at: c(3) }, { t: "בודק איכות", icon: "search", at: c(4) },
    { t: "אבטחה", icon: "shield", at: c(5) }, { t: "תוכן", icon: "book", at: c(5) + 10 }, { t: "הפצה", icon: "chat", at: c(5) + 18 },
  ];
  const roy = { x: 560, y: 95 };
  const crown = frame >= c(7);
  return (
    <AbsoluteFill>
      <Lead cues={cues} text="צוות של סוכנים" icon="bot" color={C.neuro} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {roles.map((r, i) => {
          const x = 140 + i * 168, y = 330;
          const p = interpolate(frame, [r.at, r.at + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return <path key={i} d={`M${roy.x} ${roy.y + 60} C ${roy.x} 220, ${x} 200, ${x} ${y - 60}`} fill="none" stroke={crown ? C.amber : C.line} strokeWidth={4} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />;
        })}
      </svg>
      <div style={{ position: "absolute", left: roy.x - 120, top: roy.y - 60, width: 240, ...card, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: crown ? `0 0 0 5px ${C.amber}, 0 20px 50px rgba(255,181,71,.4)` : (card.boxShadow as string) }}>
        <Badge icon="user" color={C.ink} size={64} />
        <div><div style={{ ...title, fontSize: 32 }}>רועי</div><div style={{ ...body, fontSize: 20 }}>{crown ? "מחליט ומפרסם" : "המנהל"}</div></div>
        {crown && <div style={{ position: "absolute", top: -42, right: 20, transform: `scale(${Math.min(1, (frame - c(7)) / 8)}) rotate(-12deg)` }}><Icon name="crown" size={56} color={C.amber} stroke={2.6} /></div>}
      </div>
      <Appear at={c(1)} style={abs(0, 0)}>
        {roles.map((r, i) => {
          const x = 140 + i * 168, on = frame >= r.at;
          return (
            <div key={i} style={{ position: "absolute", left: x - 74, top: 270, width: 148, textAlign: "center", opacity: on ? 1 : 0.35, transform: `scale(${on ? 1 : 0.85})` }}>
              <div style={{ display: "grid", placeItems: "center" }}><Badge icon={on ? r.icon : "bot"} color={on ? C.neuro : C.muted} size={92} /></div>
              <div style={{ ...title, fontSize: 24, marginTop: 8 }}>{on ? r.t : "סוכן"}</div>
            </div>
          );
        })}
      </Appear>
      <Appear at={c(6)} style={{ ...abs(250, 450, 620), ...card, padding: "16px 22px", border: `3px dashed ${C.cs}`, background: C.csSoft, display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ display: "flex" }}>{[0, 1, 2].map((k) => <div key={k} style={{ marginInlineStart: k ? -18 : 0 }}><Badge icon="user" color={C.cs} size={56} soft="#fff" /></div>)}</div>
        <div><div style={{ ...title, fontSize: 28, color: C.cs }}>סטודנטים מדומים</div><div style={{ ...body, fontSize: 21 }}>נכנסים לאתר ומספרים איפה נתקעו</div></div>
      </Appear>
    </AbsoluteFill>
  );
};

/* ---------- 11. your turn ---------- */
const Tips: React.FC<BoardProps> = ({ cues }) => {
  const c = (i: number) => cueAt(cues, i);
  const tips = [
    { t: "מתחילים מבעיה אמיתית וקטנה", s: "גם האתר הזה התחיל כדף קישורים", icon: "sparkle", color: C.amber },
    { t: "תוכן לחוד, קוד לחוד", s: "ובדיקה אוטומטית לפני כל פרסום", icon: "shield", color: C.mint },
    { t: "לא מאשרים מה שלא מבינים", s: "השאלות הטובות הן שלך", icon: "search", color: C.neuro },
  ];
  return (
    <AbsoluteFill>
      <Heading text="איך מתחילים" />
      {tips.map((tp, i) => (
        <Appear key={i} at={c(i + 1)} x={-80} y={0} style={{ ...abs(80, 140 + i * 150, 960, 128), ...card, display: "flex", alignItems: "center", gap: 24, padding: "0 30px" }}>
          <div style={{ ...title, fontSize: 64, color: tp.color, width: 50, textAlign: "center" }}>{i + 1}</div>
          <Badge icon={tp.icon} color={tp.color} size={76} />
          <div><div style={{ ...title, fontSize: 38 }}>{tp.t}</div><div style={{ ...body, fontSize: 26 }}>{tp.s}</div></div>
        </Appear>
      ))}
    </AbsoluteFill>
  );
};

/* ---------- 12. goodbye ---------- */
const Outro: React.FC<BoardProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = (i: number) => cueAt(cues, i);
  const big = spring({ frame: frame - c(2), fps, config: { damping: 9, stiffness: 120 } });
  const sites = [
    { name: "מדעי המחשב", url: "nechita-raka.vercel.app", mark: "cs-mark.svg", color: C.cs },
    { name: "מדעי המוח", url: "nechita-raka-neuro.vercel.app", mark: "neuro-mark.svg", color: C.neuro },
  ];
  return (
    <AbsoluteFill>
      {sites.map((s, i) => (
        <Appear key={i} at={c(1) + i * 8} y={40} style={{ ...abs(90, 70 + i * 160, 940, 136), ...card, display: "flex", alignItems: "center", gap: 26, padding: "0 30px", borderRight: `12px solid ${s.color}` }}>
          <img src={img(s.mark)} style={{ width: 88, borderRadius: 22 }} />
          <div><div style={{ ...body, fontSize: 26 }}>{s.name}</div><div style={{ fontFamily: FONT.mono, fontWeight: 600, fontSize: 40, color: s.color, direction: "ltr", textAlign: "right" }}>{s.url}</div></div>
        </Appear>
      ))}
      {frame >= c(2) && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 420, textAlign: "center", transform: `scale(${big})` }}>
          <div style={{ ...title, fontWeight: 900, fontSize: 130, backgroundImage: `linear-gradient(90deg, ${C.cs}, ${C.neuro})`, WebkitBackgroundClip: "text", color: "transparent" }}>בהצלחה!</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

export const BOARDS: Record<string, React.FC<BoardProps>> = {
  sites: Sites, scatter: Scatter, contentCode: ContentCode, sources: Sources, aiLoop: AiLoop, pipeline: Pipeline,
  smart: Smart, twoSites: TwoSites, neuroBuild: NeuroBuild, team: Team, tips: Tips, outro: Outro,
};
