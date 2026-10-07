/** Small Web-standard helpers for the /api functions. */

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export const errors = {
  notConfigured: () => json({ error: "not_configured" }, 503),
  forbidden: () => json({ error: "forbidden" }, 403),
  badRequest: (error = "bad_request") => json({ error }, 400),
};

/**
 * Writes must come from this site's own pages. With the JSON content type (which forces a CORS
 * preflight cross-site) this keeps other sites' pages from using visitors' browsers. Scripts can
 * fake the header, so the real protection against abuse is the rate limiter.
 */
export function isSameOriginWrite(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

/** The parsed JSON object body, or `null` when it is not a JSON object within `maxBytes`. */
export async function readJsonObject(request, maxBytes) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return null;
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) return null;
  let text;
  try {
    text = await request.text();
  } catch {
    return null;
  }
  if (text.length > maxBytes) return null;
  try {
    const value = JSON.parse(text);
    return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}
