/*
  The courses page (/courses): every CS course as a card, with search and year / type filters.
  Loaded by index.html only when the courses guide opens or the search needs courses, so the home page
  stays as light as before. Reads course-list.json, which the build writes from the catalog scan and the
  yearbook (api/_lib/courses/model.js). The scan is unofficial: the page says so and points to Inbar.
  index.html passes in its own helpers (tr, rank, searchDoc...) so search behaves the same everywhere.
*/
const LIST_URL = "./course-list.json";
const PAGE_SIZE = 20;
const YEARS = [
  { id: "all", label: "הכול" },
  { id: "1", label: "שנה א'" },
  { id: "2", label: "שנה ב'" },
  { id: "3", label: "שנה ג'" },
  { id: "elective", label: "בחירה" },
  { id: "other", label: "אחר" },
];
const TYPES = [
  { id: "all", label: "הכול" },
  { id: "lecture", label: "הרצאה" },
  { id: "exercise", label: "תרגיל" },
  { id: "workshop", label: "סדנה" },
  { id: "seminar", label: "סמינריון" },
  { id: "other", label: "אחר" },
];
const KIND_TYPE = { "הרצאה": "lecture", "תרגיל": "exercise", "סדנה": "workshop", "סמינריון": "seminar" };
const YEAR_ORDER = { 1: 0, 2: 1, 3: 2, elective: 3 };
const YEAR_BOOST = { 1: 3, 2: 2, 3: 2, elective: 1 };
const DAY_EN = { "א'": "Sun", "ב'": "Mon", "ג'": "Tue", "ד'": "Wed", "ה'": "Thu", "ו'": "Fri" };

let listPromise = null;
/** The shaped course list, fetched once per page. Rejects when the file can't be read. */
export function loadCourseList() {
  listPromise ??= fetch(LIST_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`course-list.json: ${res.status}`);
      return res.json();
    })
    .then((list) => {
      if (!list || !Array.isArray(list.courses)) throw new Error("course-list.json: no courses");
      return list;
    })
    .catch((err) => {
      listPromise = null; // a later visit may succeed
      throw err;
    });
  return listPromise;
}

const typeOf = (kind) => KIND_TYPE[kind] || "other";
const yearKey = (year) => (year == null ? "other" : String(year));
const dmy = (iso) => {
  const [y, m, d] = String(iso || "").split("-");
  return y && m && d ? `${Number(d)}.${Number(m)}.${y}` : "";
};
export const courseHref = (code) => `./courses?c=${encodeURIComponent(code)}`;

function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "text") node.textContent = value;
    else node.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children) if (child !== null && child !== undefined && child !== false) node.append(child);
  return node;
}

function yearLabel(year, tr) {
  const found = YEARS.find((y) => y.id === yearKey(year));
  return found && found.id !== "other" ? tr(found.label) : "";
}

/** A course as the site search sees it: name in the title, code and year as keywords, teachers in the body. */
function courseDoc(course, { tr, searchDoc }) {
  const teachers = [...new Set(course.groups.flatMap((g) => g.teachers.split(", ")).filter(Boolean))];
  // Same name, two courses (מבני נתונים for CS and for another track): the one in the yearbook comes first.
  const boost = YEAR_BOOST[course.year] || 0;
  return searchDoc(course.name, [course.code, course.nameEn, yearLabel(course.year, tr), tr("קורס")].filter(Boolean).join(" "), teachers.join(" "), boost);
}

/** Entries for index.html's search box and palette: one per course, opening its card. */
export function courseSearchEntries(list, helpers) {
  const { tr, navigate, en } = helpers;
  return list.courses.map((course) => {
    const lecture = course.groups.find((g) => typeOf(g.kind) === "lecture" && g.teachers) || course.groups.find((g) => g.teachers);
    return {
      type: tr("קורס"),
      title: (en && course.nameEn) || course.name,
      sub: [course.code, yearLabel(course.year, tr), lecture && lecture.teachers.split(", ")[0]].filter(Boolean).join(" · "),
      doc: courseDoc(course, helpers),
      href: courseHref(course.code),
      run: () => navigate(courseHref(course.code)),
      course: true,
    };
  });
}

function dayText(day, tr, en) {
  if (!day) return "";
  return en ? DAY_EN[day] || day : tr("יום {day}", { day });
}

function groupItem(g, { tr, en }) {
  const when = [dayText(g.day, tr, en), g.hours && el("span", { class: "ltr", text: g.hours })].filter(Boolean);
  const semester = g.semester.split(", ").map((s) => tr(s)).join(" + ");
  return el("li", { class: "cb-group" },
    el("span", { class: `cb-kind cb-kind-${typeOf(g.kind)}`, text: tr(g.kind) }),
    el("span", { class: "cb-group-main" },
      el("span", { class: "cb-when" },
        el("span", { text: `${tr("קבוצה {n}", { n: g.group })} · ${semester}` }),
        ...(when.length ? [" · ", ...when.flatMap((w, i) => (i ? [" ", w] : [w]))] : [" · ", el("span", { class: "cb-missing", text: tr("בלי שעה בקטלוג") })])),
      g.place ? el("span", { class: "cb-place", text: `${tr("מיקום:")} ${g.place}` }) : null,
      g.teachers ? el("span", { class: "cb-teachers", text: g.teachers }) : null));
}

function courseCard(course, groups, helpers, highlight) {
  const { tr, en } = helpers;
  const year = yearLabel(course.year, tr);
  const name = (en && course.nameEn) || course.name;
  const exams = course.exams.map((e) => `${tr(e.type)} ${dmy(e.date)}${e.hour ? ` ${e.hour}` : ""}`);
  return el("article", { class: `cb-card${highlight ? " is-target" : ""}`, id: `course-${course.code}`, "aria-labelledby": `course-h-${course.code}` },
    el("header", { class: "cb-head" },
      el("h3", { id: `course-h-${course.code}`, text: name }),
      el("p", { class: "cb-meta" },
        el("span", { class: "ltr", text: course.code }),
        year ? el("span", { class: "cb-year", text: year }) : null,
        course.points.length === 1 ? el("span", { text: tr("{n} נ\"ז", { n: course.points[0] }) }) : null,
        en || !course.nameEn ? null : el("span", { class: "cb-en", lang: "en", text: course.nameEn }))),
    exams.length ? el("p", { class: "cb-exams" }, el("strong", { text: tr("מועדי בחינה:") }), ` ${exams.join(" · ")}`) : null,
    el("ul", { class: "cb-groups" }, ...groups.map((g) => groupItem(g, helpers))));
}

function chipGroup(label, options, current, onPick, tr) {
  const buttons = options.map((o) => {
    const b = el("button", { type: "button", class: "cb-chip", "aria-pressed": String(o.id === current), text: tr(o.label) });
    b.addEventListener("click", () => onPick(o.id));
    return b;
  });
  return { node: el("div", { class: "cb-filter", role: "group", "aria-label": tr(label) }, el("span", { class: "cb-filter-label", "aria-hidden": "true", text: tr(label) }), ...buttons), buttons, options };
}

/**
 * Fills `root` with the course browser. helpers: { tr, rank(entries, raw), searchDoc, en }.
 * State lives in the address (?c=<code> opens one course, ?cq= a search), so a link shows the same list.
 */
export async function mountCourseBrowser(root, helpers) {
  const { tr, rank } = helpers;
  if (!document.querySelector('link[href="./course-browser.css"]')) document.head.append(el("link", { rel: "stylesheet", href: "./course-browser.css" }));
  root.replaceChildren(el("p", { class: "cb-loading", text: tr("טוען את הקורסים...") }));
  let list;
  try {
    list = await loadCourseList();
  } catch (err) {
    console.warn("courses: could not load the course list", err);
    root.replaceChildren(el("p", { class: "cb-error", text: tr("לא הצלחנו לטעון את רשימת הקורסים. נסו לרענן, או חפשו בשהם, קטלוג הקורסים.") }));
    return;
  }
  const params = new URLSearchParams(location.search);
  const state = { q: params.get("cq") || params.get("c") || "", year: "all", type: "all", shown: PAGE_SIZE, target: params.get("c") || "" };
  const ordered = [...list.courses].sort((a, b) => (YEAR_ORDER[a.year] ?? 9) - (YEAR_ORDER[b.year] ?? 9));
  const entries = ordered.map((course) => ({ course, doc: courseDoc(course, helpers) }));

  const input = el("input", { type: "search", class: "cb-q", id: "cb-q", placeholder: tr("שם קורס, מספר או מרצה"), "aria-label": tr("חיפוש קורס"), autocomplete: "off", enterkeyhint: "search", value: state.q });
  const status = el("p", { class: "cb-status", role: "status", "aria-live": "polite" });
  const cards = el("div", { class: "cb-cards" });
  const more = el("button", { type: "button", class: "btn cb-more", hidden: true });
  // A filter widens a one-course link (?c=) back to the whole list.
  function pick(key, id) {
    if (state.target && state.q === state.target) { state.q = ""; input.value = ""; }
    state.target = "";
    state[key] = id;
    update(true);
    saveToAddress();
  }
  const years = chipGroup("שנה", YEARS, state.year, (id) => pick("year", id), tr);
  const types = chipGroup("סוג", TYPES, state.type, (id) => pick("type", id), tr);
  const scanned = dmy(list.scannedAt);

  function matches() {
    const raw = state.q.trim();
    // A link to one course (?c=) shows just that course until the search is changed.
    const exact = state.target && entries.filter((e) => e.course.code === state.target);
    const byText = exact && exact.length ? exact : raw ? rank(entries, raw).list : entries;
    return byText
      .filter((e) => state.year === "all" || yearKey(e.course.year) === state.year)
      .map((e) => ({ course: e.course, groups: state.type === "all" ? e.course.groups : e.course.groups.filter((g) => typeOf(g.kind) === state.type) }))
      .filter((m) => m.groups.length);
  }
  function saveToAddress() {
    const url = new URL(location.href);
    url.searchParams.delete("c");
    if (state.q.trim()) url.searchParams.set("cq", state.q.trim()); else url.searchParams.delete("cq");
    history.replaceState(history.state, "", url);
  }
  function update(reset) {
    if (reset) state.shown = PAGE_SIZE;
    for (const g of [years, types]) g.buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(g.options[i].id === (g === years ? state.year : state.type))));
    const found = matches();
    const page = found.slice(0, state.shown);
    cards.replaceChildren(...page.map((m) => courseCard(m.course, m.groups, helpers, m.course.code === state.target)));
    status.textContent = found.length === 0 ? tr("לא נמצא קורס. נסו מילה אחרת או סננו פחות.")
      : found.length === 1 ? tr("קורס אחד") : tr("{n} קורסים", { n: found.length });
    const left = found.length - page.length;
    more.hidden = left <= 0;
    more.textContent = tr("עוד {n} קורסים", { n: Math.min(left, PAGE_SIZE) });
  }
  input.addEventListener("input", () => { state.q = input.value; state.target = ""; update(true); saveToAddress(); });
  more.addEventListener("click", () => { state.shown += PAGE_SIZE; update(false); });

  root.replaceChildren(
    el("p", { class: "cb-note" }, tr("נסרק מקטלוג הקורסים של האוניברסיטה ב-"), el("span", { class: "ltr", text: scanned }),
      tr(". לא מקור רשמי: שעות וחדרים משתנים, ומה שקובע הוא אינ-בר.")),
    el("div", { class: "cb-controls" }, input, years.node, types.node),
    status, cards, more);
  update(true);
  if (state.target) {
    const card = document.getElementById(`course-${state.target}`);
    if (card) requestAnimationFrame(() => card.scrollIntoView({ block: "start" }));
  }
}
