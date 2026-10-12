/*
  The chat launcher: Bit or Byte peeks over the bottom bar (or a small ledge on a computer).
  Hovering (or focusing) the mascot shows a short line in a pill; a click opens the chat, which
  is loaded only then (chat.js + chat.css).
  Who: picked by an inline script in index.html before the first paint (so a reload never flashes
  the other mascot): every load gets the other one. The chat panel can switch it too.
*/
// English (see index.html): each Hebrew string with a pair in data.en.js is swapped; {name} is filled in at run time.
const EN_STRINGS = document.documentElement.lang === "en" && window.SITE_EN ? window.SITE_EN : null;
const UI_EN = new Map(EN_STRINGS ? EN_STRINGS.ui : []);
const tr = (he, vars) => {
  const text = UI_EN.get(he) || he;
  return vars ? text.replace(/\{(\w+)\}/g, (m, key) => (key in vars ? String(vars[key]) : m)) : text;
};
const NAMES = { bit: tr("ביט"), byte: tr("בייט") };
const LINES = {
  bit: [tr("יש שאלה? 👀"), tr("מבחנים, רישום, למדה? תשאלו"), tr("אני פה, עם קפה ☕"), tr("בואו נעשה debug לשבוע הראשון"), tr("לחצו, אני לא נושך 😄")],
  byte: [tr("יש שאלה? 👋"), tr("מבחנים, רישום, למדה? תשאלו"), tr("בואו נסדר את זה 🙂"), tr("יש לי רשימה לכל דבר"), tr("לחצו ונתחיל")],
};
const GUIDE_LINE = tr("שאלה על המדריך הזה?");

const local = {
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked */ } },
};

const launcher = document.getElementById("chat-launcher");
const bubble = document.getElementById("peek-bubble");
// Chosen by the inline script next to the launcher, before the first paint.
let persona = NAMES[launcher.dataset.persona] ? launcher.dataset.persona : "bit";

function showPersona(id) {
  persona = id;
  const img = launcher.querySelector("img");
  const src = `./assets/mascot/peek-${id}.webp`;
  if (img.getAttribute("src") !== src) img.src = src;
  launcher.setAttribute("aria-label", tr("פתיחת הצ'אט עם {name}", { name: NAMES[id] }));
}
showPersona(persona);
// The panel announces a switch so the peeking mascot follows it.
window.addEventListener("nr-chat-persona", (e) => {
  showPersona(e.detail);
  local.set("nr-chat-last", e.detail);
});

// ---------- The hover line: a new one each time, never on memorial days ----------
let lineIndex = Math.floor(Math.random() * LINES.bit.length);

function showBubble() {
  if (document.documentElement.dataset.day === "memorial" || document.body.classList.contains("chat-open")) return;
  bubble.querySelector(".peek-who").textContent = NAMES[persona];
  bubble.querySelector(".peek-text").textContent = location.hash.startsWith("#guide-") ? GUIDE_LINE : LINES[persona][lineIndex++ % LINES[persona].length];
  bubble.hidden = false;
}
const hideBubble = () => { bubble.hidden = true; };

launcher.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") showBubble(); });
launcher.addEventListener("pointerleave", hideBubble);
launcher.addEventListener("focus", () => { if (launcher.matches(":focus-visible")) showBubble(); });
launcher.addEventListener("blur", hideBubble);

// ---------- Opening the chat ----------
let loading = null;

launcher.addEventListener("click", async () => {
  hideBubble();
  loading ??= Promise.all([
    import("./chat.js"),
    new Promise((resolve) => {
      const link = Object.assign(document.createElement("link"), { rel: "stylesheet", href: "./chat.css", onload: resolve, onerror: resolve });
      document.head.append(link);
    }),
  ]).then(([mod]) => mod);
  try {
    (await loading).toggleChat(launcher);
  } catch (err) {
    loading = null;
    console.error("chat failed to load", err);
  }
});
