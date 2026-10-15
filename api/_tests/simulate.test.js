import assert from "node:assert/strict";
import { test } from "node:test";
import { BUSY_RETRIES, BUSY_WAIT_MS, DEFAULT_DELAY_MS, askOnce, askWithBackoff, assertNotProduction, buildChatRequest, classifyResponse } from "../../scripts/simulate/chat.mjs";
import { listPersonaIds, loadPersona, parsePersona } from "../../scripts/simulate/personas.mjs";
import { gradeRows, gradesHeader, redactGroupLinks, renderTranscript } from "../../scripts/simulate/transcript.mjs";

const DOC = `# Persona: sample

Faculty: CS, first year. Language: English only.

Mascot: byte.

## Seed questions

1. First question?
2. (note for the runner) Second question
3.   Third question with spaces

## A good answer, for them

4. Not a seed question.
`;

// ---------- persona files ----------

test("the parser reads the mascot, the language and the numbered seed questions only", () => {
  const persona = parsePersona("sample", DOC);
  assert.equal(persona.mascot, "byte");
  assert.equal(persona.language, "english");
  assert.deepEqual(persona.questions, [
    { n: 1, text: "First question?" },
    { n: 2, text: "Second question", note: "note for the runner" },
    { n: 3, text: "Third question with spaces" },
  ]);
});

test("the parser refuses a file without a mascot or without seed questions", () => {
  assert.throws(() => parsePersona("x", DOC.replace("Mascot: byte.", "")), /Mascot/);
  assert.throws(() => parsePersona("x", DOC.replace("## Seed questions", "## Questions")), /Seed questions/);
  assert.throws(() => parsePersona("x", DOC.replace(/^\d\. .*$/gm, "")), /numbered/);
  assert.throws(() => loadPersona("../etc/passwd"), /persona id/);
});

test("every persona in management/users parses with ten questions and a mascot", () => {
  const ids = listPersonaIds();
  assert.ok(ids.length >= 5, ids.join());
  assert.ok(!ids.includes("README"));
  for (const id of ids) {
    const persona = loadPersona(id);
    assert.ok(["bit", "byte"].includes(persona.mascot), id);
    assert.equal(persona.questions.length, 10, id);
    assert.deepEqual(persona.questions.map((q) => q.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], id);
  }
  assert.equal(loadPersona("english-speaker").language, "english");
  assert.equal(loadPersona("stressed-first-year").language, "hebrew");
});

// ---------- production guard ----------

test("the guard refuses production in any spelling and accepts previews and localhost", () => {
  for (const url of ["https://nechita-raka.vercel.app", "https://NECHITA-RAKA.vercel.app/api/chat", "http://nechita-raka.vercel.app:80/", "https://nechita-raka.vercel.app./", "https://nechita-raka.vercel.app%2e/"]) {
    assert.throws(() => assertNotProduction(url), /production/, url);
  }
  assert.equal(assertNotProduction("http://localhost:3000").hostname, "localhost");
  assert.equal(assertNotProduction("https://nechita-raka-git-feature-royc4515.vercel.app/").hostname, "nechita-raka-git-feature-royc4515.vercel.app");
  // "localhost:3000" parses as a URL with the scheme "localhost:", so it fails the scheme check.
  assert.throws(() => assertNotProduction("localhost:3000"), /http or https/);
  assert.throws(() => assertNotProduction("not a url"), /full URL/);
  assert.throws(() => assertNotProduction("ftp://example.com"), /http or https/);
});

// ---------- request and outcomes ----------

test("the request carries the mascot, and the English flag only for the English persona", () => {
  const he = buildChatRequest({ mascot: "bit", language: "hebrew" }, "שאלה");
  assert.deepEqual(he, { persona: "bit", messages: [{ role: "user", content: "שאלה" }] });
  assert.ok(!("lang" in he));
  assert.equal(buildChatRequest({ mascot: "byte", language: "english" }, "q").lang, "en");
});

test("outcomes follow the handler's status codes and the blocked flag", () => {
  const sources = [{ title: "t", url: "https://x" }, { bad: true }];
  assert.deepEqual(classifyResponse(200, { reply: "hi", sources, roy: true }), { outcome: "ok", answer: "hi", sources: [sources[0]], roy: true });
  assert.equal(classifyResponse(200, { reply: "nice try", sources: [], blocked: true }).outcome, "blocked");
  assert.equal(classifyResponse(429, { error: "rate_limited" }).outcome, "rate_limited");
  assert.equal(classifyResponse(429, { error: "daily_cap" }).outcome, "daily_cap");
  assert.equal(classifyResponse(429, { error: "other" }).outcome, "error");
  assert.deepEqual(classifyResponse(503, { error: "not_configured" }), { outcome: "error", answer: "", sources: [], detail: "HTTP 503 not_configured" });
  assert.equal(classifyResponse(200, null).outcome, "error");
});

test("askOnce turns a network failure into an error outcome and sends the same-origin header", async () => {
  const persona = { id: "p", mascot: "bit", language: "hebrew" };
  const down = async () => {
    throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } });
  };
  const failed = await askOnce("http://localhost:9", persona, "q", { fetchImpl: down });
  assert.equal(failed.outcome, "error");
  assert.match(failed.detail, /ECONNREFUSED/);

  let seen;
  const up = async (url, init) => {
    seen = { url: String(url), init };
    return new Response(JSON.stringify({ reply: "ok", sources: [] }), { status: 200 });
  };
  const fine = await askOnce("http://localhost:3000/", persona, "q", { fetchImpl: up, headers: { "x-vercel-protection-bypass": "s", Origin: "https://evil" } });
  assert.equal(fine.outcome, "ok");
  assert.equal(seen.url, "http://localhost:3000/api/chat");
  assert.equal(seen.init.headers.Origin, "http://localhost:3000");
  assert.equal(seen.init.headers["x-vercel-protection-bypass"], "s");
  assert.equal(JSON.parse(seen.init.body).persona, "bit");
  assert.equal(seen.init.redirect, "manual");
});

test("askOnce reports a redirect or an HTML page as an error instead of following or parsing it", async () => {
  const persona = { id: "p", mascot: "bit", language: "hebrew" };
  const redirecting = async () => new Response(null, { status: 307, headers: { location: "https://nechita-raka.vercel.app/api/chat" } });
  const moved = await askOnce("http://localhost:3000", persona, "q", { fetchImpl: redirecting });
  assert.equal(moved.outcome, "error");
  assert.match(moved.detail, /307 redirect to https:\/\/nechita-raka\.vercel\.app\/api\/chat/);
  // Vercel Authentication answers a protected preview with an HTML page.
  const html = async () => new Response("<!doctype html><title>Authentication Required</title>", { status: 401, headers: { "content-type": "text/html" } });
  assert.deepEqual(await askOnce("http://localhost:3000", persona, "q", { fetchImpl: html }), { outcome: "error", answer: "", sources: [], detail: "HTTP 401" });
  const htmlOk = async () => new Response("<html>not json</html>", { status: 200 });
  assert.equal((await askOnce("http://localhost:3000", persona, "q", { fetchImpl: htmlOk })).outcome, "error");
});

// ---------- transcript and grades ----------

test("the transcript lists input, mascot, outcome, sources and answer per question", () => {
  const run = { target: "http://localhost:3000/", startedAt: "2026-10-15T10:00:00.000Z" };
  const persona = { id: "sample", mascot: "byte", language: "english" };
  const results = [
    { n: 1, input: "First?", outcome: "ok", answer: "Line one\nLine two", sources: [{ title: "Guide", url: "https://x/g" }] },
    { n: 2, input: "Second", note: "runner note", outcome: "error", answer: "", sources: [], detail: "HTTP 503 busy" },
  ];
  const text = renderTranscript(run, persona, results);
  assert.match(text, /- Outcomes: ok 1, rate_limited 0, daily_cap 0, blocked 0, error 1/);
  assert.match(text, /## Question 1\n\n- Input: First\?\n- Mascot: byte\n- Outcome: ok\n- Sources: \[Guide\]\(https:\/\/x\/g\)\n- Answer:\n\n> Line one\n> Line two/);
  assert.match(text, /- Note: runner note\n- Mascot: byte\n- Outcome: error \(HTTP 503 busy\)\n- Sources: none/);
  assert.match(gradesHeader(run), /`answered`, `not-answered`, `invented-fact`, `broke-character`, `blocked`, `error`/);
  assert.equal(gradeRows(persona, results), "| sample | 1 | ok | | |\n| sample | 2 | error | | HTTP 503 busy |");
});

// ---------- busy backoff and the default delay ----------

const busyPersona = { id: "p", mascot: "bit", language: "hebrew" };
const busy = () => new Response(JSON.stringify({ error: "busy" }), { status: 503 });
const fine = () => new Response(JSON.stringify({ reply: "ok", sources: [] }), { status: 200 });

/** A fetch that answers from a script of responses and a sleep that only records its waits. */
function scripted(responses) {
  const calls = { fetches: 0, waits: [] };
  const fetchImpl = async () => responses[Math.min(calls.fetches++, responses.length - 1)]();
  const sleep = async (ms) => {
    calls.waits.push(ms);
  };
  return { calls, fetchImpl, sleep };
}

test("the default delay is the one the baseline needed, and the floor stays at a second", () => {
  assert.equal(DEFAULT_DELAY_MS, 20_000);
  assert.ok(BUSY_WAIT_MS >= 30_000 && BUSY_RETRIES >= 1);
});

test("a 503 busy is retried after a wait, and the transcript says so", async () => {
  const { calls, fetchImpl, sleep } = scripted([busy, busy, fine]);
  const out = await askWithBackoff("http://localhost:3000", busyPersona, "q", { fetchImpl, sleep, retries: 2, waitMs: 60_000 });
  assert.equal(out.outcome, "ok");
  assert.equal(out.answer, "ok");
  assert.equal(out.detail, "after 2 busy retries");
  assert.equal(calls.fetches, 3);
  assert.deepEqual(calls.waits, [60_000, 60_000]);
});

test("a question still busy after the retries is recorded as an error, once", async () => {
  const { calls, fetchImpl, sleep } = scripted([busy]);
  const out = await askWithBackoff("http://localhost:3000", busyPersona, "q", { fetchImpl, sleep, retries: 2, waitMs: 1 });
  assert.equal(out.outcome, "error");
  assert.equal(out.detail, "HTTP 503 busy (after 2 busy retries)");
  assert.equal(calls.fetches, 3);
});

test("a different failure after a busy retry keeps its own detail", async () => {
  const { fetchImpl, sleep } = scripted([busy, () => new Response(JSON.stringify({ error: "rate_limited" }), { status: 429 })]);
  const out = await askWithBackoff("http://localhost:3000", busyPersona, "q", { fetchImpl, sleep, retries: 2, waitMs: 1 });
  assert.equal(out.outcome, "rate_limited");
  assert.equal(out.detail, "HTTP 429 (after 1 busy retry)");
});

test("other errors and limiter answers are not retried", async () => {
  for (const first of [() => new Response(JSON.stringify({ error: "not_configured" }), { status: 503 }), () => new Response(JSON.stringify({ error: "rate_limited" }), { status: 429 })]) {
    const { calls, fetchImpl, sleep } = scripted([first, fine]);
    const out = await askWithBackoff("http://localhost:3000", busyPersona, "q", { fetchImpl, sleep, retries: 2, waitMs: 1 });
    assert.notEqual(out.outcome, "ok");
    assert.equal(calls.fetches, 1);
    assert.deepEqual(calls.waits, []);
  }
  const { calls } = scripted([fine]);
  const out = await askWithBackoff("http://localhost:3000", busyPersona, "q", { fetchImpl: fine, sleep: async () => calls.waits.push(1) });
  assert.equal(out.outcome, "ok");
  assert.equal(out.detail, undefined);
  assert.deepEqual(calls.waits, []);
});

// ---------- group links never reach a run ----------

test("WhatsApp group links are redacted everywhere a transcript or grades sheet could carry one", () => {
  const link = "https://chat.whatsapp.com/C7CZ5YJsTYbE0wUDjsvn4c";
  assert.equal(redactGroupLinks(`הצטרפו: ${link}.`), "הצטרפו: https://chat.whatsapp.com/[redacted].");
  assert.equal(redactGroupLinks("see https://wa.me/972501234567 and https://www.biu.ac.il/x"), "see https://wa.me/972501234567 and https://www.biu.ac.il/x");
  assert.equal(redactGroupLinks("chat.whatsapp.com/AbC_d-9 or https://whatsapp.com/channel/0029Va"), "chat.whatsapp.com/[redacted] or https://whatsapp.com/channel/[redacted]");
  const run = { target: "http://localhost:3000/", startedAt: "2026-10-15T10:00:00.000Z" };
  const persona = { id: "sample", mascot: "bit", language: "hebrew" };
  const results = [
    { n: 1, input: `מה זה ${link}`, note: `sent with ${link}`, outcome: "ok", answer: `הקבוצה: ${link}\nועוד: ${link}?`, sources: [{ title: "Groups", url: link }] },
    { n: 2, input: "x", outcome: "error", answer: "", sources: [], detail: `HTTP 500 ${link}` },
  ];
  const text = renderTranscript(run, persona, results);
  assert.doesNotMatch(text, /C7CZ5YJsTYbE0wUDjsvn4c/);
  assert.match(text, /- Input: מה זה https:\/\/chat\.whatsapp\.com\/\[redacted\]/);
  assert.match(text, /- Sources: \[Groups\]\(https:\/\/chat\.whatsapp\.com\/\[redacted\]\)/);
  assert.match(text, /> הקבוצה: https:\/\/chat\.whatsapp\.com\/\[redacted\]\n> ועוד: https:\/\/chat\.whatsapp\.com\/\[redacted\]\?/);
  assert.doesNotMatch(gradeRows(persona, results), /C7CZ5YJsTYbE0wUDjsvn4c/);
  assert.match(gradeRows(persona, results), /HTTP 500 https:\/\/chat\.whatsapp\.com\/\[redacted\]/);
});
