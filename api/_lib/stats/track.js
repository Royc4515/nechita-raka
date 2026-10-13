import { createHash } from "node:crypto";
import { getKnowledge, israelToday } from "../chat/knowledge.js";
import { clientIp } from "../chat/limiter.js";
import { errors, isSameOriginWrite, readJsonObject } from "../http.js";
import { deviceOf, getCatalog, searchKey } from "./catalog.js";
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
/** Searches are free text, so one IP gets fewer of them before they stop counting. */
export const SEARCH_BURST_LIMIT = 20;
const sharedSearchBurst = new BurstLimiter(SEARCH_BURST_LIMIT);

export function databaseUrlFrom(env = process.env) {
  return (env.DATABASE_URL ?? env.POSTGRES_URL)?.trim() || null;
}

/** A short salt makes the visitor hashes guessable by brute force over the IPv4 space. */
const MIN_SALT_LENGTH = 32;

/** The day's visitor hash: salted, and different from the chat limiter's hash of the same IP. */
export function visitorHash(ip, day, salt) {
  return createHash("sha256").update(`${salt}|site|${day}|${ip}`).digest("hex").slice(0, 32);
}

export function defaultTrackDeps() {
  const databaseUrl = databaseUrlFrom();
  const salt = process.env.CHAT_SALT?.trim();
  return {
    store: databaseUrl ? statsStoreFor(databaseUrl) : null,
    salt: salt && salt.length >= MIN_SALT_LENGTH ? salt : null,
    catalog: getCatalog(getKnowledge()),
    burst: sharedBurst,
    searchBurst: sharedSearchBurst,
    now: () => new Date(),
  };
}

const done = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

/**
 * POST /api/track -> 204
 *   { kind: "view", key: "/exams", source? }  a page view; a visitor's first view of the day also counts
 *                                              the visitor, their device and where they came from (SOURCES)
 *   { kind: "click", key: "https://..." }       a click on a link from data.js
 *   { kind: "search", key: "...", results: n }  a site search the visitor settled on; results 0 also counts a miss
 *   { kind: "app", key: "launch" | "installed" | "button" }  opened from the home screen, installed, or the
 *                                              add-to-home-screen button tapped (APP_EVENTS)
 * Nothing that identifies the visitor is kept: no IP, no cookie, no id (the day's visitor hash is
 * deleted after a day). Unknown keys and bots are answered 204 too and simply not counted.
 */
export async function handleTrack(request, deps) {
  if (!deps.store) return errors.notConfigured();
  if (!isSameOriginWrite(request)) return errors.forbidden();
  const body = await readJsonObject(request, MAX_TRACK_BODY_BYTES);
  if (!body) return errors.badRequest();
  const userAgent = request.headers.get("user-agent") ?? "";
  if (BOT_UA.test(userAgent)) return done();
  const ip = clientIp(request) ?? "unknown";
  if (deps.burst && !deps.burst.allow(ip, deps.now().getTime())) return done();

  if (body.kind === "search" && deps.searchBurst && !deps.searchBurst.allow(ip, deps.now().getTime())) return done();

  const day = israelToday(deps.now());
  try {
    await record(deps, day, body, { ip, userAgent });
  } catch (err) {
    console.error(JSON.stringify({ track: "store_failed", error: err instanceof Error ? err.name : "unknown" }));
  }
  return done();
}

async function record(deps, day, body, visitor) {
  const { store, catalog } = deps;
  if (body.kind === "view") {
    const page = catalog.page(body.key);
    if (!page) return;
    await store.bump(day, "view", [page]);
    const source = catalog.source(body.source);
    if (deps.salt) await countVisitor(store, day, { ...visitor, source }, deps.salt);
    else if (source) await store.bump(day, "source", [source]);
  } else if (body.kind === "click") {
    const link = catalog.link(body.key);
    if (link) await store.bump(day, "click", [link]);
  } else if (body.kind === "app") {
    const event = catalog.app(body.key);
    if (event) await store.bump(day, "app", [event]);
  } else if (body.kind === "search") {
    const query = searchKey(body.key);
    if (!query || !Number.isInteger(body.results) || body.results < 0 || body.results > 10_000) return;
    await store.bumpCapped(day, "search", query);
    if (body.results === 0) await store.bumpCapped(day, "search_miss", query);
  }
}

let lastCleanup = null;

/** A visitor's first view of the day adds one visitor, their kind of device and where they came from. */
async function countVisitor(store, day, { ip, userAgent, source }, salt) {
  if (!(await store.registerVisitor(day, visitorHash(ip, day, salt)))) return;
  await Promise.all([
    store.bump(day, "visitors", ["all"]),
    store.bump(day, "device", [deviceOf(userAgent)]),
    source ? store.bump(day, "source", [source]) : null,
  ]);
  // Each warm instance clears the older hashes on its first new visitor of a day.
  if (lastCleanup !== day) {
    lastCleanup = day;
    await store.forgetOldVisitors(day);
  }
}
