import { defaultAdminDeps, handleStats } from "../_lib/admin/handler.js";

/** GET /api/admin/stats: the dashboard's numbers, or a CSV. See api/_lib/admin/handler.js. */
export const GET = (request) => handleStats(request, defaultAdminDeps());
