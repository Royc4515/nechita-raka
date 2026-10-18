/*
  The courses page (/courses). Two views: "all courses" (search, semester, year and day filters, courses
  grouped by year) and "my schedule" (course-schedule.js, from the courses a student starred and the groups
  they picked, saved on the device by course-store.js). Each course is a dropdown (course-card.js).
  Loaded by index.html only when the courses guide opens or the search needs courses. Reads course-list.json,
  which the build writes from the catalog scan and the yearbook (api/_lib/courses/model.js). The scan is
  unofficial: the page says so in one line and points to Inbar.
  index.html passes in its own helpers (tr, rank, searchDoc...) so search behaves the same everywhere.
  The categories and, for a faculty that has them, the study tracks come from faculty.js (window.FACULTY):
  with tracks the categories are "<track>:<year>", the chips are years, and a picker (course-track.js) narrows
  the list to one track; without a choice every course shows and each card names its tracks and years.
*/
import { courseCard, el, visibleGroups } from "./course-card.js";
import { exportBackup, openImport, openPlanner } from "./course-ai-dialog.js";
import { openCalendar } from "./course-calendar-dialog.js";
import { scheduleView } from "./course-schedule.js";
import { applyCustom, createStore } from "./course-store.js";
import { currentSemester, DAYS } from "./course-time.js";
import { facultyTracks, readTrack, saveTrack, trackAsked, trackName } from "./course-track.js";
import { NARROW } from "./course-week.js";
import { inTrack, trackOf, yearOfId, yearsOf } from "./course-years.js";

const LIST_URL = "./course-list.json";
const SEMESTERS = ["סמסטר א'", "סמסטר ב'"];
const FACULTY = (globalThis.window && globalThis.window.FACULTY) || {};
/** The yearbook's categories from the manifest (courses.categories in faculty.js): the short form for the chips, the label for section titles. */
const CATEGORIES = ((FACULTY.courses && FACULTY.courses.categories) || []).map((c) => ({ id: c.id, label: c.short || c.label, title: c.label }));
/** The faculty's study tracks; empty for a faculty without them (CS), and then nothing below mentions tracks. */
const TRACKS = facultyTracks(FACULTY);
const YEAR_LABEL = { 1: "שנה א'", 2: "שנה ב'", 3: "שנה ג'" };
/** With tracks, the year chips: every year the "<track>:<year>" categories name. */
const YEAR_CHIPS = [...new Set(CATEGORIES.map((c) => yearOfId(c.id)).filter(Boolean))].sort((a, b) => a - b).map((y) => ({ id: String(y), label: YEAR_LABEL[y] }));
const YEARS = [
  { id: "all", label: "הכול" },
  ...(TRACKS.length ? YEAR_CHIPS : CATEGORIES.map(({ id, label }) => ({ id, label }))),
  { id: "seminar", label: "סמינרים" },
  { id: "other", label: "אחר" },
];
const CATEGORY_ORDER = Object.fromEntries(CATEGORIES.map((c, i) => [c.id, i]));
const YEAR_BOOST = { 1: 3, 2: 2, 3: 2 };
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

const categoriesOf = (course) => course.categories || [];
const inYearbook = (course) => categoriesOf(course).length > 0;
/** The chips also hold "seminars": any course with a seminar group, whatever its category. */
const isSeminar = (course) => course.groups.some((g) => g.kind === "סמינריון");
/** The courses the sections show: the chosen track's, else (with or without tracks) the yearbook's. */
const inScope = (course, track) => (track ? inTrack(categoriesOf(course), track) : inYearbook(course));
/**
 * A course in several categories matches each of them. With tracks the chips are years, read within the chosen
 * track (or across every track); "other" is then what is outside the chosen track, else what the yearbook lacks.
 */
function matchesYear(course, chip, track = "") {
  const categories = categoriesOf(course);
  if (chip === "all") return inTrack(categories, track);
  if (chip === "seminar") return isSeminar(course) && inTrack(categories, track);
  if (chip === "other") return !inScope(course, track);
  return TRACKS.length ? yearsOf(categories, track).includes(Number(chip)) : categories.includes(chip);
}
const firstCategory = (course) => Math.min(9, ...categoriesOf(course).map((id) => CATEGORY_ORDER[id] ?? 9));
/** With tracks the list is ordered by first year, then by the manifest's order; without, by the manifest's order alone. */
const listOrder = (course) => (TRACKS.length ? (yearsOf(categoriesOf(course))[0] || 9) * 100 : 0) + firstCategory(course);
const dmy = (iso) => {
  const [y, m, d] = String(iso || "").split("-");
  return y && m && d ? `${Number(d)}.${Number(m)}.${y}` : "";
};
export const courseHref = (code) => `./courses?c=${encodeURIComponent(code)}`;

/**
 * "שנה ב' · אשכול 1": every category the course is in. With tracks: the course's year in the chosen track, or,
 * without a choice, each year with the tracks that take the course in it ("שנה א' (חד-חוגי, מדמ"ח) · שנה ב' (פיזיקה)").
 */
function yearLabel(course, tr, track = "") {
  const categories = categoriesOf(course);
  if (!TRACKS.length) return CATEGORIES.filter((c) => categories.includes(c.id)).map((c) => tr(c.label)).join(" · ");
  if (track) return yearsOf(categories, track).map((y) => tr(YEAR_LABEL[y])).join(" · ");
  return yearsOf(categories).map((y) => {
    const names = TRACKS.filter((t) => categories.includes(`${t.id}:${y}`)).map((t) => tr(t.short || t.label));
    return `${tr(YEAR_LABEL[y])} (${names.join(", ")})`;
  }).join(" · ");
}

/** A course as the site search sees it: name in the title, code and year as keywords, teachers in the body. */
function courseDoc(course, { tr, searchDoc }) {
  const teachers = [...new Set(course.groups.flatMap((g) => g.teachers.split(", ")).filter(Boolean))];
  // Same name, two courses (מבני נתונים for CS and for another track): the one in the yearbook comes first.
  const boost = YEAR_BOOST[course.year] || 0;
  return searchDoc(course.name, [course.code, course.nameEn, yearLabel(course, tr), tr("קורס")].filter(Boolean).join(" "), teachers.join(" "), boost);
}

/** Entries for index.html's search box and palette: one per course, opening its card. */
export function courseSearchEntries(list, helpers) {
  const { tr, navigate, en } = helpers;
  return list.courses.map((course) => {
    const lecture = course.groups.find((g) => g.kind === "הרצאה" && g.teachers) || course.groups.find((g) => g.teachers);
    return {
      type: tr("קורס"),
      title: (en && course.nameEn) || course.name,
      sub: [course.code, yearLabel(course, tr), lecture && lecture.teachers.split(", ")[0]].filter(Boolean).join(" · "),
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
    // ?tab=mine (the home page's "My schedule" link) opens the schedule even before anything is picked.
    tab: target ? "all" : params.get("tab") === "mine" || store.get().starred.length ? "mine" : "all",
    q: params.get("cq") || "",
    // The student's track (course-track.js), "" for no choice or a faculty without tracks.
    track: readTrack(TRACKS),
    // A chip saved before the categories changed (the old "elective") falls back to all.
    year: YEARS.some((y) => y.id === store.get().year) ? store.get().year : "all",
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
  const ordered = [...list.courses].sort((a, b) => listOrder(a) - listOrder(b));
  const entries = ordered.map((course) => ({ course, doc: courseDoc(course, helpers) }));
  /** The card's year line: in the chosen track, or every track and year when the course is not in it (or none is chosen). */
  const cardYearLabel = (course) => yearLabel(course, tr, state.track) || yearLabel(course, tr);
  const dayLabel = (d) => (en ? DAY_EN[d] : d);

  // ---------- controls ----------
  const tabsNode = el("div", { class: "cb-tabs", role: "group", "aria-label": tr("תצוגה") });
  const input = el("input", { type: "search", class: "cb-q", id: "cb-q", placeholder: tr("שם קורס, מספר או מרצה"), "aria-label": tr("חיפוש קורס"), autocomplete: "off", enterkeyhint: "search", value: state.q });
  const clearBtn = el("button", { type: "button", class: "cb-q-clear", "aria-label": tr("ניקוי החיפוש"), hidden: !state.q, text: "×" });
  const searchBox = el("div", { class: "cb-search" }, el("span", { class: "cb-q-icon", "aria-hidden": "true" }), input, clearBtn);
  const trackRow = el("div", { class: "cb-track-row", hidden: !TRACKS.length });
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
    if (state.tab === "mine") url.searchParams.set("tab", "mine"); else url.searchParams.delete("tab");
    history.replaceState(history.state, "", url);
  }
  function set(changes) {
    Object.assign(state, changes);
    render();
    saveToAddress();
  }
  /** Leaving a one-course link: any filter or search widens back to the list. */
  const widen = () => ({ target: "" });

  /**
   * The track picker (faculties with tracks): a select of the tracks, remembered on the device. Until the student
   * chose or dismissed it once, it is offered as a small prompt above the controls, never as a modal.
   */
  function renderTrack() {
    if (!TRACKS.length) return;
    const prompt = !state.track && !trackAsked();
    const select = el("select", { class: "cb-track", id: "cb-track", "data-key": "track" },
      el("option", { value: "", text: tr("כל המסלולים"), selected: !state.track || undefined }),
      ...TRACKS.map((t) => el("option", { value: t.id, text: tr(t.label), selected: t.id === state.track || undefined })));
    select.addEventListener("change", () => { saveTrack(select.value); set({ track: select.value, ...widen() }); });
    const label = el("label", { class: "cb-track-label", for: "cb-track", text: prompt ? tr("באיזה מסלול אתם לומדים?") : tr("המסלול שלי:") });
    let later = null;
    if (prompt) {
      later = el("button", { type: "button", class: "cb-link", "data-key": "track|later", text: tr("לא עכשיו") });
      later.addEventListener("click", () => { saveTrack(""); set({}); });
    }
    trackRow.classList.toggle("is-prompt", prompt);
    trackRow.replaceChildren(...[
      label,
      select,
      later,
      prompt ? el("p", { class: "cb-track-hint", text: tr("הבחירה נשמרת במכשיר הזה ומסננת את הקורסים ואת תשובות הצ'אט. בלי בחירה מוצגים כל המסלולים, ועל כל קורס כתוב באילו מסלולים ושנים הוא.") }) : null,
    ].filter(Boolean));
  }

  function renderControls() {
    renderTrack();
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
  function cardFor(raw, { open = false, badge = false, anchor = true } = {}) {
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
      // With tracks every card names its tracks and years (the schedule's too); without, only where asked.
      yearLabel: badge || TRACKS.length ? cardYearLabel(course) : "",
      anchor,
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
    const trackNote = state.track ? tr(trackName(TRACKS, state.track, { short: true })) : "";
    if (raw) {
      const matches = rank(entries, raw).list.map((e) => e.course).filter((c) => !state.days.size || hasVisible(c));
      const found = matches.filter((c) => matchesYear(c, state.year, state.track));
      // The chosen track hides the other tracks' matches; say how many, so a missing course has a reason.
      const elsewhere = state.track ? matches.filter((c) => matchesYear(c, state.year) && !found.includes(c)).length : 0;
      setStatus([found.length === 0 ? tr("לא נמצא קורס. נסו מילה אחרת או סננו פחות.") : found.length === 1 ? tr("קורס אחד") : tr("{n} קורסים", { n: found.length }), trackNote, elsewhere ? tr("ועוד {n} במסלולים אחרים", { n: elsewhere }) : ""].filter(Boolean).join(" · "));
      return [el("div", { class: "cb-list" }, ...found.map((c) => cardFor(c, { badge: true, open: found.length === 1 })))];
    }
    const shown = ordered.filter(hasVisible);
    const inYear = shown.filter((c) => matchesYear(c, state.year, state.track));
    // Outside the sections: what the yearbook lacks (mostly graduate), or, with a chosen track, everything outside it.
    const others = shown.filter((c) => !inScope(c, state.track));
    const shownCount = state.year === "all" ? inYear.filter((c) => inScope(c, state.track)).length + (state.showOther ? others.length : 0) : inYear.length;
    // Say how many courses the day filter took away, so a missing course has a reason.
    const hiddenByDays = state.days.size ? ordered.filter((c) => matchesYear(c, state.year, state.track) && visibleGroups(c, { semester: state.semester, days: new Set() }).length && !hasVisible(c)).length : 0;
    setStatus([shownCount === 1 ? tr("קורס אחד") : tr("{n} קורסים", { n: shownCount }), trackNote, hiddenByDays ? tr("{n} הוסתרו כי אין להם קבוצה בימים שבחרתם", { n: hiddenByDays }) : ""].filter(Boolean).join(" · "));
    if (state.year !== "all") return [el("div", { class: "cb-list" }, ...inYear.map((c) => cardFor(c)))];
    // All: one section per yearbook category (with tracks: per year of the chosen track, or per year across the
    // tracks), a course in several shown in each (the first copy is the link target); the rest wait behind a button.
    const anchored = new Set();
    const card = (c) => {
      const anchor = !anchored.has(c.code);
      anchored.add(c.code);
      return cardFor(c, { anchor });
    };
    const section = (title, courses) => (courses.length
      ? el("section", { class: "cb-section", "aria-label": tr(title) },
        el("h3", { class: "cb-section-h" }, tr(title), el("span", { class: "cb-count", text: ` ${courses.length}` })),
        el("div", { class: "cb-list" }, ...courses.map(card)))
      : null);
    const sections = !TRACKS.length
      ? CATEGORIES.map(({ id, title }) => section(title, inYear.filter((c) => categoriesOf(c).includes(id))))
      : state.track
        ? CATEGORIES.filter((c) => trackOf(c.id) === state.track).map(({ id, title }) => section(title, inYear.filter((c) => categoriesOf(c).includes(id))))
        : YEAR_CHIPS.map(({ id, label }) => section(label, inYear.filter((c) => yearsOf(categoriesOf(c)).includes(Number(id)))));
    let otherNode = null;
    if (others.length && state.showOther) {
      otherNode = section("קורסים נוספים", others);
    } else if (others.length) {
      otherNode = el("button", { type: "button", class: "btn cb-more", "data-key": "more|other", text: state.track ? tr("עוד {n} קורסים (מסלולים אחרים, תואר שני ואחרים)", { n: others.length }) : tr("עוד {n} קורסים (תואר שני ואחרים)", { n: others.length }) });
      otherNode.addEventListener("click", () => set({ showOther: true }));
    }
    return [...sections, otherNode];
  }

  function render() {
    // A star or pick redraws the list; keep keyboard focus on the same button.
    const focusKey = document.activeElement && root.contains(document.activeElement) ? document.activeElement.dataset.key : "";
    renderControls();
    if (state.tab === "mine") {
      try { localStorage.setItem("nr-new-mine-seen", "true"); } catch (err) { /* storage blocked: the home page keeps its "new" mark */ }
      setStatus("");
      content.replaceChildren(scheduleView({
        backup: () => exportBackup(aiCtx()),
        pickedDay,
        onPickDay: (day) => { pickedDay = day; render(); },
        events: helpers.events,
        // "Switch group": open that course's card in the full list.
        openCourse: (code) => {
          opened.add(code);
          set({ tab: "all", target: code });
          document.getElementById(`course-${code}`)?.scrollIntoView({ block: "start" }); // render is synchronous
        },
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
    el("div", { class: "cb-controls" }, trackRow, semesterRow, searchBox, filterRow, daysRow),
    el("div", { class: "cb-status-row" }, status, note),
    content,
  ].filter(Boolean));
  render();
  // Turning a phone or resizing a window switches My week between the phone and wide layouts.
  if (typeof matchMedia === "function") matchMedia(NARROW).addEventListener("change", () => { if (state.tab === "mine") render(); });
  if (state.target) {
    const card = document.getElementById(`course-${state.target}`);
    if (card) requestAnimationFrame(() => card.scrollIntoView({ block: "start" }));
  }
}
