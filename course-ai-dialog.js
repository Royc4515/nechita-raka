/*
  The "build my schedule with AI" sheet on the courses page, and the import (course-ai.js has the logic).
  One sheet, three steps: the questions, the ready prompt with an AI to open it in, and the import of the
  answer. A back button returns a step with the answers kept, and every step starts at its top.
  On a phone the sheet rises from the bottom; on a wide screen it is a centered window.
*/
import { courseName, el } from "./course-card.js";
import { AIS, aiLink, buildPrompt, exportSchedule, NOTES_MAX, parseSchedule, slotText } from "./course-ai.js";
import { clash, inSemester, timedSlots } from "./course-time.js";

const FILE_MAX = 200_000;
const SVG = "http://www.w3.org/2000/svg";

/** A small inline icon from SVG path data, sized and colored by CSS. */
function icon(paths, cls = "") {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", `cb-icon ${cls}`.trim());
  for (const d of paths) {
    const path = document.createElementNS(SVG, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
}
const ICONS = {
  sparkle: ["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z", "M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"],
  upload: ["M12 16V4", "M7 9l5-5 5 5", "M5 20h14"],
  check: ["M5 12.5l4.5 4.5L19 7.5"],
  copy: ["M9 9h10v11H9z", "M5 15V4h10"],
  download: ["M12 4v12", "M7 11l5 5 5-5", "M5 20h14"],
};
/**
 * Each AI's own logo, as an app-style tile, so the choice reads at a glance. The marks are the brands'
 * logos from Simple Icons (simple-icons@13.21.0, CC0 as a collection; each logo is its owner's mark,
 * used here only to point to that service).
 */
const AI_LOGOS = {
  chatgpt: { tile: "#000000", fill: "#ffffff", d: "M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" },
  claude: { tile: "#f4f3ee", fill: "#d97757", d: "m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" },
  gemini: { tile: "#ffffff", fill: "url(#cb-gemini-gradient)", gradient: ["#4285f4", "#9b72cb", "#d96570"], d: "M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81" },
};

/** An AI's logo tile: the brand mark, filled (Gemini with its gradient). */
function aiTile(id) {
  const logo = AI_LOGOS[id];
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "cb-ai-logo");
  if (logo.gradient) {
    const defs = document.createElementNS(SVG, "defs");
    const grad = document.createElementNS(SVG, "linearGradient");
    grad.setAttribute("id", "cb-gemini-gradient");
    grad.setAttribute("x1", "0");
    grad.setAttribute("y1", "0");
    grad.setAttribute("x2", "1");
    grad.setAttribute("y2", "1");
    logo.gradient.forEach((color, i) => {
      const stop = document.createElementNS(SVG, "stop");
      stop.setAttribute("offset", String(i / (logo.gradient.length - 1)));
      stop.setAttribute("stop-color", color);
      grad.append(stop);
    });
    defs.append(grad);
    svg.append(defs);
  }
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", logo.d);
  path.setAttribute("fill", logo.fill);
  svg.append(path);
  return el("span", { class: `cb-ai-tile is-${id}`, style: `background: ${logo.tile}` }, svg);
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = el("a", { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function copy(text) {
  try {
    return navigator.clipboard ? navigator.clipboard.writeText(text).then(() => true, () => false) : Promise.resolve(false);
  } catch {
    return Promise.resolve(false);
  }
}

/** On Android, ChatGPT's site link bounces through the app to the browser; an intent opens the app itself. */
function openHref(aiId, url) {
  if (aiId === "chatgpt" && /Android/i.test(navigator.userAgent)) {
    // The same address (with ?q= when the prompt fits) as an intent; without the app, the browser opens it.
    return { href: `intent://${url.replace(/^https:\/\//, "")}#Intent;scheme=https;package=com.openai.chatgpt;S.browser_fallback_url=${encodeURIComponent(url)};end`, target: null };
  }
  return { href: url, target: "_blank" };
}

/**
 * The sheet: a header with back, title and close, a scrolling body and a footer for the main action.
 * show({ title, step, body, footer, back }) swaps the step and scrolls it to its top.
 */
function sheet(tr) {
  const back = el("button", { type: "button", class: "cb-sheet-back", "aria-label": tr("חזרה") });
  const close = el("button", { type: "button", class: "cb-sheet-close", "aria-label": tr("סגירה") });
  const title = el("h3", { class: "cb-sheet-title", tabindex: "-1" });
  const step = el("p", { class: "cb-sheet-step" });
  const body = el("div", { class: "cb-sheet-body" });
  const footer = el("div", { class: "cb-sheet-foot" });
  const dialog = el("dialog", { class: "cb-sheet", "aria-labelledby": "cb-sheet-title" },
    el("header", { class: "cb-sheet-head" }, back, el("div", { class: "cb-sheet-titles" }, title, step), close),
    body, footer);
  title.id = "cb-sheet-title";
  let onBack = null;
  back.addEventListener("click", () => onBack && onBack());
  close.addEventListener("click", () => dialog.close());
  // A tap on the backdrop closes, but not a text selection that started inside and overshot.
  let downOnBackdrop = false;
  dialog.addEventListener("pointerdown", (e) => { downOnBackdrop = e.target === dialog; });
  dialog.addEventListener("click", (e) => { if (e.target === dialog && downOnBackdrop) dialog.close(); });
  dialog.addEventListener("close", () => dialog.remove());
  document.body.append(dialog);
  // Files dropped anywhere on the sheet go to the step that takes them (the import), set by onFile().
  // A file dropped anywhere on the sheet never makes the browser open it (that would lose the page);
  // only the import step reads it.
  let fileTarget = null;
  const hasFile = (e) => e.dataTransfer && [...e.dataTransfer.types].includes("Files");
  dialog.addEventListener("dragenter", (e) => { if (!hasFile(e)) return; e.preventDefault(); if (fileTarget) fileTarget.zone.classList.add("is-over"); });
  dialog.addEventListener("dragover", (e) => { if (hasFile(e)) e.preventDefault(); });
  dialog.addEventListener("dragleave", (e) => { if (fileTarget && !dialog.contains(e.relatedTarget)) fileTarget.zone.classList.remove("is-over"); });
  dialog.addEventListener("drop", (e) => {
    if (!hasFile(e)) return;
    e.preventDefault();
    if (!fileTarget || !e.dataTransfer.files.length) return;
    fileTarget.zone.classList.remove("is-over");
    fileTarget.read(e.dataTransfer.files[0]);
  });
  return {
    dialog,
    onFile: (zone, read) => { fileTarget = { zone, read }; },
    show({ title: text, step: stepText = "", body: nodes, footer: foot = [], back: backFn = null }) {
      fileTarget = null;
      title.textContent = text;
      step.textContent = stepText;
      step.hidden = !stepText;
      body.replaceChildren(...nodes.filter(Boolean));
      footer.replaceChildren(...foot.filter(Boolean));
      footer.hidden = !foot.filter(Boolean).length;
      onBack = backFn;
      // Hidden by visibility, not [hidden], so it keeps its place and the title stays centered.
      back.classList.toggle("is-off", !backFn);
      back.setAttribute("aria-hidden", String(!backFn));
      back.tabIndex = backFn ? 0 : -1;
      body.scrollTop = 0;
      if (!dialog.open) dialog.showModal();
      title.focus({ preventScroll: true });
    },
  };
}

/** A question with one answer (or several, with `multi`), as chips. */
function choice(label, options, initial, { tr, multi = false, hint = "" } = {}) {
  const value = multi ? new Set(initial) : { v: initial };
  const buttons = options.map((o) => {
    const b = el("button", { type: "button", class: "cb-pill", "aria-pressed": "false", text: tr(o.label) });
    b.addEventListener("click", () => {
      if (multi) { if (value.has(o.id)) value.delete(o.id); else value.add(o.id); } else value.v = o.id;
      paint();
    });
    return b;
  });
  const paint = () => buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(multi ? value.has(options[i].id) : value.v === options[i].id)));
  paint();
  const node = el("fieldset", { class: "cb-question" },
    el("legend", { text: tr(label) }),
    hint ? el("p", { class: "cb-question-hint", text: tr(hint) }) : null,
    el("div", { class: "cb-pills" }, ...buttons));
  return { node, get: () => (multi ? [...value] : value.v) };
}

const primary = (text, onClick, extra = {}) => {
  const b = el("button", { type: "button", class: "cb-primary", ...extra }, text);
  b.addEventListener("click", onClick);
  return b;
};
const quiet = (iconName, text, onClick) => {
  const b = el("button", { type: "button", class: "cb-quiet" }, icon(ICONS[iconName]), el("span", { text }));
  b.addEventListener("click", onClick);
  return b;
};

/**
 * Build my schedule with AI. ctx: { helpers: { tr, en }, store, list, semester, onImported(semester) }.
 */
export function openPlanner(ctx) {
  const { tr, en } = ctx.helpers;
  const ui = sheet(tr);
  const title = tr("בניית מערכת עם AI");
  const state = ctx.store.get();
  const offered = (c) => c.groups.some((g) => inSemester(g, ctx.semester));
  const starred = ctx.list.courses.filter((c) => state.starred.includes(c.code) && offered(c));
  const byYear = (y) => ctx.list.courses.filter((c) => c.year === y && offered(c));
  const sets = [
    { id: "starred", label: tr("הקורסים שסימנתי ({n})", { n: starred.length }), courses: starred },
    ...[1, 2, 3].map((y) => ({ id: `y${y}`, label: tr("כל קורסי שנה {y} ({n})", { y: ["א'", "ב'", "ג'"][y - 1], n: byYear(y).length }), courses: byYear(y) })),
  ].filter((s) => s.courses.length);
  if (!sets.length) {
    ui.show({ title, body: [el("p", { class: "cb-sheet-lead", text: tr("אין קורסים בסמסטר הזה. סמנו ☆ קורסים ונסו שוב.") })] });
    return;
  }
  const which = choice("אילו קורסים?", sets.map((s) => ({ id: s.id, label: s.label })), sets[0].id, { tr });
  const semester = choice("סמסטר", ["סמסטר א'", "סמסטר ב'"].map((s) => ({ id: s, label: s })), ctx.semester, { tr });
  const blocked = choice("ימים שאני לא יכול/ה להגיע", ["א'", "ב'", "ג'", "ד'", "ה'", "ו'"].map((d) => ({ id: d, label: d })), [], { tr, multi: true, hint: "אפשר לבחור כמה" });
  const earliest = choice("לא לפני", [{ id: "", label: "לא משנה" }, { id: "09:00", label: "09:00" }, { id: "10:00", label: "10:00" }, { id: "12:00", label: "12:00" }], "", { tr });
  const latest = choice("לסיים עד", [{ id: "", label: "לא משנה" }, { id: "14:00", label: "14:00" }, { id: "16:00", label: "16:00" }, { id: "18:00", label: "18:00" }], "", { tr });
  const shape = choice("איך השבוע?", [{ id: "compact", label: "מעט ימים, ארוכים" }, { id: "spread", label: "ימים קצרים" }, { id: "any", label: "לא משנה" }], "any", { tr });
  const gaps = choice("חלונות בין שיעורים", [{ id: "none", label: "בלי חלונות" }, { id: "lunch", label: "הפסקת צהריים" }, { id: "any", label: "לא משנה" }], "any", { tr });
  const keep = Object.values(state.picks).some((g) => g.length)
    ? choice("קבוצות שכבר בחרתי", [{ id: "keep", label: "לשמור אותן" }, { id: "free", label: "לבחור מחדש" }], "keep", { tr }) : null;
  const notes = el("textarea", { class: "cb-field", rows: "2", maxlength: String(NOTES_MAX), placeholder: tr("עוד משהו? למשל: מרצה שאני מעדיף/ה, עבודה ביום שלישי בבוקר") });
  const notesField = el("label", { class: "cb-question" }, el("span", { class: "cb-question-label", text: tr("הערות (לא חובה)") }), notes);

  function questions() {
    ui.show({
      title,
      step: tr("שלב {n} מתוך 3", { n: 1 }),
      body: [
        el("p", { class: "cb-sheet-lead", text: tr("כמה שאלות קצרות, ואז הפרומפט מוכן לבינה המלאכותית שלכם. התשובה שלה חוזרת לכאן בלחיצה על \"ייבוא\".") }),
        which.node, semester.node, blocked.node, earliest.node, latest.node, shape.node, gaps.node, keep && keep.node, notesField,
      ],
      footer: [primary(tr("יצירת הפרומפט"), makePrompt)],
    });
  }

  function makePrompt() {
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
    ready(prompt, withKept);
  }

  function ready(prompt, courses) {
    const status = el("p", { class: "cb-status-line", role: "status" });
    const rows = AIS.map((ai) => {
      const link = aiLink(ai.id, prompt);
      const { href, target } = openHref(ai.id, link.url);
      const tile = aiTile(ai.id);
      const a = el("a", { class: "cb-ai-row-link", href, target, rel: "noopener noreferrer" },
        tile,
        el("span", { class: "cb-ai-text" }, el("span", { class: "cb-ai-name", text: ai.label }), el("span", { class: "cb-ai-sub", text: link.prefilled ? tr("נפתח עם הפרומפט") : tr("מעתיק ופותח") })),
        el("span", { class: "cb-go", "aria-hidden": "true" }));
      // The click opens the AI (a plain link, so no popup blocker) and copies the prompt on the way.
      a.addEventListener("click", () => {
        copy(prompt).then((ok) => {
          status.textContent = link.prefilled
            ? tr("{ai} נפתח עם הפרומפט. שולחים, ובסוף מעתיקים את התשובה וחוזרים לייבוא.", { ai: ai.label })
            : ok ? tr("הפרומפט הועתק. ב-{ai} מדביקים (לחיצה ארוכה ואז הדבקה, או Ctrl+V) ושולחים.", { ai: ai.label })
              : tr("לא הצלחנו להעתיק. פותחים את \"הפרומפט המלא\" למטה ומעתיקים משם.", { ai: ai.label });
          status.classList.toggle("is-ok", ok || link.prefilled);
        });
      });
      return el("li", {}, a);
    });
    const box = el("textarea", { class: "cb-field cb-mono", dir: "auto", rows: "8", readonly: true, "aria-label": tr("הפרומפט") });
    box.value = prompt;
    const full = el("details", { class: "cb-more-box" },
      el("summary", { text: tr("הפרומפט המלא") }),
      box,
      el("div", { class: "cb-quiet-row" },
        quiet("copy", tr("העתקה"), () => copy(prompt).then((ok) => { status.textContent = ok ? tr("הועתק.") : tr("לא הצלחנו להעתיק. מסמנים את הטקסט בתיבה ומעתיקים."); status.classList.toggle("is-ok", ok); })),
        quiet("download", tr("קובץ טקסט"), () => download("schedule-prompt.txt", prompt, "text/plain;charset=utf-8")),
        quiet("download", tr("הנתונים (JSON)"), () => download("courses-for-ai.json", JSON.stringify({ scannedAt: ctx.list.scannedAt, courses }, null, 2), "application/json"))));
    ui.show({
      title,
      step: tr("שלב {n} מתוך 3", { n: 2 }),
      back: questions,
      body: [
        el("div", { class: "cb-ready" }, el("span", { class: "cb-ready-badge" }, icon(ICONS.check)),
          el("div", {}, el("p", { class: "cb-ready-title", text: tr("הפרומפט מוכן") }), el("p", { class: "cb-ready-sub", text: tr("{n} קורסים · בוחרים AI, והפרומפט מועתק", { n: courses.length }) }))),
        el("ul", { class: "cb-ai-list" }, ...rows),
        status,
        el("ol", { class: "cb-how" },
          el("li", { text: tr("מדביקים בצ'אט ושולחים") }),
          el("li", { text: tr("מעתיקים את התשובה (אפשר את כולה)") }),
          el("li", { text: tr("חוזרים לכאן ולוחצים \"יש לי תשובה\"") })),
        full,
      ],
      footer: [primary(tr("יש לי תשובה: ייבוא"), () => importStep(ui, ctx, () => ready(prompt, courses)))],
    });
  }

  questions();
}

/** Import on its own (the page's "ייבוא" button). */
export function openImport(ctx) {
  importStep(sheet(ctx.helpers.tr), ctx, null);
}

/**
 * The import step: drop a file, pick one, or paste the AI's answer; the preview appears by itself,
 * then one tap saves it. `back` returns to the prompt when the import came from the planner.
 */
function importStep(ui, ctx, back) {
  const { tr } = ctx.helpers;
  const area = el("textarea", { class: "cb-field", dir: "auto", rows: "5", placeholder: tr("מדביקים כאן את התשובה של ה-AI, או קובץ גיבוי של המערכת"), "aria-label": tr("התשובה של ה-AI") });
  const file = el("input", { type: "file", accept: ".json,.txt,application/json,text/plain", class: "cb-file" });
  const drop = el("label", { class: "cb-drop" },
    icon(ICONS.upload, "cb-drop-icon"),
    el("span", { class: "cb-drop-title", text: tr("גוררים לכאן קובץ") }),
    el("span", { class: "cb-drop-sub", text: tr("או לוחצים לבחירה (JSON או טקסט)") }),
    file);
  const result = el("div", { class: "cb-import-result", role: "status", "aria-live": "polite" });
  const save = primary(tr("שמירה במערכת שלי"), () => {}, { disabled: true });
  let pending = null;

  function readFile(f) {
    if (!f) return;
    if (f.size > FILE_MAX) { result.replaceChildren(el("p", { class: "cb-warn", text: tr("הקובץ גדול מדי.") })); return; }
    f.text().then((text) => { area.value = text; preview(text); }, () => result.replaceChildren(el("p", { class: "cb-warn", text: tr("לא הצלחנו לקרוא את הקובץ.") })));
  }
  file.addEventListener("change", () => { readFile(file.files && file.files[0]); file.value = ""; });
  let typing = 0;
  area.addEventListener("input", () => { clearTimeout(typing); typing = setTimeout(() => preview(area.value), 250); });

  function preview(text) {
    pending = null;
    save.disabled = true;
    if (!text.trim()) { result.replaceChildren(); return; }
    const parsed = parseSchedule(text, ctx.list.courses);
    if (parsed.error) {
      result.replaceChildren(el("p", { class: "cb-warn", text: parsed.error === "format" ? tr("זה לא בפורמט של המערכת.") : tr("לא מצאנו כאן מערכת. צריך את בלוק ה-JSON מסוף התשובה של ה-AI.") }));
      return;
    }
    const byCode = new Map(ctx.list.courses.map((c) => [c.code, c]));
    const semester = parsed.semester || "";
    const chosen = Object.entries(parsed.picks).flatMap(([code, groups]) => groups.map((g) => ({ course: byCode.get(code), group: byCode.get(code).groups.find((x) => x.group === g) })));
    const clashes = chosen.flatMap((a, i) => chosen.slice(i + 1).filter((b) => clash(a.group, b.group, semester || a.group.semester.split(", ")[0])));
    // Two lecture groups of one course is usually the AI's slip, not a plan.
    const doubles = [...new Set(chosen.filter((a, i) => chosen.some((b, j) => j < i && b.course === a.course && b.group.kind === a.group.kind)).map((p) => `${courseName(p.course, ctx.helpers)} (${tr(p.group.kind)})`))];
    const replace = el("input", { type: "checkbox", checked: true, id: "cb-import-replace" });
    // Replacing covers this semester's picks (an AI plan is per semester), or, with no semester (a backup),
    // the courses the import names. The other semester and other courses stay as they are.
    const covers = (code, g) => {
      if (!semester) return code in parsed.picks;
      const group = byCode.get(code) && byCode.get(code).groups.find((x) => x.group === g);
      return Boolean(group) && group.semester.split(", ").includes(semester);
    };
    pending = () => {
      ctx.store.importPicks(parsed.picks, { replace: replace.checked, semester, starred: parsed.starred, covers });
      ui.dialog.close();
      ctx.onImported && ctx.onImported(semester);
    };
    save.disabled = false;
    const byCourse = new Map();
    for (const p of chosen) byCourse.set(p.course, [...(byCourse.get(p.course) || []), p.group]);
    result.replaceChildren(...[
      el("div", { class: "cb-summary" },
        el("p", { class: "cb-summary-title", text: tr("נמצאו {n} קבוצות ב-{c} קורסים", { n: chosen.length, c: byCourse.size }) }),
        semester ? el("p", { class: "cb-summary-sub", text: tr(semester) }) : null,
        el("ul", { class: "cb-summary-list" }, ...[...byCourse].map(([course, groups]) => el("li", {},
          el("span", { class: "cb-summary-name", text: courseName(course, ctx.helpers) }),
          el("span", { class: "cb-summary-groups" }, ...groups.map((g) => el("span", { text: `${tr(g.kind)} ${g.group} · ${timedSlots(g).map(slotText).join(" + ") || tr("בלי שעה בקטלוג")}` }))))))),
      clashes.length ? el("p", { class: "cb-warn", text: tr("⚠ {n} חפיפות. אפשר לשמור ולתקן במערכת שלי.", { n: clashes.length }) }) : null,
      doubles.length ? el("p", { class: "cb-warn", text: tr("⚠ יותר מקבוצה אחת מאותו סוג ב: {list}. בדרך כלל לוקחים אחת.", { list: doubles.join(", ") }) }) : null,
      parsed.dropped.length ? el("p", { class: "cb-note-line", text: tr("לא נמצאו בקטלוג ולכן דולגו: {list}", { list: parsed.dropped.join(", ") }) }) : null,
      el("label", { class: "cb-check", for: "cb-import-replace" }, replace,
        semester ? tr("להחליף את הבחירות שלי ב{semester} (הסמסטר השני לא משתנה)", { semester: tr(semester) }) : tr("להחליף את הבחירות בקורסים האלה (השאר לא משתנים)")),
    ].filter(Boolean));
    result.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  save.addEventListener("click", () => pending && pending());

  ui.show({
    title: tr("ייבוא מערכת"),
    step: back ? tr("שלב {n} מתוך 3", { n: 3 }) : "",
    back,
    body: [
      el("p", { class: "cb-sheet-lead", text: tr("מדביקים את התשובה של ה-AI (אפשר את כולה) או מעלים קובץ גיבוי.") }),
      drop,
      el("p", { class: "cb-or", text: tr("או") }),
      area,
      result,
    ],
    footer: [save],
  });
  // After show(), which clears the previous step's target: a file dropped on the sheet is read here.
  ui.onFile(drop, readFile);
}

/** Backup: download the whole schedule in the import format. */
export function exportBackup(ctx) {
  const text = exportSchedule(ctx.store.get());
  download("my-schedule.json", text, "application/json");
  return text;
}
