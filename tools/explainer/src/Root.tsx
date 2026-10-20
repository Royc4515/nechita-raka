import React from "react";
import { Composition, registerRoot } from "remotion";
import { Explainer } from "./Explainer";
import { FPS, TL } from "./timeline";

const Root: React.FC = () => (
  <Composition id="Explainer" component={Explainer} durationInFrames={TL.total} fps={FPS} width={1920} height={1080} />
);

registerRoot(Root);
