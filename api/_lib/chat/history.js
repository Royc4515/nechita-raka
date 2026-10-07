/** The browser keeps the conversation; the server only sees the last few turns. */
export const MAX_TURNS = 12;
/** Per question; also the input box's limit in the panel. */
export const MAX_TURN_CHARS = 500;
/** An assistant turn echoed back can be longer than a question (answers are capped at 700). */
const MAX_ASSISTANT_CHARS = 800;
/** Invisible and bidi control characters. */
const UNSAFE = /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u115f\u1160\u200b-\u200f\u2028-\u202e\u2060-\u206f\u3164\ufeff\uffa0]/g;

/**
 * The validated conversation, or `null` for anything malformed. Only "user" and "assistant"
 * roles get through: a client cannot smuggle in a "system" turn.
 */
export function parseHistory(raw) {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_TURNS) return null;
  const turns = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) return null;
    const { role, content } = item;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    // Whitespace first, so a newline becomes a space instead of being stripped with the controls.
    const clean = content.replace(/\s+/g, " ").replace(UNSAFE, "").trim();
    const limit = role === "user" ? MAX_TURN_CHARS : MAX_ASSISTANT_CHARS;
    if (!clean || Array.from(clean).length > limit) return null;
    turns.push({ role, content: clean });
  }
  return turns[turns.length - 1].role === "user" ? turns : null;
}

/** What retrieval searches: the latest question plus the one before ("ומה לגבי זה?"). */
export function retrievalQuery(turns) {
  return turns
    .filter((t) => t.role === "user")
    .slice(-2)
    .map((t) => t.content)
    .join(" ");
}

export const isHebrew = (text) => /[֐-׿]/.test(text);
