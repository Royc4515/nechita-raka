/*
  The courses page (/courses). Two views: "all courses" (search, semester, year and day filters, courses
  grouped by year) and "my schedule" (course-schedule.js, from the courses a student starred and the groups
  they picked, saved on the device by course-store.js). Each course is a dropdown (course-card.js).
  Loaded by index.html only when the courses guide opens or the search needs courses. Reads course-list.json,
  which the build writes from the catalog scan and the yearbook (api/_lib/courses/model.js). The scan is
  unofficial: the page says so in one line and points to Inbar.
  index.html passes in its own helpers (tr, rank, searchDoc...) so search behaves the same everywhere.
*/
import { courseCard, el, visibleGroups } from "./course-card.js";
import { exportBackup, openImport, openPlanner } from "./course-ai-dialog.js";
import { openCalendar } from "./course-calendar-dialog.js";
import { scheduleView } from "./course-schedule.js";
import { applyCustom, createStore } from "./course-store.js";
import { currentSemester, DAYS } from "./course-time.js";

const LIST_URL = "./course-list.json";
const SEMESTERS = ["סמסטר א'", "סמסטר ב'"];
const YEARS = [
  { id: "all", label: "הכול" },
  { id: "1", label: "שנה א'" },
  { id: "2", label: "שנה ב'" },
  { id: "3", label: "שנה ג'" },
  { id: "elective", label: "בחירה" },
  { id: "seminar", label: "סמינרים" },
  { id: "other", label: "אחר" },
];
const SECTION_TITLES = { 1: "שנה א'", 2: "שנה ב'", 3: "שנה ג'", elective: "קורסי בחירה" };
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

const yearKey = (year) => (year == null ? "other" : String(year));
/** The year chips also hold "seminars": any course with a seminar group, whatever its year. */
const isSeminar = (course) => course.groups.some((g) => g.kind === "סמינריון");
const matchesYear = (course, year) => year === "all" || (year === "seminar" ? isSeminar(course) : yearKey(course.year) === year);
const dmy = (iso) => {
  const [y, m, d] = String(iso || "").split("-");
  return y && m && d ? `${Number(d)}.${Number(m)}.${y}` : "";
};
export const courseHref = (code) => `./courses?c=${encodeURIComponent(code)}`;

function yearLabel(year, tr) {
  const found = YEARS.find((y) => y.id === yearKey(year));
  return found && !["other", "all", "seminar"].includes(found.id) ? tr(found.label) : "";
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
    const lecture = course.groups.find((g) => g.kind === "הרצאה" && g.teachers) || course.groups.find((g) => g.teachers);
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

/** A row of toggle buttons. `multi` allows several (days); otherwise exactly one is pressed. */
function toggles(label, options, isOn, onPick, { tr, extraClass = "" } = {}) {
  const buttons = options.map((o) => {
    const b = el("button", { type: "button", class: "cb-chip", "data-key": `chip|${label}|${o.id}`, "aria-pressed": String(isOn(o.id)), text: tr(o.label) });
    b.addEventListener("click", () => onPick(o.id));
    return b;
  });
  return el("div", { class: `cb-toggles ${extraClass}`, role: "group", "aria-label": tr(label) }, ...buttons);
}

/**
 * Fills `root` with the course browser. helpers: { tr, rank(entries, raw), searchDoc, en, now(), terms }.
 * The address keeps a one-course link (?c=<code>) and a search (?cq=), so a link shows the same list.
 */
export async function mountCourseBrowser(root, helpers) {
  const { tr, rank, en } = helpers;
  if (!document.querySelector('link[href="./course-browser.css"]')) document.head.append(el("link", { rel: "stylesheet", href: "./course-browser.css" }));
  root.replaceChildren(el("p", { class: "cb-muted", text: tr("טוען את הקורסים...") }));
  let list;
  try {
    list = await loadCourseList();
  } catch (err) {
    console.warn("courses: could not load the course list", err);
    root.replaceChildren(el("p", { class: "cb-error", text: tr("לא הצלחנו לטעון את רשימת הקורסים. נסו לרענן, או חפשו בשהם, קטלוג הקורסים.") }));
    return;
  }
  const store = createStore();
  // A new scan can drop a group someone picked; tell them which, once.
  const dropped = store.reconcile(list.courses, list.scannedAt);
  const nowFn = () => (helpers.now ? helpers.now() : new Date());
  const thisSemester = currentSemester(helpers.terms, nowFn()) || SEMESTERS[0];
  const params = new URLSearchParams(location.search);
  const target = params.get("c") || "";
  const state = {
    tab: target || !store.get().starred.length ? "all" : "mine",
    q: params.get("cq") || "",
    year: store.get().year || "all",
    // The semester someone last chose (planning semester B in October), else the current one.
    semester: SEMESTERS.includes(store.get().semester) ? store.get().semester : SEMESTERS.includes(thisSemester) ? thisSemester : SEMESTERS[0],
    days: new Set(),
    target,
    showOther: false,
  };
  const opened = new Set(target ? [target] : []);
  // The courses with the student's manual times folded in, rebuilt only when the saved state changes.
  let effective = { state: null, courses: list.courses, byCode: new Map() };
  const live = () => {
    const s = store.get();
    if (effective.state !== s) {
      const courses = applyCustom(list.courses, s.custom);
      effective = { state: s, courses, byCode: new Map(courses.map((c) => [c.code, c])) };
    }
    return effective;
  };
  // Which group's "add a time" form is open, kept across redraws.
  let pickedDay = ""; // the day shown in My week's day view, once the student picks one
  let editingKey = "";
  let draft = {}; // what was typed in the open form, so a redraw (a pick, a star) doesn't clear it
  const editTime = () => ({
    key: editingKey,
    draft,
    open: (key) => { editingKey = key; draft = {}; render(); },
    close: () => { editingKey = ""; draft = {}; render(); },
  });
  const closed = new Set(); // cards someone closed stay closed, even ones that open by default
  const untimedOpen = new Set(); // courses whose "no time" fold is open
  const ordered = [...list.courses].sort((a, b) => (YEAR_ORDER[a.year] ?? 9) - (YEAR_ORDER[b.year] ?? 9));
  const entries = ordered.map((course) => ({ course, doc: courseDoc(course, helpers) }));
  const dayLabel = (d) => (en ? DAY_EN[d] : d);

  // ---------- controls ----------
  const tabsNode = el("div", { class: "cb-tabs", role: "group", "aria-label": tr("תצוגה") });
  const input = el("input", { type: "search", class: "cb-q", id: "cb-q", placeholder: tr("שם קורס, מספר או מרצה"), "aria-label": tr("חיפוש קורס"), autocomplete: "off", enterkeyhint: "search", value: state.q });
  const clearBtn = el("button", { type: "button", class: "cb-q-clear", "aria-label": tr("ניקוי החיפוש"), hidden: !state.q, text: "×" });
  const searchBox = el("div", { class: "cb-search" }, el("span", { class: "cb-q-icon", "aria-hidden": "true" }), input, clearBtn);
  const semesterRow = el("div", { class: "cb-semester-row" });
  const filterRow = el("div", { class: "cb-filter-row" });
  const daysRow = el("div", { class: "cb-days-row" });
  const status = el("p", { class: "cb-status", role: "status", "aria-live": "polite" });
  const announcer = el("p", { class: "sr-only", role: "status", "aria-live": "polite" });
  const setStatus = (text) => { if (status.textContent !== text) status.textContent = text; };
  const content = el("div", { class: "cb-content" });
  // Build a schedule with your own AI, and bring its answer (or a backup) back in.
  const aiCtx = () => ({
    helpers: { tr, en }, store, list: { ...list, courses: live().courses }, semester: state.semester,
    onImported: (semester, count) => {
      set({ tab: "mine", ...(SEMESTERS.includes(semester) ? { semester } : {}), ...widen() });
      announcer.textContent = tr("נשמרו {n} קבוצות במערכת שלי.", { n: count || 0 });
      // Start the new schedule from its top, where the next class and the week are.
      root.scrollIntoView({ block: "start", behavior: "smooth" });
    },
  });
  const planBtn = el("button", { type: "button", class: "cb-plan-btn" }, el("span", { class: "cb-plan-icon", "aria-hidden": "true" }), el("span", { text: tr("בניית מערכת עם AI") }));
  planBtn.addEventListener("click", () => openPlanner(aiCtx()));
  const importBtn = el("button", { type: "button", class: "cb-import-btn" }, el("span", { class: "cb-import-icon", "aria-hidden": "true" }), el("span", { text: tr("ייבוא") }));
  importBtn.addEventListener("click", () => openImport(aiCtx()));
  const actions = el("div", { class: "cb-actions" }, planBtn, importBtn);
  // The tool that collected the data, as a quiet credit next to the scan date.
  const CRAWLER_URL = "https://github.com/Royc4515/biu-courses-crawler";
  const note = el("p", { class: "cb-note" }, tr("נסרק ב-"), el("bdi", { dir: "ltr", text: dmy(list.scannedAt) }), tr(" · לא רשמי, בודקים באינ-בר"),
    " · ", el("a", { href: CRAWLER_URL, target: "_blank", rel: "noopener noreferrer", class: "cb-note-link", text: tr("איך נאסף") }));

  function saveToAddress() {
    const url = new URL(location.href);
    if (state.target) url.searchParams.set("c", state.target); else url.searchParams.delete("c");
    if (state.q.trim()) url.searchParams.set("cq", state.q.trim()); else url.searchParams.delete("cq");
    history.replaceState(history.state, "", url);
  }
  function set(changes) {
    Object.assign(state, changes);
    render();
    saveToAddress();
  }
  /** Leaving a one-course link: any filter or search widens back to the list. */
  const widen = () => ({ target: "" });

  function renderControls() {
    const mine = store.get().starred.length;
    tabsNode.replaceChildren(...[["all", tr("כל הקורסים")], ["mine", tr("המערכת שלי")]].map(([id, label]) => {
      // The count is a small badge; screen readers hear it in words.
      const count = id === "mine" && mine ? el("span", { class: "cb-tab-count", "aria-hidden": "true", text: String(mine) }) : null;
      const b = el("button", { type: "button", class: "cb-tab", "data-key": `tab|${id}`, "aria-pressed": String(state.tab === id), "aria-label": count ? tr("המערכת שלי ({n} קורסים)", { n: mine }) : null }, label, count);
      b.addEventListener("click", () => set({ tab: id, ...widen() }));
      return b;
    }));
    const semesterToggles = toggles("סמסטר", SEMESTERS.map((s) => ({ id: s, label: s })), (id) => state.semester === id, (id) => { store.setSemester(id); set({ semester: id }); }, { tr, extraClass: "is-segmented" });
    const yearToggles = toggles("שנה", YEARS, (id) => state.year === id, (id) => { store.setYear(id); set({ year: id, ...widen() }); }, { tr });
    semesterRow.replaceChildren(semesterToggles);
    filterRow.hidden = state.tab !== "all";
    filterRow.replaceChildren(yearToggles);
    daysRow.hidden = state.tab !== "all";
    daysRow.replaceChildren(...[
      el("span", { class: "cb-days-label", text: tr("רק בימים:") }),
      toggles("רק בימים", DAYS.map((d) => ({ id: d, label: dayLabel(d) })), (id) => state.days.has(id), (id) => {
        const days = new Set(state.days);
        if (days.has(id)) days.delete(id); else days.add(id);
        set({ days, ...widen() });
      }, { tr }),
      state.days.size ? (() => { const b = el("button", { type: "button", class: "cb-link", "data-key": "days|clear", text: tr("ניקוי") }); b.addEventListener("click", () => set({ days: new Set() })); return b; })() : null,
    ].filter(Boolean));
    searchBox.hidden = state.tab !== "all";
  }

  // ---------- the list ----------
  function cardFor(raw, { open = false, badge = false } = {}) {
    const course = live().byCode.get(raw.code) || raw;
    return courseCard(course, {
      helpers: { tr, en },
      store,
      now: nowFn(),
      semester: state.semester,
      semesterIsNow: state.semester === thisSemester,
      days: state.days,
      picked: pickedAll(),
      open: opened.has(course.code) || (open && !closed.has(course.code)),
      untimedOpen: untimedOpen.has(course.code),
      onUntimed: (code, isOpen) => { if (isOpen) untimedOpen.add(code); else untimedOpen.delete(code); },
      highlight: course.code === state.target,
      yearLabel: badge ? yearLabel(course.year, tr) : "",
      editTime: editTime(),
      onToggle: (code, isOpen) => {
        if (isOpen) { opened.add(code); closed.delete(code); } else { opened.delete(code); closed.add(code); }
      },
      onOtherSemester: (code) => {
        const other = SEMESTERS.find((s) => s !== state.semester);
        opened.add(code);
        store.setSemester(other);
        set({ semester: other });
      },
      onTeacher: (name) => {
        input.value = name;
        clearBtn.hidden = false;
        set({ tab: "all", q: name, year: "all", days: new Set(), ...widen() });
        root.scrollIntoView({ block: "start" });
        // The tapped link may now be inside a closed card; the search box with their name holds focus.
        input.focus({ preventScroll: true });
      },
    });
  }
  function pickedAll() {
    return live().courses.flatMap((course) => course.groups.filter((g) => store.isPicked(course.code, g.group)).map((group) => ({ course, group })));
  }
  const hasVisible = (course) => visibleGroups(live().byCode.get(course.code) || course, state).length > 0;

  function allView() {
    if (state.target) {
      const course = list.courses.find((c) => c.code === state.target);
      const back = el("button", { type: "button", class: "cb-link", text: tr("→ כל הקורסים") });
      back.addEventListener("click", () => set({ target: "" }));
      setStatus(course ? tr("קורס אחד") : tr("הקורס לא נמצא בקטלוג."));
      return [course ? el("div", { class: "cb-list" }, cardFor(course, { open: true, badge: true })) : null, back];
    }
    const raw = state.q.trim();
    if (raw) {
      const found = rank(entries, raw).list.map((e) => e.course).filter((c) => matchesYear(c, state.year)).filter((c) => !state.days.size || hasVisible(c));
      setStatus(found.length === 0 ? tr("לא נמצא קורס. נסו מילה אחרת או סננו פחות.") : found.length === 1 ? tr("קורס אחד") : tr("{n} קורסים", { n: found.length }));
      return [el("div", { class: "cb-list" }, ...found.map((c) => cardFor(c, { badge: true, open: found.length === 1 })))];
    }
    const inYear = ordered.filter((c) => matchesYear(c, state.year) && hasVisible(c));
    const shownCount = state.year === "all" && !state.showOther ? inYear.filter((c) => yearKey(c.year) !== "other").length : inYear.length;
    // Say how many courses the day filter took away, so a missing course has a reason.
    const hiddenByDays = state.days.size ? ordered.filter((c) => matchesYear(c, state.year) && visibleGroups(c, { semester: state.semester, days: new Set() }).length && !hasVisible(c)).length : 0;
    setStatus([shownCount === 1 ? tr("קורס אחד") : tr("{n} קורסים", { n: shownCount }), hiddenByDays ? tr("{n} הוסתרו כי אין להם קבוצה בימים שבחרתם", { n: hiddenByDays }) : ""].filter(Boolean).join(" · "));
    if (state.year !== "all") return [el("div", { class: "cb-list" }, ...inYear.map((c) => cardFor(c)))];
    // All years: one section per year; the courses outside the yearbook (mostly graduate) wait behind a button.
    const sections = Object.keys(SECTION_TITLES).map((y) => {
      const courses = inYear.filter((c) => yearKey(c.year) === y);
      if (!courses.length) return null;
      return el("section", { class: "cb-section", "aria-label": tr(SECTION_TITLES[y]) },
        el("h3", { class: "cb-section-h" }, tr(SECTION_TITLES[y]), el("span", { class: "cb-count", text: ` ${courses.length}` })),
        el("div", { class: "cb-list" }, ...courses.map((c) => cardFor(c))));
    });
    const others = inYear.filter((c) => yearKey(c.year) === "other");
    let otherNode = null;
    if (others.length && state.showOther) {
      otherNode = el("section", { class: "cb-section", "aria-label": tr("קורסים נוספים") },
        el("h3", { class: "cb-section-h" }, tr("קורסים נוספים"), el("span", { class: "cb-count", text: ` ${others.length}` })),
        el("div", { class: "cb-list" }, ...others.map((c) => cardFor(c))));
    } else if (others.length) {
      otherNode = el("button", { type: "button", class: "btn cb-more", "data-key": "more|other", text: tr("עוד {n} קורסים (תואר שני ואחרים)", { n: others.length }) });
      otherNode.addEventListener("click", () => set({ showOther: true }));
    }
    return [...sections, otherNode];
  }

  function render() {
    // A star or pick redraws the list; keep keyboard focus on the same button.
    const focusKey = document.activeElement && root.contains(document.activeElement) ? document.activeElement.dataset.key : "";
    renderControls();
    if (state.tab === "mine") {
      setStatus("");
      content.replaceChildren(scheduleView({
        backup: () => exportBackup(aiCtx()),
        pickedDay,
        onPickDay: (day) => { pickedDay = day; render(); },
        calendar: () => openCalendar({
          helpers: { tr, en }, store, courses: live().courses, semester: state.semester,
          terms: helpers.terms, events: helpers.events, scannedAt: list.scannedAt, now: nowFn(),
        }),
        helpers: { tr, en },
        store,
        now: nowFn(),
        semester: state.semester,
        semesterIsNow: state.semester === thisSemester,
        courses: live().courses,
        card: (course, open) => cardFor(course, { open }),
        goToAll: () => set({ tab: "all" }),
      }));
    } else {
      content.replaceChildren(...allView().filter(Boolean));
    }
    if (focusKey) {
      const again = [...root.querySelectorAll("[data-key]")].find((n) => n.dataset.key === focusKey);
      if (again) again.focus({ preventScroll: true });
    }
  }

  let typing = 0;
  input.addEventListener("input", () => {
    clearBtn.hidden = !input.value;
    clearTimeout(typing);
    typing = setTimeout(() => set({ q: input.value, ...widen() }), 120);
  });
  clearBtn.addEventListener("click", () => { input.value = ""; clearBtn.hidden = true; set({ q: "" }); input.focus(); });
  store.subscribe(() => render());
  // Once someone saves a schedule, ask the browser not to clear this site's storage on its own.
  let askedToPersist = false;
  store.subscribe((s) => {
    if (askedToPersist || !s.starred.length || !navigator.storage || !navigator.storage.persist) return;
    askedToPersist = true;
    navigator.storage.persist().catch(() => {});
  });

  root.replaceChildren(...[
    tabsNode,
    actions,
    announcer,
    dropped.length ? el("p", { class: "cb-banner", role: "status", text: tr("הקטלוג התעדכן, ו-{n} קבוצות שבחרתם כבר לא קיימות. כדאי לבחור מחדש בקורסים: {list}.", { n: dropped.length, list: [...new Set(dropped.map((d) => (list.courses.find((c) => c.code === d.code) || { name: d.code }).name))].join(", ") }) }) : null,
    el("div", { class: "cb-controls" }, semesterRow, searchBox, filterRow, daysRow),
    el("div", { class: "cb-status-row" }, status, note),
    content,
  ].filter(Boolean));
  render();
  if (state.target) {
    const card = document.getElementById(`course-${state.target}`);
    if (card) requestAnimationFrame(() => card.scrollIntoView({ block: "start" }));
  }
}
