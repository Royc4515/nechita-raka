import { getKnowledge } from "../chat/knowledge.js";
import { errors, isSameOriginWrite, json, readJsonObject } from "../http.js";
import { getCatalog } from "../stats/catalog.js";
import { statsStoreFor } from "../stats/store.js";
import { adminFromGoogleToken, adminFromRequest, createSession, readAdminConfig, sessionCookie } from "./auth.js";
import { buildReport, parseRange, toCsv } from "./report.js";

const MAX_SESSION_BODY_BYTES = 8_192;

export function defaultAdminDeps() {
  const config = readAdminConfig();
  return {
    config,
    store: config ? statsStoreFor(config.databaseUrl) : null,
    catalog: getCatalog(getKnowledge()),
    verifyGoogle: (token) => adminFromGoogleToken(token, config),
    now: () => new Date(),
  };
}

const withCookie = (response, cookie) => {
  response.headers.append("Set-Cookie", cookie);
  return response;
};

/**
 * /api/admin/session
 *   GET    -> { signedIn, email?, clientId }   (the page needs the client id to show Google's button)
 *   POST   { credential } (Google's ID token)  -> { email } and the session cookie, or 403
 *   DELETE -> signs out
 */
export async function handleSession(request, deps) {
  const { config } = deps;
  if (!config) return errors.notConfigured();
  if (request.method === "GET") {
    const email = await adminFromRequest(request, config, deps.now());
    return json(email ? { signedIn: true, email, clientId: config.googleClientId } : { signedIn: false, clientId: config.googleClientId });
  }
  if (!isSameOriginWrite(request)) return errors.forbidden();
  if (request.method === "DELETE") return withCookie(json({ signedIn: false }), sessionCookie(null));
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const body = await readJsonObject(request, MAX_SESSION_BODY_BYTES);
  if (!body) return errors.badRequest();
  const email = await deps.verifyGoogle(body.credential);
  if (!email) {
    console.warn(JSON.stringify({ admin: "sign_in_refused" }));
    return errors.forbidden();
  }
  const token = await createSession(email, config, deps.now());
  return withCookie(json({ signedIn: true, email }), sessionCookie(token));
}

/**
 * GET /api/admin/stats?from=YYYY-MM-DD&to=YYYY-MM-DD[&format=csv]
 *   -> the report (see report.js), or the raw counters as a CSV download. Admins only.
 */
export async function handleStats(request, deps) {
  const { config } = deps;
  if (!config) return errors.notConfigured();
  if (!(await adminFromRequest(request, config, deps.now()))) return json({ error: "signed_out" }, 401);
  const params = new URL(request.url).searchParams;
  const range = parseRange(params);
  if (!range) return errors.badRequest("invalid_range");

  let rows;
  try {
    rows = await deps.store.read(range.from, range.to);
  } catch (err) {
    console.error(JSON.stringify({ admin: "read_failed", error: err instanceof Error ? err.name : "unknown" }));
    return json({ error: "unavailable" }, 503);
  }
  if (params.get("format") === "csv") {
    return new Response(toCsv(rows, deps.catalog), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="nechita-raka-stats_${range.from}_${range.to}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }
  return json({ ...buildReport(rows, range, deps.catalog), generatedAt: deps.now().toISOString() });
}
