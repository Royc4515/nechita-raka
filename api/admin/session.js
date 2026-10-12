import { defaultAdminDeps, handleSession } from "../_lib/admin/handler.js";

/** /api/admin/session: Google sign-in for the dashboard. See api/_lib/admin/handler.js. */
const handle = (request) => handleSession(request, defaultAdminDeps());
export const GET = handle;
export const POST = handle;
export const DELETE = handle;
