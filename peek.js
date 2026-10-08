/*
  The chat launcher: Bit or Byte peeks over the bottom bar (or a small ledge on a computer).
  Hovering (or focusing) the mascot shows a short line in a pill; a click opens the chat, which
  is loaded only then (chat.js + chat.css).
  Who: picked by an inline script in index.html before the first paint (so a reload never flashes
  the other mascot): every load gets the other one. The chat panel can switch it too.
*/
const NAMES = { bit: "ביט", byte: "בייט" };
const LINES = {
  bit: ["יש שאלה? 👀", "מבחנים, רישום, למדה? תשאלו", "אני פה, עם קפה ☕", "בואו נעשה debug לשבוע הראשון", "לחצו, אני לא נושך 😄"],
  byte: ["יש שאלה? 👋", "מבחנים, רישום, למדה? תשאלו", "בואו נסדר את זה 🙂", "יש לי רשימה לכל דבר", "לחצו ונתחיל"],
};
const GUIDE_LINE = "שאלה על המדריך הזה?";

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
  launcher.setAttribute("aria-label", `פתיחת הצ'אט עם ${NAMES[id]}`);
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
