# נוי and רון: visual direction review (18.10.2026, updated with the persona round)

Scope: look only. Personalities, names, voice split and the violet theme stay (`mascots.md`, `DECISIONS.md`). Reviewed from the five sheets plus three persona reactions (`scratchpad\review\persona-*.md`). Head ratios are measured by eye. No images generated.

## 0. What the CS pair does (the family to match)

- Head about 1:4 of the figure with hair, about 1:4.5 without. Not chibi: hair volume does the "cute", not the skull.
- Adult face grammar: medium oval eyes with one highlight, bold eyebrows, a visible nose, an open grin, a real jaw. This is why Bit reads about 20 at 1:4.
- Legs about 45% of the height, a hoodie, a prop that breaks the silhouette (backpack, tote), thick warm-dark outline, soft cel shading, a weight shift in every pose.
- Brain-of-the-faculty cue is big and readable (Python logo, terminal badge). Neuro has nothing equivalent yet.

## 1. Critique of A, B, C

| Criterion | A (first draft) | B (cute, swapped looks) | C (adult) |
| --- | --- | --- | --- |
| Family with Bit/Byte | Noi close (outline, hoodie, face). Ron A is manga. | Ron B1/B2 emoji-chibi, head about 1:2.5: a different genre. | Right proportions, but flat stock-vector faces, closed mouths. Reads "generic clip art" (persona 3). |
| Distinct from Bit/Byte | Weak: Noi A is Byte's curls plus Bit's glasses. | Noi B good (auburn, lilac). Ron B1 brown hair is near Bit's. | Noi C good, but the bun nods to Byte. Ron C: teal plus backpack plus the pose is Bit (all personas noticed). |
| 68-128px, avatar, peek | Bun plus pencil reads at 104, pencil gone at 68. | Biggest faces, best in the avatar. | Worst: head about 14px at 68px, thin sticks; only hoodie colour and hair colour survive. |
| Light vs dark | Black curls vanish on dark. | Ron B2 black dome vanishes; Noi B auburn works on both. | Ron C black hair and charcoal trousers weak on dark. |
| Age 20-24 | Reads 12-15 (all personas). | Reads 10-15. | Noi C about 22, Ron C about 23: the only pair judged "a fellow student". C0 neat hair reads stiff, like an ID photo. |
| Body, stereotypes | Noi chubby. | Same. | Noi C overcorrected to model legs (about 55%). Pencil-bun-glasses-notebook and headphones-backpack-organised are known tropes (personas 1 and 2). |
| Brain cue | None readable. | None. | Ron's line reads as EKG (cardiology), not EEG. Neuron patch unreadable. Only the notebook says "lab". |
| Personality | Noi A yes, Ron A too eager. | Both too sweet. | Noi C too polite for "enthusiastic, chaotic" (needs gesture). Ron C reads bored, not dry. |

Persona consensus, taken as given: adults only (the cute sheets would make the chat feel unserious); Noi C plus Ron C are the pick, with more energy for Noi and a stronger brain cue; fix dark-mode edges; guard against the two tropes. Do not use B2 at all. Drop C0.

## 2. Baseline R (recommended if Roy wants one safe pick now)

Noi C and Ron C, repaired against the persona list:
- Proportions of CS (head 1:4.5 with hair, legs about 45%), not C's tall thin 1:5 plus 55% legs. This also fixes 68px (bigger head, more readable).
- Noi: both arms active (one holds an iced coffee up, the other gestures), mid-step, grin wide open. Drop the pencil (a trope, invisible at 68, Byte-adjacent); keep Roy's glasses, but thick plum frames. The notebook stays as a pose prop, not a permanent anchor.
- Brain cue: a big, simple pink cartoon brain patch on Noi's chest (at least a quarter of the chest width, not a neuron). Ron: three stacked irregular wavy EEG traces of different heights across the tee, no single sharp spike (that is what read as EKG).
- Dark mode: black hair with blue-black body and lighter strokes; lilac ear cups; stone chinos. The engineer can also add a 1px pale-lilac `drop-shadow` to the mascot images in dark mode only.
- Ron's teal is the continuity colour but it is also the Bit echo; D1 below tests the alternative. At 68px use colour first: lilac plus auburn for Noi, a non-teal tee plus black for Ron.

Skin: Noi fair warm (#f6d3b8), light freckles (bonus). Ron tanned warm olive (#c28a5a). Outfits: Noi lilac #c4a8ec hoodie, mid-blue jeans #3f6a9a, white sneakers; Ron tee as chosen, stone chinos #b5a889, white sneakers.

## New directions D1-D3 (for the comparison sheet)

All three: students 20-24, Noi slim (not model), Ron clearly adult, distinct from Bit/Byte, a readable brain cue, a silhouette that works at 68px, dark-mode-safe hair. They vary proportions, hair and silhouette, outfit and colour story, and rendering. Style line is appended verbatim; rendering notes sit in the body.

### D1, "Colour-block" (most readable at 68px)

Head 1:4, simplified rendering: big flat colour shapes, thick 4px outlines, one highlight per surface, little interior detail. Colour story: the pair are complementary against the violet theme, lilac for her and tangerine for him, so Ron stops echoing Bit's teal. Hair: Noi a short auburn wavy bob with a yellow headband (new silhouette: round and compact, no bun); Ron a high black curly twist-top with tapered sides (taller than Noi's head silhouette, not a dome). Brain cue: a big pink brain patch on her hoodie; a white EEG trace plus a small brain outline on his tee. Props: iced coffee (her), thermos of mint tea plus a laptop sleeve under the arm (him, no backpack).

```
Noi D1: A friendly cartoon young woman, Israeli university student, about 21, slim build, full body, standing front view, holding a big iced coffee cup with an orange straw in one hand and a lab notebook with colorful sticky tabs in the other, wide open excited grin, high eyebrows, weight on one leg. Fair warm skin with light freckles, green eyes, thick plum-colored rounded glasses. Short wavy auburn bob haircut with a yellow headband. Loose bright lilac hoodie with a big simple pink cartoon brain patch on the chest, dark blue jeans, white sneakers. Head about one quarter of her height, simple bold shapes with large flat color areas, little interior detail. cartoon illustration, bold dark outlines, flat cel shading, plain pure white background, no border, no text
```

```
Ron D1: A friendly cartoon young man, Israeli university student, about 23, lean adult build, full body, standing front view with relaxed shoulders, holding a green thermos with a little steam in one hand and a slim laptop sleeve under the other arm, calm half smile, one eyebrow slightly raised. Tanned warm olive-brown skin, brown eyes, no glasses. Tall black curly twist-top hairstyle with short tapered sides. Bright tangerine-orange t-shirt with three stacked white wavy EEG brain-wave lines and a small white brain outline on the chest, stone-beige chinos, white sneakers, charcoal over-ear headphones with lilac ear cups around his neck. Head about one quarter of his height, simple bold shapes with large flat color areas, little interior detail. cartoon illustration, bold dark outlines, flat cel shading, plain pure white background, no border, no text
```

### D2, "Lab coat" (the most faculty-specific, taller proportions)

Head 1:5.5, almost realistic young-adult build, longer legs (about 50%), two-tone cel shading and a deep plum outline instead of black. Colour story: the lab is the brand, so no hoodies (the CS signature) at all: Noi in a pale lilac lab coat (#d9c8f3), open, sleeves rolled, sticky notes on the pocket, over a sunny yellow tee; Ron in a sage-green overshirt (#7fb08a) over a white tee with a brain print. Hair: Noi a short auburn pixie with a side-swept fringe and big round tortoise glasses; Ron a short black curly crop with a shaved fade. The lab coat gives a lilac shape as wide as a hoodie at 68px. Risk: furthest from CS in proportion, closest to "science student" in meaning. Props: iced coffee plus a clipboard of sticky notes; a tote bag plus a thermos.

```
Noi D2: A friendly cartoon young woman, Israeli university student, about 22, slim build, full body, standing front view with a confident relaxed posture, one hip out, holding an iced coffee cup with a straw in one hand and a clipboard covered in colorful sticky notes in the other, big excited grin. Fair warm skin with freckles, green eyes, large round tortoiseshell glasses. Short auburn pixie haircut with a side-swept fringe. A pale lilac open lab coat with the sleeves rolled up and a few sticky notes on the pocket, over a sunny yellow t-shirt with a small pink brain print, slim blue jeans, white sneakers. Realistic young-adult proportions, head about one fifth to one sixth of her height, longer legs, two-tone shading, deep plum outlines. cartoon illustration, bold dark outlines, flat cel shading, plain pure white background, no border, no text
```

```
Ron D2: A friendly cartoon young man, Israeli university student, about 24, lean adult build with straight shoulders, full body, standing front view in a relaxed stance, one hand holding a steel thermos of mint tea, a canvas tote bag with a laptop edge over the other shoulder, calm dry half smile. Tanned warm olive-brown skin, brown eyes, no glasses, a light shadow of stubble. Short black curly crop with a shaved fade. A sage-green open overshirt over a white t-shirt with a big black line-art brain and a wavy EEG trace across it, stone-beige chinos, white sneakers, charcoal headphones with lilac ear cups around his neck. Realistic young-adult proportions, head about one fifth to one sixth of his height, longer legs, two-tone shading, deep plum outlines. cartoon illustration, bold dark outlines, flat cel shading, plain pure white background, no border, no text
```

### D3, "Rich-render, light and violet" (closest to Bit's finish, dark-mode first)

Head 1:4.5, richer rendering like the live CS art: soft gradient shading on clothes, individual hair strands, a glossy eye highlight. Colour story built for dark backgrounds: the pair wear the theme itself and a light sky blue, both bright against dark and strongly outlined against white. Noi in a deep violet hoodie (#5b3aa8, the accent) with a white line-art brain; Ron in a sky-blue denim jacket (#6fb4e8) over a white tee with a violet EEG trace (no teal anywhere). Hair: Noi long auburn wavy hair loose to the shoulders with one side tucked behind the ear and a small lilac clip (differs from Byte's ponytail by length, colour and wave), glasses in thin gold; Ron a short, black, side-swept curly quiff with soft blue highlights so the edge survives on dark. Props: iced coffee; thermos plus a phone with a podcast waveform. Risk: the most rendering detail means the most drift across 9 poses in Flow.

```
Noi D3: A friendly cartoon young woman, Israeli university student, about 22, slim build, full body, standing front view, one hand raised in a lively gesture and the other holding an iced coffee cup with a straw, bright enthusiastic smile, weight on one leg. Fair warm skin with light freckles, green eyes, round thin gold-framed glasses. Long wavy auburn hair loose to the shoulders, one side tucked behind her ear with a small lilac hair clip, individual hair strands and soft highlights. Deep violet hoodie with drawstrings and a large white line-art brain on the chest, soft gradient fabric shading, light blue jeans, white sneakers. Head about one quarter of her height, rich detailed rendering like a polished storybook illustration. cartoon illustration, bold dark outlines, flat cel shading, plain pure white background, no border, no text
```

```
Ron D3: A friendly cartoon young man, Israeli university student, about 23, lean adult build, full body, standing front view in a relaxed stance, one hand holding a steel thermos of mint tea and the other holding a phone showing a small audio waveform, calm half smile, one eyebrow slightly raised. Tanned warm olive-brown skin, brown eyes, no glasses. Short black curly side-swept quiff with soft blue highlights and individual curls. Light sky-blue denim jacket over a white t-shirt with a violet wavy EEG trace, dark blue jeans, white sneakers, over-ear headphones with lilac ear cups around his neck. Head about one quarter of his height, rich detailed rendering like a polished storybook illustration, soft gradient fabric shading. cartoon illustration, bold dark outlines, flat cel shading, plain pure white background, no border, no text
```

### How I would rank them before seeing them

D1 for small sizes and distance from Bit/Byte, D2 for faculty meaning and age, D3 for family finish and dark mode. If Roy wants the safest single answer without another round: R. A second pass could mix D1's colours with D2's face.

## 3. Questions for student personas (round 2)

Show the D1-D3 sheet plus R unlabeled, at 68 and 128px, light and dark, next to Bit and Byte.

1. "How old is each character? Does anyone look younger than a first-year student or older than a TA?" (target 19-24).
2. "At 68px on both backgrounds, which characters can you tell apart, and which one fades?" (silhouette, colour, dark edges).
3. "Which two are enthusiastic-and-messy versus calm-and-dry, with no labels? And what in the picture says brain sciences?" (Noi for the first, Ron for the second; the brain cue should be named without a hint).
4. "Same family as Bit and Byte, a copy, or a different site? Does any look like a stereotype, or like someone who is not at your university?"
