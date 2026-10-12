import { neon } from "@neondatabase/serverless";

/**
 * Anonymous daily counters for the admin dashboard: one row per (day, kind, key), never anything
 * about a visitor. kind is one of KINDS; key is checked against data.js before it gets here.
 */
export const KINDS = Object.freeze(["view", "click", "topic", "chat"]);

const SCHEMA = `create table if not exists site_stats (
  day   date not null,
  kind  text not null check (char_length(kind) between 1 and 20),
  key   text not null check (char_length(key) between 1 and 300),
  count integer not null default 0,
  primary key (day, kind, key)
)`;

/** query: (text, params) => Promise<rows>. */
export class PgStatsStore {
  constructor(query) {
    this.query = query;
    this.schemaReady = null;
  }

  ensureSchema() {
    this.schemaReady ??= this.query(SCHEMA).then(() => undefined).catch((err) => {
      this.schemaReady = null;
      throw err;
    });
    return this.schemaReady;
  }

  /** Adds one to each key (a key listed twice counts once). */
  async bump(day, kind, keys) {
    const unique = [...new Set(keys)];
    if (!unique.length) return;
    await this.ensureSchema();
    await this.query(
      `insert into site_stats as s (day, kind, key, count)
       select $1::date, $2, k, 1 from unnest($3::text[]) as k
       on conflict (day, kind, key) do update set count = s.count + 1`,
      [day, kind, unique],
    );
  }

  /**
   * Every counter between from and to (inclusive), as [{ day, kind, key, count }], days as YYYY-MM-DD.
   * The chat's own daily totals live in chat_usage (see chat/limiter.js) and come back as
   * kind "chat_day" with key "messages" or "visitors".
   */
  async read(from, to) {
    await this.ensureSchema();
    const [stats, chat] = await Promise.all([
      this.query(
        `select to_char(day, 'YYYY-MM-DD') as day, kind, key, count from site_stats
         where day between $1::date and $2::date order by day, kind, key`,
        [from, to],
      ),
      this.query(
        `select to_char(day, 'YYYY-MM-DD') as day, split_part(bucket, ':', 1) as key, count from chat_usage
         where day between $1::date and $2::date and (bucket like 'global:%' or bucket like 'visitors:%')`,
        [from, to],
      ).catch((err) => {
        // Before the first chat message there is no chat_usage table yet: no chat totals, not an error.
        if (err?.code === "42P01") return [];
        throw err;
      }),
    ]);
    const chatRows = chat.map((r) => ({ day: r.day, kind: "chat_day", key: r.key === "global" ? "messages" : "visitors", count: Number(r.count) }));
    return [...stats.map((r) => ({ ...r, count: Number(r.count) })), ...chatRows];
  }
}

let shared = null;

export function statsStoreFor(databaseUrl) {
  if (shared?.url !== databaseUrl) {
    const sql = neon(databaseUrl);
    shared = { url: databaseUrl, store: new PgStatsStore((text, params) => sql.query(text, params)) };
  }
  return shared.store;
}
