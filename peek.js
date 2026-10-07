/*
  The chat launcher: Bit or Byte peeks over the bottom bar (or a small ledge on a computer).
  Hovering (or focusing) the mascot shows a short line in a pill; a click opens the chat, which
  is loaded only then (chat.js + chat.css).
  Who: the same mascot for the whole visit (this tab). The first visit picks at random, and each
  new visit gets the other one, so everyone meets both. The chat panel can switch it too.
*/
const NAMES = { bit: "ביט", byte: "בייט" };
const LINES = {
  bit: ["יש שאלה? 👀", "מבחנים, רישום, למדה? תשאלו", "אני פה, עם קפה ☕", "בואו נעשה debug לשבוע הראשון", "לחצו, אני לא נושך 😄"],
  byte: ["יש שאלה? 👋", "מבחנים, רישום, למדה? תשאלו", "בואו נסדר את זה 🙂", "יש לי רשימה לכל דבר", "לחצו ונתחיל"],
};
const GUIDE_LINE = "שאלה על המדריך הזה?";

const store = (area) => ({
  get(key) { try { return JSON.parse(area().getItem(key)); } catch { return null; } },
  set(key, value) { try { area().setItem(key, JSON.stringify(value)); } catch { /* storage blocked */ } },
});
const session = store(() => sessionStorage);
const local = store(() => localStorage);

let persona = session.get("nr-chat-persona");
if (!NAMES[persona]) {
  const last = local.get("nr-chat-last");
  persona = last === "bit" ? "byte" : last === "byte" ? "bit" : Math.random() < 0.5 ? "bit" : "byte";
  session.set("nr-chat-persona", persona);
  local.set("nr-chat-last", persona);
}

const launcher = document.getElementById("chat-launcher");
const bubble = document.getElementById("peek-bubble");

function showPersona(id) {
  persona = id;
  launcher.querySelector("img").src = `./assets/mascot/peek-${id}.webp`;
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
