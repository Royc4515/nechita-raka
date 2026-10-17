// From parsed/plans.json: (1) plans.json for the repo, cohorts labeled, with a per-course year guess;
// (2) the effective yearbook for 5787: a student follows the plan of the year they started, so in 5787
// year 1 comes from the 5787 plan, year 2 from the 5786 plan (the "updated per 5787" variant, the one
// the Gonda pages list first), year 3 from the 5785 plan; (3) the category list for the manifest;
// (4) a summary with the diffs, for management/neuro/plans.md.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const HERE = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const parsed = JSON.parse(readFileSync(join(HERE, "parsed", "plans.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(HERE, "manifest.json"), "utf8"));
const entries = manifest.files || manifest;
const OUT = join(HERE, "out");
mkdirSync(OUT, { recursive: true });

const TRACKS = {
  single: "מדעי המוח חד-חוגי",
  "single-comp": "מדעי המוח חד-חוגי, מגמה חישובית",
  cs: "מדעי המוח ומדעי המחשב",
  psychology: "מדעי המוח ופסיכולוגיה",
  biology: "מדעי המוח ומדעי החיים",
  philosophy: "מדעי המוח ופילוסופיה",
  linguistics: "מדעי המוח ובלשנות",
  physics: "מדעי המוח ופיזיקה",
};
const YEAR_LABEL = { 1: "שנה א'", 2: "שנה ב'", 3: "שנה ג'" };
const COHORT_LABEL = { 5785: 'תשפ"ה', 5786: 'תשפ"ו', 5787: 'תשפ"ז' };

const yearOfCode = (catalogCode) => (catalogCode.startsWith("272") ? 1 : catalogCode.startsWith("273") ? 2 : catalogCode.startsWith("274") ? 3 : catalogCode.startsWith("275") ? 3 : null);
const urlOf = (track, fileKey) => { const e = entries.find((x) => x.track === track && String(x.file || "").replace(/\\/g, "/").endsWith(`/${fileKey}.pdf`)); return e ? e.url : null; };

// 1. plans.json with labeled variants
const plans = {};
const notes = [];
for (const [track, cohorts] of Object.entries(parsed)) {
  plans[track] = { label: TRACKS[track], cohorts: {} };
  for (const [key, plan] of Object.entries(cohorts)) {
    const cohort = key.slice(0, 4);
    const variant = key.endsWith("-2") ? "original" : cohort === "5786" ? "updated" : "only";
    // Double majors: the blocks come in year order, a brain-sciences block then the partner's, so block order
    // beats the code numbering (some 27-3xx courses sit in year 3 of a track). The single major is one flat block.
    const filled = plan.blocks.filter((b) => b.courses.length);
    const ORDER = { 6: [1, 1, 2, 2, 3, 3], 5: [1, 1, 2, 2, 3], 4: [1, 1, 2, 2], 3: [1, 2, 3] };
    const byOrder = !track.startsWith("single") && ORDER[filled.length] ? new Map(filled.map((b, i) => [b.index, ORDER[filled.length][i]])) : null;
    const courses = plan.blocks.flatMap((b) => b.courses.map((c) => ({
      code: c.code, name: c.name, rawName: c.name ? undefined : c.rawName, credits: c.credits, hours: c.hours,
      block: b.index, blockKind: b.kind, blockTotal: b.total,
      year: byOrder ? byOrder.get(b.index) : c.catalogCode.startsWith("27") ? (yearOfCode(c.catalogCode) ?? b.year) : b.year,
      yearSource: byOrder ? "block-order" : c.catalogCode.startsWith("27") && yearOfCode(c.catalogCode) ? "code-numbering" : b.yearSource,
    })));
    plans[track].cohorts[`${cohort}${variant === "only" ? "" : `-${variant}`}`] = { cohort, cohortLabel: COHORT_LABEL[cohort], variant, source: urlOf(track, key), extractedFrom: plan.file, courses };
  }
}
// sanity: the "updated" 5786 variant must be closer to 5787 than the original is
for (const [track, t] of Object.entries(plans)) {
  const codes = (k) => new Set((t.cohorts[k]?.courses || []).map((c) => c.code));
  const shared = (a, b) => [...a].filter((c) => b.has(c)).length;
  if (t.cohorts["5786-updated"] && t.cohorts["5786-original"] && t.cohorts["5787"]) {
    const u = shared(codes("5786-updated"), codes("5787")), o = shared(codes("5786-original"), codes("5787"));
    notes.push(`${track}: 5786-updated shares ${u} codes with 5787, 5786-original shares ${o}${u >= o ? "" : " (UNEXPECTED: original closer to 5787)"}`);
  }
}
writeFileSync(join(OUT, "plans.json"), JSON.stringify({ source: "Gonda study-plan PDFs (חוקה) per track, downloaded 18.10.2026 from gondabrain.biu.ac.il; text extracted with pypdf; years inferred from the department code numbering and block order (see README.md)", tracks: plans }, null, 2) + "\n");

// 2. effective yearbook for 5787
const PICK = { 1: "5787", 2: "5786-updated", 3: "5785" };
const categories = {};
const semesters = {};
const rows = [];
for (const [track, t] of Object.entries(plans)) {
  for (const [year, cohortKey] of Object.entries(PICK)) {
    const plan = t.cohorts[cohortKey] || t.cohorts["5787"];
    if (!plan) continue;
    if (track === "single-comp" && year !== "1") continue; // the computational track started in 5787: only year 1 exists
    const picked = plan.courses.filter((c) => String(c.year) === year);
    for (const c of picked) {
      const code = c.code.replace("-", "");
      categories[code] ??= [];
      const id = `${track}:${year}`;
      if (!categories[code].includes(id)) categories[code].push(id);
    }
    rows.push(`${track} y${year} <- ${plan.cohort}${plan.variant === "only" ? "" : "-" + plan.variant}: ${picked.length} courses`);
  }
}
const categoryList = Object.keys(TRACKS).flatMap((track) => (track === "single-comp" ? [1] : [1, 2, 3]).map((y) => ({ id: `${track}:${y}`, label: `${TRACKS[track]}: ${YEAR_LABEL[y]}` })));
writeFileSync(join(OUT, "yearbook.json"), JSON.stringify({
  source: 'תוכניות הלימודים (חוקה) של המרכז לחקר המוח ע"ש גונדה לכל מסלול, לפי שנת תחילת התואר: שנה א\' מחוקה תשפ"ז, שנה ב\' מחוקה תשפ"ו (הגרסה המעודכנת), שנה ג\' מחוקה תשפ"ה. נקראו מ-gondabrain.biu.ac.il ב-18.10.2026.',
  track: "מדעי המוח, כל המסלולים; קטגוריה = <מסלול>:<שנה>. קורסים של המחלקה השנייה (89, 60, 80, 86, 31, 37) מופיעים במיפוי אך אינם בקטלוג של מחלקה 27, ולכן לא מוצגים עד שהקטלוג שלהם ייסרק.",
  notes: "single-comp: Gonda publishes no separate PDF (its תשפ\"ז link is the single-major file); its year-1 differences are on the HTML page /computaional_track and still need to be read. Years were inferred (27-2xx year 1, 27-3xx year 2, 27-4xx year 3; partner blocks inherit the adjacent brain-sciences block), not read from headings; the owner verifies against the PDFs before launch.",
  categories, semesters,
}, null, 2) + "\n");
writeFileSync(join(OUT, "categories.json"), JSON.stringify(categoryList, null, 2) + "\n");

// 3. summary
const lines = ["# Study plans per track and cohort (parsed 18.10.2026)", "", "Picks for the effective 5787 yearbook:", ...rows.map((r) => `- ${r}`), "", "5786 variants (the first link on each page is the plan updated per 5787):", ...notes.map((n) => `- ${n}`), ""];
for (const [track, t] of Object.entries(plans)) {
  lines.push(`## ${track} (${t.label})`);
  const keys = ["5785", "5786-original", "5786-updated", "5787"].filter((k) => t.cohorts[k]);
  for (const k of keys) {
    const p = t.cohorts[k];
    const byYear = [1, 2, 3].map((y) => `y${y}: ${p.courses.filter((c) => c.year === y).length}`).join(", ");
    const unnamed = p.courses.filter((c) => !c.name).length;
    lines.push(`- ${k}: ${p.courses.length} courses (${byYear}); ${unnamed} partner-department courses with raw names only`);
  }
  for (let i = 1; i < keys.length; i++) {
    const a = new Set(t.cohorts[keys[i - 1]].courses.map((c) => c.code)), b = new Set(t.cohorts[keys[i]].courses.map((c) => c.code));
    const added = [...b].filter((c) => !a.has(c)), removed = [...a].filter((c) => !b.has(c));
    lines.push(`  - ${keys[i - 1]} → ${keys[i]}: added ${added.join(", ") || "none"}; removed ${removed.join(", ") || "none"}`);
  }
  lines.push("");
}
writeFileSync(join(OUT, "summary.md"), lines.join("\n"));
console.log(lines.slice(0, 40).join("\n"));
console.log(`\ncategories: ${Object.keys(categories).length} codes mapped, ${categoryList.length} category ids`);
