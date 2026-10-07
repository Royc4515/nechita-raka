/** The chat's server config, read per request so a missing variable answers 503, not a crash. */

/** Best free-tier quality first, then a smaller model with its own separate Groq quota. */
export const DEFAULT_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
export const GUARD_MODEL = "meta-llama/llama-prompt-guard-2-86m";

/** A short salt makes the hashed IPs guessable by brute force over the IPv4 space. */
const MIN_SALT_LENGTH = 32;
const MODEL_ID = /^[\w./:-]{1,100}$/;

/**
 * `null` (chat off) unless the Groq key, the database and a long salt are all present.
 * CHAT_ENABLED=false is the server-side kill switch.
 */
export function readChatConfig(env = process.env) {
  if (env.CHAT_ENABLED?.trim().toLowerCase() === "false") return null;
  const groqApiKey = env.GROQ_API_KEY?.trim();
  const databaseUrl = (env.DATABASE_URL ?? env.POSTGRES_URL)?.trim();
  const salt = env.CHAT_SALT?.trim();
  if (!groqApiKey || !databaseUrl || !salt || salt.length < MIN_SALT_LENGTH) return null;

  const listed = (env.CHAT_MODELS ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter((m) => MODEL_ID.test(m));
  return {
    groqApiKey,
    models: listed.length ? [...new Set(listed)].slice(0, 4) : DEFAULT_MODELS,
    guardModel: env.CHAT_GUARD?.trim().toLowerCase() === "off" ? null : GUARD_MODEL,
    databaseUrl,
    salt,
  };
}
