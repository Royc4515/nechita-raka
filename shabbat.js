/*
  The Shabbat rest: from candle lighting on Friday to havdalah on Saturday, the page shows a closed screen over
  the whole viewport and reopens by itself. The HTML stays the full site (search engines and no-JS visitors get the
  content); this script only lays the overlay over it, before the first paint, and takes it away when Shabbat ends.

  A classic script loaded synchronously in the <head> of index.html, after shabbat-times.js (the times, shared with
  the chat's server), faculty.js (the copy and the mascots) and the English pairs. On a normal day it does one date
  computation and nothing else: shabbat.css is fetched only when the page is closed.
  While closed: the page behind is hidden and inert (shabbat.css, body.inert), a dialog holds the focus, and no request
  is made by the overlay itself (it reuses the mascot images the site already ships).

  Testing: ?today=YYYY-MM-DDTHH:MM sets the clock (Israel time, and it keeps ticking); ?open=1 skips the rest. Crawlers are never closed out.
*/
(() => {
  "use strict";
  const Z = globalThis.NR_SHABBAT;
  const F = window.FACULTY;
  const copy0 = F && F.site && F.site.shabbat;
  if (!Z || !copy0) return;
  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  if (params.get("open") === "1" || /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|lighthouse/i.test(navigator.userAgent)) return;

  const override = Z.parseClockOverride(params.get("today"));
  const skew = override === null ? 0 : override - Date.now();
  const now = () => Date.now() + skew;

  // English (see index.html): each Hebrew string with a pair in data.en.js is swapped; {name} marks a value filled in at run time.
  const EN = document.documentElement.lang === "en" && !!window.SITE_EN;
  const UI_EN = new Map(EN ? window.SITE_EN.ui || [] : []);
  const tr = (he, vars) => {
    const text = (EN && UI_EN.get(he)) || he;
    return vars ? text.replace(/\{(\w+)\}/g, (m, key) => (key in vars ? String(vars[key]) : m)) : text;
  };

  /** "5 שעות ו-12 דקות" / "5 hr 12 min" for the minutes left, rounded up so it never says 0 while it is still closed. */
  function untilText(ms) {
    const total = Math.max(1, Math.ceil(ms / 60000));
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (EN) return [h ? `${h} hr` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
    const hours = h === 1 ? "שעה" : h === 2 ? "שעתיים" : `${h} שעות`;
    const minutes = m === 1 ? "דקה" : m === 2 ? "שתי דקות" : `${m} דקות`;
    if (!h) return minutes;
    return m ? `${hours} ${/^\d/.test(minutes) ? "ו-" : "ו"}${minutes}` : hours;
  }

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  // A sleeping crescent moon: constants (no page text in it); the sign's words are real text over it, so they translate and read aloud.
  const MOON = '<svg class="shb-moon" viewBox="0 0 200 200" aria-hidden="true" focusable="false"><path d="M138 22C86 26 46 68 46 120c0 46 36 70 78 66 24-2 44-14 56-30-48 6-86-24-86-70 0-32 18-52 44-64Z" fill="#ffd23f" stroke="#15151f" stroke-width="5" stroke-linejoin="round"/><path d="M62 150c8 22 30 34 58 34-30-8-52-16-58-34Z" fill="#f59e0b" opacity=".55"/><path d="M62 104q9 8 18 0M56 124q7 5 14 0" fill="none" stroke="#15151f" stroke-width="5" stroke-linecap="round"/><ellipse cx="62" cy="136" rx="9" ry="6" fill="#ff6b8b"/></svg>';
  const SPARK = '<svg class="shb-spark" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12Z"/></svg>';

  let dialog = null;
  let countdown = null;

  function build(closesAt) {
    const node = el("div", "shb");
    node.id = "shabbat";
    node.setAttribute("role", "dialog");
    node.setAttribute("aria-modal", "true");
    node.setAttribute("aria-labelledby", "shb-title");
    node.setAttribute("aria-describedby", "shb-lines");
    node.tabIndex = -1;
    node.append(el("div", "shb-bg"));
    const frame = el("div", "shb-frame");
    const bar = el("div", "shb-bar");
    bar.setAttribute("aria-hidden", "true");
    bar.append(el("b", "", "SOFT LANDING"), el("span", "", "SHABBAT BREAK · ★"));

    const art = el("div", "shb-art");
    art.setAttribute("aria-hidden", "true");
    art.append(el("span", "shb-halftone"));
    const moon = el("div", "shb-moonbox");
    moon.innerHTML = MOON; // a constant
    const sign = el("div", "shb-sign");
    sign.append(el("b", "", tr("סגור לשבת")), el("small", "", "CLOSED · BRB"));
    moon.append(sign);
    art.append(moon);
    for (const [i, c] of [["z", "z1"], ["Z", "z2"], ["z", "z3"]].entries()) art.append(el("span", "shb-z " + c[1], c[0]));
    for (const c of ["sp1", "sp2", "sp3"]) { const sp = el("span", "shb-sp " + c); sp.innerHTML = SPARK; art.append(sp); }
    F.mascots.forEach((m, i) => {
      const img = el("img", "shb-mascot shb-mascot-" + i);
      img.alt = "";
      img.src = `./assets/mascot/${m.files.poses}-wave.webp`;
      img.width = m.poseWidths.wave;
      img.height = 480;
      img.decoding = "async";
      art.append(img);
    });

    const copy = el("div", "shb-copy");
    const title = el("h1", "shb-title", tr(copy0.title));
    title.id = "shb-title";
    const lines = el("div", "shb-lines");
    lines.id = "shb-lines";
    for (const line of copy0.lines) lines.append(el("p", "", tr(line)));
    countdown = el("strong", "shb-left");
    const ticket = el("div", "shb-ticket");
    const main = el("div", "shb-ticket-main");
    main.append(el("span", "shb-reopen-label", tr("האתר נפתח שוב בעוד")), countdown, el("span", "shb-at", tr("במוצאי שבת, אחרי {time} (שעון ישראל)", { time: Z.clock(closesAt) })));
    const stub = el("div", "shb-stub");
    stub.setAttribute("aria-hidden", "true");
    stub.innerHTML = SPARK;
    ticket.append(main, stub);
    copy.append(title, lines, ticket, el("p", "shb-footer", tr(copy0.footer)));
    frame.append(bar, el("div", "shb-body"));
    frame.lastChild.append(copy, art);
    node.append(frame);
    // Focus stays on the dialog: there is nothing to press, and Tab must not walk into the page behind.
    node.addEventListener("keydown", (e) => { if (e.key === "Tab") e.preventDefault(); });
    return node;
  }

  function setInert(on) {
    if (!document.body) return;
    document.body.inert = on;
    if (on) document.body.setAttribute("aria-hidden", "true"); else document.body.removeAttribute("aria-hidden");
  }

  function lay(state) {
    if (!dialog) {
      dialog = build(state.havdalah);
      root.append(dialog); // a child of <html> works before <body> exists, which is what makes it first-paint
    }
    root.dataset.shabbat = "closed";
    for (const d of document.querySelectorAll("dialog[open]")) d.close(); // the search palette sits in the top layer, above everything
    if (document.body) setInert(true); else document.addEventListener("DOMContentLoaded", () => { if (dialog) setInert(true); }, { once: true });
    dialog.focus({ preventScroll: true });
  }

  function lift() {
    if (!dialog) return;
    dialog.remove();
    dialog = null;
    countdown = null;
    delete root.dataset.shabbat;
    setInert(false);
    window.dispatchEvent(new Event("resize")); // the page was laid out all along; this only nudges the parts that measure on resize
  }

  let styled = false;
  /** The overlay's CSS, fetched only when needed. While the page is still loading it blocks the first paint, so there is no flash. */
  function withStyles(then) {
    if (styled) return then();
    styled = true;
    if (document.readyState === "loading") {
      document.write('<link rel="stylesheet" href="./shabbat.css">');
      return then();
    }
    const link = Object.assign(document.createElement("link"), { rel: "stylesheet", href: "./shabbat.css", onload: then, onerror: then });
    document.head.append(link);
  }

  function tick() {
    const at = now();
    const state = Z.shabbatState(at);
    if (!state.closed) return lift();
    const render = () => { if (countdown) countdown.textContent = untilText(state.havdalah - now()); };
    if (dialog) return render();
    withStyles(() => {
      lay(state);
      render();
      setTimeout(tick, Math.max(1000, state.havdalah - now() + 1000)); // reopen on the minute, not up to a minute late
    });
  }

  try {
    tick();
    setInterval(tick, 60000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
    window.addEventListener("pageshow", tick);
  } catch (err) {
    // The rest is a courtesy: if anything about it fails (no Intl, a blocked write), the site simply stays open.
    console.warn("shabbat rest skipped", err);
  }
})();
