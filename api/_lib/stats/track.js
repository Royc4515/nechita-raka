import { getKnowledge, israelToday } from "../chat/knowledge.js";
import { clientIp } from "../chat/limiter.js";
import { errors, isSameOriginWrite, readJsonObject } from "../http.js";
import { getCatalog } from "./catalog.js";
import { statsStoreFor } from "./store.js";

const MAX_TRACK_BODY_BYTES = 4_096;
/** Crawlers and link previews don't count as visits. */
const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|python|curl|wget/i;

/**
 * A light brake on a script replaying counts: per warm instance, so it only blunts a flood (the
 * numbers are a guide, not an audit). Kept in memory on purpose: no extra database write per view.
 */
export const BURST_LIMIT = 120;
const BURST_WINDOW_MS = 10 * 60_000;
const MAX_TRACKED_IPS = 5_000;

export class BurstLimiter {
  constructor(limit = BURST_LIMIT, windowMs = BURST_WINDOW_MS) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.seen = new Map();
  }

  /** true while this IP stays under the limit in the current window. */
  allow(ip, nowMs) {
    const entry = this.seen.get(ip);
    if (!entry || nowMs - entry.start >= this.windowMs) {
      if (this.seen.size >= MAX_TRACKED_IPS) this.seen.clear();
      this.seen.set(ip, { start: nowMs, count: 1 });
      return true;
    }
    this.seen.set(ip, { start: entry.start, count: entry.count + 1 });
    return entry.count + 1 <= this.limit;
  }
}

const sharedBurst = new BurstLimiter();

export function databaseUrlFrom(env = process.env) {
  return (env.DATABASE_URL ?? env.POSTGRES_URL)?.trim() || null;
}

export function defaultTrackDeps() {
  const databaseUrl = databaseUrlFrom();
  return {
    store: databaseUrl ? statsStoreFor(databaseUrl) : null,
    catalog: getCatalog(getKnowledge()),
    burst: sharedBurst,
    now: () => new Date(),
  };
}

const done = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

/**
 * POST /api/track  { kind: "view", key: "/exams" } | { kind: "click", key: "https://..." }  -> 204
 * Adds one to today's counter for that page or link. Nothing about the visitor is kept: no IP,
 * no cookie, no id. Unknown keys and bots are answered 204 too and simply not counted.
 */
export async function handleTrack(request, deps) {
  if (!deps.store) return errors.notConfigured();
  if (!isSameOriginWrite(request)) return errors.forbidden();
  const body = await readJsonObject(request, MAX_TRACK_BODY_BYTES);
  if (!body) return errors.badRequest();
  if (BOT_UA.test(request.headers.get("user-agent") ?? "")) return done();

  if (deps.burst && !deps.burst.allow(clientIp(request) ?? "unknown", deps.now().getTime())) return done();

  const key = body.kind === "view" ? deps.catalog.page(body.key) : body.kind === "click" ? deps.catalog.link(body.key) : null;
  if (!key) return done();
  try {
    await deps.store.bump(israelToday(deps.now()), body.kind, [key]);
  } catch (err) {
    console.error(JSON.stringify({ track: "store_failed", error: err instanceof Error ? err.name : "unknown" }));
  }
  return done();
}
