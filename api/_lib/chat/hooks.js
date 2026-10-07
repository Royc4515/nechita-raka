/**
 * Output hooks: every model answer passes through these before a student sees it, so a model
 * that ignores its instructions still cannot leak the prompt, show a phone number, link
 * somewhere else, or break the site's style. Each hook returns { ok: true, draft } (maybe
 * rewritten) or { ok: false, reason } to replace the answer with a canned reply.
 * ctx: { canary, allowedUrls, allowedEmails, chunkIds }
 */

const pass = (draft) => ({ ok: true, draft });
const rewrite = (draft, answer) => ({ ok: true, draft: { ...draft, answer } });

export const canaryHook = {
  name: "canary",
  apply: (draft, { canary }) =>
    draft.answer.includes(canary) || /\bNRC-[0-9a-f]{6,}/i.test(draft.answer) ? { ok: false, reason: "leak" } : pass(draft),
};

/** 9+ digits written as one number: a phone number, never a date or a count. */
const PHONE = /\+?\(?\d[\d\s().-]{7,}\d/g;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const ASK_ROY = "קבוצת הוואטסאפ של נחיתה רכה";

export const piiHook = {
  name: "pii",
  apply: (draft, { allowedEmails }) => {
    const answer = draft.answer
      .replace(PHONE, (m) => (m.replace(/\D/g, "").length >= 9 ? ASK_ROY : m))
      .replace(EMAIL, (m) => (allowedEmails.includes(m.toLowerCase()) ? m : ASK_ROY));
    return answer === draft.answer ? pass(draft) : rewrite(draft, answer);
  },
};

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi;

/** Only links from data.js (or the site itself) survive; anything else is cut out. */
export const linkAllowlistHook = {
  name: "links",
  apply: (draft, { allowedUrls }) => {
    const allowed = (url) => {
      const norm = url.replace(/^www\./i, "https://www.").replace(/^http:\/\//i, "https://").replace(/\/+$/, "").toLowerCase();
      return allowedUrls.some((p) => {
        const prefix = p.toLowerCase();
        return norm === prefix || norm.startsWith(`${prefix}/`) || norm.startsWith(`${prefix}#`) || norm.startsWith(`${prefix}?`);
      });
    };
    const answer = draft.answer
      .replace(URL_RE, (url) => {
        // A sentence's final period sticks to the URL; it belongs to the sentence.
        const trail = url.match(/[.,;:!?]+$/)?.[0] ?? "";
        return allowed(url.slice(0, url.length - trail.length)) ? url : trail;
      })
      .replace(/\(\s*\)/g, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/ +([.,;:!?])/g, "$1");
    return answer === draft.answer ? pass(draft) : rewrite(draft, answer.trim());
  },
};

/** Cited ids must exist; at most three chips under an answer. */
export const sourcesHook = {
  name: "sources",
  apply: (draft, { chunkIds }) => pass({ ...draft, sources: [...new Set(draft.sources)].filter((id) => chunkIds.has(id)).slice(0, 3) }),
};

/** Answers stay readable in a chat bubble; a runaway one is cut at a sentence end. */
export const MAX_ANSWER_CHARS = 900;

function cap(text) {
  if (text.length <= MAX_ANSWER_CHARS) return text;
  const cut = text.slice(0, MAX_ANSWER_CHARS);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "), cut.lastIndexOf("\n"));
  return end > MAX_ANSWER_CHARS / 2 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}...`;
}

/** The site's copy rules, enforced rather than requested. */
export const styleHook = {
  name: "style",
  apply: (draft) => {
    const answer = cap(
      draft.answer
        .replace(/\s*[–—]\s*/g, " - ")
        .replace(/\u2011/g, "-")
        .replace(/[\u202f\u00a0]/g, " ")
        .replace(/\*\*|__|`/g, "")
        .replace(/^\s{0,3}#{1,6}\s+/gm, "")
        .replace(/^\s*[*•]\s+/gm, "- ")
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)")
        .replace(/\n{3,}/g, "\n\n")
        .trim(),
    );
    if (!answer) return { ok: false, reason: "empty" };
    return answer === draft.answer ? pass(draft) : rewrite(draft, answer);
  },
};

/** Order matters: the canary is checked on the raw answer, style runs last on the final text. */
export const OUTPUT_HOOKS = [canaryHook, piiHook, linkAllowlistHook, sourcesHook, styleHook];

export function runOutputHooks(draft, ctx, hooks = OUTPUT_HOOKS) {
  let current = draft;
  for (const hook of hooks) {
    const outcome = hook.apply(current, ctx);
    if (!outcome.ok) return outcome;
    current = outcome.draft;
  }
  return pass(current);
}

/** In-character replies for blocked answers, in the student's language. */
export function cannedReply(reason, hebrew, personaId = "bit") {
  if (reason === "empty") {
    return hebrew
      ? "משהו השתבש לי בתשובה. אפשר לנסות לשאול שוב, או לכתוב לרועי בקבוצת הוואטסאפ."
      : "Something went wrong with that answer. Try again, or ask Roy in the WhatsApp group.";
  }
  return hebrew
    ? `חחח ניסיון יפה 😄 אבל אני ${personaId === "byte" ? "נשארת" : "נשאר"} אני. אז, מה באמת מעניין אותך? רישום, מבחנים, למדה, או סתם איך שורדים את השבוע הראשון?`
    : "Haha, nice try 😄 but I'm staying me. So what do you actually want to know? Registration, exams, Lemida, or how to survive week one?";
}
