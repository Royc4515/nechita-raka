/** Prompt Guard 2 reads at most 512 tokens; the tail of a long message is cut, not split. */
const MAX_GUARD_CHARS = 1500;

/** Meta's Llama Prompt Guard 2 on Groq: a small classifier that answers with a probability 0-1. */
export class PromptGuard {
  constructor(provider) {
    this.provider = provider;
  }

  /** The jailbreak probability, or `null` when the guard is unreachable or unreadable. */
  async score(text) {
    try {
      const { content } = await this.provider.complete({
        messages: [{ role: "user", content: text.slice(0, MAX_GUARD_CHARS) }],
        maxTokens: 16,
      });
      return parseGuardScore(content);
    } catch {
      return null;
    }
  }
}

export function parseGuardScore(content) {
  const match = content.match(/\d*\.?\d+(?:e-?\d+)?/i);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}
