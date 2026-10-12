import { defaultWeeklyDeps, handleWeekly } from "../_lib/admin/weekly.js";

/** GET /api/cron/weekly: Sunday's summary email (Vercel cron). See api/_lib/admin/weekly.js. */
export const GET = (request) => handleWeekly(request, defaultWeeklyDeps());
