// One question to <target>/api/chat, shaped like the browser's chat.js sends it; the server side
// is api/_lib/chat/handler.js. askOnce never retries: the transcript records what happened.
// askWithBackoff retries only a 503 `busy` (the model provider's per-minute token budget), which
// refills within about a minute; everything else is recorded as it came.

import { FACULTIES } from "../../faculties/index.js";

/** Hosts the script refuses: every faculty's production site is capped and its dashboard would count the run. */
export const PRODUCTION_HOSTS = new Set(Object.values(FACULTIES).map((f) => new URL(f.site.url).hostname));
export const MIN_DELAY_MS = 1000;
/**
 * Pause between questions. The prompt is about 8,000 characters of Hebrew per message; at one
 * second both Groq models hit their per-minute token budget after about seven messages (baseline
 * run of 15.10.2026), at twenty seconds a full run of 50 messages went through without a `busy`.
 */
export const DEFAULT_DELAY_MS = 20_000;
/** A `busy` answer is retried this many times, after this wait: the budget refills per minute. */
export const BUSY_RETRIES = 2;
export const BUSY_WAIT_MS = 60_000;
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
  // "nechita-raka.vercel.app." (trailing dot) resolves to the same site, so the dot is dropped first.
  const host = url.hostname.toLowerCase().replace(/\.+$/, "");
  if (PRODUCTION_HOSTS.has(host)) {
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
      // A redirect would re-send the question to a host the production guard never saw.
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status >= 300 && res.status < 400) {
      return { outcome: "error", answer: "", sources: [], detail: `HTTP ${res.status} redirect to ${res.headers.get("location") ?? "?"} (not followed)` };
    }
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

const isBusy = (reply) => reply.outcome === "error" && reply.detail === "HTTP 503 busy";
const times = (n, what) => `${n} ${n === 1 ? what : what.replace(/y$/, "ies")}`;

/**
 * askOnce, retried while the server answers 503 `busy`. After a retry the reply keeps its own
 * outcome and detail (an `ok`, or whatever failed last, `busy` included) and `detail` gains the
 * retry count. `sleep` is injectable for tests.
 */
export async function askWithBackoff(target, persona, text, { retries = BUSY_RETRIES, waitMs = BUSY_WAIT_MS, sleep = defaultSleep, ...askOptions } = {}) {
  let reply = await askOnce(target, persona, text, askOptions);
  let attempts = 0;
  while (isBusy(reply) && attempts < retries) {
    attempts += 1;
    await sleep(waitMs);
    reply = await askOnce(target, persona, text, askOptions);
  }
  if (attempts === 0) return reply;
  const retried = `after ${times(attempts, "busy retry")}`;
  return { ...reply, detail: reply.detail ? `${reply.detail} (${retried})` : retried };
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
