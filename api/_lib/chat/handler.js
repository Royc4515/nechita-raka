import { readChatConfig } from "./config.js";
import { PromptGuard } from "./guard.js";
import { cannedReply, runOutputHooks } from "./hooks.js";
import { isHebrew, parseHistory, retrievalQuery } from "./history.js";
import { getKnowledge, israelToday } from "./knowledge.js";
import { clientIp, limiterFor } from "./limiter.js";
import { FallbackChain, OpenAICompatibleProvider } from "./llm.js";
import { DEFAULT_PERSONA, PERSONAS, buildRequest, canaryFor, parseDraft } from "./prompt.js";
import { retrieve } from "./retrieve.js";
import { errors, isSameOriginWrite, json, readJsonObject } from "../http.js";
import { statsStoreFor } from "../stats/store.js";

/** 12 turns of at most 800 characters (Hebrew is 2 bytes a letter in UTF-8), plus JSON. */
const MAX_CHAT_BODY_BYTES = 32_768;
/** At or above this Prompt Guard score, the message is treated as a jailbreak attempt. */
export const GUARD_THRESHOLD = 0.9;

/** What the handler needs from the outside world; tests pass fakes instead. */
export function defaultChatDeps() {
  return {
    config: readChatConfig(),
    knowledge: getKnowledge(),
    limiter: (config) => limiterFor(config.databaseUrl, config.salt, { perVisitorDaily: config.perVisitorDaily, globalDaily: config.globalDaily }),
    stats: (config) => statsStoreFor(config.databaseUrl),
    guard: (config) =>
      config.guardModel ? new PromptGuard(new OpenAICompatibleProvider(config.guardModel, config.groqApiKey, { timeoutMs: 4_000 })) : null,
    chain: (config) => new FallbackChain(config.models.map((model) => new OpenAICompatibleProvider(model, config.groqApiKey))),
    now: () => new Date(),
  };
}

/**
 * POST /api/chat   { persona: <a mascot id of the faculty, "bit" | "byte" for CS>, lang?: "en", messages: [{ role, content }] }
 *   -> { reply, sources: [{ title, url }] }
 *
 * validate -> rate-limit -> injection guard -> retrieve -> model chain -> output hooks.
 * Nothing about the conversation is stored; only a hashed per-visitor counter for one day, and
 * for the admin dashboard a daily count of how answers ended and which data.js sources they used.
 * Errors: 400, 403, 429 rate_limited/daily_cap, 503 not_configured/busy/chat_unavailable.
 */
export async function handleChat(request, deps) {
  const { config, knowledge } = deps;
  if (!config) return errors.notConfigured();
  if (!isSameOriginWrite(request)) return errors.forbidden();
  const body = await readJsonObject(request, MAX_CHAT_BODY_BYTES);
  if (!body) return errors.badRequest();
  const turns = parseHistory(body.messages);
  if (!turns) return errors.badRequest("invalid_messages");
  const personaId = Object.hasOwn(PERSONAS, body.persona) ? body.persona : DEFAULT_PERSONA;

  const latest = turns[turns.length - 1].content;
  // English when the student writes in English, or writes no words at all on the English site (lang: "en").
  const hebrew = isHebrew(latest) || (!/[a-z]/i.test(latest) && body.lang !== "en");
  const blocked = (reason) => json({ reply: cannedReply(reason, hebrew, personaId), sources: [], blocked: true });

  const today = israelToday(deps.now());
  const record = (outcome, sources = []) => recordStats(deps, config, today, outcome, sources);
  // Fails closed: without the counter there is nothing between a script and the free quota.
  try {
    const verdict = await deps.limiter(config).take(clientIp(request) ?? "unknown", today);
    if (verdict !== "ok") {
      await record(verdict);
      return json({ error: verdict }, 429);
    }
  } catch (err) {
    console.error(JSON.stringify({ chat: "limiter_failed", error: err instanceof Error ? err.name : "unknown" }));
    return json({ error: "chat_unavailable" }, 503);
  }

  // Fails open: the guard is one layer of several, and the output hooks still run.
  const score = await deps.guard(config)?.score(latest);
  if (score != null && score >= GUARD_THRESHOLD) {
    await record("blocked");
    return blocked("injection");
  }

  const facts = retrieve(knowledge.chunks, retrievalQuery(turns));
  const canary = canaryFor(config.salt);
  const request_ = buildRequest({ personaId, core: knowledge.core(today), facts, history: turns, canary, english: !hebrew });
  const result = await deps.chain(config).run(request_, parseDraft);
  if (!result.ok) {
    await record(result.busy ? "busy" : "unavailable");
    return json({ error: result.busy ? "busy" : "chat_unavailable" }, 503);
  }
  console.info(JSON.stringify({ chat: "ok", model: result.completion.model, prompt: result.completion.promptTokens, cached: result.completion.cachedTokens }));

  const byId = new Map(knowledge.chunks.map((c) => [c.id, c]));
  const outcome = runOutputHooks(result.value, {
    canary,
    allowedUrls: knowledge.allowedUrls,
    allowedEmails: knowledge.allowedEmails,
    chunkIds: new Set(byId.keys()),
  });
  if (!outcome.ok) {
    await record(outcome.reason === "empty" ? "unavailable" : "blocked");
    return blocked(outcome.reason);
  }
  await record(outcome.draft.inScope === false ? "out_of_scope" : "ok", outcome.draft.sources);
  const sources = outcome.draft.sources.map((id) => ({ title: byId.get(id).title, url: byId.get(id).url }));
  return json({ reply: outcome.draft.answer, sources, ...(needsRoyLine(latest, outcome.draft) ? { roy: true } : {}) });
}

const RESERVES_RE = /מילואים|מילואימניק|צו 8|אפוד אקדמי|reserv/i;
const RESERVES_SOURCES = /^(guide|tips):(reserves|academic-vest)$|^link:wa-reserves/;

/**
 * true when the question is about reserve duty (its words, or the reserves sources the answer used)
 * and the answer itself didn't point to Roy: the chat then adds a line under it with his WhatsApp.
 */
export function needsRoyLine(question, draft) {
  const aboutReserves = RESERVES_RE.test(question) || draft.sources.some((id) => RESERVES_SOURCES.test(id));
  return aboutReserves && !/רועי|\bRoy\b/i.test(draft.answer);
}

/** Dashboard counters: never in the way of an answer, so a failed write is only logged. */
async function recordStats(deps, config, day, outcome, sourceIds) {
  try {
    const store = deps.stats?.(config);
    if (!store) return;
    await Promise.all([store.bump(day, "chat", [outcome]), store.bump(day, "topic", sourceIds)]);
  } catch (err) {
    console.error(JSON.stringify({ chat: "stats_failed", error: err instanceof Error ? err.name : "unknown" }));
  }
}
