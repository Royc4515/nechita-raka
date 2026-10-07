/**
 * BM25 retrieval over the knowledge chunks, tuned for Hebrew: final letters folded, one or two
 * prefix letters (ו, ה, ב, ל, מ, ש, כ) stripped, and the site's own search synonyms expanded.
 */

/** Enough detail for one answer while keeping a request small on Groq's free tier. */
export const TOP_K = 3;

const FINAL_LETTERS = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
const PREFIX = /^[והבלמשכ]/;

/** The same groups as the site's search box (index.html), so "שכל" finds tuition, etc. */
const SYNONYM_GROUPS = [
  ["למדה", "lemida", "moodle", "מודל"],
  ["אינבר", "inbar", "פורטל"],
  ["מבחנים", "מבחן", "בחינות", "בחינה"],
  ["שכל", "שכר", "תשלום", "תשלומים", "כסף"],
  ["וואטסאפ", "ווטסאפ", "ואטסאפ", "whatsapp", "וצאפ", "ווצאפ", "וואצאפ"],
  ["סיסמה", "סיסמא", "password"],
  ["חנייה", "חניה", "חניון", "parking"],
  ["מילואים", "מילואימניק", "מילואימניקים"],
  ["מדמח", "מחשב", "cs"],
  ["מזכירות", "מזכירה"],
  ["wifi", "וויפי", "ויפי", "אינטרנט"],
  ["אינפי", "חדוא"],
  ["רישום", "הרשמה", "להירשם", "נרשמים", "שינויים", "שינוי", "לשנות", "משנים", "לבטל", "ביטול", "מבטלים"],
  ["חופשה", "חופש", "חג", "חגים"],
];

const STOPWORDS = new Set(
  ["מתי", "איפה", "איך", "מה", "למה", "כמה", "האם", "יש", "אני", "צריך", "רוצה", "אפשר", "של", "עם", "על", "את", "זה", "הוא", "היא", "לי", "אם", "או", "גם", "כל", "אבל", "לא", "כן", "שלום", "היי", "תודה", "the", "and", "how", "what", "when", "where"].map(fold),
);

function fold(word) {
  return word
    .toLowerCase()
    .replace(/["'׳״`]/g, "")
    .replace(/[ךםןףץ]/g, (ch) => FINAL_LETTERS[ch])
    // "אינ-בר" and "אינ בר" are one name; split, "בר" would match "בר אילן" everywhere.
    .replace(/אינ[-\s]?בר/g, "אינבר");
}

const SYNONYMS = new Map();
for (const group of SYNONYM_GROUPS) {
  const forms = group.map(fold);
  for (const form of forms) SYNONYMS.set(form, forms);
}

/** A Hebrew word and its forms without up to two prefix letters ("ובמבחן" -> "במבחן", "מבחן"). */
function variants(word) {
  const out = [word];
  let w = word;
  for (let i = 0; i < 2 && w.length > 3 && PREFIX.test(w); i++) {
    w = w.slice(1);
    out.push(w);
  }
  return out;
}

export function tokenize(text) {
  const out = [];
  for (const raw of fold(text).split(/[^a-z0-9א-ת]+/)) {
    if (raw.length < 2 || STOPWORDS.has(raw)) continue;
    out.push(...variants(raw));
  }
  return out;
}

function queryTerms(query) {
  const terms = new Set();
  for (const t of tokenize(query)) for (const s of SYNONYMS.get(t) || [t]) terms.add(s);
  return [...terms];
}

const indexes = new WeakMap();

function indexOf(chunks) {
  let index = indexes.get(chunks);
  if (index) return index;
  const docs = chunks.map((chunk) => {
    const terms = tokenize(`${chunk.title} ${chunk.text}`);
    const tf = new Map();
    for (const t of terms) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { chunk, tf, length: terms.length, keywords: new Set(chunk.keywords.flatMap(tokenize)), title: new Set(tokenize(chunk.title)) };
  });
  const df = new Map();
  for (const d of docs) for (const t of new Set([...d.tf.keys(), ...d.keywords])) df.set(t, (df.get(t) ?? 0) + 1);
  const n = docs.length;
  const idf = new Map([...df].map(([t, f]) => [t, Math.log(1 + (n - f + 0.5) / (f + 0.5))]));
  const avg = docs.reduce((s, d) => s + d.length, 0) / Math.max(n, 1);
  index = { docs, idf, avg };
  indexes.set(chunks, index);
  return index;
}

const K1 = 1.2;
const B = 0.75;
/** A keyword or title match beats incidental word overlap in a long guide. */
const KEYWORD_BOOST = 2;
const TITLE_BOOST = 1;

/** The `k` best chunks for `query`, best first; empty when nothing matches. */
export function retrieve(chunks, query, k = TOP_K) {
  const terms = queryTerms(query);
  if (!terms.length) return [];
  const { docs, idf, avg } = indexOf(chunks);
  return docs
    .map((d) => {
      let score = 0;
      for (const t of terms) {
        const w = idf.get(t) ?? 0;
        const f = d.tf.get(t) ?? 0;
        if (f) score += (w * f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.length) / avg));
        if (d.keywords.has(t)) score += KEYWORD_BOOST * w;
        if (d.title.has(t)) score += TITLE_BOOST * w;
      }
      return { chunk: d.chunk, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => s.chunk);
}
