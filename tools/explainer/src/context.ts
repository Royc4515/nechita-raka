import { createContext, useContext } from "react";
import { TL, type Timeline } from "./timeline";

/** Which timeline (and so which format) the components below are drawing. Defaults to the full video. */
export const TimelineContext = createContext<Timeline>(TL);
export const useTL = () => useContext(TimelineContext);
