import { neon } from "@neondatabase/serverless";

/**
 * Anonymous daily counters for the admin dashboard: one row per (day, kind, key), never anything
 * about a visitor. Keys are checked (against data.js, or a fixed list) before they get here; the
 * only free text is a site search, which searchKey() cleans and which is capped per day.
 */
export const KINDS = Object.freeze(["view", "click", "topic", "chat", "search", "search_miss", "source", "visitors", "device", "app", "system",
  "gsc_clicks", "gsc_impr", "gsc_pos", "gsc_q_clicks", "gsc_q_impr", "gsc_p_clicks", "gsc_p_impr"]);
/** At most this many different free-text keys per kind per day, so a script can't flood the table. */
export const MAX_FREE_KEYS_PER_DAY = 300;

const SCHEMA = `create table if not exists site_stats (
  day   date not null,
  kind  text not null check (char_length(kind) between 1 and 20),
  key   text not null check (char_length(key) between 1 and 300),
  count integer not null default 0,
  primary key (day, kind, key)
)`;

// Today's visitors as salted hashes (never an IP), so each counts once a day; rows older than a
// day are deleted, the same way the chat's limiter handles its own.
const VISITORS_SCHEMA = `create table if not exists site_visitors (
  day  date not null,
  hash text not null check (char_length(hash) between 1 and 100),
  primary key (day, hash)
)`;

/**
 * query: (text, params) => Promise<rows>. transaction: ([[text, params], ...]) => Promise, all or
 * nothing; without one (tests), the statements run one after another.
 */
export class PgStatsStore {
  constructor(query, transaction = null) {
    this.query = query;
    this.transaction = transaction ?? (async (statements) => {
      for (const [text, params] of statements) await query(text, params);
    });
    this.schemaReady = null;
  }

  ensureSchema() {
    this.schemaReady ??= Promise.all([this.query(SCHEMA), this.query(VISITORS_SCHEMA)]).then(() => undefined).catch((err) => {
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
   * Replaces every counter of these kinds between from and to with `counters` ([{ day, kind, key,
   * count }]): for data copied from elsewhere (Search Console), where a later copy is more complete.
   */
  async replaceRange(from, to, kinds, counters) {
    await this.ensureSchema();
    // One transaction: a failed insert leaves the previous copy in place, not a hole.
    const statements = [[`delete from site_stats where day between $1::date and $2::date and kind = any($3::text[])`, [from, to, kinds]]];
    for (let i = 0; i < counters.length; i += 1_000) {
      const part = counters.slice(i, i + 1_000);
      statements.push([
        `insert into site_stats as s (day, kind, key, count)
         select d::date, k, key, c from unnest($1::text[], $2::text[], $3::text[], $4::int[]) as t(d, k, key, c)
         on conflict (day, kind, key) do update set count = excluded.count`,
        [part.map((c) => c.day), part.map((c) => c.kind), part.map((c) => c.key), part.map((c) => c.count)],
      ]);
    }
    await this.transaction(statements);
  }

  /** Like bump for one free-text key, unless the day already has MAX_FREE_KEYS_PER_DAY other keys of this kind. */
  async bumpCapped(day, kind, key) {
    await this.ensureSchema();
    await this.query(
      `insert into site_stats as s (day, kind, key, count)
       select $1::date, $2, $3, 1
       where exists (select 1 from site_stats where day = $1::date and kind = $2 and key = $3)
          or (select count(*) from site_stats where day = $1::date and kind = $2) < $4
       on conflict (day, kind, key) do update set count = s.count + 1`,
      [day, kind, key, MAX_FREE_KEYS_PER_DAY],
    );
  }

  /** true the first time this hash is seen on this day. The first new visitor of a day clears older hashes. */
  async registerVisitor(day, hash) {
    await this.ensureSchema();
    const rows = await this.query(
      `insert into site_visitors (day, hash) values ($1::date, $2) on conflict do nothing returning hash`,
      [day, hash],
    );
    return rows.length > 0;
  }

  /**
   * A once-only job (kind 'system'), e.g. this week's email. The row's count is the minute the job
   * was claimed (Unix minutes), or 0 once it is done. true when this caller may run it: nobody has
   * claimed it, or a claim older than `staleMinutes` never finished (it failed or was cut off).
   */
  async claimOnce(day, key, nowMinutes, staleMinutes) {
    await this.ensureSchema();
    const rows = await this.query(
      `insert into site_stats as s (day, kind, key, count) values ($1::date, 'system', $2, $3::int)
       on conflict (day, kind, key) do update set count = excluded.count
       where s.count > 0 and s.count < $3::int - $4::int
       returning key`,
      [day, key, nowMinutes, staleMinutes],
    );
    return rows.length > 0;
  }

  /** Marks a claimed job done, so it never runs again. */
  async markDone(day, key) {
    await this.query(`update site_stats set count = 0 where day = $1::date and kind = 'system' and key = $2`, [day, key]);
  }

  async forgetOldVisitors(day) {
    await this.query(`delete from site_visitors where day < $1::date - 1`, [day]);
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
         where day between $1::date and $2::date and kind <> 'system' order by day, kind, key`,
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
    shared = {
      url: databaseUrl,
      store: new PgStatsStore(
        (text, params) => sql.query(text, params),
        (statements) => sql.transaction(statements.map(([text, params]) => sql.query(text, params))),
      ),
    };
  }
  return shared.store;
}
