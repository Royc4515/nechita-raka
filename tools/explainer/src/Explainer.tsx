import React from "react";
import { AbsoluteFill } from "remotion";
import { Background, Grain } from "./Background";
import { Board } from "./Board";
import { Cameo, Character } from "./Character";
import { Intro } from "./Intro";
import { Captions, Confetti, Glossary, TopBar } from "./Overlay";
import { Sound } from "./Sound";
import { INTRO, TL } from "./timeline";

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
      <Cameo file="her-celebrate.webp" x={1500} at={outro.from + 26} height={380} />
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
