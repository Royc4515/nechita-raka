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

/** 12 turns of at most 800 characters (Hebrew is 2 bytes a letter in UTF-8), plus JSON. */
const MAX_CHAT_BODY_BYTES = 32_768;
/** At or above this Prompt Guard score, the message is treated as a jailbreak attempt. */
export const GUARD_THRESHOLD = 0.9;

/** What the handler needs from the outside world; tests pass fakes instead. */
export function defaultChatDeps() {
  return {
    config: readChatConfig(),
    knowledge: getKnowledge(),
    limiter: (config) => limiterFor(config.databaseUrl, config.salt),
    guard: (config) =>
      config.guardModel ? new PromptGuard(new OpenAICompatibleProvider(config.guardModel, config.groqApiKey, { timeoutMs: 4_000 })) : null,
    chain: (config) => new FallbackChain(config.models.map((model) => new OpenAICompatibleProvider(model, config.groqApiKey))),
    now: () => new Date(),
  };
}

/**
 * POST /api/chat   { persona: "bit" | "byte", messages: [{ role, content }] }
 *   -> { reply, sources: [{ title, url }] }
 *
 * validate -> rate-limit -> injection guard -> retrieve -> model chain -> output hooks.
 * Nothing about the conversation is stored; only a hashed per-visitor counter for one day.
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
  const hebrew = isHebrew(latest) || !/[a-z]/i.test(latest);
  const blocked = (reason) => json({ reply: cannedReply(reason, hebrew), sources: [], blocked: true });

  const today = israelToday(deps.now());
  // Fails closed: without the counter there is nothing between a script and the free quota.
  try {
    const verdict = await deps.limiter(config).take(clientIp(request) ?? "unknown", deps.now().toISOString().slice(0, 10));
    if (verdict !== "ok") return json({ error: verdict }, 429);
  } catch (err) {
    console.error(JSON.stringify({ chat: "limiter_failed", error: err instanceof Error ? err.name : "unknown" }));
    return json({ error: "chat_unavailable" }, 503);
  }

  // Fails open: the guard is one layer of several, and the output hooks still run.
  const score = await deps.guard(config)?.score(latest);
  if (score != null && score >= GUARD_THRESHOLD) return blocked("injection");

  const facts = retrieve(knowledge.chunks, retrievalQuery(turns));
  const canary = canaryFor(config.salt);
  const request_ = buildRequest({ personaId, core: knowledge.core(today), facts, history: turns, canary });
  const result = await deps.chain(config).run(request_, parseDraft);
  if (!result.ok) return json({ error: result.busy ? "busy" : "chat_unavailable" }, 503);
  console.info(JSON.stringify({ chat: "ok", model: result.completion.model, prompt: result.completion.promptTokens, cached: result.completion.cachedTokens }));

  const byId = new Map(knowledge.chunks.map((c) => [c.id, c]));
  const outcome = runOutputHooks(result.value, {
    canary,
    allowedUrls: knowledge.allowedUrls,
    allowedEmails: knowledge.allowedEmails,
    chunkIds: new Set(byId.keys()),
  });
  if (!outcome.ok) return blocked(outcome.reason);
  const sources = outcome.draft.sources.map((id) => ({ title: byId.get(id).title, url: byId.get(id).url }));
  return json({ reply: outcome.draft.answer, sources });
}
