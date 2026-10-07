/**
 * A minimal OpenAI-compatible chat client (Groq speaks this API) and a fallback chain across
 * models. Plain fetch, no SDK: one endpoint, and tests inject a fake fetch.
 * Ported from the portfolio's Pixel Roy chat.
 */
export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

export class ProviderError extends Error {
  constructor(status, message, retryAfterSec = null) {
    super(message);
    this.status = status;
    /** Seconds the provider asked us to wait (Groq's `retry-after` on a 429), when it said. */
    this.retryAfterSec = retryAfterSec;
  }

  /** The free tier's per-minute token budget is spent; it refills within seconds. */
  get rateLimited() {
    return this.status === 429;
  }

  /** A bad or revoked key fails the same way on every model: no point trying the next one. */
  get fatal() {
    return this.status === 401 || this.status === 403;
  }
}

export class OpenAICompatibleProvider {
  constructor(model, apiKey, { fetchFn = (...args) => fetch(...args), baseUrl = GROQ_BASE_URL, timeoutMs = 10_000 } = {}) {
    this.model = model;
    this.apiKey = apiKey;
    this.fetchFn = fetchFn;
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
  }

  /** request: { messages, maxTokens, temperature?, jsonSchema?: { name, schema } } */
  async complete(request) {
    const body = { model: this.model, messages: request.messages, max_completion_tokens: request.maxTokens };
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.jsonSchema) {
      body.response_format = {
        type: "json_schema",
        json_schema: { name: request.jsonSchema.name, strict: true, schema: request.jsonSchema.schema },
      };
    }
    // gpt-oss reasons before answering, and those tokens count against the free-tier budget.
    if (this.model.startsWith("openai/gpt-oss")) body.reasoning_effort = "low";

    let res;
    try {
      res = await this.fetchFn(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new ProviderError(0, `${this.model}: ${err instanceof Error ? err.name : "network error"}`);
    }
    if (!res.ok) {
      const header = res.headers.get("retry-after");
      const wait = header === null || header.trim() === "" ? NaN : Number(header);
      throw new ProviderError(res.status, `${this.model}: HTTP ${res.status}`, Number.isFinite(wait) && wait >= 0 ? wait : null);
    }
    const data = await res.json().catch(() => null);
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new ProviderError(502, `${this.model}: no content`);
    return {
      content,
      model: this.model,
      promptTokens: Number(data?.usage?.prompt_tokens ?? 0) || 0,
      cachedTokens: Number(data?.usage?.prompt_tokens_details?.cached_tokens ?? 0) || 0,
    };
  }
}

/** Longest wait worth taking inside one request: the visitor is watching the thinking dots. */
export const MAX_RETRY_WAIT_MS = 5000;
/** When a 429 carries no `retry-after`, the per-minute budget usually frees up this soon. */
const DEFAULT_RETRY_WAIT_MS = 2000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Tries each model in order until one returns something `parse` accepts. Any failure moves on
 * except an auth error, which no other model would fix. When every model was only rate limited,
 * it waits as long as Groq asked (if short) and goes round once more.
 * Resolves to { ok: true, value, completion } or { ok: false, busy }.
 */
export class FallbackChain {
  constructor(providers, wait = sleep) {
    this.providers = providers;
    this.wait = wait;
  }

  async run(request, parse) {
    const first = await this.round(request, parse);
    if (first.ok || !first.busy) return first.ok ? first : { ok: false, busy: false };
    const waitMs = first.retryMs ?? DEFAULT_RETRY_WAIT_MS;
    if (waitMs > MAX_RETRY_WAIT_MS) return { ok: false, busy: true };
    await this.wait(waitMs);
    const second = await this.round(request, parse);
    return second.ok ? second : { ok: false, busy: second.busy };
  }

  async round(request, parse) {
    let allRateLimited = true;
    let retryMs = null;
    for (const provider of this.providers) {
      try {
        const completion = await provider.complete(request);
        const value = parse(completion.content);
        if (value !== null) return { ok: true, value, completion };
        allRateLimited = false;
        console.warn(JSON.stringify({ chat: "invalid_output", model: provider.model }));
      } catch (err) {
        const status = err instanceof ProviderError ? err.status : -1;
        console.warn(JSON.stringify({ chat: "model_failed", model: provider.model, status }));
        if (err instanceof ProviderError && err.fatal) return { ok: false, busy: false, retryMs: null };
        if (err instanceof ProviderError && err.rateLimited) {
          const ms = err.retryAfterSec === null ? null : err.retryAfterSec * 1000;
          if (ms !== null) retryMs = retryMs === null ? ms : Math.min(retryMs, ms);
        } else {
          allRateLimited = false;
        }
      }
    }
    return { ok: false, busy: allRateLimited, retryMs };
  }
}
