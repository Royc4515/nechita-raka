/*
  Anonymous counters for the admin dashboard: page views, clicks on links from data.js, where the
  visit came from (a category, never the full address), the site searches people settle on
  (not one opened from a ?q= link), and add-to-home-screen use (launches, installs, button taps).
  Nothing identifies the visitor (no cookie, no id, no storage), and the server keeps only daily
  totals. An admin can turn counting off on their own device from the dashboard.
*/
(() => {
  "use strict";
  try { if (localStorage.getItem("nr-no-track") === "1") return; } catch (e) { /* storage blocked: count */ }
  if (navigator.webdriver) return;

  function send(kind, key, extra) {
    try {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, key, ...extra }),
        keepalive: true,
        credentials: "omit",
      }).catch(() => { /* counting never gets in the way */ });
    } catch (e) { /* old browser */ }
  }

  // Where the visit came from: a ?src= tag on links shared in groups (WhatsApp hides its referrer),
  // else the referring site. Only the category is sent; the tag is then removed from the address.
  const SOURCE_PATTERNS = [
    ["whatsapp", /whatsapp|^wa$/], ["linkedin", /linkedin|lnkd|^li$/], ["google", /google/], ["bing", /bing/],
    ["facebook", /facebook|^fb$/], ["instagram", /instagram|^ig$/], ["telegram", /telegram|t\.me|^tg$/],
    ["ai", /chatgpt|openai|perplexity|claude|gemini|copilot/],
  ];
  function sourceOf(value) {
    const v = String(value || "").toLowerCase();
    const hit = SOURCE_PATTERNS.find(([, re]) => re.test(v));
    return hit ? hit[0] : "other";
  }
  // It rides on the first view; the server keeps it only for a visitor's first view of the day.
  const landingSource = (function sourceOfVisit() {
    const params = new URLSearchParams(location.search);
    const tag = params.get("src") || params.get("utm_source");
    if (tag) {
      ["src", "utm_source", "utm_medium", "utm_campaign"].forEach((p) => params.delete(p));
      const qs = params.toString();
      history.replaceState(history.state, "", `${location.pathname}${qs ? `?${qs}` : ""}${location.hash}`);
      return sourceOf(tag);
    }
    let from = null;
    try { from = document.referrer ? new URL(document.referrer) : null; } catch (e) { from = null; }
    if (!from) return "direct";
    return from.origin === location.origin ? null : sourceOf(from.hostname || from.href);
  })();

  let lastPath = null;
  function view() {
    const path = location.pathname.replace(/\.html$/, "").replace(/\/index$/, "/") || "/";
    if (path === lastPath) return;
    const first = lastPath === null;
    lastPath = path;
    send("view", path, first && landingSource ? { source: landingSource } : undefined);
  }
  view();

  // Add to home screen: a visit opened from the home-screen icon, an install (Chrome and Edge tell the
  // page; Safari doesn't), and taps on the page's "add to home screen" button.
  if (matchMedia("(display-mode: standalone)").matches || navigator.standalone === true) send("app", "launch");
  window.addEventListener("appinstalled", () => send("app", "installed"));
  document.addEventListener("click", (e) => {
    if (e.target instanceof Element && e.target.closest("#install-btn")) send("app", "button");
  }, true);
  // Guides open and close through pushState/replaceState (not always followed by popstate), and
  // Back fires popstate: all three are a route change. view() skips a change that keeps the path.
  for (const name of ["pushState", "replaceState"]) {
    const original = history[name];
    history[name] = function (...args) {
      const result = original.apply(this, args);
      view();
      return result;
    };
  }
  window.addEventListener("popstate", view);

  // Links open in a new tab, so the page is still here to send the count. The server only counts
  // links that data.js has; same-site links are sent as a path (only the calendar file counts).
  function onClick(e) {
    if (e.type === "auxclick" && e.button !== 1) return;
    const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
    if (!link) return;
    let url;
    try { url = new URL(link.href); } catch (err) { return; }
    if (url.origin === location.origin) {
      if (/\.ics$/.test(url.pathname)) send("click", url.pathname);
    } else if (url.protocol === "https:" || url.protocol === "http:") {
      send("click", url.href);
    }
  }
  document.addEventListener("click", onClick, true);
  document.addEventListener("auxclick", onClick, true);

  // Searches: the page fires nr:search on every keystroke; only the query someone stops on counts,
  // with how many results it found (0 marks a gap in the content).
  const SEARCH_SETTLE_MS = 1500;
  let pending = null;
  let lastSearch = "";
  let searchTimer = 0;
  function flushSearch() {
    clearTimeout(searchTimer);
    if (!pending) return;
    const { q, results } = pending;
    pending = null;
    if (q === lastSearch) return;
    lastSearch = q;
    send("search", q, { results });
  }
  window.addEventListener("nr:search", (e) => {
    const q = String((e.detail && e.detail.q) || "").trim();
    // Looks like personal data (an email, a phone or an id number): never sent. The server checks too.
    if (q.length < 2 || q.includes("@") || q.replace(/\D/g, "").length >= 7) { pending = null; clearTimeout(searchTimer); return; }
    pending = { q, results: Number(e.detail.results) || 0 };
    clearTimeout(searchTimer);
    searchTimer = setTimeout(flushSearch, SEARCH_SETTLE_MS);
  });
  window.addEventListener("pagehide", flushSearch);
  document.addEventListener("visibilitychange", () => { if (document.hidden) flushSearch(); });
})();
