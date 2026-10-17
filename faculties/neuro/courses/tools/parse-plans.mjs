// Parses the flattened pypdf text of the Gonda study-plan PDFs into structured plans.
// A table row came out as: <code>[-group]<name fragments><credits><hours>; totals lines ("סה"כ נ"ז חובה: 43")
// close a block; lines with "בחירה" open elective blocks. Years are not in the text, so each block's year is
// the majority year of its brain-sciences codes (27-2xx year 1, 27-3xx year 2, 27-4xx year 3, the department
// numbering confirmed by the "שעת מחלקה שנה א/ב/ג" courses in the catalog), and a block with no 27- codes
// inherits the previous block's year. Names of 27- courses come from the catalog scan; others keep the raw text.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const HERE = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TEXT = join(HERE, "text");
const OUT = join(HERE, "parsed");
const CATALOG = new URL("../catalog.json", import.meta.url);
const catalog = JSON.parse(readFileSync(CATALOG, "utf8"));
const catalogNames = new Map();
for (const r of catalog.rows) if (!catalogNames.has(r.code)) catalogNames.set(r.code, r.name);

const COURSE = /^(\d{2})-(\d{3,4})(?:-(\d{2}))?(.*?)(\d)(\d)?\s*$/;
const TOTAL = /סה"כ|כ נ"ז|:ז\s*חובה"כ|ז מקורסי בחירה"נ|^\s*:\s*ז חובה/;
const ELECTIVE = /בחירה/;
const YEAR_HEADING = /^'?שנה ([אבג])'?\s*$/;
const YEAR_OF_LETTER = { "א": 1, "ב": 2, "ג": 3 };

const yearOfNeuroCode = (code) => (code.startsWith("272") ? 1 : code.startsWith("273") ? 2 : code.startsWith("274") ? 3 : null);

function normalizeCode(dept, digits, rest) {
  // "27-215-011 פרקים" came out as code 27-215 group 01 then a name starting with "1"; "27-2011" is a real 4-digit code.
  let code = dept + digits, name = rest;
  if (dept === "27" && digits.length === 4 && !catalogNames.has(code) && catalogNames.has(dept + digits.slice(0, 3))) {
    code = dept + digits.slice(0, 3);
    name = digits.slice(3) + " " + rest;
  }
  return { code, name };
}

function parseFile(file) {
  const lines = readFileSync(join(TEXT, file), "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const blocks = [];
  let current = { index: 0, kind: "required", courses: [], total: null, headingYear: null };
  let pendingYear = null;
  const close = () => { if (current.courses.length || current.total !== null) blocks.push(current); current = { index: blocks.length, kind: "required", courses: [], total: null, headingYear: pendingYear }; };
  for (const line of lines) {
    const yh = line.match(YEAR_HEADING);
    if (yh) { pendingYear = YEAR_OF_LETTER[yh[1]]; if (!current.courses.length) current.headingYear = pendingYear; continue; }
    const m = line.match(COURSE);
    if (m && !TOTAL.test(line)) {
      const { code, name } = normalizeCode(m[1], m[2], m[4]);
      const credits = Number(m[5]), hours = m[6] === undefined ? null : Number(m[6]);
      const rawName = name.replace(/\s+/g, " ").trim();
      current.courses.push({ code: `${code.slice(0, 2)}-${code.slice(2)}`, catalogCode: code, name: catalogNames.get(code) || null, rawName, credits, hours, group: m[3] || null });
      continue;
    }
    if (TOTAL.test(line)) {
      const n = line.match(/(\d+)\s*$/);
      current.total = n ? Number(n[1]) : null;
      if (ELECTIVE.test(line)) current.kind = "elective";
      close();
      continue;
    }
    if (ELECTIVE.test(line) && current.courses.length === 0) current.kind = "elective";
  }
  close();
  let lastYear = null;
  for (const b of blocks) {
    const years = b.courses.map((c) => c.catalogCode.startsWith("27") ? yearOfNeuroCode(c.catalogCode) : null).filter(Boolean);
    const counts = years.reduce((a, y) => (a[y] = (a[y] || 0) + 1, a), {});
    const majority = Object.entries(counts).sort((x, y) => y[1] - x[1])[0];
    b.year = b.headingYear ?? (majority ? Number(majority[0]) : lastYear);
    b.yearSource = b.headingYear ? "heading" : majority ? "neuro-codes" : lastYear ? "inherited" : "unknown";
    if (b.year) lastYear = b.year;
    b.credits = b.courses.reduce((s, c) => s + c.credits, 0);
  }
  return blocks;
}

mkdirSync(OUT, { recursive: true });
const files = readdirSync(TEXT).filter((f) => f.endsWith(".txt"));
const plans = {};
for (const file of files) {
  const m = file.match(/^(.+?)-(\d{4})(-2)?\.txt$/);
  if (!m) continue;
  const [, track, year, variant] = m;
  plans[track] ??= {};
  plans[track][year + (variant || "")] = { file, blocks: parseFile(file) };
}
writeFileSync(join(OUT, "plans.json"), JSON.stringify(plans, null, 2));

// Summary and diffs
const lines = [];
for (const [track, cohorts] of Object.entries(plans)) {
  lines.push(`\n== ${track}`);
  for (const [cohort, plan] of Object.entries(cohorts)) {
    const n = plan.blocks.reduce((s, b) => s + b.courses.length, 0);
    const unknown = plan.blocks.filter((b) => b.yearSource === "unknown").length;
    lines.push(`  ${cohort}: ${plan.blocks.length} blocks, ${n} courses, blocks: ` + plan.blocks.map((b) => `[${b.kind[0]} y${b.year ?? "?"} ${b.courses.length}c ${b.credits}cr${b.total !== null ? ` t${b.total}` : ""}]`).join(" ") + (unknown ? ` (${unknown} blocks with unknown year)` : ""));
  }
  const codesOf = (plan) => new Set(plan.blocks.flatMap((b) => b.courses.map((c) => c.code)));
  const keys = Object.keys(cohorts).sort();
  for (let i = 1; i < keys.length; i++) {
    const a = codesOf(cohorts[keys[i - 1]]), b = codesOf(cohorts[keys[i]]);
    const added = [...b].filter((c) => !a.has(c)), removed = [...a].filter((c) => !b.has(c));
    lines.push(`  ${keys[i - 1]} -> ${keys[i]}: +${added.length} [${added.join(", ")}] -${removed.length} [${removed.join(", ")}]`);
  }
}
writeFileSync(join(OUT, "summary.txt"), lines.join("\n"));
console.log(lines.join("\n"));
