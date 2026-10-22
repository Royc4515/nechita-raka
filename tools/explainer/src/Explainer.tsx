import React from "react";
import { AbsoluteFill } from "remotion";
import { Background, Grain } from "./Background";
import { Board } from "./Board";
import { Cameo, Character } from "./Character";
import { Intro } from "./Intro";
import { Captions, Confetti, Glossary, ShortHeader, TopBar } from "./Overlay";
import { Sound } from "./Sound";
import { TimelineContext } from "./context";
import { C } from "./lib";
import { INTRO, TL, TL_SHORT, TL_TOUR } from "./timeline";

export const Explainer: React.FC = () => {
  const outro = TL.scenes[TL.scenes.length - 1];
  const lastLine = TL.lines[TL.lines.length - 1];
  return (
    <AbsoluteFill style={{ backgroundColor: "#070c18" }}>
      <Background />
      <Intro />
      <TopBar />
      <Board />
      {/* Byte comes back with Bit for the goodbye, behind him */}
      <Cameo file="her-celebrate.webp" x={1500} at={outro.from + 26} height={380} tag={{ name: "בייט", site: "מדעי המחשב" }} />
      <Character who="noi" enterAt={INTRO - 8} />
      <Character who="ron" enterAt={INTRO - 2} />
      <Character who="bit" enterAt={INTRO} />
      <Glossary />
      <Captions />
      <Confetti at={lastLine.cues[0] ?? lastLine.from} originX={960} originY={360} count={180} />
      <Grain />
      <Sound />
    </AbsoluteFill>
  );
};

/** The 9:16 short: the same pieces on the short timeline, with a header instead of the intro and chapter bar. */
export const Short: React.FC = () => {
  const lastLine = TL_SHORT.lines[TL_SHORT.lines.length - 1];
  return (
    <TimelineContext.Provider value={TL_SHORT}>
      <AbsoluteFill style={{ backgroundColor: "#070c18" }}>
        <Background />
        <ShortHeader />
        <Board />
        <Character who="ron" enterAt={2} />
        <Character who="noi" enterAt={6} />
        <Character who="bit" enterAt={0} />
        <Glossary />
        <Captions />
        <Confetti at={lastLine.cues[0] ?? lastLine.from} originX={540} originY={700} count={160} />
        <Grain />
        <Sound />
      </AbsoluteFill>
    </TimelineContext.Provider>
  );
};

/** The 9:16 site tour: Noi and Ron show what is on the brain sciences site. */
export const Tour: React.FC = () => {
  const lastLine = TL_TOUR.lines[TL_TOUR.lines.length - 1];
  return (
    <TimelineContext.Provider value={TL_TOUR}>
      <AbsoluteFill style={{ backgroundColor: "#070c18" }}>
        <Background />
        <ShortHeader headline={<>מה יש באתר של <span style={{ color: C.neuroLight }}>מדעי המוח</span></>} />
        <Board />
        <Character who="ron" enterAt={2} />
        <Character who="noi" enterAt={6} />
        <Captions />
        <Confetti at={lastLine.cues[0] ?? lastLine.from} originX={540} originY={700} count={160} />
        <Grain />
        <Sound />
      </AbsoluteFill>
    </TimelineContext.Provider>
  );
};
