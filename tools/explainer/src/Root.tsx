import React from "react";
import { Composition, registerRoot } from "remotion";
import { Explainer, Short } from "./Explainer";
import { FPS, TL, TL_SHORT } from "./timeline";

const Root: React.FC = () => (
  <>
    <Composition id="Explainer" component={Explainer} durationInFrames={TL.total} fps={FPS} width={1920} height={1080} />
    <Composition id="Short" component={Short} durationInFrames={TL_SHORT.total} fps={FPS} width={1080} height={1920} />
  </>
);

registerRoot(Root);
