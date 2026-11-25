# Contributing

Thanks for helping first-year students at Bar-Ilan. This is a small, single-maintainer project, so the process is light.

## Reporting

- **Wrong or missing information** (a link, date, guide or answer): open a [content update](https://github.com/Royc4515/nechita-raka/issues/new?template=content_update.md) with an official source.
- **Something broken**: open a [bug report](https://github.com/Royc4515/nechita-raka/issues/new?template=bug_report.md).

## Editing content

Content lives in plain JavaScript files, editable straight from the GitHub web UI:

- [`shared/data.js`](shared/data.js): general Bar-Ilan content, shown on every faculty site.
- `faculties/<id>/data.js`: one faculty's content ([CS](faculties/cs/data.js), [Brain Sciences](faculties/neuro/data.js)).

The step-by-step guide, in Hebrew, is [docs/EDITING.md](docs/EDITING.md): adding an item, a category, a date, a guide, an FAQ answer, an English pair. Every fact needs an official source.

## Changing code

1. Fork, then branch from `main`.
2. Install and build both faculties (Node.js 22):

   ```bash
   npm ci
   FACULTY=cs npm run build
   FACULTY=neuro npm run build
   ```

   `npm run build` runs the content check, the test suite and the static build. CI runs the same for both faculties on every pull request.
3. Keep the conventions you see: vanilla JavaScript with no framework or bundler, small functions, comments that explain why, tests in [`api/_tests/`](api/_tests/) with the Node test runner.
4. Run `node scripts/review-tier.mjs` to see which review a change needs (the ladder is in [docs/MANAGEMENT-PLAN.md](docs/MANAGEMENT-PLAN.md)).
5. Open a pull request using the template. Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `content:`, `docs:`, `refactor:`, `chore:`).

## Ground rules

- No WhatsApp group links outside the content files; the build fails if one reaches a published file.
- No secrets in the repository. Configuration goes in Vercel environment variables (see [`.env.example`](.env.example)).
- One faculty's data never ships in another faculty's build; the faculty guard enforces it.
- Privacy first: no tracking cookies, no stored IP addresses, no stored chat questions.
