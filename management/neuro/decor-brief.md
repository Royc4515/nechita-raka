# Neuro decor brief (brain-science elements, premium feel)

Roy: elements of brain science, premium, in the background or beside things. No copy changes, no on-image text. Written 18.10.2026 for the engineer; the CS look must stay untouched.

## Switch

`faculty.js`: `decor: { background: "synapses", headings: "spike", watermark: "neuron", cards: "glow" }`. Each key absent means the CS look. The build sets `data-decor-bg`, `data-decor-headings`, `data-decor-mark`, `data-decor-cards` on `<html>` (same pattern as `data-mascot-shadow`); CSS keys on them. All shapes are painted with `mask-image` plus a token color, so light and dark follow the accent.

## Contrast budget (computed, WCAG relative luminance, sRGB mix)

The weakest text is `--faint` #5c6b82 (L 0.144 light, 0.277 dark). Ink laid under text on the page background (not on opaque cards) must keep it at 4.5:1 or better.

| Pair | Ratio |
|---|---|
| faint on light bg #f4f7fb (L 0.927) | 5.04 |
| faint on bg + 6% accent #6434cc (L 0.841) | 4.59, the light cap |
| faint on bg + 8% accent | 4.45, fails |
| accent-text #5a2ebb on bg + 18% accent | 5.78 |
| faint on dark bg #0b1220 (L 0.006) | 5.84 |
| faint on bg + 14% accent #b89df6 (L 0.0195) | 4.70, the dark cap |
| faint on bg + 18% accent | 4.33, fails |
| white on accent #6434cc | 7.23; with 14% white laid over it about 5.4 (20% gives 4.67) |

Rules: effective ink under page text is at most 6% accent in light and 14% in dark. Assumes neuro `--accent-ink` is #fff in light; in dark the ink is darker than the fill, so darkening it only raises contrast.

## 1. Synapse field (`background: "synapses"`)

- What: a faint neural network replaces the dotted `body` grid (set its `background-image: none`) and layers on the aurora glow, which stays.
- Where: `.aurora::after`, same 620px box and fade mask as the aurora, so it sits behind the hero and first section only. Tiled mask 240px on desktop (1280), 180px on phone (375). Symmetric, so RTL needs no flip.
- Paint: `background: color-mix(in srgb, var(--accent) 6%, transparent)` light; `14%` dark. Mask alpha: lines 0.8, nodes 1.
- Tile (240x240 viewBox, stroke-only, 1px lines): 10 nodes (x,y,r) = (30,40,3.2) (96,22,2.2) (168,58,3.6) (222,24,2.2) (60,120,2.6) (132,104,4.2) (206,140,2.6) (40,200,3) (120,190,2.4) (190,214,3.2). Edges are gentle quadratic curves between near neighbors, each node has 2 or 3, no crossings. To tile, one edge leaves the right edge at y=24 and re-enters the left at y=24, and one leaves the bottom at x=120 and re-enters the top at x=120, both with horizontal or vertical tangent.
- Motion: dark only, inside `prefers-reduced-motion: no-preference`: `.aurora::after` opacity 0.6 to 1, 14s ease-in-out alternate infinite (compositor only, no JS). Fallback: static at opacity 0.85. Light is static.
- Weight: about 1.2 KB data-URI SVG.

## 2. Spike-train headings (`headings: "spike"`)

- What: the `// ` prefix on section `h2`s becomes a small action-potential trace. Also remove the `_` after `h1` (`h1::after { content: none }`) and the `[` `]` around counts (CS developer jokes).
- Where: `h2::before` as an inline block, 28x14px on desktop and phone, `margin-inline-end: 8px`, vertical-align -1px. It sits at the inline start (right in RTL); the shape is not mirrored.
- Paint: `background: var(--accent-text)` through a mask; full strength (graphic, 7.7:1 light, higher dark; passes 3:1).
- Shape (28x14 viewBox, stroke 1.6, round caps and joins, no fill): `M0 11 H6 L8 3 L10 11 H15 L17 6 L19 11 H28`.
- Motion: none. Weight: 0.3 KB.

## 3. Neuron watermark (`watermark: "neuron"`)

- What: a dendritic neuron replaces the `{ }` on `.tile.hero-tile::before` (the accent banner).
- Where: 96px on phone, 160px on desktop, `inset-inline-end: -8px`, vertically centered, clipped by the tile (confirm it has `overflow: hidden`); the left side in RTL, behind the arrow.
- Paint: `background: color-mix(in srgb, var(--accent-ink) 14%, transparent)`, same in both modes (lightens in light, darkens in dark; 5.4:1 worst case, above).
- Source: Flow raster, see below. Static, no motion.

## 4. Card glow (`cards: "glow"`)

- What: cards feel lit from within, nothing painted behind text.
- Light: `--shadow-2` becomes `0 1px 2px rgb(15 27 45 / 5%), 0 14px 32px -16px color-mix(in srgb, var(--accent) 38%, transparent)`.
- Dark (shadows are `none` today): `box-shadow: inset 0 1px 0 color-mix(in srgb, var(--accent) 22%, transparent), 0 0 0 1px color-mix(in srgb, var(--accent) 10%, var(--border))`.
- Motion: none beyond the existing hover and pointer glow. Weight: 0.

## Flow decision

Only the watermark neuron goes to Flow: an organic Golgi-stain branching tree is what reads as premium, and a hand-plotted path looks like clip art. A raster cannot take token colors, so it is used as an alpha mask.
- Prompt: "Single neuron in the style of a Ramon y Cajal ink drawing: round cell body with five fine branching dendrites and one long axon ending in small terminal buttons. Pure black ink linework on a plain flat pure white background, fine confident lines, a little thickness variation, no shading, no color, no text, no frame, no other objects, centered with a margin."
- Aspect 1:1. Output 1024. Processing: grayscale, alpha = 255 minus luminance, RGB set to black, trim, resize to max side 480, webp quality 70, aim for 25 KB or less (hard cap 40). Place as `mask-image: url(...); mask-size: contain; mask-repeat: no-repeat` on `::before`, `loading` not needed (CSS background, deferred until the banner paints).
- Fallback if the render is poor: draw soma circle r14 at (70,86), 5 forking dendrites of stroke 3, one axon to (130,92) with three boutons r4, in a 160 box.

The other three stay SVG and CSS: they must follow the accent in both modes and weigh under 2 KB.

## UX checklist (phone 375 and desktop 1280, light and dark)

- [ ] Body text, counts and meta are readable over the field; nothing gets harder to read than before.
- [ ] Field is visible as texture on a good screen, fades out before the first card, and never reaches the footer.
- [ ] No tile seams or repetition stripes in the field at both tile sizes.
- [ ] Section headings: spike glyph at the right in RTL, aligned to the text baseline, no `//`, no `_`, no brackets.
- [ ] Banner watermark sits at the left, clipped, never touches the title text, arrow still clear.
- [ ] Cards: light shows a soft violet lift; dark shows a faint top edge. No double borders.
- [ ] Dark pulse is slow, hard to notice while reading; with reduced motion on, everything is still.
- [ ] CS edition identical to before (dotted grid, `// `, `_`, `{ }`).
- [ ] No layout shift; added weight is under 30 KB.

## As built (faculty PR 6e, 18.10.2026)

The engineer's changes to the brief, after the browser checks:

- Attributes are `data-decor-<place>` with the manifest's key names (`data-decor-background`, `-headings`, `-watermark`, `-cards`); the vocabulary is `DECOR_STYLES` in `faculties/index.js`.
- Shapes are files, not data URIs, so the shared `index.html` grows only by CSS lines: `faculties/neuro/decor/` holds `synapses.svg` (0.9 KB), `spike.svg` (0.2 KB) and `neuron.webp` (24 KB), published to `assets/decor/`.
- Neuron: the Flow render (Nano Banana, x1, 1:1, project "נחיתה רכה - קמעות", prompt as above) came out as a tall pyramidal cell. Processing: grayscale, paper above 215 dropped, ink stretched x1.6, lines thickened with a 5 px max filter (the fine lines vanished at 96 px), trimmed, max side 480, alpha mask, webp q70. On phones it sits at the bottom inline-end corner (the short tile has no free middle); from 640 px it is centered vertically in the tall tile, clear of the title. The CS rule's `direction: ltr` is reset, otherwise the inline-end inset lands behind the title.
- Card glow in dark: a 10% accent tint on the border instead of an extra 1 px ring (no double border), kept off while hovering so the hover border still shows.
- Spike on the headings with a mascot (`h2.has-mascot`, a flex row aligned to the bottom): lifted 0.4em to sit on the text line. Counts keep a 0.4em gap once the brackets are gone.
