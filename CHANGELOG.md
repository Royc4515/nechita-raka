# Changelog

Notable changes, newest first. The project ships continuously from `main` (no version numbers); each entry links the pull request. Content-only updates (new links, freshness passes) are summarized, not listed one by one. The full list is in the [closed pull requests](https://github.com/Royc4515/nechita-raka/pulls?q=is%3Apr+is%3Aclosed).

## Unreleased

### Changed

- Browser source moved from the repository root into [`web/`](web/); published addresses are unchanged.
- Planning documents and the Hebrew editing manual moved into [`docs/`](docs/); new English [README](README.md).

### Added

- [MIT license](LICENSE), [`.env.example`](.env.example), [contributing guide](CONTRIBUTING.md), issue and pull request templates, [`.editorconfig`](.editorconfig), [repository audit](docs/REPO_AUDIT.md).

### Removed

- `.nojekyll` and the unused `assets/soft-landing.webp`.

## November 2026

- Important notices at the top of the page, each with its own share link and preview image ([#117](https://github.com/Royc4515/nechita-raka/pull/117)).
- Monthly review, lecturer emails on both sites, smarter search and lecturer answers in the chat ([#112](https://github.com/Royc4515/nechita-raka/pull/112)).
- Freshness passes on both sites ([#113](https://github.com/Royc4515/nechita-raka/pull/113), [#116](https://github.com/Royc4515/nechita-raka/pull/116)); neuro elective-exemption rule ([#115](https://github.com/Royc4515/nechita-raka/pull/115)).

## October 2026

### Brain Sciences site

- Faculty manifest and per-faculty build: one codebase, one Vercel project per faculty ([#78](https://github.com/Royc4515/nechita-raka/pull/78), [#79](https://github.com/Royc4515/nechita-raka/pull/79), [#80](https://github.com/Royc4515/nechita-raka/pull/80), [#83](https://github.com/Royc4515/nechita-raka/pull/83)).
- Brain Sciences content, catalog, study plans, tracks and mascots נוי ורון ([#87](https://github.com/Royc4515/nechita-raka/pull/87), [#88](https://github.com/Royc4515/nechita-raka/pull/88), [#91](https://github.com/Royc4515/nechita-raka/pull/91), [#92](https://github.com/Royc4515/nechita-raka/pull/92), [#93](https://github.com/Royc4515/nechita-raka/pull/93), [#95](https://github.com/Royc4515/nechita-raka/pull/95)).
- Manifest-driven design elements and audience copy ([#96](https://github.com/Royc4515/nechita-raka/pull/96), [#99](https://github.com/Royc4515/nechita-raka/pull/99)); cross-faculty leak fixes ([#102](https://github.com/Royc4515/nechita-raka/pull/102), [#104](https://github.com/Royc4515/nechita-raka/pull/104), [#105](https://github.com/Royc4515/nechita-raka/pull/105)).
- Shabbat rest page: the site closes from candle lighting to havdalah ([#101](https://github.com/Royc4515/nechita-raka/pull/101)).

### Chat and quality

- Chat simulation script with graded runs against previews ([#70](https://github.com/Royc4515/nechita-raka/pull/70), [#71](https://github.com/Royc4515/nechita-raka/pull/71), [#100](https://github.com/Royc4515/nechita-raka/pull/100)), and the fixes they found ([#73](https://github.com/Royc4515/nechita-raka/pull/73), [#74](https://github.com/Royc4515/nechita-raka/pull/74)).
- Review ladder that picks the review tier from the touched files ([#77](https://github.com/Royc4515/nechita-raka/pull/77)).
- Courses classified by the CS yearbook ([#68](https://github.com/Royc4515/nechita-raka/pull/68)).
- AI agent organization and multi-faculty plans ([#69](https://github.com/Royc4515/nechita-raka/pull/69)).
