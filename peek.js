/*
  The chat launcher: Bit or Byte peeks over the bottom bar (or the bottom of the screen on a
  computer) and now and then says something in a speech bubble. A click opens the chat, which
  is loaded only then (chat.js + chat.css). One mascot per visit, picked at random; the chat
  panel can switch it.
*/
const NAMES = { bit: "ביט", byte: "בייט" };
const LINES = {
  bit: ["יש שאלה? אני כאן 🙂", "לא מוצאים משהו באתר? תשאלו אותי", "מתי הבחינות? איך משנים קורס? תשאלו!", "שכחתם סיסמה ללמדה? אני יודע מה עושים", "אני עונה רק מתוך האתר, בלי להמציא"],
  byte: ["יש שאלה? אני כאן 🙂", "לא מוצאים משהו באתר? תשאלו אותי", "מתי הבחינות? איך משנים קורס? תשאלו!", "שכחתם סיסמה ללמדה? אני יודעת מה עושים", "אני עונה רק מתוך האתר, בלי להמציא"],
};
const GUIDE_LINE = "שאלה על המדריך הזה? תשאלו אותי 🙂";
const FIRST_DELAY_MS = 5000;
const SHOW_MS = 7000;
const GAP_MS = 25000;
const MAX_PER_PAGE = 5;

const session = {
  get(key) { try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; } },
  set(key, value) { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked */ } },
};

let persona = session.get("nr-chat-persona");
if (!NAMES[persona]) {
  persona = Math.random() < 0.5 ? "bit" : "byte";
  session.set("nr-chat-persona", persona);
}

const launcher = document.getElementById("chat-launcher");
const bubble = document.getElementById("peek-bubble");
const say = bubble.querySelector(".peek-say");

function showPersona(id) {
  persona = id;
  launcher.querySelector("img").src = `./assets/mascot/peek-${id}.webp`;
  launcher.setAttribute("aria-label", `פתיחת הצ'אט עם ${NAMES[id]}`);
}
showPersona(persona);
// The panel announces a switch so the peeking mascot follows it.
window.addEventListener("nr-chat-persona", (e) => showPersona(e.detail));

// ---------- Speech bubbles: a few per page, never on memorial days, never after "×" ----------
let shown = 0;
let timer = 0;
const quiet = () => session.get("nr-peek-quiet") || document.documentElement.dataset.day === "memorial" || document.body.classList.contains("chat-open");

function nextLine() {
  if (location.hash.startsWith("#guide-") && shown === 0) return GUIDE_LINE;
  const lines = LINES[persona];
  const i = (session.get("nr-peek-line") ?? Math.floor(Math.random() * lines.length)) % lines.length;
  session.set("nr-peek-line", i + 1);
  return lines[i];
}

function hideBubble() {
  bubble.hidden = true;
  launcher.classList.remove("talking");
}

function cycle() {
  if (quiet() || shown >= MAX_PER_PAGE) return hideBubble();
  if (document.hidden) {
    timer = setTimeout(cycle, GAP_MS);
    return;
  }
  say.querySelector(".peek-who").textContent = NAMES[persona];
  say.querySelector(".peek-text").textContent = nextLine();
  bubble.hidden = false;
  launcher.classList.add("talking");
  shown++;
  timer = setTimeout(() => {
    hideBubble();
    timer = setTimeout(cycle, GAP_MS);
  }, SHOW_MS);
}
timer = setTimeout(cycle, FIRST_DELAY_MS);

bubble.querySelector(".peek-x").addEventListener("click", () => {
  session.set("nr-peek-quiet", true);
  clearTimeout(timer);
  hideBubble();
});

// ---------- Opening the chat ----------
let loading = null;

async function openChat() {
  clearTimeout(timer);
  hideBubble();
  session.set("nr-peek-quiet", true);
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
}

launcher.addEventListener("click", openChat);
say.addEventListener("click", openChat);
