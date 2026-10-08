import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

/** Messages one visitor may send per UTC day. A real conversation is rarely longer. */
export const PER_VISITOR_DAILY = 15;
/** Messages the whole site may send per UTC day, under the two models' free daily token limits. */
export const GLOBAL_DAILY = 150;

/** The visitor's bucket key: a salted hash, so the table never holds an IP address. */
export function visitorBucket(ip, day, salt) {
  return `ip:${createHash("sha256").update(`${salt}|${day}|${ip}`).digest("hex").slice(0, 32)}`;
}

/**
 * The caller's IP as Vercel's edge reports it. Vercel sets x-real-ip, and overwrites (does not
 * append to) x-forwarded-for, so a client can't forge either; `null` outside Vercel (tests).
 */
export function clientIp(request) {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}

// Idempotent: the first chat request creates the table.
const SCHEMA = `create table if not exists chat_usage (
  bucket text primary key check (char_length(bucket) between 1 and 100),
  day    date not null,
  count  integer not null default 0
)`;

/** query: (text, params) => Promise<rows>. take() resolves to "ok" | "rate_limited" | "daily_cap". */
export class PgChatLimiter {
  constructor(query, salt) {
    this.query = query;
    this.salt = salt;
    this.schemaReady = null;
  }

  ensureSchema() {
    this.schemaReady ??= this.query(SCHEMA).then(() => undefined).catch((err) => {
      this.schemaReady = null;
      throw err;
    });
    return this.schemaReady;
  }

  async bump(bucket, day) {
    const rows = await this.query(
      `insert into chat_usage as u (bucket, day, count) values ($1, $2::date, 1)
       on conflict (bucket) do update set count = u.count + 1
       returning count`,
      [bucket, day],
    );
    return Number(rows[0]?.count ?? Infinity);
  }

  async take(visitor, day) {
    await this.ensureSchema();
    const mine = await this.bump(visitorBucket(visitor, day, this.salt), day);
    // Usage stats: a visitor's first message of the day counts them once in visitors:<day>.
    if (mine === 1) await this.bump(`visitors:${day}`, day);
    if (mine > PER_VISITOR_DAILY) return "rate_limited";
    const total = await this.bump(`global:${day}`, day);
    // The first message of a day clears out older visitor rows: the hashes are useless after their
    // day. The global:<day> and visitors:<day> totals stay, as the chat's daily usage history.
    if (total === 1) await this.query(`delete from chat_usage where day < $1::date - 1 and bucket like 'ip:%'`, [day]);
    return total > GLOBAL_DAILY ? "daily_cap" : "ok";
  }
}

let shared = null;

export function limiterFor(databaseUrl, salt) {
  if (shared?.url !== databaseUrl) {
    const sql = neon(databaseUrl);
    shared = { url: databaseUrl, limiter: new PgChatLimiter((text, params) => sql.query(text, params), salt) };
  }
  return shared.limiter;
}
