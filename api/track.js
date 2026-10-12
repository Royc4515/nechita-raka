import { defaultTrackDeps, handleTrack } from "./_lib/stats/track.js";

/** POST /api/track: anonymous page-view and link-click counters. See api/_lib/stats/track.js. */
export const POST = (request) => handleTrack(request, defaultTrackDeps());
