# What changed in `chore/repo-polish`

Date: 25.11.2026. Full research and findings: [docs/REPO_AUDIT.md](docs/REPO_AUDIT.md).

## What changed and why

| Change | Why |
| --- | --- |
| `README.md` (Hebrew editor's manual) moved to [`docs/EDITING.md`](docs/EDITING.md), text kept | Frees the root README for a project overview; the manual is linked first from the new README. |
| New English [`README.md`](README.md) with badges, screenshots, Mermaid architecture, structure, setup, configuration, limitations and author links | A visitor or recruiter now sees what the project is in seconds; a developer gets commands that were actually run. |
| Browser source (`index.html`, `admin.*`, `robots.txt`, page scripts and styles, `icons/`) moved into [`web/`](web/) | The root was 20 loose files; the build still publishes them flat, so every address on both sites is unchanged. |
| `MANAGEMENT-PLAN.md`, `MULTI-FACULTY-PLAN.md`, `SEO_REPORT.md` moved into [`docs/`](docs/) | Planning documents out of the root; every reference in code comments, agents and management docs updated. |
| Deleted `.nojekyll` and `assets/soft-landing.webp` | Unused (approved). |
| CI path filters use `web/**`; stale `biu-5787.ics` path removed | Kept CI triggering on the same changes after the move. |
| `docs/EDITING.md` "בדיקה מקומית" now builds and serves `public/` | The old command served the repo root, which has no `data.js` since the faculty split, so it was already broken. |
| Added [`LICENSE`](LICENSE) (MIT), [`.env.example`](.env.example), [`CONTRIBUTING.md`](CONTRIBUTING.md), [`CHANGELOG.md`](CHANGELOG.md), [`.editorconfig`](.editorconfig), issue and PR templates, markdownlint config | Standard project files, sized for a one-maintainer project. |
| `// don't touch` comments on four load-bearing lines | The flat copy to `public/`, the WhatsApp guard, the git-based "last updated" date, and the server's import of a browser file. |
| `package.json` description covers both faculties | It still said CS only. |

Not touched on purpose: `shared/data*.js` and `faculties/*/data*.js`. Any commit to those files, even a comment, moves the "last updated" date on the live sites. `management/` and `.claude/` keep their text, except for path updates.

## Verification

- `npm run check`, `npm test` (236/236), `FACULTY=cs npm run build` and `FACULTY=neuro npm run build` all pass, the same as the baseline.
- `public/` for both faculties was diffed against the pre-change build: identical except two comments and the deleted image.
- markdownlint: 0 errors (with `management/` and `.claude/` excluded as records).
- Link check: 0 broken links outside `management/simulations/` transcripts. Those contain expired preview URLs and URLs the chat model produced; they are records and stay as they are.
- Both Mermaid diagrams render with mermaid-cli.

## Left for you

1. **Watch the Vercel preview of this PR.** The chat and course code now import `web/shabbat-times.js` and `web/course-years.js`. Vercel traces static imports, so this should work, but only a deployment proves it. Open the preview and send one chat message.
2. **Fix the stray "null" on the live home page** (found while taking screenshots, not caused by this PR). In `web/index.html`, `renderNotices` calls `box.replaceChildren(..., more.length ? el("details", ...) : null)`; with three notices or fewer, the DOM writes the text "null" under them. Suggested fix: `box.replaceChildren(...cards.slice(0, 3), ...(more.length ? [el("details", ...)] : []))`.
3. **GitHub metadata** (description, topics) is proposed in the PR and applied only after you approve.
4. **Screenshots** in `docs/assets/` show both sites (desktop light, phone dark), taken from local builds. The stray "null" from item 2 was removed from the page before the CS capture, so the README shows the intended layout.
5. **Open pull requests**: [#29](https://github.com/Royc4515/nechita-raka/pull/29), [#108](https://github.com/Royc4515/nechita-raka/pull/108) and [#111](https://github.com/Royc4515/nechita-raka/pull/111) do not touch any moved file. [#107](https://github.com/Royc4515/nechita-raka/pull/107) edits `.gitignore`, which this PR also edits (one added line), so it may need a trivial rebase.
6. **`engines` in `package.json`** was not added: on Vercel it would change the Node.js runtime selection, which is a behavior change. Add `"engines": { "node": "22.x" }` only if that is what the Vercel projects already use.
