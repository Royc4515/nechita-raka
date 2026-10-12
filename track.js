/*
  Anonymous counters for the admin dashboard: one count per page view and per click on a link from
  data.js. Nothing identifies the visitor (no cookie, no id, no storage), and the server keeps only
  the daily totals. An admin can turn counting off on their own device from the dashboard.
*/
(() => {
  "use strict";
  try { if (localStorage.getItem("nr-no-track") === "1") return; } catch (e) { /* storage blocked: count */ }
  if (navigator.webdriver) return;

  function send(kind, key) {
    try {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, key }),
        keepalive: true,
        credentials: "omit",
      }).catch(() => { /* counting never gets in the way */ });
    } catch (e) { /* old browser */ }
  }

  let lastPath = null;
  function view() {
    const path = location.pathname.replace(/\.html$/, "").replace(/\/index$/, "/") || "/";
    if (path === lastPath) return;
    lastPath = path;
    send("view", path);
  }
  view();
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
})();
