/**
 * What counts as a phone number, shared by the facts (knowledge.js hides them before the model
 * sees them) and the output hook (hooks.js catches one the model invents). A copied number used
 * to be replaced in the answer alone with "ask in the WhatsApp group", which garbled the sentence
 * around it ("הטלפון של המזכירות הוא קבוצת הוואטסאפ", baseline run of 15.10.2026). The facts now
 * say where the number is instead, and the site itself still shows it.
 */

export const PHONE_NOTE = "(מספר הטלפון מופיע באתר)";

/**
 * A short service number ("*9392", "*9392 שלוחה 3", "ל* 9392"). Not a star glued to a word, digit
 * or another star (bold "**2026**", "3*100"), not italics ("*2026*"), and a space after the star
 * only mid-sentence, so a bullet ("* 2026 ...") stays.
 */
export const STAR_NUMBER = /(?<![\w*])(?:(?<=\S)\*\s?|\*)\d{3,5}(?![\d*])(?:\s+שלוחה\s+\d+)?/g;

/**
 * 9+ digits written as one number: a phone number, never a date or a count. Unicode hyphens and
 * dashes count as separators (models write "03‑5317000"); dots don't, since Israeli numbers
 * aren't written with them and a date range ("14.10-28.10.2026") would read as one long number.
 * Spaces and tabs separate groups ("052 617 1988"), newlines never, so two lines don't merge.
 * An area code in parentheses is matched whole, so "(03) 5317000" keeps its parentheses balanced.
 */
export const LONG_NUMBER = /\+?(?:\(\d+\)|\d)[\d \t()\-‐-―−]{7,}\d/g;

/** A link: digits inside one are an id (".../id1207648282", "wa.me/972..."), never a phone. */
const LINK = /(\b(?:https?:\/\/|www\.)[^\s<>"')\]]+)/gi;

const escaped = PHONE_NOTE.replace(/[()]/g, "\\$&");
/** "note, note" or "note או note" (a WhatsApp number next to a phone number) collapses to one note. */
const NOTE_RUN = new RegExp(`${escaped}(?:\\s*(?:,|או)\\s*${escaped})+`, "g");

/** Applies `fn` to the text between links and leaves the links themselves untouched. */
export function outsideLinks(text, fn) {
  return text
    .split(LINK)
    .map((part, i) => (i % 2 ? part : fn(part)))
    .join("");
}

const isPhone = (m) => m.replace(/\D/g, "").length >= 9;

/** The text with every phone number replaced by PHONE_NOTE, links left alone. */
export function hidePhones(text) {
  return outsideLinks(text, (part) =>
    part
      .replace(STAR_NUMBER, PHONE_NOTE)
      .replace(LONG_NUMBER, (m) => (isPhone(m) ? PHONE_NOTE : m))
      .replace(NOTE_RUN, PHONE_NOTE),
  );
}

/** The text with every long number replaced by `long` and every star number by `star`, links left alone. */
export function replacePhones(text, { long, star }) {
  return outsideLinks(text, (part) => part.replace(STAR_NUMBER, star).replace(LONG_NUMBER, (m) => (isPhone(m) ? long : m)));
}
