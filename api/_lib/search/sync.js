/**
 * The daily copy of Search Console into site_stats, so the dashboard and the weekly email can
 * show Google next to the site's own counters. Search Console fills in a day over 2-3 days, so
 * every run copies the last SYNC_DAYS days again, replacing what the previous run copied.
 */
import { israelToday } from "../chat/knowledge.js";
import { errors, json } from "../http.js";
import { addDays, HISTORY_START } from "../admin/insights.js";
import { databaseUrlFrom } from "../stats/track.js";
import { statsStoreFor } from "../stats/store.js";
import { gscAccessToken, querySearchAnalytics, readGscConfig, toCounters } from "./gsc.js";
import { timingSafeEqual } from "node:crypto";

export const SYNC_DAYS = 30;
export const GSC_KINDS = Object.freeze(["gsc_clicks", "gsc_impr", "gsc_pos", "gsc_q_clicks", "gsc_q_impr", "gsc_p_clicks", "gsc_p_impr"]);

export function defaultSyncDeps() {
  const gsc = readGscConfig();
  const databaseUrl = databaseUrlFrom();
  return {
    gsc,
    store: databaseUrl ? statsStoreFor(databaseUrl) : null,
    cronSecret: process.env.CRON_SECRET?.trim() || null,
    token: () => gscAccessToken(gsc),
    query: (args) => querySearchAnalytics(args),
    now: () => new Date(),
  };
}

function sameSecret(given, expected) {
  const a = Buffer.from(String(given ?? ""));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * GET /api/cron/search-console  (Vercel cron, every morning before the weekly email)
 * Copies the last SYNC_DAYS days (from HISTORY_START at the earliest). Read-only toward Google and
 * idempotent here, so calling it again only repeats the same copy.
 */
export async function handleSync(request, deps) {
  if (!deps.gsc || !deps.store) return errors.notConfigured();
  if (deps.cronSecret && !sameSecret(request.headers.get("authorization"), `Bearer ${deps.cronSecret}`)) return errors.forbidden();

  const to = addDays(israelToday(deps.now()), -1);
  const earliest = addDays(to, -(SYNC_DAYS - 1));
  const from = earliest < HISTORY_START ? HISTORY_START : earliest;
  try {
    const token = await deps.token();
    const ask = (dimensions) => deps.query({ siteUrl: deps.gsc.siteUrl, token, startDate: from, endDate: to, dimensions });
    const [byDate, byQuery, byPage] = await Promise.all([ask(["date"]), ask(["date", "query"]), ask(["date", "page"])]);
    const counters = toCounters({ byDate, byQuery, byPage }, deps.gsc.siteUrl);
    await deps.store.replaceRange(from, to, GSC_KINDS, counters);
    return json({ synced: true, from, to, rows: counters.length });
  } catch (err) {
    console.error(JSON.stringify({ gsc: "sync_failed", error: err instanceof Error ? err.message.slice(0, 60) : "unknown" }));
    return json({ synced: false }, 503);
  }
}
