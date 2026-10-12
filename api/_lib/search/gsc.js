/**
 * Google Search Console: what people searched on Google before they reached the site, and which
 * pages Google showed. Read-only, with no key or password anywhere: the function proves who it
 * is with Vercel's OIDC token, Google swaps that for a short-lived token of a service account
 * (Workload Identity Federation), and that service account is a restricted user of the property.
 */
import { getVercelOidcToken } from "@vercel/oidc";
import { ExternalAccountClient } from "google-auth-library";

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const API = "https://searchconsole.googleapis.com/webmasters/v3/sites";
/** The most one request may ask for; 30 days of this site's queries are far fewer. */
const ROW_LIMIT = 25_000;
/** A key longer than this can't be stored (site_stats checks it), so such a page is skipped. */
const MAX_PATH = 300;

/** `null` (sync off) unless the federation settings are all set. None of them is a secret. */
export function readGscConfig(env = process.env) {
  const projectNumber = env.GCP_PROJECT_NUMBER?.trim();
  const serviceAccount = env.GCP_SERVICE_ACCOUNT_EMAIL?.trim();
  const pool = env.GCP_WORKLOAD_IDENTITY_POOL_ID?.trim();
  const provider = env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID?.trim();
  const siteUrl = env.GSC_SITE_URL?.trim();
  if (!projectNumber || !serviceAccount || !pool || !provider || !siteUrl) return null;
  return { projectNumber, serviceAccount, pool, provider, siteUrl };
}

/** An access token for the Search Console API, from the function's own OIDC token. */
export async function gscAccessToken(config) {
  const audience = `//iam.googleapis.com/projects/${config.projectNumber}/locations/global/workloadIdentityPools/${config.pool}/providers/${config.provider}`;
  const client = ExternalAccountClient.fromJSON({
    type: "external_account",
    audience,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${config.serviceAccount}:generateAccessToken`,
    subject_token_supplier: { getSubjectToken: () => getVercelOidcToken({ audience: `https:${audience}` }) },
    scopes: [SCOPE],
  });
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("gsc_no_token");
  return token;
}

/** Search analytics rows for the dimensions, as { keys, clicks, impressions, ctr, position }. */
export async function querySearchAnalytics({ siteUrl, token, startDate, endDate, dimensions, fetchFn = fetch }) {
  const res = await fetchFn(`${API}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ startDate, endDate, dimensions, rowLimit: ROW_LIMIT, dataState: "all" }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`gsc_${res.status}`);
  const body = await res.json();
  return Array.isArray(body.rows) ? body.rows : [];
}

/** A page URL from Search Console as the site's own path ("/", "/exams"), or null for another site. */
export function pagePath(url, siteUrl) {
  try {
    const page = new URL(url);
    if (page.origin !== new URL(siteUrl).origin) return null;
    const path = page.pathname.replace(/^\/+/, "/").replace(/\.html$/, "").replace(/\/index$/, "/").replace(/(.)\/+$/, "$1");
    return path.length <= MAX_PATH ? path || "/" : null;
  } catch {
    return null;
  }
}

const MAX_QUERY = 120;
/** A Google query as stored: trimmed, single spaces, at most MAX_QUERY characters. */
export const queryKey = (q) => String(q ?? "").replace(/[\p{Cc}\p{Cf}]/gu, "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY);

/**
 * Search Console rows into daily counters, as [{ day, kind, key, count }]:
 *   gsc_clicks / gsc_impr / gsc_pos (key "all"; position x10, rounded) from the [date] rows,
 *   gsc_q_clicks / gsc_q_impr (key: the query) and gsc_p_clicks / gsc_p_impr (key: the path).
 * Zero counts are left out.
 */
export function toCounters({ byDate, byQuery, byPage }, siteUrl) {
  const out = [];
  const add = (day, kind, key, count) => {
    if (key && count > 0) out.push({ day, kind, key, count: Math.round(count) });
  };
  for (const r of byDate) {
    const [day] = r.keys;
    add(day, "gsc_clicks", "all", r.clicks);
    add(day, "gsc_impr", "all", r.impressions);
    if (r.impressions > 0) add(day, "gsc_pos", "all", r.position * 10);
  }
  const merge = new Map();
  const keep = (day, kind, key, count) => {
    const id = `${day}|${kind}|${key}`;
    merge.set(id, { day, kind, key, count: (merge.get(id)?.count ?? 0) + count });
  };
  for (const r of byQuery) {
    const [day, raw] = r.keys;
    const q = queryKey(raw);
    if (!q) continue;
    keep(day, "gsc_q_clicks", q, r.clicks);
    keep(day, "gsc_q_impr", q, r.impressions);
  }
  for (const r of byPage) {
    const [day, url] = r.keys;
    const path = pagePath(url, siteUrl);
    if (!path) continue;
    keep(day, "gsc_p_clicks", path, r.clicks);
    keep(day, "gsc_p_impr", path, r.impressions);
  }
  for (const c of merge.values()) add(c.day, c.kind, c.key, c.count);
  return out;
}
