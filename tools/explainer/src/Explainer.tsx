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
      {/* Byte and Ron join for the goodbye, behind the hosts */}
      <Cameo file="her-celebrate.webp" x={1500} at={outro.boardFrom + 20} height={380} />
      <Cameo file="ron-celebrate.webp" x={420} at={outro.boardFrom + 28} height={380} />
      <Character who="noi" x={215} enterAt={INTRO - 8} side={-1} />
      <Character who="bit" x={1705} enterAt={INTRO - 2} side={1} />
      <Glossary />
      <Captions />
      <Confetti at={lastLine.cues[0] ?? lastLine.from} originX={960} originY={360} count={180} />
      <Grain />
      <Sound />
    </AbsoluteFill>
  );
};
