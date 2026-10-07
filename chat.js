/*
  The Bit and Byte chat panel. Loaded on the first click of the launcher (index.html), so the
  page itself stays as fast as before. Talks to POST /api/chat (api/chat.js).
  The conversation lives in this tab only (sessionStorage); the server stores nothing.
*/
const PERSONAS = {
  bit: { name: "ביט", avatar: "./assets/mascot/avatar-bit.webp", joined: "ביט הצטרף לשיחה", hello: "היי, אני ביט 👋 אני עונה על שאלות על שנה א' במדמ\"ח בבר אילן, רק מתוך מה שכתוב באתר. על מה תרצו לשאול?" },
  byte: { name: "בייט", avatar: "./assets/mascot/avatar-byte.webp", joined: "בייט הצטרפה לשיחה", hello: "היי, אני בייט 👋 אני עונה על שאלות על שנה א' במדמ\"ח בבר אילן, רק מתוך מה שכתוב באתר. על מה תרצו לשאול?" },
};
const OTHER = { bit: "byte", byte: "bit" };
const SUGGESTIONS = ["מתי מתחילות הבחינות?", "איך משנים קורס באינ-בר?", "שכחתי סיסמה ללמדה", "מה עושים עם מבחן במילואים?"];
const ERRORS = {
  rate_limited: { code: "429 daily limit", text: "הגעתם ל-15 השאלות של היום. נתראה מחר! בינתיים אפשר לחפש באתר או לשאול את רועי בקבוצה.", retry: false },
  daily_cap: { code: "429 site limit", text: "הרבה סטודנטים שאלו היום והגענו למכסה היומית. נחזור מחר! בינתיים החיפוש באתר עובד מצוין.", retry: false },
  busy: { code: "503 busy", text: "יש עומס כרגע. נסו שוב בעוד דקה.", retry: true },
  offline: { code: "offline", text: "הצ'אט לא זמין כרגע. אפשר לחפש באתר או לשאול את רועי בקבוצת הוואטסאפ.", retry: true },
};
const MAX_QUESTION = 500;
const MAX_TURNS = 12;
const STORE_PERSONA = "nr-chat-persona";
const STORE_LOG = "nr-chat-log";
const URL_RE = /https:\/\/[^\s<>"')\]]+/g;

const store = {
  get(key) {
    try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; }
  },
  set(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked: the chat still works */ }
  },
};

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === "text") node.textContent = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? "" : value);
  }
  node.append(...children.filter((c) => c != null && c !== false));
  return node;
}

/** The persona picked for this visit (index.html sets it before this file loads). */
export function currentPersona() {
  const saved = store.get(STORE_PERSONA);
  return PERSONAS[saved] ? saved : "bit";
}

/** Text with https links turned into anchors; links to this site's guides open in place. */
function richText(text, onInternal) {
  const frag = document.createDocumentFragment();
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const url = m[0].replace(/[.,;:!?]+$/, "");
    frag.append(text.slice(last, m.index));
    frag.append(linkTo(url, url.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, ""), onInternal));
    last = m.index + url.length;
  }
  frag.append(text.slice(last));
  return frag;
}

/** This site's links open in place (the answer may name the deployed address or this one). */
const SITE_ORIGINS = new Set([location.origin, "https://nechita-raka.vercel.app"]);

function linkTo(url, label, onInternal) {
  let parsed;
  try { parsed = new URL(url); } catch { return document.createTextNode(label); }
  if (SITE_ORIGINS.has(parsed.origin) && parsed.hash) {
    const guide = parsed.hash.startsWith("#guide-") && window.SITE_DATA?.guides?.find((g) => `#guide-${g.id}` === parsed.hash);
    return el("a", { href: parsed.hash, text: guide && label === url.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "") ? `המדריך "${guide.title}"` : label, onclick: () => onInternal() });
  }
  return el("a", { href: parsed.href, target: "_blank", rel: "noopener noreferrer", text: label });
}

class ChatPanel {
  constructor(launcher) {
    this.launcher = launcher;
    this.persona = currentPersona();
    this.log = Array.isArray(store.get(STORE_LOG)) ? store.get(STORE_LOG) : [];
    this.busy = false;
    this.build();
    this.render();
  }

  build() {
    this.avatar = el("img", { class: "chat-avatar", alt: "", width: "40", height: "40" });
    this.title = el("h2", { class: "chat-title", id: "chat-title" });
    this.switchBtn = el("button", { class: "chat-switch", type: "button", onclick: () => this.switchPersona() });
    const close = el("button", { class: "chat-close", type: "button", "aria-label": "סגירת הצ'אט", onclick: () => this.close() }, closeIcon());
    this.list = el("ol", { class: "chat-log", "aria-live": "polite", "aria-relevant": "additions" });
    this.input = el("textarea", { class: "chat-input", rows: "1", maxlength: String(MAX_QUESTION), placeholder: "כתבו שאלה...", "aria-label": "שאלה", enterkeyhint: "send" });
    this.sendBtn = el("button", { class: "chat-send", type: "submit", "aria-label": "שליחה" }, sendIcon());
    const form = el("form", { class: "chat-form", onsubmit: (e) => { e.preventDefault(); this.send(this.input.value); } }, this.input, this.sendBtn);
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); }
    });
    this.input.addEventListener("input", () => this.autosize());

    this.root = el("section", { class: "chat-panel", role: "dialog", "aria-modal": "false", "aria-labelledby": "chat-title", hidden: true },
      el("div", { class: "now-chrome chat-chrome", "aria-hidden": "true" }, el("i"), el("i"), el("i"), el("span", { class: "chat-path" })),
      el("header", { class: "chat-head" }, this.avatar, el("div", { class: "chat-who" }, this.title, el("p", { class: "chat-sub", text: "עונה מתוך האתר" })), this.switchBtn, close),
      this.list,
      form,
      el("p", { class: "chat-note", text: "תשובות של AI: כדאי לבדוק במקור הרשמי. עד 15 שאלות ביום. השיחה לא נשמרת בשרת." }));
    this.root.addEventListener("keydown", (e) => { if (e.key === "Escape") this.close(); });
    document.body.append(this.root);
  }

  setHeader() {
    const p = PERSONAS[this.persona];
    this.avatar.src = p.avatar;
    this.title.textContent = p.name;
    this.root.querySelector(".chat-path").textContent = `~/year-1 › ask ${this.persona}`;
    this.switchBtn.textContent = `להחליף ל${PERSONAS[OTHER[this.persona]].name}`;
    window.dispatchEvent(new CustomEvent("nr-chat-persona", { detail: this.persona }));
  }

  render() {
    this.setHeader();
    const items = [this.botItem(PERSONAS[this.persona].hello, this.persona, [], true)];
    for (const m of this.log) {
      if (m.role === "user") items.push(this.userItem(m.content));
      else if (m.role === "assistant") items.push(this.botItem(m.content, m.persona, m.sources || []));
      else if (m.role === "event") items.push(el("li", { class: "chat-event", text: m.content }));
      else if (m.role === "error") items.push(this.errorItem(m));
    }
    if (!this.log.some((m) => m.role === "user")) items.push(this.suggestions());
    this.list.replaceChildren(...items);
    this.scroll();
  }

  userItem(text) {
    return el("li", { class: "chat-msg user" }, el("p", { class: "bubble", text }));
  }

  /** Answers are document-style cards (no speech bubble), sources and a copy button inside. */
  botItem(text, persona, sources, greeting = false) {
    const p = PERSONAS[persona] || PERSONAS.bit;
    const head = el("div", { class: "answer-head" },
      el("img", { class: "chat-avatar small", src: p.avatar, alt: "", width: "24", height: "24" }),
      el("span", { class: "answer-who", text: p.name }),
      greeting ? null : el("button", { type: "button", class: "answer-copy", "aria-label": "העתקת התשובה", onclick: (e) => copyText(text, e.currentTarget) }, copyIcon()));
    const card = el("div", { class: `answer${greeting ? " greeting" : ""}` }, head, el("p", { class: "answer-text" }, richText(text, () => this.onInternalLink())));
    if (sources.length) {
      card.append(el("div", { class: "chat-sources" },
        el("span", { class: "sources-label", text: "מקורות:" }),
        ...sources.map((s) => {
          const chip = s.url ? linkTo(s.url, s.title, () => this.onInternalLink()) : el("span", { text: s.title });
          chip.prepend(docIcon());
          return chip;
        })));
    }
    return el("li", { class: "chat-msg bot" }, card);
  }

  /** Suggested questions as shell commands; on a guide page, one about that guide comes first. */
  suggestions() {
    const guideId = location.hash.startsWith("#guide-") ? location.hash.slice(7) : "";
    const guide = window.SITE_DATA?.guides?.find((g) => g.id === guideId);
    const questions = guide ? [`מה הכי חשוב לדעת על "${guide.title}"?`, ...SUGGESTIONS.slice(0, 3)] : SUGGESTIONS;
    return el("li", { class: "chat-suggest" },
      el("p", { class: "chat-suggest-label", text: "אפשר להתחיל מכאן:" }),
      ...questions.map((q) => el("button", { type: "button", class: "chat-cmd", onclick: () => this.send(q) }, el("span", { class: "prompt", "aria-hidden": "true", text: "$" }), q)));
  }

  errorItem(m) {
    const e = ERRORS[m.error] || ERRORS.offline;
    return el("li", { class: "chat-error", role: "status" },
      el("code", { dir: "ltr", text: `error: ${e.code}` }),
      el("p", { text: e.text }),
      e.retry && m.question ? el("button", { type: "button", class: "chat-cmd small", onclick: () => this.retry(m) }, "נסו שוב") : null);
  }

  retry(m) {
    this.log = this.log.filter((x) => x !== m);
    this.input.value = "";
    this.send(m.question);
  }

  /** Terminal-style thinking line, with the mascot bobbing next to it. */
  typing() {
    const p = PERSONAS[this.persona];
    return el("li", { class: "chat-typing", role: "status" },
      el("img", { class: "chat-avatar small bob", src: p.avatar, alt: "", width: "24", height: "24" }),
      el("code", {}, el("span", { class: "prompt", text: "$ " }), `${p.name} ${this.persona === "byte" ? "מחפשת" : "מחפש"} במדריכים…`, el("span", { class: "cursor", "aria-hidden": "true" })));
  }

  autosize() {
    this.input.style.blockSize = "auto";
    this.input.style.blockSize = `${Math.min(this.input.scrollHeight, 120)}px`;
  }

  scroll() {
    this.list.scrollTop = this.list.scrollHeight;
  }

  save() {
    store.set(STORE_LOG, this.log.filter((m) => m.role !== "error").slice(-40));
  }

  switchPersona() {
    this.persona = OTHER[this.persona];
    store.set(STORE_PERSONA, this.persona);
    if (this.log.length) this.log.push({ role: "event", content: PERSONAS[this.persona].joined });
    this.save();
    this.render();
  }

  async send(raw) {
    const text = raw.replace(/\s+/g, " ").trim().slice(0, MAX_QUESTION);
    if (!text || this.busy) return;
    this.busy = true;
    this.sendBtn.disabled = true;
    this.input.value = "";
    this.autosize();
    this.log.push({ role: "user", content: text });
    this.save();
    this.render();
    const typing = this.typing();
    this.list.append(typing);
    this.scroll();

    const messages = this.log.filter((m) => m.role === "user" || m.role === "assistant").slice(-MAX_TURNS).map((m) => ({ role: m.role, content: m.content.slice(0, 800) }));
    while (messages.length && messages[0].role !== "user") messages.shift();
    let reply;
    try {
      const res = await fetch("./api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ persona: this.persona, messages }) });
      const body = await res.json().catch(() => ({}));
      if (res.ok && typeof body.reply === "string") reply = { role: "assistant", content: body.reply, persona: this.persona, sources: Array.isArray(body.sources) ? body.sources : [] };
      else reply = { role: "error", error: ERRORS[body.error] ? body.error : "offline", question: text };
    } catch {
      reply = { role: "error", error: "offline", question: text };
    }
    typing.remove();
    // A failed question is taken back, so asking again doesn't send it twice.
    if (reply.role === "error") this.log.pop();
    this.log.push(reply);
    this.save();
    this.busy = false;
    this.sendBtn.disabled = false;
    this.render();
    if (reply.role === "error") this.input.value = text;
    this.autosize();
    this.input.focus();
  }

  onInternalLink() {
    if (window.matchMedia("(max-width: 899px)").matches) this.close();
  }

  open() {
    this.root.hidden = false;
    this.launcher.setAttribute("aria-expanded", "true");
    document.body.classList.add("chat-open");
    this.scroll();
    requestAnimationFrame(() => this.input.focus());
  }

  close() {
    this.root.hidden = true;
    this.launcher.setAttribute("aria-expanded", "false");
    document.body.classList.remove("chat-open");
    this.launcher.focus();
  }

  toggle() {
    if (this.root.hidden) this.open();
    else this.close();
  }
}

function svg(paths) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  node.setAttribute("viewBox", "0 0 24 24");
  node.setAttribute("aria-hidden", "true");
  node.setAttribute("fill", "none");
  node.setAttribute("stroke", "currentColor");
  node.setAttribute("stroke-width", "2.2");
  node.setAttribute("stroke-linecap", "round");
  node.setAttribute("stroke-linejoin", "round");
  for (const d of paths) {
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", d);
    node.append(p);
  }
  return node;
}
const closeIcon = () => svg(["M6 6l12 12", "M18 6 6 18"]);
const copyIcon = () => svg(["M9 9h10v10H9z", "M5 15V5h10"]);
const docIcon = () => svg(["M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z", "M14 3v5h5"]);

async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    button.classList.add("done");
    button.setAttribute("aria-label", "הועתק");
    setTimeout(() => { button.classList.remove("done"); button.setAttribute("aria-label", "העתקת התשובה"); }, 1500);
  } catch { /* clipboard blocked: nothing to do */ }
}
// Points left: in a right-to-left page, "send" moves toward the conversation's end.
const sendIcon = () => svg(["M20 12H5", "M11 6l-6 6 6 6"]);

let panel = null;

/** Opens (or closes) the chat; called by the launcher in index.html. */
export function toggleChat(launcher) {
  panel ??= new ChatPanel(launcher);
  panel.toggle();
}
