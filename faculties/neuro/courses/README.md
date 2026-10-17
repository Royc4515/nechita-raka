> **Neuro scan status (18.10.2026):** `catalog.json` is the real scan of the brain sciences department (catalog department id 96, course code prefix 27, 121 rows, 60 courses, complete, scraped 14.10.2026 by Roy). `yearbook.json` is still a placeholder with no categories; the neuro content PR builds it from the track study-plan pages listed in `management/neuro/programs.md`. The rest of this file is the CS procedure and applies to neuro with department 96 instead of 84.

# Course files of the brain sciences faculty (placeholder)

`catalog.json` and `yearbook.json` here are copies of the CS files (`faculties/cs/courses/`), so that
`FACULTY=neuro npm run build` has a course list to publish. They are placeholders: every course is a
CS course. Faculty PR 6 replaces them with a scan over the departments that teach into the brain
sciences tracks, following the rules in `faculties/cs/courses/README.md`.
