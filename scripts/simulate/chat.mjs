// One question to <target>/api/chat, shaped like the browser's chat.js sends it; the server side
// is api/_lib/chat/handler.js. Nothing here retries: the transcript records what happened.

/** Hosts the script refuses: production is capped and its dashboard would count the run. */
export const PRODUCTION_HOSTS = new Set(["nechita-raka.vercel.app"]);
export const MIN_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 40_000;

/** The target as a URL, or throws when it is not http(s) or is the production site. */
export function assertNotProduction(target) {
  let url;
  try {
    url = new URL(target);
  } catch {
    throw new Error(`--target must be a full URL such as http://localhost:3000, got "${target}"`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error(`--target must be http or https, got ${url.protocol}`);
  if (PRODUCTION_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error(`refusing to run against production (${url.hostname}); use a preview deployment or localhost`);
  }
  return url;
}

/** { persona, lang?, messages }: the mascot as `persona`, `lang: "en"` only for the English site. */
export function buildChatRequest(persona, text) {
  return {
    persona: persona.mascot,
    ...(persona.language === "english" ? { lang: "en" } : {}),
    messages: [{ role: "user", content: text }],
  };
}

/**
 * The transcript's view of one HTTP answer:
 * { outcome: "ok" | "rate_limited" | "daily_cap" | "blocked" | "error", answer, sources, roy?, detail? }.
 */
export function classifyResponse(status, body) {
  const base = { answer: "", sources: [] };
  if (status === 200 && typeof body?.reply === "string") {
    const sources = Array.isArray(body.sources) ? body.sources.filter((s) => typeof s?.title === "string" && typeof s?.url === "string") : [];
    return { outcome: body.blocked === true ? "blocked" : "ok", answer: body.reply, sources, ...(body.roy === true ? { roy: true } : {}) };
  }
  if (status === 429 && (body?.error === "rate_limited" || body?.error === "daily_cap")) return { ...base, outcome: body.error, detail: "HTTP 429" };
  return { ...base, outcome: "error", detail: `HTTP ${status}${typeof body?.error === "string" ? ` ${body.error}` : ""}` };
}

/**
 * Sends one fresh conversation; a network failure or a timeout is an "error" outcome, never a throw.
 * `headers` adds to the request, e.g. Vercel's protection bypass for a preview deployment.
 */
export async function askOnce(target, persona, text, { fetchImpl = fetch, timeoutMs = REQUEST_TIMEOUT_MS, headers = {} } = {}) {
  const url = new URL("/api/chat", target);
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      // The handler accepts writes only from its own origin; the limiter is what protects the quota.
      headers: { ...headers, "Content-Type": "application/json", Origin: url.origin },
      body: JSON.stringify(buildChatRequest(persona, text)),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const raw = await res.text();
    let body = null;
    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }
    return classifyResponse(res.status, body);
  } catch (err) {
    // Node wraps a refused connection: the code sits on the cause, or on its first error for dual-stack hosts.
    const cause = err?.cause;
    const why = cause?.code ?? cause?.errors?.[0]?.code ?? cause?.message;
    return { outcome: "error", answer: "", sources: [], detail: `${err?.name ?? "Error"}: ${err?.message ?? err}${why ? ` (${why})` : ""}` };
  }
}
