/*
  "Build my schedule with AI" on the courses page. A few short questions (which courses, days, hours,
  how packed a week) become one precise prompt with only the relevant groups from the catalog scan.
  One click opens ChatGPT, Claude or Gemini with the prompt (prefilled when it fits in a link, and
  always copied to the clipboard), or downloads it. The AI is asked to end with a JSON block in a fixed
  format, which "import" reads back, checks against the catalog and saves as "my schedule".
  The same format is the backup: export it here, import it on another phone.
  Nothing is sent anywhere by this page; the student takes the prompt to their own AI.
  This module has no DOM (the tests import it); the dialogs are in course-ai-dialog.js.
*/
import { inSemester, timedSlots } from "./course-time.js";

export const FORMAT = "nechita-raka-schedule";
const VERSION = 1;
/** Links longer than this are cut by some servers; past it the AI opens empty and the prompt is pasted. */
const MAX_LINK = 7000;
export const NOTES_MAX = 300;
export const AIS = [
  { id: "chatgpt", label: "ChatGPT", url: (q) => `https://chatgpt.com/${q ? `?q=${q}` : ""}` },
  { id: "claude", label: "Claude", url: (q) => `https://claude.ai/new${q ? `?q=${q}` : ""}` },
  // Gemini has no documented way to prefill a prompt, so it always opens empty for a paste.
  { id: "gemini", label: "Gemini", url: () => "https://gemini.google.com/app" },
];

export const slotText = (s) => `${s.day} ${s.start}-${s.end}`;
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
