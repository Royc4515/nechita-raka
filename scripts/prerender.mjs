// Writes the site's content into the HTML at build time.
//
// index.html renders everything from data.js in the browser. Crawlers that don't run JavaScript
// (Bing, most AI crawlers, WhatsApp's link preview) used to see an empty page, and Google only saw
// the content after rendering. So the build fills the same containers with static markup, using the
// same classes, and the page script removes it ([data-pre]) and renders as before. Nothing here
// changes how the page looks once the script runs.
//
// It also gives every guide a page of its own (/exams, /registration...), with its own title,
// description and structured data, because a hash (#guide-exams) is never indexed as a separate page
// and each guide answers a different search.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { contentFiles, loadContent } from "../faculties/content.js";
import { DECOR_STYLES, FACULTY, HERO_VARIANTS, TERMINAL_TOKEN_KINDS, THEME_KEYS } from "../faculties/index.js";

// The page identity comes from the faculty manifest (faculties/<id>/faculty.js, MULTI-FACULTY-PLAN.md D4).
export const SITE_URL = FACULTY.site.url;
const OG_IMAGE = { ...FACULTY.site.ogImage, url: `${SITE_URL}/${FACULTY.site.ogImage.path}` };
const BRAND = FACULTY.site.brand;
const SITE_NAME = FACULTY.site.name;
const HOME_TITLE = FACULTY.site.title;

/**
 * Who the site is for, as the sentences below embed it (site.audience, faculties/index.js): `people` and `en` as the
 * manifest says them; `scope` is what the site covers after "של" or "ל" ("שנה א' במדעי המחשב", or the faculty itself
 * when no year narrows it), and `scopeShort` the same where the faculty is already implied ("שנה א'").
 */
export function audienceOf(faculty) {
  const { he, en, year } = faculty.site.audience;
  return { people: he, en, scope: year ? `${year} ב${faculty.name.he}` : faculty.name.he, scopeShort: year || faculty.name.he };
}
const AUDIENCE = audienceOf(FACULTY);
const NOT_OFFICIAL = "יוזמה של סטודנט, לא אתר רשמי של האוניברסיטה.";
const BIU = { "@type": "CollegeOrUniversity", "@id": `${SITE_URL}/#biu`, name: "אוניברסיטת בר-אילן", alternateName: "Bar-Ilan University", url: "https://www.biu.ac.il/" };
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// ---------- Data ----------

/** The site's content: shared/data.js and faculties/<id>/data.js merged (faculties/content.js, MULTI-FACULTY-PLAN.md D5). */
export function loadData(faculty = FACULTY) {
  const data = loadContent(faculty);
  if (!Array.isArray(data.categories) || !Array.isArray(data.guides)) throw new Error("prerender: the merged content has no categories or guides");
  return data;
}

const isSafeUrl = (url) => typeof url === "string" && /^https:\/\/[^\s]+$/.test(url);

// The private WhatsApp link, built the same way as mentorItem() in index.html.
function mentorItem(site) {
  const number = String((site && site.whatsapp) || "").replace(/\D/g, "");
  if (!/^\d{9,15}$/.test(number)) return null;
  const text = site.whatsappText ? `?text=${encodeURIComponent(site.whatsappText)}` : "";
  return { id: "mentor", name: "וואטסאפ פרטי לרועי", desc: "הודעה פרטית לרועי", url: `https://wa.me/${number}${text}` };
}

function itemsById(data) {
  const map = new Map(data.categories.flatMap((cat) => (cat.items || []).filter((i) => i && i.id && i.desc && isSafeUrl(i.url)).map((i) => [i.id, i])));
  const mentor = mentorItem(data.site);
  if (mentor) map.set(mentor.id, mentor);
  return map;
}

function resolveLinks(links, items) {
  return (links || []).map((link) => {
    if (typeof link === "string") {
      const item = items.get(link);
      return item ? { label: item.name, url: item.url } : null;
    }
    if (link && link.guide && link.label && /^[a-z0-9-]+$/.test(link.guide)) return link;
    return link && isSafeUrl(link.url) && link.label ? link : null;
  }).filter(Boolean);
}

// ---------- Dates ----------

/** "7.10.2026" (checkedOn) -> "2026-10-07" */
export function isoFromDmy(dmy) {
  const m = String(dmy || "").match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}
const dmyFromIso = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}.${m}.${y}`;
};

function formatRange(ev) {
  const [y1, m1, d1] = ev.date.split("-").map(Number);
  if (!ev.until) return `${d1}.${m1}.${y1}${ev.time ? `, ${ev.time}` : ""}`;
  const [y2, m2, d2] = ev.until.split("-").map(Number);
  if (y1 !== y2) return `${d1}.${m1}.${y1}–${d2}.${m2}.${y2}`;
  if (m1 !== m2) return `${d1}.${m1}–${d2}.${m2}.${y2}`;
  return `${d1}–${d2}.${m2}.${y2}`;
}

const MONTH_FMT = new Intl.DateTimeFormat("he-IL", { month: "short", timeZone: "UTC" });
const monthShort = (iso) => MONTH_FMT.format(new Date(`${iso}T12:00:00Z`));

/** Israel's UTC offset on that day ("+02:00" in winter, "+03:00" in summer). */
function israelOffset(iso) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", timeZoneName: "longOffset" })
    .formatToParts(new Date(`${iso}T12:00:00Z`)).find((p) => p.type === "timeZoneName").value;
  const m = name.match(/GMT([+-]\d{2}:\d{2})/);
  return m ? m[1] : "+02:00";
}

/** When the content last changed: the last commit to either content file, or the latest "checked on" date if git is not there. */
export function lastUpdated(data, faculty = FACULTY) {
  const checked = [data.calendar && data.calendar.checkedOn, ...data.guides.map((g) => g.checkedOn)].map(isoFromDmy).filter(Boolean);
  let committed = null;
  try {
    committed = execFileSync("git", ["log", "-1", "--format=%cs", "--", ...contentFiles(faculty).data], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null;
  } catch {
    committed = null; // no git history in this build: fall back to the checked-on dates
  }
  return [committed, ...checked].filter((d) => d && ISO_DATE.test(d)).sort().pop();
}

// ---------- HTML helpers ----------

export const esc = (text) => String(text ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

/** Same as bidiText() in index.html: Latin runs and emails isolated so RTL never scrambles them. */
function bidi(text) {
  const pattern = /[*@A-Za-z](?:[\w@*.\-+/:]*\w)?(?: [\w*@](?:[\w@*.\-+/:]*\w)?)*|\d+(?:[.:/–\-]\d+)+%?|\d+[A-Za-z]+\b/g;
  text = String(text ?? "");
  let out = "";
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const run = match[0];
    out += esc(text.slice(last, match.index));
    out += /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(run)
      ? `<a href="mailto:${esc(run)}" dir="ltr" class="run">${esc(run)}</a>`
      : `<bdi dir="ltr" class="run">${esc(run)}</bdi>`;
    last = match.index + run.length;
  }
  return out + esc(text.slice(last));
}

const external = (url, text, attrs = "") => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer"${attrs}>${text}</a>`;
const guideHref = (id) => `./${id}`;
const guideUrl = (id) => `${SITE_URL}/${id}`;
const linkButton = (link, text) => (link.guide
  ? `<a class="btn" href="${guideHref(link.guide)}">${esc(link.label)}</a>`
  : external(link.url, esc(text || "פתיחה"), ` class="btn btn-primary" aria-label="${esc(`${text || `פתיחה: ${link.label}`} (נפתח בלשונית חדשה)`)}"`));
const sourceLine = (sources, tail = "") => `<p class="source">מקור: ${sources.map((s) => external(s.url, esc(s.label || "האתר הרשמי"))).join(" · ")}${tail}</p>`;

function faqSources(entry, guidesById) {
  const own = Array.isArray(entry.sources) ? entry.sources : (guidesById.get(entry.guide) || {}).sources;
  return (own || []).filter((src) => src && isSafeUrl(src.url));
}

// ---------- Sections of the home page (same markup as the render functions in index.html) ----------

function featuredHtml(data, items) {
  const list = (data.featured || []).map((id) => items.get(id)).filter(Boolean);
  return list.map((item, i) => {
    const variant = i === 0 ? " hero-tile" : (i === list.length - 1 && list.length % 2 === 0 ? " wide" : "");
    return `<a class="tile${variant}" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer" data-pre><span class="tile-icon"></span><span class="tile-text"><span class="tile-desc">${esc(item.desc)}</span><span class="tile-name">${esc(item.name)}</span></span><span class="sr-only">(נפתח בלשונית חדשה)</span></a>`;
  }).join("");
}

function guideCardsHtml(data) {
  return data.guides.map((g) => `<a class="guide-card" href="${guideHref(g.id)}" data-guide="${esc(g.id)}" data-pre><span class="guide-icon"></span><h3>${esc(g.title)}</h3>${g.summary ? `<p>${bidi(g.summary)}</p>` : ""}<span class="guide-meta"><span>${g.steps.length === 1 ? "צעד אחד" : `${g.steps.length} צעדים`}</span></span></a>`).join("");
}

function categoriesHtml(data) {
  return data.categories.map((cat) => {
    const items = (cat.items || []).filter((i) => i && i.id && i.desc && isSafeUrl(i.url));
    const cards = items.map((item) => `<article class="card"><div class="card-text"><h3>${external(item.url, esc(item.desc), ` class="card-link" aria-label="${esc(`${item.desc}: ${item.name} (נפתח בלשונית חדשה)`)}"`)}</h3><p class="name">${esc(item.name)}</p>${item.note ? `<p class="note">${bidi(item.note)}</p>` : ""}</div><div class="card-tools"></div></article>`).join("");
    const heading = `<h2 id="cat-${esc(cat.id)}">${esc(cat.title)}<span class="count" aria-hidden="true">${items.length}</span></h2>`;
    return cat.collapsed
      ? `<section class="cat cat-collapsed" aria-labelledby="cat-${esc(cat.id)}" data-pre><details><summary>${heading}</summary><div class="grid">${cards}</div></details></section>`
      : `<section class="cat" aria-labelledby="cat-${esc(cat.id)}" data-pre>${heading}<div class="grid">${cards}</div></section>`;
  }).join("");
}

function timelineHtml(data) {
  const events = [...data.calendar.events].filter((ev) => ev && ev.title && ISO_DATE.test(ev.date || "")).sort((a, b) => a.date.localeCompare(b.date));
  return events.map((ev) => {
    const datetime = ev.time ? `${ev.date}T${ev.time.padStart(5, "0")}` : ev.date;
    const day = Number(ev.date.slice(8));
    return `<li class="event${ev.kind === "birthday" ? " birthday" : ""}" data-pre><span class="datechip" aria-hidden="true"><span class="mon">${esc(monthShort(ev.date))}</span><span class="day">${day}</span></span><div><time datetime="${datetime}"><span class="ltr">${esc(formatRange(ev))}</span></time><div class="title">${esc(ev.title)}</div>${ev.kind === "birthday" ? `<span class="bday-badge">🎂 יום הולדת</span>` : ""}${ev.note ? `<div class="ev-note">${esc(ev.note)}</div>` : ""}${ev.guide ? `<a class="ev-guide" href="${guideHref(ev.guide)}">איך עושים את זה ←</a>` : ""}${ev.link && isSafeUrl(ev.link.url) ? external(ev.link.url, `${esc(ev.link.label)} ←`, ` class="ev-guide"`) : ""}</div></li>`;
  }).join("");
}

function calSourceHtml(cal) {
  const link = isSafeUrl(cal.sourceUrl) ? `${external(cal.sourceUrl, "הלוח הרשמי")} קובע.` : "הלוח הרשמי קובע.";
  return `<span data-pre>התאריכים נלקחו מלוח הזמנים האקדמי של האוניברסיטה ב-<span class="ltr">${esc(cal.checkedOn || "")}</span>. אם משהו השתנה, ${link}</span>`;
}

function faqHtml(data, items) {
  const guidesById = new Map(data.guides.map((g) => [g.id, g]));
  return (data.faq || []).filter((f) => f && f.q && f.a).map((entry) => {
    const linked = resolveLinks(entry.links, items);
    const sources = faqSources(entry, guidesById);
    const actions = linked.length || entry.guide
      ? `<div class="actions">${linked.map((l) => linkButton(l, `פתיחת ${l.label}`)).join("")}${entry.guide ? `<a class="btn" href="${guideHref(entry.guide)}">למדריך המלא</a>` : ""}</div>`
      : "";
    return `<li data-pre><details><summary><h3>${esc(entry.q)}</h3></summary><div class="faq-a"><p>${bidi(entry.a)}</p>${entry.more ? `<p class="faq-more">${bidi(entry.more)}</p>` : ""}${actions}${sources.length ? sourceLine(sources) : ""}</div></details></li>`;
  }).join("");
}

function creditHtml(site) {
  const links = [[site.authorUrl, "לינקדאין"], [site.portfolioUrl, "פורטפוליו"]].filter(([url]) => isSafeUrl(url)).map(([url, text]) => external(url, text));
  return links.length ? `<span data-pre> · ${links.join(" · ")}</span>` : "";
}

function updatedHtml(iso, year) {
  return `<p id="updated">עודכן לאחרונה ב-<time datetime="${iso}">${dmyFromIso(iso)}</time>${year ? ` · שנת הלימודים ${esc(year)}` : ""}</p>`;
}

/** A guide as renderGuideView() in index.html draws it: steps, tips, links and sources. */
/** The short name of each course category (the manifest's `short`, else its label), as the course chips show it. */
const COURSE_CATEGORY = Object.fromEntries(FACULTY.courses.categories.map((c) => [c.id, c.short || c.label]));

/** The courses page before course-browser.js takes over: every course by name, for search engines and no-JS. */
function coursesHtml(courses) {
  if (!courses || !courses.courses.length) return "";
  const rows = courses.courses.map((c) => `<li><a href="./courses?c=${esc(c.code)}">${esc(c.name)}</a> <span class="ltr">${esc(c.code)}</span>${(c.categories || []).length ? `, ${c.categories.map((id) => COURSE_CATEGORY[id]).filter(Boolean).join(", ")}` : ""}</li>`).join("");
  return `<section class="course-browser" id="course-browser" aria-label="הקורסים"><ul class="course-static">${rows}</ul></section>`;
}

/** Same as stepContent() in index.html: a link with `at` wraps that phrase of the step, the others follow as small links. */
const stepAnchor = (link, content) => (link.guide
  ? `<a class="step-link" href="${guideHref(link.guide)}" title="${esc(link.label)}">${content}</a>`
  : external(link.url, content, ` class="step-link" aria-label="${esc(`${link.label} (נפתח בלשונית חדשה)`)}"`));

function stepLinksFor(guide, n, items) {
  return ((guide.stepLinks || {})[n] || []).map((raw) => {
    const entry = raw && typeof raw === "object" ? raw : {};
    const link = resolveLinks([entry.id || raw], items)[0];
    return link && entry.at ? { ...link, at: entry.at } : link;
  }).filter(Boolean);
}

function stepContent(step, links) {
  const placed = [];
  let end = 0;
  const wanted = links.filter((l) => l.at && step.includes(l.at)).map((link) => ({ link, from: step.indexOf(link.at) })).sort((a, b) => a.from - b.from);
  for (const entry of wanted) if (entry.from >= end) { placed.push(entry); end = entry.from + entry.link.at.length; }
  let html = "";
  let pos = 0;
  for (const { link, from } of placed) {
    html += bidi(step.slice(pos, from)) + stepAnchor(link, bidi(link.at));
    pos = from + link.at.length;
  }
  html += bidi(step.slice(pos));
  const rest = links.filter((l) => !placed.some((p) => p.link === l));
  return { text: html, more: rest.length ? `<p class="step-more">${rest.map((l) => stepAnchor(l, esc(l.label))).join("")}</p>` : "" };
}

function guideViewHtml(guide, items, year, courses = null) {
  const steps = guide.steps.map((step, i) => {
    const id = `step-${guide.id}-${i}`;
    const { text, more } = stepContent(step, stepLinksFor(guide, i + 1, items));
    return `<li class="step"><input type="checkbox" id="${id}" data-n="${String(i + 1).padStart(2, "0")}" aria-label="צעד ${i + 1}"><div class="step-body"><label for="${id}">${text}</label>${more}</div></li>`;
  }).join("");
  const tips = guide.tips && guide.tips.length
    ? `<section class="tips" aria-labelledby="tips-h"><h3 id="tips-h">כדאי לדעת</h3><ul>${guide.tips.map((t) => `<li>${bidi(t)}</li>`).join("")}</ul></section>`
    : "";
  const links = resolveLinks(guide.links, items);
  const sources = (guide.sources || []).filter((s) => s && isSafeUrl(s.url));
  const checked = guide.checkedOn ? `. נבדק ב-<span class="ltr">${esc(guide.checkedOn)}</span>${year ? `, לשנת הלימודים ${esc(year)}` : ""}. אם משהו השתנה, המקור הרשמי קובע.` : "";
  return [
    `<a class="back" href="./#guides">→ כל המדריכים</a>`,
    `<h2 id="guide-title" tabindex="-1">${esc(guide.title)}</h2>`,
    guide.summary ? `<p class="guide-summary">${bidi(guide.summary)}</p>` : "",
    guide.map && isSafeUrl(guide.map.url) && isSafeUrl(guide.map.embed)
      ? `<section class="guide-map" aria-label="מפה"><div class="actions">${linkButton({ url: guide.map.url }, guide.map.label || "פתיחה בגוגל מפות")}</div></section>` : "",
    guide.courses ? coursesHtml(courses) : "",
    `<p class="steps-progress"><span>אפשר לסמן כל צעד שסיימתם. הסימון נשמר במכשיר הזה.</span></p>`,
    `<ol class="steps">${steps}</ol>`,
    tips,
    links.length ? `<div class="actions">${links.map((l) => linkButton(l, l.label)).join("")}</div>` : "",
    sources.length ? sourceLine(sources, checked) : "",
  ].join("");
}

// ---------- <head>: title, description, canonical, link preview, JSON-LD ----------

const jsonLd = (graph) => `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c")}</script>`;

function headHtml({ title, description, url, type, modified, graph }) {
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">`,
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(OG_IMAGE.url)}">`,
    `<meta property="og:image:width" content="${OG_IMAGE.width}">`,
    `<meta property="og:image:height" content="${OG_IMAGE.height}">`,
    `<meta property="og:image:alt" content="${esc(OG_IMAGE.alt)}">`,
    `<meta property="og:locale" content="he_IL">`,
    type === "article" ? `<meta property="article:modified_time" content="${modified}">` : "",
    `<meta name="twitter:card" content="summary">`,
    jsonLd(graph),
  ].filter(Boolean).join("\n");
}

function personNode(site) {
  const sameAs = [site.authorUrl, site.portfolioUrl].filter(isSafeUrl);
  return {
    "@type": "Person",
    "@id": `${SITE_URL}/#author`,
    name: site.author || "רועי כרמלי",
    alternateName: "Roy Carmelli",
    description: `מי שבנה את ${BRAND}, האתר ל${AUDIENCE.people} בבר אילן.`,
    ...(sameAs.length ? { url: sameAs[0], sameAs } : {}),
  };
}

function websiteNode(description) {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    alternateName: BRAND,
    description,
    inLanguage: "he",
    creator: { "@id": `${SITE_URL}/#author` },
    publisher: { "@id": `${SITE_URL}/#author` },
    about: { "@id": BIU["@id"] },
  };
}

// Real happenings with a time and a place (exams, the career fair). Deadlines and holidays are not
// events, so they stay as <time> elements in the calendar instead of being marked up as Event.
function eventNodes(data) {
  return data.calendar.events
    .filter((ev) => ev && ISO_DATE.test(ev.date || "") && (/^בחינה:/.test(ev.title) || /יריד/.test(ev.title)))
    .map((ev) => ({
      "@type": "Event",
      name: ev.title,
      startDate: ev.time ? `${ev.date}T${ev.time.padStart(5, "0")}:00${israelOffset(ev.date)}` : ev.date,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: { "@type": "Place", name: "אוניברסיטת בר-אילן" },
      organizer: { "@id": BIU["@id"] },
      description: `מתוך לוח השנה של ${AUDIENCE.scope} בבר אילן, ${data.calendar.title || ""}. הלוח הרשמי של האוניברסיטה קובע.`,
      url: `${SITE_URL}/#calendar`,
    }));
}

const faqAnswerText = (f) => [f.a, f.more].filter(Boolean).join(" ");

/** The manifest's home description with {year} filled from data.js (or dropped, with its space, when there is no year). */
export function homeDescription(year) {
  return `${FACULTY.site.description.replace(/ ?\{year\}/g, year ? ` ${year}` : "")} ${NOT_OFFICIAL}`;
}

function homeHead(data, updated) {
  const description = homeDescription(data.site.academicYear || "");
  const url = `${SITE_URL}/`;
  const graph = [
    websiteNode(description),
    personNode(data.site),
    BIU,
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url,
      name: HOME_TITLE,
      description,
      inLanguage: "he",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": BIU["@id"] },
      author: { "@id": `${SITE_URL}/#author` },
      dateModified: updated,
      primaryImageOfPage: { "@type": "ImageObject", url: OG_IMAGE.url, width: OG_IMAGE.width, height: OG_IMAGE.height },
      hasPart: { "@id": `${SITE_URL}/#faq` },
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      url: `${SITE_URL}/#faq`,
      name: `שאלות נפוצות של ${AUDIENCE.people} בבר אילן`,
      inLanguage: "he",
      isPartOf: { "@id": `${SITE_URL}/#webpage` },
      dateModified: updated,
      mainEntity: (data.faq || []).filter((f) => f && f.q && f.a).map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: faqAnswerText(f) },
      })),
    },
    {
      "@type": "ItemList",
      "@id": `${SITE_URL}/#guides`,
      name: `מדריכים ל${AUDIENCE.scope} בבר אילן`,
      itemListElement: data.guides.map((g, i) => ({ "@type": "ListItem", position: i + 1, name: g.title, url: guideUrl(g.id) })),
    },
    ...eventNodes(data),
  ];
  return headHtml({ title: HOME_TITLE, description, url, type: "website", modified: updated, graph });
}

/** Same format as guideTitle() in index.html, so the title doesn't change when the script runs. */
export const guidePageTitle = (guide) => `${guide.title} - בר אילן | ${BRAND}`;

function guideHead(data, guide, updated) {
  const url = guideUrl(guide.id);
  const modified = isoFromDmy(guide.checkedOn) || updated;
  const description = `${guide.summary || guide.title} מדריך צעד אחר צעד ל${AUDIENCE.people} בבר אילן, מתוך האתרים הרשמיים. ${NOT_OFFICIAL}`;
  const title = guidePageTitle(guide);
  const sources = (guide.sources || []).filter((s) => s && isSafeUrl(s.url));
  const graph = [
    websiteNode(`מרכז מידע ל${AUDIENCE.people} בבר אילן. ${NOT_OFFICIAL}`),
    personNode(data.site),
    BIU,
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: title,
      description,
      inLanguage: "he",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": BIU["@id"] },
      author: { "@id": `${SITE_URL}/#author` },
      dateModified: modified,
      breadcrumb: { "@id": `${url}#breadcrumb` },
      mainEntity: { "@id": `${url}#howto` },
      citation: sources.map((s) => ({ "@type": "WebPage", name: s.label, url: s.url })),
    },
    {
      "@type": "HowTo",
      "@id": `${url}#howto`,
      name: guide.title,
      description: guide.summary || guide.title,
      inLanguage: "he",
      step: guide.steps.map((text, i) => ({ "@type": "HowToStep", position: i + 1, text })),
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: guide.title, item: url },
      ],
    },
  ];
  return headHtml({ title, description, url, type: "article", modified, graph });
}

// ---------- Pages ----------

function fill(html, marker, content) {
  const tag = `<!-- ${marker} -->`;
  if (html.split(tag).length !== 2) throw new Error(`prerender: index.html should have exactly one ${tag}`);
  return html.replace(tag, () => content);
}

function swap(html, from, to) {
  if (html.split(from).length !== 2) throw new Error(`prerender: index.html should have exactly one ${from}`);
  return html.replace(from, () => to);
}

function withHead(html, head) {
  const start = html.indexOf("<!-- seo:head");
  const end = html.indexOf("<!-- /seo:head -->");
  if (start < 0 || end < start) throw new Error("prerender: index.html is missing the <!-- seo:head --> block");
  return html.slice(0, start) + head + html.slice(end + "<!-- /seo:head -->".length);
}

// ---------- The faculty's look: accent colors and the hero (MULTI-FACULTY-PLAN.md D6, D8) ----------

const CSS_VAR = { accent: "--accent", accentHover: "--accent-hover", accentInk: "--accent-ink", accentText: "--accent-text", accentSoft: "--accent-soft", focus: "--focus" };
// A whole line holding only the six variables: the :root blocks. The memorial-day override (one line with its selector) is not touched.
const ACCENT_LINE_RE = new RegExp(`^([ \\t]*)${THEME_KEYS.map((key) => `${CSS_VAR[key]}: #[0-9a-f]{6};`).join(" ")}[ \\t]*$`, "gm");
const DARK_SPLIT = "@media (prefers-color-scheme: dark)";

/** The six accent variables of one mode as they appear on their line in index.html. */
export const accentLine = (mode) => THEME_KEYS.map((key) => `${CSS_VAR[key]}: ${mode[key]};`).join(" ");

/** The accent set of the manifest written into the :root blocks: the light one before the dark-mode media query, the two dark ones after it. */
export function withTheme(html, theme) {
  const split = html.indexOf(DARK_SPLIT);
  if (split < 0) throw new Error(`prerender: index.html is missing ${DARK_SPLIT}`);
  const light = html.slice(0, split);
  const dark = html.slice(split);
  if ((light.match(ACCENT_LINE_RE) || []).length !== 1) throw new Error("prerender: index.html should have exactly one light accent line before the dark-mode block");
  if ((dark.match(ACCENT_LINE_RE) || []).length !== 2) throw new Error("prerender: index.html should have exactly two dark accent lines (media query and data-theme)");
  return light.replace(ACCENT_LINE_RE, (m, indent) => indent + accentLine(theme.light)) + dark.replace(ACCENT_LINE_RE, (m, indent) => indent + accentLine(theme.dark));
}

// The hero block of index.html: the switch point for the variants (D8). The template holds the CS terminal,
// so the terminal renderer fills its bar label and typed lines; the EEG variant renders its own markup (the
// same window, a trace that draws itself, then the typed lines) in place of the whole block.
const HERO_BLOCK_RE = /<div class="term" dir="ltr" aria-hidden="true">[\s\S]*?<\/pre>\s*<\/div>/g;
const TERM_BAR_RE = /(<div class="term-bar"><i><\/i><i><\/i><i><\/i><span>)[^<]*(<\/span><\/div>)/g;
const TERM_BODY_RE = /<pre class="term-body">[\s\S]*?<\/pre>/g;

/** Text inside an element: only the three characters that would start markup (quotes stay, the lines show them). */
const escText = (text) => String(text ?? "").replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[ch]);
/** 0.3 -> ".3s", 1 -> "1s", 1.4 -> "1.4s": the CSS time as index.html writes it. */
const seconds = (value) => `${String(value).replace(/^0\./, ".")}s`;
function tokenHtml(token) {
  if (!Array.isArray(token)) return escText(token);
  if (!TERMINAL_TOKEN_KINDS.includes(token[0])) throw new Error(`prerender: unknown terminal token kind "${token[0]}"`);
  return `<span class="t-${token[0]}">${escText(token[1])}</span>`;
}

/** One typed line: its typing steps and timing as custom properties, its tokens, and the blinking caret on the last line. */
function terminalLine({ steps, start, duration, tokens }, last) {
  // The manifest is validated (faculties/index.js), but the numbers land in a style attribute, so they are checked here too.
  if (!Number.isInteger(steps) || !Number.isFinite(start) || (duration !== undefined && !Number.isFinite(duration))) throw new Error("prerender: a hero line needs whole steps and numeric start and duration");
  const timing = `--n:${steps};--at:${seconds(start)}${duration === undefined ? "" : `;--d:${seconds(duration)}`}`;
  return `<span class="ln" style="${timing}">${tokens.map(tokenHtml).join("")}${last ? '<span class="t-caret"></span>' : ""}</span>`;
}

function terminalHero(block, hero) {
  if ((block.match(TERM_BAR_RE) || []).length !== 1 || (block.match(TERM_BODY_RE) || []).length !== 1) throw new Error("prerender: the hero block of index.html should hold one terminal bar and one terminal body");
  const body = hero.lines.map((line, i) => terminalLine(line, i === hero.lines.length - 1)).join("");
  return block.replace(TERM_BAR_RE, (m, open, close) => `${open}${esc(hero.path)}${close}`).replace(TERM_BODY_RE, `<pre class="term-body">${body}</pre>`);
}

/**
 * The EEG trace (index.html styles .term-eeg .eeg): a flat line with spikes across the window's width, drawn in
 * the accent color by a stroke-dashoffset animation. pathLength fixes the dash length whatever the real length.
 */
const EEG_PATH = "M0 12 H58 L64 5 L70 19 L76 12 H140 L146 8 L150 16 L154 12 H224 L230 2 L236 22 L242 12 H318 L324 9 L328 15 L332 12 H398 L404 4 L410 20 L416 12 H480";

function eegHero(block, hero) {
  const body = hero.lines.map((line, i) => terminalLine(line, i === hero.lines.length - 1)).join("");
  return [
    `<div class="term term-eeg" dir="ltr" aria-hidden="true">`,
    `<div class="term-bar"><i></i><i></i><i></i><span>${esc(hero.path)}</span></div>`,
    `<pre class="term-body"><svg class="eeg" viewBox="0 0 480 24" preserveAspectRatio="none" focusable="false"><path d="${EEG_PATH}" pathLength="1000"/></svg>${body}</pre>`,
    `</div>`,
  ].join("");
}

const HERO_RENDERERS = { terminal: terminalHero, eeg: eegHero };

/** The hero of the manifest written into index.html's hero block: the variant picks the renderer. */
export function withHero(html, hero) {
  const render = HERO_RENDERERS[hero.variant];
  if (!render || !HERO_VARIANTS.includes(hero.variant)) throw new Error(`prerender: unknown hero variant "${hero.variant}"`);
  if ((html.match(HERO_BLOCK_RE) || []).length !== 1) throw new Error("prerender: index.html should have exactly one hero block");
  return html.replace(HERO_BLOCK_RE, (block) => render(block, hero));
}

// The brand block of index.html: the site's name in its H1 (the template keeps the CS one so the file opens locally).
const BRAND_H1_RE = /(<div class="brand">[\s\S]*?<h1>)[^<]*(<\/h1>)/g;

/** The site name of the manifest written into the H1 of the brand block. */
export function withSiteName(html, name) {
  if ((html.match(BRAND_H1_RE) || []).length !== 1) throw new Error("prerender: index.html should have exactly one <h1> in the brand block");
  return html.replace(BRAND_H1_RE, (m, open, close) => `${open}${escText(name)}${close}`);
}

// The tagline under the brand (site.tagline), before the "add to home screen" button; the template keeps the CS one.
const TAGLINE_RE = /(<p class="tagline">)[^<]*( <button class="install-btn")/g;

/** The manifest's tagline written under the brand. */
export function withTagline(html, tagline) {
  if ((html.match(TAGLINE_RE) || []).length !== 1) throw new Error("prerender: index.html should have exactly one tagline before the install button");
  return html.replace(TAGLINE_RE, (m, open, close) => `${open}${escText(tagline)}${close}`);
}

// The status label of the "now" box, written by the page script in the chat path's style ("~/year-1 › status").
const STATUS_LABEL_RE = /(el\("span", \{ text: )"~\/year-1 › status"( \}\))/g;
// A JS string literal inside the page script: JSON escaping plus "<" as \u003c, so no value can close the script.
const jsString = (text) => JSON.stringify(text).replace(/</g, "\\u003c");

/** The chat path of the manifest (labels.chatPath) written into the status label of the "now" box. */
export function withStatusPath(html, chatPath) {
  if ((html.match(STATUS_LABEL_RE) || []).length !== 1) throw new Error("prerender: index.html should have exactly one status label in the page script");
  return html.replace(STATUS_LABEL_RE, (m, open, close) => `${open}${jsString(`${chatPath} › status`)}${close}`);
}

// The hero illustration (site.heroArt): the round avatar next to the brand on phones and the picture next to the
// hero on wide screens. The template holds the CS files, which the build publishes under assets/ by their names.
const BRAND_AVATAR_RE = /(<img class="brand-avatar" src=")[^"]*(")/g;
const HERO_ART_RE = /(<div class="hero-art">\s*<img )src="[^"]*" alt="[^"]*" width="\d+" height="\d+"/g;

/** The manifest's hero art written into the brand avatar and the hero picture. */
export function withHeroArt(html, art) {
  if (!Number.isInteger(art.width) || !Number.isInteger(art.height)) throw new Error("prerender: site.heroArt needs whole-number width and height");
  if ((html.match(BRAND_AVATAR_RE) || []).length !== 1 || (html.match(HERO_ART_RE) || []).length !== 1) throw new Error("prerender: index.html should have exactly one brand avatar and one hero picture");
  return html
    .replace(BRAND_AVATAR_RE, (m, open, close) => `${open}./assets/${esc(art.avatar)}${close}`)
    .replace(HERO_ART_RE, (m, open) => `${open}src="./assets/${esc(art.file)}" alt="${esc(art.alt)}" width="${art.width}" height="${art.height}"`);
}

// The <html> tag: a flag the stylesheet reads (index.html) when the manifest asks for the dark-mode mascot shadow.
const HTML_TAG = `<html lang="he" dir="rtl"`;

/** The mascot-shadow flag of the manifest (theme.mascotShadow) as a data attribute on <html>, or the page as is. */
export function withMascotShadow(html, on) {
  if (html.split(HTML_TAG).length !== 2) throw new Error(`prerender: index.html should have exactly one ${HTML_TAG}`);
  return on ? html.replace(HTML_TAG, () => `${HTML_TAG} data-mascot-shadow`) : html;
}

/**
 * The manifest's design elements (decor, faculties/index.js DECOR_STYLES) as data-decor-<place>="<style>" attributes on
 * <html>, in the vocabulary's order; index.html's stylesheet draws each one. No decor gives the page back as is.
 */
export function withDecor(html, decor = {}) {
  if (html.split(HTML_TAG).length !== 2) throw new Error(`prerender: index.html should have exactly one ${HTML_TAG}`);
  const attrs = Object.keys(DECOR_STYLES).filter((place) => decor[place] !== undefined).map((place) => {
    // Validated with the manifest, checked again because the value lands in an attribute.
    if (typeof decor[place] !== "string" || !Object.hasOwn(DECOR_STYLES[place], decor[place])) throw new Error(`prerender: unknown decor ${place} "${decor[place]}"`);
    return ` data-decor-${place}="${decor[place]}"`;
  });
  return attrs.length ? html.replace(HTML_TAG, () => `${HTML_TAG}${attrs.join("")}`) : html;
}

function common(html, data, updated) {
  html = withTheme(html, FACULTY.theme);
  html = withMascotShadow(html, FACULTY.theme.mascotShadow === true);
  html = withDecor(html, FACULTY.decor);
  html = withHero(html, FACULTY.hero);
  html = withHeroArt(html, FACULTY.site.heroArt);
  html = withSiteName(html, SITE_NAME);
  html = withTagline(html, FACULTY.site.tagline);
  html = withStatusPath(html, FACULTY.labels.chatPath);
  html = fill(html, "pre:credit", creditHtml(data.site || {}));
  return fill(html, "pre:updated", updatedHtml(updated, data.site.academicYear));
}

export function homePage(template, data, updated) {
  const items = itemsById(data);
  let html = withHead(template, homeHead(data, updated));
  html = fill(html, "pre:featured", featuredHtml(data, items));
  html = fill(html, "pre:guides-count", `<span class="count" aria-hidden="true" data-pre>${data.guides.length}</span>`);
  html = fill(html, "pre:guides", guideCardsHtml(data));
  html = swap(html, `<section class="section" id="guides" aria-labelledby="guides-h" hidden>`, `<section class="section" id="guides" aria-labelledby="guides-h">`);
  html = fill(html, "pre:categories", categoriesHtml(data));
  html = fill(html, "pre:calendar-title", esc(data.calendar.title || "לוח השנה האקדמי"));
  html = fill(html, "pre:timeline", timelineHtml(data));
  html = fill(html, "pre:cal-source", calSourceHtml(data.calendar));
  html = fill(html, "pre:faq", faqHtml(data, items));
  html = fill(html, "pre:guide", "");
  return common(html, data, updated);
}

/** A guide's own page: the same page, opened on the guide, as /#guide-<id> used to look. */
export function guidePage(template, data, guide, updated, courses = null) {
  const items = itemsById(data);
  let html = withHead(template, guideHead(data, guide, updated));
  html = swap(html, `<html lang="he" dir="rtl">`, `<html lang="he" dir="rtl" data-home-title="${esc(HOME_TITLE)}">`);
  for (const marker of ["pre:featured", "pre:guides-count", "pre:guides", "pre:categories", "pre:calendar-title", "pre:timeline", "pre:cal-source", "pre:faq"]) html = fill(html, marker, "");
  html = swap(html, `<div id="jump-nav">`, `<div id="jump-nav" hidden>`);
  html = swap(html, `<div class="layout">`, `<div class="layout" hidden>`);
  html = swap(html, `<article class="guide-view" id="guide-view" hidden>`, `<article class="guide-view" id="guide-view">`);
  html = fill(html, "pre:guide", guideViewHtml(guide, items, data.site.academicYear, courses));
  return common(html, data, updated);
}

const SITEMAP_LINE_RE = /^Sitemap: https:\/\/\S+$/gm;

/** robots.txt with its Sitemap line pointing at this faculty's address (the file in the repo names the CS one). */
export function robotsTxt(text) {
  if ((text.match(SITEMAP_LINE_RE) || []).length !== 1) throw new Error("prerender: robots.txt should have exactly one Sitemap line");
  return text.replace(SITEMAP_LINE_RE, `Sitemap: ${SITE_URL}/sitemap.xml`);
}

export function sitemapXml(data, updated) {
  const urls = [{ loc: `${SITE_URL}/`, lastmod: updated }, ...data.guides.map((g) => ({ loc: guideUrl(g.id), lastmod: isoFromDmy(g.checkedOn) || updated }))];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(u.loc)}</loc><lastmod>${u.lastmod}</lastmod></url>`).join("\n")}\n</urlset>\n`;
}

// llms.txt: a plain map of the site for AI assistants (llmstxt.org), with the same disclaimer.
export function llmsTxt(data, updated) {
  const year = data.site.academicYear || "";
  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> מרכז מידע ל${AUDIENCE.people} באוניברסיטת בר-אילן${year ? `, שנת הלימודים ${year}` : ""}. ${NOT_OFFICIAL} נבנה על ידי ${data.site.author || "רועי כרמלי"}. כל מדריך מבוסס על דפי האוניברסיטה הרשמיים ומקשר אליהם, ואם משהו השתנה, המקור הרשמי קובע.`,
    "",
    `עודכן לאחרונה: ${updated}`,
    "",
    "## מדריכים",
    "",
    ...data.guides.map((g) => `- [${g.title}](${guideUrl(g.id)}): ${g.summary || ""}${g.checkedOn ? ` (נבדק ב-${g.checkedOn})` : ""}`),
    "",
    "## בעמוד הבית",
    "",
    `- [${data.calendar.title || "לוח השנה האקדמי"}](${SITE_URL}/#calendar): סמסטרים, חופשות, מועדי תשלום ותאריכי הבחינות של ${AUDIENCE.scopeShort}.`,
    `- [שאלות נפוצות](${SITE_URL}/#faq): ${(data.faq || []).length} שאלות עם תשובות קצרות ומקורות.`,
    `- [קישורים](${SITE_URL}/#categories): אתרי האוניברסיטה, חומרי לימוד וקבוצות הוואטסאפ של ${AUDIENCE.scopeShort}.`,
    "",
    "## מקורות רשמיים",
    "",
    ...(isSafeUrl(data.calendar.sourceUrl) ? [`- [לוח הזמנים האקדמי הרשמי](${data.calendar.sourceUrl})`] : []),
    "- [אתר אוניברסיטת בר-אילן](https://www.biu.ac.il/)",
    `- [${FACULTY.department.name}](${FACULTY.department.url})`,
    "",
  ];
  return lines.join("\n");
}
