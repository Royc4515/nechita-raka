// Which reviews a change needs, from the files it touches (MANAGEMENT-PLAN.md, "Review ladder").
// Usage: node scripts/review-tier.mjs [base]   (base defaults to origin/main; compares to the working tree)
// Prints the tier, the reason, and the exact agents to run, so a review never costs more than the change.
import { execFileSync } from "node:child_process";

const TIERS = [
  { tier: 3, reason: "server, env, prompt, limiter, admin or build", test: (f) => /^api\/(?!_tests\/)|^vercel\.json$|^scripts\/(build-public|prerender)\.mjs$|^\.github\//.test(f) },
  { tier: 2, reason: "browser code", test: (f) => /^(index\.html|chat\.js|peek\.js|track\.js|admin\.(html|js)|course-[\w-]+\.js|.*\.css|manifest\.webmanifest)$/.test(f) || /^faculties\/[^/]+\/faculty\.js$/.test(f) },
  { tier: 1, reason: "scripts, tests, agents or docs", test: (f) => /^(scripts\/|api\/_tests\/|\.claude\/|package(-lock)?\.json$|README\.md$|.*\.md$)/.test(f) },
  { tier: 0, reason: "content only", test: (f) => /^(data\.js|data\.en\.js|management\/|shared\/|faculties\/[^/]+\/data(\.en)?\.js$|courses-[\w-]+\.json$|biu-\d+\.ics$)/.test(f) },
];

const REVIEWS = {
  0: ["CI only (npm run check, tests, build). Owner fact-check if a Bar-Ilan fact changed. No QA, no security."],
  1: ["Engineer self-review plus CI. No agents."],
  2: ["qa (Sonnet): build, tests, one browser walk of the touched flow, phone and desktop.", "ux-reviewer only if something visible changed."],
  3: ["qa (Sonnet) scoped to the diff.", "security (Opus) scoped to the diff.", "If prompt.js, knowledge.js or chat facts changed: simulate.mjs --limit 3 with one or two personas, not a full run.", "One gemini-delegate review instead of a second Claude pass."],
};

const base = process.argv[2] || "origin/main";
let files;
try {
  files = execFileSync("git", ["diff", "--name-only", base], { encoding: "utf8" }).split("\n").map((f) => f.trim()).filter(Boolean);
} catch (error) {
  console.error(`review-tier: cannot diff against ${base}: ${error.message}`);
  process.exit(2);
}
if (!files.length) {
  console.log(`review-tier: no changes against ${base}`);
  process.exit(0);
}

const classify = (file) => TIERS.find((t) => t.test(file)) || { tier: 1, reason: "unlisted path, treated as scripts" };
const perFile = files.map((file) => ({ file, ...classify(file) }));
const top = perFile.reduce((max, f) => (f.tier > max.tier ? f : max), perFile[0]);

console.log(`Tier ${top.tier}: ${top.reason} (${top.file})`);
for (const f of perFile) console.log(`  ${f.tier}  ${f.file}`);
console.log("Reviews:");
for (const line of REVIEWS[top.tier]) console.log(`  - ${line}`);
console.log("Brief rule: hand the agent the diff and this file list; it reads only those and what they import; report under 300 words; once per PR, at the end.");
