// Downloads the brain-sciences study-plan PDFs (חוקה תשפ"ה / תשפ"ו / תשפ"ז) from Gonda.
// Node 24, no dependencies. Run: node fetch-plans.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PLANS_DIR = join(HERE, 'plans');
const MANIFEST_PATH = join(HERE, 'manifest.json');
const BASE = 'https://gondabrain.biu.ac.il';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const DELAY_MS = 1500;

const TRACKS = [
  { track: 'single', paths: ['/Extended%20track', '/biology_cognition_track'] },
  { track: 'single-comp', paths: ['/computaional_track'] },
  { track: 'cs', paths: ['/double.major_computer.science'] },
  { track: 'psychology', paths: ['/neuroscience_and_psychology_CL'] },
  { track: 'biology', paths: ['/neuroscience_and_biology_CL'] },
  { track: 'philosophy', paths: ['/double.track_philosophy'] },
  { track: 'linguistics', paths: ['/neuroscience_and_linguistics_cl'] },
  { track: 'physics', paths: ['/neuroscience_and_physics_cl'] },
];

// Hebrew year letters: ה = 5785, ו = 5786, ז = 5787.
const YEARS = [
  { year: 5785, heb: 'ה', lat: 'h' },
  { year: 5786, heb: 'ו', lat: 'v' },
  { year: 5787, heb: 'ז', lat: 'z' },
];
// Quote variants: ASCII " , gershayim U+05F4, ASCII ', geresh U+05F3.
const YEAR_RES = YEARS.map(({ year, heb, lat }) => ({
  year,
  res: [
    new RegExp(`תשפ["״'׳]?${heb}`),
    new RegExp(`tashpa[\\s_.-]*${lat}(?![a-z])`, 'i'),
    new RegExp(String(year)),
  ],
}));

class StopRun extends Error {}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let lastStart = 0;

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function yearOf(text) {
  const decoded = safeDecode(text);
  for (const { year, res } of YEAR_RES) {
    if (res.some((re) => re.test(decoded))) return year;
  }
  return null;
}

const NAMED_ENTITIES = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body) => {
    if (body[0] === '#') {
      const cp = body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return cp <= 0x10ffff ? String.fromCodePoint(cp) : match;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

function extractLinks(html, pageUrl) {
  const links = [];
  const re = /<a\b[^>]*?\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a\s*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const href = decodeEntities(m[2]).trim();
    const text = decodeEntities(m[3].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    try {
      links.push({ url: new URL(href, pageUrl).href, text });
    } catch {
      // malformed href: skip
    }
  }
  return links;
}

const PLAN_PAGE_PATHS = new Set(TRACKS.flatMap(({ paths }) => paths.map((p) => safeDecode(p))));

// Navigation links to the study-plan pages themselves (e.g. the single track's
// second page linking back to its own plan) match the text rule but are not PDFs.
function isPlanPage(url) {
  return PLAN_PAGE_PATHS.has(safeDecode(new URL(url).pathname));
}

function isCandidate(link) {
  const path = safeDecode(new URL(link.url).pathname).toLowerCase();
  const matches = path.endsWith('.pdf') || link.text.includes('חוקה') || link.text.includes('תוכנית לימודים');
  return matches && !isPlanPage(link.url);
}

async function politeGet(url, accept) {
  const wait = lastStart + DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastStart = Date.now();
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: accept, 'Accept-Language': 'he,en;q=0.8' },
  });
  if (res.status === 403 || res.status === 429) {
    throw new StopRun(`HTTP ${res.status} from ${url}`);
  }
  return res;
}

async function fetchHtml(url) {
  const res = await politeGet(url, 'text/html,application/xhtml+xml');
  if (!res.ok) throw new Error(`HTTP ${res.status} for page ${url}`);
  return res.text();
}

async function fetchPdf(url) {
  const res = await politeGet(url, 'application/pdf,*/*;q=0.8');
  if (!res.ok) return { error: `HTTP ${res.status}` };
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return { buf };
  const type = res.headers.get('content-type') ?? '';
  if (/text\/html/i.test(type) || /^\s*</.test(buf.subarray(0, 64).toString('utf8'))) {
    throw new StopRun(`HTML instead of PDF from ${url} (content-type: ${type || 'none'})`);
  }
  return { error: `not a PDF (content-type: ${type || 'none'}, ${buf.length} bytes)` };
}

async function collectCandidates(track, paths, failures) {
  const found = new Map(); // pdf url -> { year, text }, deduped per track
  for (const path of paths) {
    const pageUrl = BASE + path;
    let html;
    try {
      html = await fetchHtml(pageUrl);
    } catch (err) {
      if (err instanceof StopRun) throw err;
      failures.push({ track, url: pageUrl, error: err.message });
      continue;
    }
    for (const link of extractLinks(html, pageUrl)) {
      if (found.has(link.url) || !isCandidate(link)) continue;
      const year = yearOf(link.text) ?? yearOf(link.url);
      if (year) found.set(link.url, { year, text: link.text });
    }
  }
  return found;
}

async function downloadTrack(track, found, manifest, failures) {
  const dir = join(PLANS_DIR, track);
  await mkdir(dir, { recursive: true });
  const countPerYear = new Map();
  for (const [url, { year, text }] of found) {
    const n = (countPerYear.get(year) ?? 0) + 1;
    countPerYear.set(year, n);
    const file = n === 1 ? `${year}.pdf` : `${year}-${n}.pdf`;
    console.log(`[${track}] ${year} "${text}" -> ${url}`);
    try {
      const result = await fetchPdf(url);
      if (result.error) {
        failures.push({ track, year, url, error: result.error });
        continue;
      }
      await writeFile(join(dir, file), result.buf);
      manifest.push({ track, year, link_text: text, url, file: `plans/${track}/${file}`, bytes: result.buf.length });
      console.log(`  saved ${file} (${result.buf.length} bytes)`);
    } catch (err) {
      if (err instanceof StopRun) throw err;
      failures.push({ track, year, url, error: err.message });
    }
  }
}

async function main() {
  const manifest = [];
  const failures = [];
  let stopped = null;
  try {
    const listOnly = process.argv.includes('--list');
    for (const { track, paths } of TRACKS) {
      const found = await collectCandidates(track, paths, failures);
      console.log(`[${track}] ${found.size} matching PDF link(s)`);
      if (listOnly) {
        for (const [url, { year, text }] of found) console.log(`  ${year} "${text}" -> ${url}`);
        continue;
      }
      await downloadTrack(track, found, manifest, failures);
    }
    if (listOnly) return;
  } catch (err) {
    if (!(err instanceof StopRun)) throw err;
    stopped = err.message;
  } finally {
    await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  }

  console.log('\nPer-track summary:');
  for (const { track } of TRACKS) {
    const years = [...new Set(manifest.filter((m) => m.track === track).map((m) => m.year))].sort();
    const flag = years.length < 3 ? '  <-- fewer than three years' : '';
    console.log(`${track}: ${years.join(', ') || 'none'}${flag}`);
  }
  if (failures.length) console.log('\nFailures:', JSON.stringify(failures, null, 2));
  if (stopped) {
    console.log(`\nSTOPPED: ${stopped}`);
    process.exitCode = 1;
  }
  console.log(`\nManifest entries: ${manifest.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
