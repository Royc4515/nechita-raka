import { defaultSyncDeps, handleSync } from "../_lib/search/sync.js";

/** GET /api/cron/search-console: copies Search Console into the counters. See api/_lib/search/sync.js. */
export const GET = (request) => handleSync(request, defaultSyncDeps());
