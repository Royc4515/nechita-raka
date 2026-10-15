/*
  "Build my schedule with AI" on the courses page. A few short questions (which courses, days, hours,
  how packed a week) become one precise prompt with only the relevant groups from the catalog scan.
  One click opens ChatGPT, Claude or Gemini with the prompt (prefilled when it fits in a link, and
  always copied to the clipboard), or downloads it. The AI is asked to end with a JSON block in a fixed
  format, which "import" reads back, checks against the catalog and saves as "my schedule".
  The same format is the backup: export it here, import it on another phone.
  Nothing is sent anywhere by this page; the student takes the prompt to their own AI.
*/
import { courseName, el } from "./course-card.js";
import { clash, inSemester, timedSlots } from "./course-time.js";

export const FORMAT = "nechita-raka-schedule";
const VERSION = 1;
/** Links longer than this are cut by some servers; past it the AI opens empty and the prompt is pasted. */
const MAX_LINK = 7000;
const NOTES_MAX = 300;
export const AIS = [
  { id: "chatgpt", label: "ChatGPT", url: (q) => `https://chatgpt.com/${q ? `?q=${q}` : ""}` },
  { id: "claude", label: "Claude", url: (q) => `https://claude.ai/new${q ? `?q=${q}` : ""}` },
  // Gemini has no documented way to prefill a prompt, so it always opens empty for a paste.
  { id: "gemini", label: "Gemini", url: () => "https://gemini.google.com/app" },
];

const slotText = (s) => `${s.day} ${s.start}-${s.end}`;
const placeOf = (g) => [...new Set(timedSlots(g).map((s) => [s.building, s.room && `חדר ${s.room}`].filter(Boolean).join(" ")).filter(Boolean))].join(" / ");
const dmy = (iso) => `${Number(iso.slice(8, 10))}.${Number(iso.slice(5, 7))}.${iso.slice(0, 4)}`;

/** One course as compact lines: its groups of this semester, by type, with every weekly meeting. */
export function courseDataText(course, semester) {
  const groups = course.groups.filter((g) => inSemester(g, semester));
  const lines = groups.map((g) => {
    const when = timedSlots(g).map(slotText).join(" + ") || "בלי שעה בקטלוג";
    return `- ${g.kind} ${g.group} | ${when}${placeOf(g) ? ` | ${placeOf(g)}` : ""}${g.teachers ? ` | ${g.teachers.replace(/ /g, " ")}` : ""}`;
  });
  const exams = course.exams.filter((e) => e.semester === semester).map((e) => `${e.type} ${dmy(e.date)}`).join(", ");
  return [`### ${course.code} ${course.name}`, ...lines, exams ? `מבחנים: ${exams}` : ""].filter(Boolean).join("\n");
}

const SHAPES = {
  compact: { he: "מעט ימים בקמפוס, גם אם הימים ארוכים", en: "as few days on campus as possible, even if they are long" },
  spread: { he: "ימים קצרים, גם אם יש יותר ימים בקמפוס", en: "short days, even if that means more days on campus" },
};
const GAPS = {
  none: { he: "בלי חלונות (שעות ריקות) בין שיעורים באותו יום", en: "no idle gaps between classes on the same day" },
  lunch: { he: "הפסקה של שעה בצהריים בכל יום ארוך", en: "a one-hour lunch break on every long day" },
};

/**
 * The prompt. prefs: { semester, blockedDays: [], earliest, latest, shape, gaps, notes, keep: [{ course, group }] }.
 * Hebrew by default; `en` writes it in English (the course data stays as the catalog has it).
 */
export function buildPrompt(courses, prefs, { scannedAt = "", en = false } = {}) {
  const t = (he, enText) => (en ? enText : he);
  const wants = [
    prefs.blockedDays.length ? t(`אני לא יכול/ה להגיע בימים: ${prefs.blockedDays.join(", ")}.`, `I can't come on: ${prefs.blockedDays.join(", ")} (Hebrew weekday letters: א'=Sun ... ו'=Fri).`) : "",
    prefs.earliest ? t(`לא להתחיל לפני ${prefs.earliest}.`, `Nothing before ${prefs.earliest}.`) : "",
    prefs.latest ? t(`לסיים עד ${prefs.latest}.`, `Finish by ${prefs.latest}.`) : "",
    SHAPES[prefs.shape] ? t(`אני מעדיף/ה ${SHAPES[prefs.shape].he}.`, `I prefer ${SHAPES[prefs.shape].en}.`) : "",
    GAPS[prefs.gaps] ? t(`חשוב לי: ${GAPS[prefs.gaps].he}.`, `It matters to me: ${GAPS[prefs.gaps].en}.`) : "",
    prefs.keep.length ? t(`כבר בחרתי ואני רוצה לשמור: ${prefs.keep.map((k) => `${k.course.code} ${k.group.kind} ${k.group.group}`).join(", ")}.`, `Keep the groups I already chose: ${prefs.keep.map((k) => `${k.course.code} ${k.group.kind} ${k.group.group}`).join(", ")}.`) : "",
    prefs.notes ? t(`עוד חשוב לי: ${prefs.notes}`, `Also: ${prefs.notes}`) : "",
  ].filter(Boolean);
  // The example uses a code no course has, so pasting the prompt back can never import it as a schedule.
  const example = JSON.stringify({ format: FORMAT, version: VERSION, semester: prefs.semester, picks: { "00000": ["01", "03"] } });
  return [
    t(`אני סטודנט/ית למדעי המחשב באוניברסיטת בר-אילן ובונה מערכת שעות ל${prefs.semester} בשנת תשפ"ז. תעזור לי לבחור קבוצות.`,
      `I'm a Computer Science student at Bar-Ilan University building my timetable for ${prefs.semester === "סמסטר ב'" ? "semester B" : "semester A"} of 2026-27. Help me choose groups.`),
    "",
    t("המשימה: לכל קורס ברשימה למטה, לבחור קבוצה אחת מכל סוג שיש לו (הרצאה, תרגיל, תגבור וכו'), כך שאין שתי קבוצות שחופפות בזמן, ושהמערכת מתאימה להעדפות שלי ככל האפשר.",
      "The task: for every course below, choose one group of each type it has (lecture, exercise, etc.) so that no two chosen groups overlap in time, and the week fits my preferences as well as possible."),
    "",
    wants.length ? t("ההעדפות שלי:", "My preferences:") : "",
    ...wants.map((w) => `- ${w}`),
    wants.length ? "" : "",
    t("כללים:", "Rules:"),
    t("1. משתמשים רק בקבוצות מהנתונים למטה. לא ממציאים קבוצות, שעות, חדרים או מרצים.", "1. Use only the groups in the data below. Never invent groups, hours, rooms or lecturers."),
    t("2. לקבוצה עם כמה מפגשים בשבוע (למשל \"ב' 09:00-11:00 + ג' 10:00-12:00\") כל המפגשים נחשבים.", "2. A group with several weekly meetings (e.g. \"ב' 09:00-11:00 + ג' 10:00-12:00\") takes all of them."),
    t("3. קבוצה \"בלי שעה בקטלוג\" בוחרים רק אם אין ברירה, ואומרים את זה.", "3. Choose a group with no hours (\"בלי שעה בקטלוג\") only if there is no other option, and say so."),
    t("4. אם אי אפשר לעמוד בכל ההעדפות, מציעים את הפשרה הכי טובה ואומרים מה לא התקיים.", "4. If not every preference can be met, give the best compromise and say what was not met."),
    t("5. אם חסר לך משהו חשוב כדי להחליט, תשאל אותי קודם.", "5. If something important is missing for the decision, ask me first."),
    "",
    t("מה להחזיר:", "What to return:"),
    t("א. טבלה של השבוע: יום, שעות, קורס, סוג, מספר קבוצה, חדר.", "a. A table of the week: day, hours, course, type, group number, room."),
    t("ב. 2-3 משפטים למה בחרת כך, וחלופה אחת אם יש.", "b. Two or three sentences on why, and one alternative if there is one."),
    t("ג. בסוף התשובה, בלוק קוד JSON אחד בדיוק בפורמט הזה (זו רק דוגמה למבנה: במקום 00000 שמים את קודי הקורסים, ואת מספרי הקבוצות שבחרת). זה הפורמט שהאתר יודע לייבא:",
      "c. At the very end, exactly one JSON code block in this format (this is only the shape: put the real course codes instead of 00000, with the group numbers you chose). It is the format the site imports:"),
    "```json",
    example,
    "```",
    "",
    t(`הנתונים, מקטלוג הקורסים של האוניברסיטה${scannedAt ? ` (נסרק ב-${dmy(scannedAt)}, לא רשמי)` : ""}. שורת קבוצה: סוג, מספר קבוצה | יום ושעות | בניין וחדר | מרצה.`,
      `The data, from the university's course catalog${scannedAt ? ` (scanned on ${dmy(scannedAt)}, unofficial)` : ""}. A group line: type, group number | day and hours | building and room | lecturer. Days are Hebrew letters: א'=Sun, ב'=Mon, ג'=Tue, ד'=Wed, ה'=Thu, ו'=Fri.`),
    "",
    ...courses.map((c) => courseDataText(c, prefs.semester)),
  ].join("\n").replace(/\n{3,}/g, "\n\n");
}

/** The link that opens an AI with the prompt, prefilled when the link stays short enough. */
export function aiLink(aiId, prompt) {
  const ai = AIS.find((a) => a.id === aiId);
  if (!ai) return null;
  const q = encodeURIComponent(prompt);
  const prefilled = ai.id !== "gemini" && ai.url(q).length <= MAX_LINK;
  return { url: ai.url(prefilled ? q : ""), prefilled };
}

/**
 * Reads a schedule from an AI's answer, a backup file or pasted JSON: the last JSON object in the text
 * with our format (or at least "picks"). Every course and group is checked against the catalog; unknown
 * ones are dropped and listed. Returns { semester, picks: { code: [group] }, dropped: [string] } or { error }.
 */
export function parseSchedule(text, courses) {
  // The block is asked for at the very end, so a long paste keeps its tail.
  const source = String(text || "").slice(-200_000);
  // Code blocks first, the last one first (the AI was asked to end with it); then any {...} from the end.
  const candidates = [...source.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((m) => m[1]).reverse();
  const end = source.lastIndexOf("}");
  for (let i = source.lastIndexOf("{"), n = 0; i >= 0 && end > i && n < 50; i = i > 0 ? source.lastIndexOf("{", i - 1) : -1, n++) {
    candidates.push(source.slice(i, end + 1));
  }
  let data = null;
  for (const c of candidates) {
    try {
      const value = JSON.parse(c);
      if (value && typeof value === "object" && value.picks && typeof value.picks === "object" && !Array.isArray(value.picks)) { data = value; break; }
    } catch { /* not this one */ }
  }
  if (!data) return { error: "no-json" };
  if (data.format && data.format !== FORMAT) return { error: "format" };
  const byCode = new Map(courses.map((c) => [c.code, c]));
  const picks = {};
  const dropped = [];
  for (const [rawCode, rawGroups] of Object.entries(data.picks)) {
    const code = String(rawCode).replace(/\D/g, "");
    const course = byCode.get(code);
    const groups = (Array.isArray(rawGroups) ? rawGroups : [rawGroups]).map((g) => String(g ?? "").trim()).filter(Boolean)
      .map((g) => (/^\d$/.test(g) ? `0${g}` : g));
    if (!course) { dropped.push(String(rawCode)); continue; }
    const kept = groups.filter((g) => course.groups.some((x) => x.group === g));
    groups.filter((g) => !kept.includes(g)).forEach((g) => dropped.push(`${code}/${g}`));
    if (kept.length) picks[code] = [...new Set(kept)];
  }
  const starred = (Array.isArray(data.starred) ? data.starred : []).map((c) => String(c).replace(/\D/g, "")).filter((c) => byCode.has(c));
  if (!Object.keys(picks).length && !starred.length) return { error: "empty", dropped };
  const semester = ["סמסטר א'", "סמסטר ב'"].includes(data.semester) ? data.semester : "";
  return { semester, picks, starred, dropped };
}

/** The whole schedule in the import format (both semesters, and starred courses with no pick yet), for a backup. */
export function exportSchedule(state) {
  const picks = Object.fromEntries(Object.entries(state.picks).filter(([code, groups]) => groups.length && state.starred.includes(code)));
  return JSON.stringify({ format: FORMAT, version: VERSION, semester: "", starred: state.starred, picks }, null, 2);
}

// ---------- DOM: the two dialogs ----------

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = el("a", { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function copy(text) {
  try {
    return navigator.clipboard ? navigator.clipboard.writeText(text).then(() => true, () => false) : Promise.resolve(false);
  } catch {
    return Promise.resolve(false);
  }
}

function dialogShell(title, tr) {
  const close = el("button", { type: "button", class: "cb-dialog-close", "aria-label": tr("סגירה"), text: "×" });
  const body = el("div", { class: "cb-dialog-body" });
  const dialog = el("dialog", { class: "cb-dialog", "aria-label": title },
    el("div", { class: "cb-dialog-head" }, el("h3", { text: title }), close), body);
  close.addEventListener("click", () => dialog.close());
  // Close on a tap on the backdrop only when it also started there (not a text selection that overshot).
  let downOnBackdrop = false;
  dialog.addEventListener("pointerdown", (e) => { downOnBackdrop = e.target === dialog; });
  dialog.addEventListener("click", (e) => { if (e.target === dialog && downOnBackdrop) dialog.close(); });
  dialog.addEventListener("close", () => dialog.remove());
  document.body.append(dialog);
  return { dialog, body };
}

/** A question with one answer (or several, with `multi`), as the page's chips. */
function choice(label, options, initial, { tr, multi = false } = {}) {
  const value = multi ? new Set(initial) : { v: initial };
  const buttons = options.map((o) => {
    const b = el("button", { type: "button", class: "cb-chip", "aria-pressed": "false", text: tr(o.label) });
    b.addEventListener("click", () => {
      if (multi) { if (value.has(o.id)) value.delete(o.id); else value.add(o.id); } else value.v = o.id;
      paint();
    });
    return b;
  });
  const paint = () => buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(multi ? value.has(options[i].id) : value.v === options[i].id)));
  paint();
  const node = el("fieldset", { class: "cb-q-field" }, el("legend", { text: tr(label) }), el("div", { class: "cb-q-chips" }, ...buttons));
  return { node, get: () => (multi ? [...value] : value.v) };
}

/**
 * The questions, then the prompt and the AI buttons. ctx: { helpers: { tr, en }, store, list, semester }.
 */
export function openPlanner(ctx) {
  const { tr, en } = ctx.helpers;
  const { dialog, body } = dialogShell(tr("בניית מערכת עם AI"), tr);
  const state = ctx.store.get();
  const offered = (c) => c.groups.some((g) => inSemester(g, ctx.semester));
  const starred = ctx.list.courses.filter((c) => state.starred.includes(c.code) && offered(c));
  const byYear = (y) => ctx.list.courses.filter((c) => c.year === y && offered(c));
  const sets = [
    { id: "starred", label: tr("הקורסים שסימנתי ({n})", { n: starred.length }), courses: starred },
    ...[1, 2, 3].map((y) => ({ id: `y${y}`, label: tr("כל קורסי שנה {y} ({n})", { y: ["א'", "ב'", "ג'"][y - 1], n: byYear(y).length }), courses: byYear(y) })),
  ].filter((s) => s.courses.length);
  const which = choice("אילו קורסים?", sets.map((s) => ({ id: s.id, label: s.label })), sets[0]?.id, { tr });
  const semester = choice("סמסטר", ["סמסטר א'", "סמסטר ב'"].map((s) => ({ id: s, label: s })), ctx.semester, { tr });
  const blocked = choice("ימים שאני לא יכול/ה להגיע", ["א'", "ב'", "ג'", "ד'", "ה'", "ו'"].map((d) => ({ id: d, label: d })), [], { tr, multi: true });
  const earliest = choice("לא לפני", [{ id: "", label: "לא משנה" }, { id: "09:00", label: "09:00" }, { id: "10:00", label: "10:00" }, { id: "12:00", label: "12:00" }], "", { tr });
  const latest = choice("לסיים עד", [{ id: "", label: "לא משנה" }, { id: "14:00", label: "14:00" }, { id: "16:00", label: "16:00" }, { id: "18:00", label: "18:00" }], "", { tr });
  const shape = choice("איך השבוע?", [{ id: "compact", label: "מעט ימים, ארוכים" }, { id: "spread", label: "ימים קצרים" }, { id: "any", label: "לא משנה" }], "any", { tr });
  const gaps = choice("חלונות בין שיעורים", [{ id: "none", label: "בלי חלונות" }, { id: "lunch", label: "הפסקת צהריים" }, { id: "any", label: "לא משנה" }], "any", { tr });
  const keepPicks = Object.values(state.picks).some((g) => g.length);
  const keep = keepPicks ? choice("קבוצות שכבר בחרתי", [{ id: "keep", label: "לשמור אותן" }, { id: "free", label: "לבחור מחדש" }], "keep", { tr }) : null;
  const notes = el("textarea", { class: "cb-q-notes", rows: "2", maxlength: String(NOTES_MAX), placeholder: tr("עוד משהו? למשל: מרצה שאני מעדיף/ה, עבודה ביום שלישי בבוקר") });
  const next = el("button", { type: "button", class: "btn btn-solid cb-q-next", text: tr("יצירת הפרומפט") });
  if (!sets.length) {
    body.replaceChildren(el("p", { text: tr("אין קורסים בסמסטר הזה. סמנו ☆ קורסים ונסו שוב.") }));
    dialog.showModal();
    return;
  }
  body.replaceChildren(
    el("p", { class: "cb-q-intro", text: tr("כמה שאלות קצרות, ואז הפרומפט מוכן לבינה המלאכותית שלכם. התשובה שלה חוזרת לכאן בלחיצה על \"ייבוא\".") }),
    which.node, semester.node, blocked.node, earliest.node, latest.node, shape.node, gaps.node, keep ? keep.node : null,
    el("label", { class: "cb-q-field" }, el("span", { class: "cb-q-label", text: tr("הערות (לא חובה)") }), notes),
    next);
  next.addEventListener("click", () => {
    const set = sets.find((s) => s.id === which.get()) || sets[0];
    const sem = semester.get();
    const courses = set.courses.filter((c) => c.groups.some((g) => inSemester(g, sem)));
    const keepList = keep && keep.get() === "keep"
      ? ctx.list.courses.flatMap((course) => course.groups.filter((g) => ctx.store.isPicked(course.code, g.group) && inSemester(g, sem)).map((group) => ({ course, group })))
      : [];
    // Courses of groups to keep go into the data too, or the AI can't place them.
    const withKept = [...new Set([...courses, ...keepList.map((k) => k.course)])];
    const prompt = buildPrompt(withKept, {
      semester: sem, blockedDays: blocked.get(), earliest: earliest.get(), latest: latest.get(),
      shape: shape.get(), gaps: gaps.get(), notes: notes.value.trim().slice(0, NOTES_MAX), keep: keepList,
    }, { scannedAt: ctx.list.scannedAt, en });
    showPrompt(body, prompt, withKept, ctx, dialog);
  });
  dialog.showModal();
}

function showPrompt(body, prompt, courses, ctx, dialog) {
  const { tr } = ctx.helpers;
  const status = el("p", { class: "cb-q-status", role: "status" });
  const aiButtons = AIS.map((ai) => {
    const link = aiLink(ai.id, prompt);
    const a = el("a", { class: "btn cb-ai-btn", href: link.url, target: "_blank", rel: "noopener noreferrer", text: tr("העתקה ופתיחה ב-{ai}", { ai: ai.label }) });
    // The click opens the AI (a plain link, so no popup blocker), and copies the prompt as it goes.
    a.addEventListener("click", () => {
      copy(prompt).then((ok) => {
        status.textContent = link.prefilled
          ? tr("{ai} נפתח עם הפרומפט. שולחים, ובסוף מעתיקים את התשובה ולוחצים כאן על \"ייבוא\".", { ai: ai.label })
          : ok ? tr("הפרומפט הועתק. ב-{ai} מדביקים (לחיצה ארוכה ← הדבקה, או Ctrl+V) ושולחים.", { ai: ai.label })
            : tr("לא הצלחנו להעתיק. מעתיקים מהתיבה למטה ומדביקים ב-{ai}.", { ai: ai.label });
      });
    });
    return a;
  });
  const copyBtn = el("button", { type: "button", class: "btn", text: tr("העתקת הפרומפט") });
  copyBtn.addEventListener("click", () => copy(prompt).then((ok) => { status.textContent = ok ? tr("הועתק.") : tr("לא הצלחנו להעתיק. מסמנים את הטקסט בתיבה ומעתיקים."); }));
  const txtBtn = el("button", { type: "button", class: "btn", text: tr("הורדה כקובץ טקסט") });
  txtBtn.addEventListener("click", () => download("schedule-prompt.txt", prompt, "text/plain;charset=utf-8"));
  const jsonBtn = el("button", { type: "button", class: "btn", text: tr("הורדת הנתונים (JSON)") });
  jsonBtn.addEventListener("click", () => download("courses-for-ai.json", JSON.stringify({ scannedAt: ctx.list.scannedAt, courses }, null, 2), "application/json"));
  const importBtn = el("button", { type: "button", class: "btn btn-solid", text: tr("יש לי תשובה: ייבוא") });
  importBtn.addEventListener("click", () => { dialog.close(); openImport(ctx); });
  const box = el("textarea", { class: "cb-q-prompt", rows: "6", readonly: true, "aria-label": tr("הפרומפט") });
  box.value = prompt;
  body.replaceChildren(
    el("p", { class: "cb-q-intro", text: tr("הפרומפט מוכן ({n} קורסים). בוחרים AI: הוא נפתח בלשונית חדשה והפרומפט מועתק.", { n: courses.length }) }),
    el("div", { class: "cb-ai-row" }, ...aiButtons),
    status,
    box,
    el("div", { class: "cb-ai-row is-secondary" }, copyBtn, txtBtn, jsonBtn),
    el("p", { class: "cb-muted", text: tr("כשה-AI מסיים, מעתיקים את כל התשובה שלו (או רק את בלוק ה-JSON) ולוחצים על ייבוא.") }),
    importBtn);
}

/**
 * Paste or upload a schedule (an AI's answer, or a backup), see what it holds and its clashes, then save.
 * ctx: { helpers, store, list, onImported(semester) }.
 */
export function openImport(ctx) {
  const { tr } = ctx.helpers;
  const { dialog, body } = dialogShell(tr("ייבוא מערכת"), tr);
  const area = el("textarea", { class: "cb-q-prompt", rows: "6", placeholder: tr("מדביקים כאן את התשובה של ה-AI, או קובץ גיבוי של המערכת"), "aria-label": tr("התשובה של ה-AI") });
  const file = el("input", { type: "file", accept: ".json,.txt,application/json,text/plain", class: "cb-file" });
  const check = el("button", { type: "button", class: "btn btn-solid", text: tr("בדיקה") });
  const result = el("div", { class: "cb-import-result", role: "status" });
  file.addEventListener("change", () => {
    const f = file.files && file.files[0];
    if (!f) return;
    if (f.size > 200_000) { result.textContent = tr("הקובץ גדול מדי."); return; }
    f.text().then((text) => { area.value = text; check.click(); }, () => { result.textContent = tr("לא הצלחנו לקרוא את הקובץ."); });
    file.value = "";
  });
  check.addEventListener("click", () => preview(area.value));
  function preview(text) {
    const parsed = parseSchedule(text, ctx.list.courses);
    if (parsed.error) {
      result.replaceChildren(el("p", { class: "cb-clash", text: parsed.error === "format" ? tr("זה לא בפורמט של המערכת.") : tr("לא מצאנו כאן מערכת. צריך את בלוק ה-JSON מסוף התשובה של ה-AI.") }));
      return;
    }
    const byCode = new Map(ctx.list.courses.map((c) => [c.code, c]));
    const semester = parsed.semester || "";
    const chosen = Object.entries(parsed.picks).flatMap(([code, groups]) => groups.map((g) => ({ course: byCode.get(code), group: byCode.get(code).groups.find((x) => x.group === g) })));
    const clashes = chosen.flatMap((a, i) => chosen.slice(i + 1).filter((b) => clash(a.group, b.group, semester || a.group.semester.split(", ")[0])).map((b) => [a, b]));
    // Two lecture groups of one course is usually the AI's slip, not a plan.
    const doubles = [...new Set(chosen.filter((a, i) => chosen.some((b, j) => j < i && b.course === a.course && b.group.kind === a.group.kind)).map((p) => `${courseName(p.course, ctx.helpers)} (${tr(p.group.kind)})`))];
    const replace = el("input", { type: "checkbox", checked: true, id: "cb-import-replace" });
    const save = el("button", { type: "button", class: "btn btn-solid", text: tr("שמירה במערכת שלי") });
    // Replacing covers this semester's picks (an AI plan is per semester), or, with no semester (a backup),
    // the courses the import names. The other semester and other courses stay as they are.
    const covers = (code, g) => {
      if (!semester) return code in parsed.picks;
      const group = byCode.get(code) && byCode.get(code).groups.find((x) => x.group === g);
      return Boolean(group) && group.semester.split(", ").includes(semester);
    };
    save.addEventListener("click", () => {
      ctx.store.importPicks(parsed.picks, { replace: replace.checked, semester, starred: parsed.starred, covers });
      dialog.close();
      ctx.onImported && ctx.onImported(semester);
    });
    result.replaceChildren(
      el("p", { class: "cb-q-intro", text: tr("נמצאו {n} קבוצות ב-{c} קורסים{s}.", { n: chosen.length, c: Object.keys(parsed.picks).length, s: semester ? ` (${tr(semester)})` : "" }) }),
      el("ul", { class: "cb-import-list" }, ...chosen.map((p) => el("li", {}, `${courseName(p.course, ctx.helpers)}: ${tr(p.group.kind)} ${p.group.group} · ${timedSlots(p.group).map(slotText).join(" + ") || tr("בלי שעה בקטלוג")}`))),
      clashes.length ? el("p", { class: "cb-clash", text: tr("⚠ {n} חפיפות. אפשר לשמור ולתקן במערכת שלי.", { n: clashes.length }) }) : null,
      doubles.length ? el("p", { class: "cb-clash", text: tr("⚠ יותר מקבוצה אחת מאותו סוג ב: {list}. בדרך כלל לוקחים אחת.", { list: doubles.join(", ") }) }) : null,
      parsed.dropped.length ? el("p", { class: "cb-muted", text: tr("לא נמצאו בקטלוג ולכן דולגו: {list}", { list: parsed.dropped.join(", ") }) }) : null,
      el("label", { class: "cb-check", for: "cb-import-replace" }, replace,
        semester ? tr("להחליף את הבחירות שלי ב{semester} (הסמסטר השני לא משתנה)", { semester: tr(semester) }) : tr("להחליף את הבחירות בקורסים האלה (השאר לא משתנים)")),
      save);
  }
  body.replaceChildren(
    el("p", { class: "cb-q-intro", text: tr("מדביקים את התשובה של ה-AI (אפשר את כולה) או מעלים קובץ גיבוי.") }),
    area,
    el("div", { class: "cb-ai-row is-secondary" }, check, el("label", { class: "btn cb-file-label" }, tr("העלאת קובץ"), file)),
    result);
  dialog.showModal();
  area.focus();
}

/** Backup: download the schedule as a file, or copy it, in the import format. */
export function exportBackup(ctx) {
  const text = exportSchedule(ctx.store.get());
  download("my-schedule.json", text, "application/json");
  return text;
}
