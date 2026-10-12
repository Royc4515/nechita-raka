/*
  The admin dashboard (/admin). Signs in with Google, then reads /api/admin/stats for the chosen
  range and refreshes it every 30 seconds while the tab is open. The CSV button downloads the same
  range as raw daily counters. Everything is drawn with textContent: labels come from the server.
*/
const REFRESH_MS = 30_000;
const STATS_START = "2026-10-07"; // the first day the site kept any counters; HISTORY_START in api/_lib/admin/insights.js
const TOP_ROWS = 10;
const RANGE_KEY = "nr-admin-range";
const NO_TRACK_KEY = "nr-no-track";
const SVG_NS = "http://www.w3.org/2000/svg";

const METRICS = [
  { id: "views", label: "צפיות" },
  { id: "visitors", label: "מבקרים" },
  { id: "clicks", label: "לחיצות" },
  { id: "searches", label: "חיפושים" },
  { id: "chatMessages", label: "הודעות בצ'אט" },
  { id: "chatVisitors", label: "מבקרים בצ'אט" },
];

const $ = (sel) => document.querySelector(sel);
const fmt = new Intl.NumberFormat("he-IL");
const store = {
  get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* storage blocked */ } },
  remove(key) { try { localStorage.removeItem(key); } catch (e) { /* storage blocked */ } },
};

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "text") node.textContent = v;
    else node.setAttribute(k, v === true ? "" : v);
  }
  node.append(...children.filter((c) => c != null));
  return node;
}
function svg(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// ---------- dates (the server counts every series by Israel's date) ----------
function israelToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const shortDate = (iso) => `${Number(iso.slice(8, 10))}.${Number(iso.slice(5, 7))}`;
const longDate = (iso) => `${shortDate(iso)}.${iso.slice(0, 4)}`;

function presetRange(preset) {
  const today = israelToday();
  if (preset === "today") return { from: today, to: today };
  if (preset === "all") return { from: STATS_START < today ? STATS_START : today, to: today };
  const days = Number(preset);
  const from = addDays(today, -(days - 1));
  return { from: from < STATS_START ? STATS_START : from, to: today };
}

// ---------- state ----------
const state = {
  preset: ["today", "7", "30", "90", "all"].includes(store.get(RANGE_KEY)) ? store.get(RANGE_KEY) : "30",
  range: null,
  metric: "views",
  report: null,
  timer: null,
  updatedAt: null,
  inFlight: null,
};
state.range = presetRange(state.preset);

// ---------- server ----------
async function api(path, init) {
  const res = await fetch(path, { credentials: "same-origin", ...init, headers: { "Content-Type": "application/json", ...(init && init.headers) } });
  let body = null;
  try { body = await res.json(); } catch (e) { /* empty body */ }
  return { status: res.status, body: body || {} };
}

async function boot() {
  let session;
  try {
    session = await api("/api/admin/session");
  } catch (e) {
    return showSignIn(null, "אין חיבור לשרת. בדקו את החיבור ונסו שוב.");
  }
  if (session.status === 503) return showSignIn(null, "לוח הבקרה עוד לא מוגדר: חסרים משתני הסביבה ב-Vercel (ראו README).");
  if (session.status !== 200) return showSignIn(null, "משהו השתבש. נסו לרענן את הדף.");
  if (session.body.signedIn) showDashboard(session.body.email);
  else showSignIn(session.body.clientId);
}

// ---------- sign-in ----------
function loadGoogle() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.accounts && window.google.accounts.id) return resolve(window.google.accounts.id);
    const script = el("script", { src: "https://accounts.google.com/gsi/client", async: true });
    script.onload = () => resolve(window.google.accounts.id);
    script.onerror = () => reject(new Error("gsi"));
    document.head.append(script);
  });
}
const isDark = () => document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);

async function showSignIn(clientId, message) {
  stopRefresh();
  $("#dash").hidden = true;
  $("#who").hidden = true;
  $("#signin").hidden = false;
  const err = $("#signin-err");
  err.hidden = !message;
  err.textContent = message || "";
  if (!clientId) return;
  try {
    const gsi = await loadGoogle();
    gsi.initialize({ client_id: clientId, callback: onGoogleCredential, auto_select: false, cancel_on_tap_outside: true });
    $("#gsi").replaceChildren();
    gsi.renderButton($("#gsi"), { theme: isDark() ? "filled_black" : "outline", size: "large", shape: "pill", text: "signin_with", locale: "he" });
  } catch (e) {
    err.hidden = false;
    err.textContent = "הכפתור של Google לא נטען. אולי חוסם פרסומות חוסם אותו?";
  }
}

async function onGoogleCredential(response) {
  const err = $("#signin-err");
  const res = await api("/api/admin/session", { method: "POST", body: JSON.stringify({ credential: response.credential }) }).catch(() => ({ status: 0 }));
  if (res.status === 200) {
    if (store.get(NO_TRACK_KEY) === null) store.set(NO_TRACK_KEY, "1"); // the admin's own visits don't count, unless they turn it back on
    showDashboard(res.body.email);
    return;
  }
  err.hidden = false;
  err.textContent = res.status === 403 ? "החשבון הזה לא מורשה לראות את לוח הבקרה." : "הכניסה לא הצליחה. נסו שוב.";
}

$("#signout").addEventListener("click", async () => {
  await api("/api/admin/session", { method: "DELETE" }).catch(() => null);
  if (window.google && window.google.accounts) window.google.accounts.id.disableAutoSelect();
  boot();
});

// ---------- dashboard ----------
function showDashboard(email) {
  $("#signin").hidden = true;
  $("#dash").hidden = false;
  $("#who").hidden = false;
  $("#who-email").textContent = email;
  $("#no-track").checked = store.get(NO_TRACK_KEY) === "1";
  syncControls();
  load();
  startRefresh();
}

function syncControls() {
  for (const b of document.querySelectorAll("#ranges button")) b.setAttribute("aria-pressed", String(b.dataset.range === state.preset));
  $("#from").value = state.range.from;
  $("#to").value = state.range.to;
  $("#from").max = $("#to").max = israelToday();
  $("#from").min = $("#to").min = STATS_START;
  const q = new URLSearchParams({ ...state.range, format: "csv" });
  $("#csv").href = `/api/admin/stats?${q}`;
  $("#csv").setAttribute("download", `nechita-raka-stats_${state.range.from}_${state.range.to}.csv`);
}

async function load() {
  // A preset follows the calendar: "7 days" on a dashboard left open overnight moves with the date.
  if (state.preset) state.range = presetRange(state.preset);
  syncControls();
  const controller = new AbortController();
  if (state.inFlight) state.inFlight.abort();
  state.inFlight = controller;
  let res;
  try {
    const r = await fetch(`/api/admin/stats?${new URLSearchParams(state.range)}`, { credentials: "same-origin", signal: controller.signal });
    res = { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) {
    if (e.name === "AbortError") return;
    return showError("אין חיבור לשרת. ננסה שוב בעוד רגע.");
  } finally {
    if (state.inFlight === controller) state.inFlight = null;
  }
  if (res.status === 401) return boot();
  if (res.status !== 200) return showError(res.status === 400 ? "הטווח לא תקין: עד שלוש שנים, ותאריך ההתחלה לפני הסוף." : "לא הצלחנו לקרוא את הנתונים. ננסה שוב בעוד רגע.");
  $("#error").hidden = true;
  state.report = res.body;
  state.updatedAt = new Date();
  render();
  tickLive();
}

function showError(message) {
  const box = $("#error");
  box.hidden = false;
  box.textContent = message;
  $("#live").classList.add("stale");
}

function tickLive() {
  const live = $("#live");
  if (!state.updatedAt) return;
  const seconds = Math.round((Date.now() - state.updatedAt.getTime()) / 1000);
  live.classList.toggle("stale", document.hidden || seconds > (REFRESH_MS / 1000) * 3);
  const time = state.updatedAt.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  $("#live-text").textContent = document.hidden ? `מושהה · עודכן ${time}` : `חי · עודכן ${time}`;
}

function startRefresh() {
  stopRefresh();
  state.timer = setInterval(() => { if (!document.hidden) load(); }, REFRESH_MS);
}
function stopRefresh() {
  clearInterval(state.timer);
  state.timer = null;
}
document.addEventListener("visibilitychange", () => {
  tickLive();
  if (!document.hidden && state.timer && state.updatedAt && Date.now() - state.updatedAt.getTime() > REFRESH_MS / 2) load();
});

// ---------- controls ----------
$("#ranges").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-range]");
  if (!b) return;
  state.preset = b.dataset.range;
  store.set(RANGE_KEY, state.preset);
  load();
});
for (const id of ["#from", "#to"]) {
  $(id).addEventListener("change", () => {
    const from = $("#from").value;
    const to = $("#to").value;
    if (!from || !to) return;
    state.preset = null;
    state.range = from <= to ? { from, to } : { from: to, to: from };
    load();
  });
}
$("#refresh").addEventListener("click", () => load());
$("#share-copy").addEventListener("click", async (e) => {
  let ok = false;
  try { await navigator.clipboard.writeText($("#share-link").textContent.trim()); ok = true; } catch (err) { ok = false; }
  e.target.textContent = ok ? "הועתק" : "לא הצליח";
  setTimeout(() => { e.target.textContent = "העתקה"; }, 2000);
});
$("#no-track").addEventListener("change", (e) => {
  if (e.target.checked) store.set(NO_TRACK_KEY, "1");
  else store.set(NO_TRACK_KEY, "0");
});
$("#metrics").append(...METRICS.map((m) => el("button", { type: "button", "data-metric": m.id, "aria-pressed": String(m.id === state.metric), text: m.label })));
$("#metrics").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-metric]");
  if (!b) return;
  state.metric = b.dataset.metric;
  for (const x of document.querySelectorAll("#metrics button")) x.setAttribute("aria-pressed", String(x === b));
  renderChart();
});

// ---------- render ----------
function render() {
  renderTiles();
  renderInsights();
  renderEvents();
  renderChart();
  renderDailyTable();
  renderRanked($("#pages"), state.report.pages, "view");
  renderRanked($("#links"), state.report.links, "click");
  renderRanked($("#topics"), state.report.topics, "topic");
  renderRanked($("#chat"), state.report.chat, "chat");
  renderRanked($("#searches"), state.report.searches, "search");
  renderRanked($("#misses"), state.report.searchMisses, "search_miss");
  renderRanked($("#sources"), state.report.sources, "source");
  renderRanked($("#devices"), state.report.devices, "device");
}

function renderTiles() {
  const { totals, days } = state.report;
  const perDay = (n) => (days.length > 1 ? `${fmt.format(Math.round((n / days.length) * 10) / 10)} ביום בממוצע` : "");
  const answeredShare = totals.chatMessages ? `${fmt.format(totals.answered)} נענו` : "";
  const before = state.report.previous && state.report.previous.totals;
  const tile = (label, key, sub) => el("div", { class: "tile" },
    el("p", { class: "label", text: label }),
    el("p", { class: "value", text: fmt.format(totals[key]) }),
    deltaNode(totals[key], before ? before[key] : null),
    sub ? el("p", { class: "sub", text: sub }) : null);
  $("#tiles").replaceChildren(
    tile("מבקרים", "visitors", days.length > 1 ? "כל מבקר נספר פעם ביום" : ""),
    tile("צפיות בעמודים", "views", perDay(totals.views)),
    tile("לחיצות על קישורים", "clicks", perDay(totals.clicks)),
    tile("חיפושים באתר", "searches", perDay(totals.searches)),
    tile("הודעות בצ'אט", "chatMessages", answeredShare),
    tile("מבקרים ששאלו בצ'אט", "chatVisitors", days.length > 1 ? "סכום של כל יום בנפרד" : ""),
  );
}

/** "▲ 40% לעומת 7 הימים שלפני": only when the period before had something to compare with. */
function deltaNode(now, before) {
  if (!before) return null;
  const pct = Math.round(((now - before) / before) * 100);
  const span = state.report.days.length;
  const period = span === 1 ? "אתמול" : `${span} הימים שלפני`;
  const text = pct === 0 ? `ללא שינוי לעומת ${period}` : `${pct > 0 ? "▲" : "▼"} ${Math.abs(pct)}% לעומת ${period}`;
  return el("p", { class: `delta ${pct > 0 ? "up" : pct < 0 ? "down" : ""}`, text, title: `לפני: ${fmt.format(before)}` });
}

function renderInsights() {
  const list = state.report.insights || [];
  $("#insights-card").hidden = list.length === 0;
  $("#insights").replaceChildren(...list.map((text) => el("li", { text })));
  const prev = state.report.previous;
  const running = state.report.to === israelToday() ? " (היום עוד לא נגמר)" : "";
  $("#insights-hint").textContent = prev ? `לעומת ${longDate(prev.from)} עד ${longDate(prev.to)}${running}` : "";
}

function renderEvents() {
  const events = state.report.events || [];
  $("#events").replaceChildren(...events.map((e) =>
    el("li", { text: `${shortDate(e.date)}${e.until ? ` עד ${shortDate(e.until)}` : ""}: ${e.title}` })));
}

function niceMax(max) {
  if (max <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * step >= max) return m * step;
  return 10 * step;
}

/** A bar with a 4px rounded top and a square base. */
function barPath(x, y, w, h) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function renderChart() {
  const box = $("#chart");
  if (!state.report) return;
  const days = state.report.days;
  const metric = METRICS.find((m) => m.id === state.metric);
  if (days.length < 2) {
    box.replaceChildren(el("p", { class: "empty", text: "בטווח של יום אחד אין גרף. כל המספרים של היום נמצאים למעלה ובטבלאות למטה." }));
    return;
  }
  const values = days.map((d) => d[metric.id]);
  const max = niceMax(Math.max(...values));
  const W = Math.max(280, box.clientWidth || 600);
  const H = 240;
  const m = { top: 12, right: 8, bottom: 24, left: 40 };
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;
  const band = iw / days.length;
  const gap = band >= 6 ? 2 : 0.5;
  const bw = Math.max(1, Math.min(24, band - gap, band * 0.72));
  const y = (v) => m.top + ih - (v / max) * ih;

  const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `${metric.label} לפי יום, ${longDate(days[0].day)} עד ${longDate(days[days.length - 1].day)}` });
  const axis = svg("g", { class: "axis" });
  for (let i = 0; i <= 4; i += 1) {
    const v = (max / 4) * i;
    const yy = y(v);
    if (i > 0) axis.append(svg("line", { class: "gridline", x1: m.left, x2: W - m.right, y1: yy, y2: yy }));
    const t = svg("text", { x: m.left - 8, y: yy + 4, "text-anchor": "end" });
    t.textContent = fmt.format(v);
    axis.append(t);
  }
  const labelEvery = Math.max(1, Math.ceil(days.length / Math.max(2, Math.floor(iw / 56))));
  days.forEach((d, i) => {
    if (i % labelEvery !== 0 && i !== days.length - 1) return;
    if (i !== days.length - 1 && days.length - 1 - i < labelEvery * 0.6) return; // keep the last label clear
    const t = svg("text", { x: m.left + band * i + band / 2, y: H - 6, "text-anchor": "middle" });
    t.textContent = shortDate(d.day);
    axis.append(t);
  });
  axis.append(svg("line", { class: "baseline", x1: m.left, x2: W - m.right, y1: m.top + ih, y2: m.top + ih }));
  root.append(axis);

  const tip = el("div", { class: "tip", hidden: true });
  // Calendar events behind the bars: a soft band over their days, and a dot to hover for the name.
  const dayIndex = new Map(days.map((d, i) => [d.day, i]));
  const firstDay = days[0].day;
  const lastDay = days[days.length - 1].day;
  const eventLayer = svg("g");
  for (const ev of state.report.events || []) {
    const start = dayIndex.get(ev.date < firstDay ? firstDay : ev.date);
    const end = dayIndex.get((ev.until || ev.date) > lastDay ? lastDay : (ev.until || ev.date));
    if (start === undefined || end === undefined) continue;
    const x0 = m.left + band * start;
    const width = band * (end - start + 1);
    eventLayer.append(svg("rect", { class: "event-band", x: x0, y: m.top, width, height: ih, opacity: 0.6 }));
    const mark = svg("circle", { class: "event-mark", cx: x0 + Math.min(width, band) / 2, cy: m.top + 2, r: 4 });
    eventLayer.append(mark);
  }
  root.insertBefore(eventLayer, root.firstChild);
  const bars = svg("g");
  days.forEach((d, i) => {
    const v = d[metric.id];
    const x = m.left + band * i + (band - bw) / 2;
    const hit = svg("rect", { class: "hit", x: m.left + band * i, y: m.top, width: band, height: ih });
    const bar = svg("path", { class: "bar", d: v > 0 ? barPath(x, y(v), bw, m.top + ih - y(v)) : "" });
    const show = () => {
      bar.classList.add("on");
      const onDay = (state.report.events || []).filter((ev) => ev.date <= d.day && d.day <= (ev.until || ev.date)).map((ev) => ev.title);
      tip.replaceChildren(el("strong", { class: "num", text: fmt.format(v) }), el("span", { text: `${metric.label} · ${longDate(d.day)}` }),
        ...onDay.map((title) => el("span", { class: "tip-event", text: title })));
      tip.hidden = false;
      const px = ((m.left + band * i + band / 2) / W) * box.clientWidth;
      const py = (Math.min(y(v), m.top + ih - 4) / H) * box.clientHeight;
      tip.style.left = `${Math.min(Math.max(px, 70), box.clientWidth - 70)}px`;
      tip.style.top = `${py}px`;
    };
    const hide = () => { bar.classList.remove("on"); tip.hidden = true; };
    hit.addEventListener("pointerenter", show);
    hit.addEventListener("pointerleave", hide);
    hit.addEventListener("click", show); // touch: a tap shows the value until the next tap
    bars.append(hit, bar);
  });
  root.append(bars);
  box.replaceChildren(root, tip);
}

function renderDailyTable() {
  const days = [...state.report.days].reverse();
  const head = el("tr", {}, el("th", { text: "תאריך" }), ...METRICS.map((mm) => el("th", { class: "count", text: mm.label })));
  const rows = days.map((d) => el("tr", {}, el("td", { class: "num", text: longDate(d.day) }), ...METRICS.map((mm) => el("td", { class: "count", text: fmt.format(d[mm.id]) }))));
  $("#daily-table .scroll").replaceChildren(el("table", {}, el("thead", {}, head), el("tbody", {}, ...rows)));
}

const expanded = new Set();
function renderRanked(box, rows, kind) {
  if (!rows.length) {
    box.replaceChildren(el("p", { class: "empty", text: "אין עדיין נתונים בטווח הזה." }));
    return;
  }
  const max = rows[0].count;
  const open = expanded.has(kind);
  const shown = open ? rows : rows.slice(0, TOP_ROWS);
  const linkFor = (row) => {
    if (kind === "view") return el("a", { href: row.key, target: "_blank", rel: "noopener", text: row.label });
    if (kind === "search" || kind === "search_miss") return el("a", { href: `/?q=${encodeURIComponent(row.key)}`, target: "_blank", rel: "noopener", title: "לראות מה האתר מציג לחיפוש הזה", text: row.label });
    if (kind === "click" && /^https?:\/\//.test(row.key)) return el("a", { href: row.key, target: "_blank", rel: "noopener noreferrer", title: row.key, text: row.label });
    return document.createTextNode(row.label);
  };
  const body = shown.map((row) => el("tr", {},
    el("td", { class: "rank-cell" },
      el("span", { class: "rank-label" }, linkFor(row)),
      el("span", { class: "rank-bar", style: `inline-size:${Math.max(1, (row.count / max) * 100)}%`, "aria-hidden": "true" })),
    el("td", { class: "count", text: fmt.format(row.count) })));
  const table = el("table", {}, el("tbody", {}, ...body));
  const more = rows.length > TOP_ROWS
    ? el("button", { type: "button", class: "more", text: open ? "הצגת פחות" : `הצגת כל ה-${rows.length}` })
    : null;
  if (more) more.addEventListener("click", () => { if (open) expanded.delete(kind); else expanded.add(kind); renderRanked(box, rows, kind); });
  box.replaceChildren(table, ...(more ? [more] : []));
}

let resizeFrame = 0;
new ResizeObserver(() => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => { if (state.report && !$("#dash").hidden) renderChart(); });
}).observe($("#chart"));
setInterval(tickLive, 5_000);

boot();
