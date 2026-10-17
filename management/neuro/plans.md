# Brain sciences study plans, parsed 18.10.2026

Source: the חוקה PDFs linked from each track's study-plan page on gondabrain.biu.ac.il (29 files, three cohorts, downloaded with `faculties/neuro/courses/tools/fetch-plans.mjs`). Data: `faculties/neuro/courses/plans.json` (every cohort) and `faculties/neuro/courses/yearbook.json` (the effective תשפ"ז mapping).

## The rule

A student follows the plan of the year they started. So the תשפ"ז site maps year 1 from the תשפ"ז plan, year 2 from the תשפ"ו plan and year 3 from the תשפ"ה plan. Each track has two תשפ"ו PDFs: the original ("סופי" or "מעודכן") and one named "מעודכן לפי תוכנית לימודים תשפ"ז", which the Gonda pages list first; the mapping uses the updated one, which Roy confirmed on 18.10.2026 is the plan that binds תשפ"ו students (Q10 in programs.md).

## Caveats

- The PDF text has no year headings. Double majors: years come from block order (a brain-sciences block then the partner's block, per year). Single major: from the department code numbering (27-2xx year 1, 27-3xx year 2, 27-4xx year 3). `yearSource` on every course says which. Verify against the PDFs before launch.
- The computational single-major track has no PDF of its own (its תשפ"ז link is the single-major file); its year-1 differences are on the HTML page /computaional_track and still need to be read. The mapping gives it year 1 only.
- Partner-department codes (89, 60, 80, 86, 31, 37) are in the mapping but not in the department-27 catalog, so they do not show on the site until those catalogs are scanned. Four-digit partner codes (86-2073 versus 86-207) are ambiguous in the flattened text; the physics diff below shows that artifact.
- 19 catalog courses have no plan entry: department hours (27223, 27360, 27410), electives and workshops (274xx, 27456 to 27476), graduate seminars (275xxx), and 27216 (פרקים במדעי המוח 2), which no PDF lists.

Picks for the effective 5787 yearbook:
- biology y1 <- 5787: 15 courses
- biology y2 <- 5786-updated: 17 courses
- biology y3 <- 5785: 13 courses
- cs y1 <- 5787: 17 courses
- cs y2 <- 5786-updated: 12 courses
- cs y3 <- 5785: 17 courses
- linguistics y1 <- 5787: 18 courses
- linguistics y2 <- 5786-updated: 12 courses
- linguistics y3 <- 5785: 12 courses
- philosophy y1 <- 5787: 16 courses
- philosophy y2 <- 5786-updated: 13 courses
- philosophy y3 <- 5785: 7 courses
- physics y1 <- 5787: 15 courses
- physics y2 <- 5786-updated: 16 courses
- physics y3 <- 5785: 15 courses
- psychology y1 <- 5787: 17 courses
- psychology y2 <- 5786-updated: 17 courses
- psychology y3 <- 5785: 8 courses
- single y1 <- 5787: 31 courses
- single y2 <- 5786-updated: 14 courses
- single y3 <- 5785: 12 courses
- single-comp y1 <- 5787: 31 courses

5786 variants (the first link on each page is the plan updated per 5787):
- biology: 5786-updated shares 41 codes with 5787, 5786-original shares 39
- cs: 5786-updated shares 42 codes with 5787, 5786-original shares 41
- linguistics: 5786-updated shares 37 codes with 5787, 5786-original shares 37
- philosophy: 5786-updated shares 32 codes with 5787, 5786-original shares 30
- physics: 5786-updated shares 37 codes with 5787, 5786-original shares 39 (UNEXPECTED: original closer to 5787)
- psychology: 5786-updated shares 37 codes with 5787, 5786-original shares 36
- single: 5786-updated shares 48 codes with 5787, 5786-original shares 43

## biology (מדעי המוח ומדעי החיים)
- 5785: 42 courses (y1: 14, y2: 15, y3: 13); 21 partner-department courses with raw names only
- 5786-original: 41 courses (y1: 14, y2: 15, y3: 12); 18 partner-department courses with raw names only
- 5786-updated: 45 courses (y1: 17, y2: 17, y3: 11); 20 partner-department courses with raw names only
- 5787: 43 courses (y1: 15, y2: 17, y3: 11); 17 partner-department courses with raw names only
  - 5785 → 5786-original: added 27-2011, 27-2012; removed 80-1211, 80-1351, 80-1231
  - 5786-original → 5786-updated: added 80-1211, 80-1231, 80-1351, 27-361, 27-362; removed 27-316, 27-434
  - 5786-updated → 5787: added 27-231; removed 80-1211, 80-1231, 80-1351

## cs (מדעי המוח ומדעי המחשב)
- 5785: 45 courses (y1: 15, y2: 13, y3: 17); 24 partner-department courses with raw names only
- 5786-original: 46 courses (y1: 16, y2: 11, y3: 19); 28 partner-department courses with raw names only
- 5786-updated: 47 courses (y1: 16, y2: 12, y3: 19); 28 partner-department courses with raw names only
- 5787: 47 courses (y1: 17, y2: 13, y3: 17); 28 partner-department courses with raw names only
  - 5785 → 5786-original: added 89-112, 89-1262, 89-113, 89-263; removed 27-209, 27-208, 27-213
  - 5786-original → 5786-updated: added 27-362; removed 27-434
  - 5786-updated → 5787: added 27-231, 86-147, 86-148, 27-468; removed 27-2012, 27-211, 27-207, 80-208

## linguistics (מדעי המוח ובלשנות)
- 5785: 40 courses (y1: 18, y2: 10, y3: 12); 18 partner-department courses with raw names only
- 5786-original: 40 courses (y1: 18, y2: 11, y3: 11); 18 partner-department courses with raw names only
- 5786-updated: 40 courses (y1: 18, y2: 12, y3: 10); 17 partner-department courses with raw names only
- 5787: 40 courses (y1: 18, y2: 12, y3: 10); 17 partner-department courses with raw names only
  - 5785 → 5786-original: added none; removed none
  - 5786-original → 5786-updated: added 27-361, 27-362; removed 27-316, 27-434
  - 5786-updated → 5787: added 27-231, 27-316; removed 27-211, 27-361

## philosophy (מדעי המוח ופילוסופיה)
- 5785: 33 courses (y1: 16, y2: 10, y3: 7); 10 partner-department courses with raw names only
- 5786-original: 33 courses (y1: 16, y2: 11, y3: 6); 10 partner-department courses with raw names only
- 5786-updated: 34 courses (y1: 16, y2: 13, y3: 5); 9 partner-department courses with raw names only
- 5787: 34 courses (y1: 16, y2: 13, y3: 5); 8 partner-department courses with raw names only
  - 5785 → 5786-original: added none; removed none
  - 5786-original → 5786-updated: added 27-361, 27-362; removed 27-316, 27-434
  - 5786-updated → 5787: added 27-231; removed 27-211

## physics (מדעי המוח ופיזיקה)
- 5785: 43 courses (y1: 15, y2: 13, y3: 15); 28 partner-department courses with raw names only
- 5786-original: 42 courses (y1: 15, y2: 13, y3: 14); 27 partner-department courses with raw names only
- 5786-updated: 43 courses (y1: 15, y2: 16, y3: 12); 27 partner-department courses with raw names only
- 5787: 43 courses (y1: 15, y2: 16, y3: 12); 26 partner-department courses with raw names only
  - 5785 → 5786-original: added none; removed 27-437
  - 5786-original → 5786-updated: added 27-362, 86-207, 86-208, 86-215; removed 86-2073, 86-2084, 86-2151, 27-434
  - 5786-updated → 5787: added 27-231, 27-468, 86-2073, 86-2084, 86-2151; removed 27-2012, 27-211, 86-207, 86-208, 86-215

## psychology (מדעי המוח ופסיכולוגיה)
- 5785: 41 courses (y1: 17, y2: 16, y3: 8); 22 partner-department courses with raw names only
- 5786-original: 41 courses (y1: 17, y2: 16, y3: 8); 22 partner-department courses with raw names only
- 5786-updated: 42 courses (y1: 17, y2: 17, y3: 8); 22 partner-department courses with raw names only
- 5787: 42 courses (y1: 17, y2: 17, y3: 8); 21 partner-department courses with raw names only
  - 5785 → 5786-original: added none; removed none
  - 5786-original → 5786-updated: added 27-362; removed 27-434
  - 5786-updated → 5787: added 27-231; removed 27-211

## single (מדעי המוח חד-חוגי)
- 5785: 63 courses (y1: 38, y2: 13, y3: 12); 17 partner-department courses with raw names only
- 5786-original: 64 courses (y1: 38, y2: 13, y3: 13); 17 partner-department courses with raw names only
- 5786-updated: 66 courses (y1: 38, y2: 14, y3: 14); 16 partner-department courses with raw names only
- 5787: 60 courses (y1: 31, y2: 12, y3: 17); 20 partner-department courses with raw names only
  - 5785 → 5786-original: added 27-4470; removed none
  - 5786-original → 5786-updated: added 27-361, 27-362, 60-305, 60-306, 27-4481; removed 27-316, 60-212, 60-213, 27-434
  - 5786-updated → 5787: added 27-231, 86-147, 86-148, 86-153, 27-230, 27-232, 27-468, 27-504, 27-505, 27-5020, 27-5054; removed 27-211

## single-comp (מדעי המוח חד-חוגי, מגמה חישובית)
- 5787: 60 courses (y1: 31, y2: 12, y3: 17); 20 partner-department courses with raw names only
