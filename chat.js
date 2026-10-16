/*
  The chat panel of the faculty's two mascots (Bit and Byte for CS). Loaded on the first click of
  the launcher (index.html), so the page itself stays as fast as before. Talks to POST /api/chat
  (api/chat.js). The conversation lives in this tab only (sessionStorage); the server stores nothing.
  Names, greetings and images come from faculty.js (window.FACULTY, built from faculties/<id>/faculty.js).
*/
// English (see index.html): each Hebrew string with a pair in data.en.js is swapped; {name} is filled in at run time.
const EN_STRINGS = document.documentElement.lang === "en" && window.SITE_EN ? window.SITE_EN : null;
const UI_EN = new Map(EN_STRINGS ? EN_STRINGS.ui : []);
const tr = (he, vars) => {
  const text = UI_EN.get(he) || he;
  return vars ? text.replace(/\{(\w+)\}/g, (m, key) => (key in vars ? String(vars[key]) : m)) : text;
};
const CONTENT_EN = new Map(EN_STRINGS ? EN_STRINGS.content : []);
const trContent = (he) => CONTENT_EN.get(he) || he;
const FACULTY = window.FACULTY;
const DEFAULT_PERSONA = FACULTY.defaultMascot;
/** A mascot as the panel shows it: translated lines, the avatar's address, and the "thinking…" verb in its gender. */
const persona = (m) => ({
  name: EN_STRINGS ? m.nameEn : m.name,
  avatar: `./assets/mascot/${m.files.avatar}`,
  joined: tr(m.joined),
  thinking: tr(m.thinking),
  hellos: m.hellos.map((line) => tr(line)),
  timely: { morning: tr(m.timely.morning), evening: tr(m.timely.evening), night: tr(m.timely.night) },
});
const PERSONAS = Object.fromEntries(FACULTY.mascots.map((m) => [m.id, persona(m)]));

/** A fresh opening line each time the chat opens: one in three times it fits the hour. */
function pickGreeting(persona) {
  const p = PERSONAS[persona];
  const hour = new Date().getHours();
  const slot = hour >= 5 && hour < 11 ? "morning" : hour >= 18 && hour < 23 ? "evening" : hour >= 23 || hour < 5 ? "night" : null;
  if (slot && Math.random() < 1 / 3) return p.timely[slot];
  return p.hellos[Math.floor(Math.random() * p.hellos.length)];
}
// The switch button's target: the mascot that is not the current one.
const OTHER = Object.fromEntries(FACULTY.mascots.map((m, i, all) => [m.id, all[(i + 1) % all.length].id]));
const SUGGESTIONS = [tr("מתי מתחילות הבחינות?"), tr("איך משנים קורס באינ-בר?"), tr("שכחתי סיסמה ללמדה"), tr("מה עושים עם מבחן במילואים?"), tr("באיזה חדר ההרצאה בהכנה למדעי המחשב?")];
const ERRORS = {
  rate_limited: { code: "429 daily limit", text: tr("הגעתם ל-15 השאלות של היום. נתראה מחר! בינתיים אפשר לחפש באתר או לשאול את רועי בקבוצה."), retry: false },
  daily_cap: { code: "429 site limit", text: tr("הרבה סטודנטים שאלו היום והגענו למכסה היומית. נחזור מחר! בינתיים החיפוש באתר עובד מצוין."), retry: false },
  busy: { code: "503 busy", text: tr("יש עומס כרגע. נסו שוב בעוד דקה."), retry: true },
  offline: { code: "offline", text: tr("הצ'אט לא זמין כרגע. אפשר לחפש באתר או לשאול את רועי בקבוצת הוואטסאפ."), retry: true },
};
const MAX_QUESTION = 500;
const MAX_TURNS = 12;
// Match the panel's transitions in chat.css.
const OPEN_MS = 280;
const CLOSE_MS = 180;
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

/** The persona picked for this page load (index.html sets it before this file loads). */
export function currentPersona() {
  const saved = store.get(STORE_PERSONA);
  return Object.hasOwn(PERSONAS, saved) ? saved : DEFAULT_PERSONA;
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
const SITE_ORIGINS = new Set([location.origin, FACULTY.site.url]);

function linkTo(url, label, onInternal) {
  let parsed;
  try { parsed = new URL(url); } catch { return document.createTextNode(label); }
  if (SITE_ORIGINS.has(parsed.origin) && parsed.hash) {
    const guide = parsed.hash.startsWith("#guide-") && window.SITE_DATA?.guides?.find((g) => `#guide-${g.id}` === parsed.hash);
    return el("a", { href: parsed.hash, text: guide && label === url.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "") ? tr("המדריך \"{title}\"", { title: trContent(guide.title) }) : label, onclick: () => onInternal() });
  }
  return el("a", { href: parsed.href, target: "_blank", rel: "noopener noreferrer", text: label });
}

class ChatPanel {
  constructor(launcher) {
    this.launcher = launcher;
    this.persona = currentPersona();
    this.greeting = pickGreeting(this.persona);
    this.log = Array.isArray(store.get(STORE_LOG)) ? store.get(STORE_LOG) : [];
    this.busy = false;
    this.build();
    this.render();
  }

  build() {
    this.avatar = el("img", { class: "chat-avatar", alt: "", width: "40", height: "40" });
    this.title = el("h2", { class: "chat-title", id: "chat-title" });
    this.switchBtn = el("button", { class: "chat-switch", type: "button", onclick: () => this.switchPersona() });
    // The red light of the window chrome closes the chat, like a Mac window.
    const close = el("button", { class: "chat-light close", type: "button", "aria-label": tr("סגירת הצ'אט"), onclick: () => this.close() }, el("i", {}, closeIcon()));
    this.list = el("ol", { class: "chat-log", "aria-live": "polite", "aria-relevant": "additions" });
    this.input = el("textarea", { class: "chat-input", rows: "1", maxlength: String(MAX_QUESTION), placeholder: tr("כתבו שאלה..."), "aria-label": tr("שאלה"), enterkeyhint: "send" });
    this.sendBtn = el("button", { class: "chat-send", type: "submit", "aria-label": tr("שליחה") }, sendIcon());
    const form = el("form", { class: "chat-form", onsubmit: (e) => { e.preventDefault(); this.send(this.input.value); } }, this.input, this.sendBtn);
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); }
    });
    this.input.addEventListener("input", () => this.autosize());

    this.root = el("section", { class: "chat-panel", role: "dialog", "aria-modal": "false", "aria-labelledby": "chat-title", tabindex: "-1", hidden: true },
      el("div", { class: "now-chrome chat-chrome" }, close, el("span", { class: "chat-light", "aria-hidden": "true" }, el("i")), el("span", { class: "chat-light", "aria-hidden": "true" }, el("i")), el("span", { class: "chat-path", "aria-hidden": "true" })),
      el("header", { class: "chat-head" }, this.avatar, el("div", { class: "chat-who" }, this.title, el("p", { class: "chat-sub", text: tr("קמע AI של נחיתה רכה") })), this.switchBtn),
      this.list,
      form,
      el("p", { class: "chat-note", text: tr("ביט ובייט הם AI: תאריכים וכללים כדאי לבדוק במקור הרשמי. עד 15 שאלות ביום, והשיחה לא נשמרת בשרת.") }));
    this.root.addEventListener("keydown", (e) => { if (e.key === "Escape") this.close(); });
    document.body.append(this.root);
  }

  setHeader() {
    const p = PERSONAS[this.persona];
    this.avatar.src = p.avatar;
    this.title.textContent = p.name;
    this.root.querySelector(".chat-path").textContent = `${FACULTY.labels.chatPath} › ask ${this.persona}`;
    this.switchBtn.textContent = tr("להחליף ל{name}", { name: PERSONAS[OTHER[this.persona]].name });
    window.dispatchEvent(new CustomEvent("nr-chat-persona", { detail: this.persona }));
  }

  render() {
    this.setHeader();
    const items = [this.botItem(this.greeting, this.persona, [], true)];
    for (const m of this.log) {
      if (m.role === "user") items.push(this.userItem(m.content));
      else if (m.role === "assistant") items.push(this.botItem(m.content, m.persona, m.sources || [], false, m.roy === true));
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
  botItem(text, persona, sources, greeting = false, roy = false) {
    const p = PERSONAS[persona] || PERSONAS[DEFAULT_PERSONA];
    const head = el("div", { class: "answer-head" },
      el("img", { class: "chat-avatar small", src: p.avatar, alt: "", width: "24", height: "24" }),
      el("span", { class: "answer-who", text: p.name }),
      greeting ? null : el("button", { type: "button", class: "answer-copy", "aria-label": tr("העתקת התשובה"), onclick: (e) => copyText(text, e.currentTarget) }, copyIcon()));
    const card = el("div", { class: `answer${greeting ? " greeting" : ""}` }, head, el("p", { class: "answer-text" }, richText(text, () => this.onInternalLink())));
    if (sources.length) {
      card.append(el("div", { class: "chat-sources" },
        el("span", { class: "sources-label", text: tr("מקורות:") }),
        ...sources.map((s) => {
          const chip = s.url ? linkTo(s.url, s.title, () => this.onInternalLink()) : el("span", { text: s.title });
          chip.prepend(docIcon());
          return chip;
        })));
    }
    // A reserve-duty answer that left Roy out gets a line with his private WhatsApp (the server decides).
    const royUrl = roy ? royWhatsApp() : "";
    if (royUrl) {
      card.append(el("p", { class: "chat-roy" },
        el("span", { text: tr("🫡 רועי, מילואימניק בעצמו עם לא מעט ימים, ישמח לעזור:") }),
        el("a", { class: "wa-btn", href: royUrl, target: "_blank", rel: "noopener noreferrer" }, whatsAppIcon(), tr("וואטסאפ פרטי לרועי"))));
    }
    return el("li", { class: "chat-msg bot" }, card);
  }

  /** Suggested questions as shell commands; on a guide page, one about that guide comes first. */
  suggestions() {
    const guideId = location.hash.startsWith("#guide-") ? location.hash.slice(7) : "";
    const guide = window.SITE_DATA?.guides?.find((g) => g.id === guideId);
    const questions = guide ? [tr("מה הכי חשוב לדעת על \"{title}\"?", { title: trContent(guide.title) }), ...SUGGESTIONS.slice(0, 3)] : SUGGESTIONS;
    return el("li", { class: "chat-suggest" },
      el("p", { class: "chat-suggest-label", text: tr("אפשר להתחיל מכאן:") }),
      ...questions.map((q) => el("button", { type: "button", class: "chat-cmd", onclick: () => this.send(q) }, el("span", { class: "prompt", "aria-hidden": "true", text: "$" }), q)));
  }

  errorItem(m) {
    const e = ERRORS[m.error] || ERRORS.offline;
    return el("li", { class: "chat-error", role: "status" },
      el("code", { dir: "ltr", text: `error: ${e.code}` }),
      el("p", { text: e.text }),
      e.retry && m.question ? el("button", { type: "button", class: "chat-cmd small", onclick: () => this.retry(m) }, tr("נסו שוב")) : null);
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
      el("code", {}, el("span", { class: "prompt", text: "$ " }), `${p.name} ${p.thinking}…`, el("span", { class: "cursor", "aria-hidden": "true" })));
  }

  autosize() {
    this.input.style.blockSize = "auto";
    this.input.style.blockSize = `${Math.min(this.input.scrollHeight, 120)}px`;
  }

  /** The newest message in view; before the first question, the top (the hello) instead. */
  scroll() {
    this.list.scrollTop = this.log.some((m) => m.role === "user") ? this.list.scrollHeight : 0;
  }

  save() {
    store.set(STORE_LOG, this.log.filter((m) => m.role !== "error").slice(-40));
  }

  switchPersona() {
    this.persona = OTHER[this.persona];
    this.greeting = pickGreeting(this.persona);
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

    const messages = this.log.filter((m) => m.role === "user" || m.role === "assistant").slice(-MAX_TURNS).map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
    while (messages.length && messages[0].role !== "user") messages.shift();
    let reply;
    try {
      const res = await fetch("./api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ persona: this.persona, lang: EN_STRINGS ? "en" : undefined, messages }) });
      const body = await res.json().catch(() => ({}));
      if (res.ok && typeof body.reply === "string") reply = { role: "assistant", content: body.reply, persona: this.persona, sources: Array.isArray(body.sources) ? body.sources : [], roy: body.roy === true };
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
    // Until the student writes something, every opening of the chat gets a new hello.
    if (!this.log.some((m) => m.role === "user")) {
      this.greeting = pickGreeting(this.persona);
      this.render();
    }
    clearTimeout(this.closing);
    this.root.hidden = false;
    this.launcher.setAttribute("aria-expanded", "true");
    document.body.classList.add("chat-open");
    this.scroll();
    // Rises from the mascot's corner (chat.css); the keyboard waits until the panel has landed.
    // On a phone it doesn't open by itself, so the greeting and the suggestions stay in view.
    this.root.getBoundingClientRect();
    this.root.classList.add("is-open");
    const touch = window.matchMedia("(pointer: coarse)").matches;
    setTimeout(() => (touch ? this.root : this.input).focus({ preventScroll: true }), touch ? 0 : OPEN_MS);
  }

  close() {
    this.root.classList.remove("is-open");
    this.launcher.setAttribute("aria-expanded", "false");
    document.body.classList.remove("chat-open");
    this.launcher.focus({ preventScroll: true });
    this.closing = setTimeout(() => { this.root.hidden = true; }, CLOSE_MS);
  }

  toggle() {
    if (this.root.classList.contains("is-open")) this.close();
    else this.open();
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

/** The WhatsApp logo (Simple Icons, CC0), filled with the text color. */
function whatsAppIcon() {
  const node = svg(["M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"]);
  node.setAttribute("fill", "currentColor");
  node.setAttribute("stroke", "none");
  return node;
}

/** Roy's private WhatsApp link, from site.whatsapp in data.js (the same link the site's "mentor" card uses), or "". */
function royWhatsApp() {
  const site = window.SITE_DATA?.site || {};
  const number = String(site.whatsapp || "").replace(/\D/g, "");
  if (!/^\d{9,15}$/.test(number)) return "";
  return `https://wa.me/${number}${site.whatsappText ? `?text=${encodeURIComponent(site.whatsappText)}` : ""}`;
}

async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    button.classList.add("done");
    button.setAttribute("aria-label", tr("הועתק"));
    setTimeout(() => { button.classList.remove("done"); button.setAttribute("aria-label", tr("העתקת התשובה")); }, 1500);
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
