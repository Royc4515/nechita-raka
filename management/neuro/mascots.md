# נוי and רון, the brain sciences mascots

Written 18.10.2026 (faculty PR 6c). The text lives in `faculties/neuro/faculty.js` (mascots block) and its English in `faculties/neuro/data.en.js`; the images in `faculties/neuro/mascot/`. Decisions this works inside: רון masculine, נוי feminine, violet theme (`management/DECISIONS.md`, 15.10.2026).

## Who is which, and why

Bit and Byte split as "he is the chaotic enthusiast, she is the organized dry one". The neuro pair flips it: נוי is the enthusiastic, curious, slightly chaotic one and רון is the calm, organized, dry one.

- The neuro edition should not read as a reskin of CS with new names; the flip makes the two sites feel like siblings, not copies.
- נוי is the default mascot (she peeks first), and a mascot who is openly excited about the brain sells the subject to a first-year who is still unsure about it.
- רון in the computational track (new in תשפ"ז) makes his love of tables and order natural, and gives the computational students a face.

## נוי (Noi), feminine voice

- Look: see "The look" below.
- Studies: the single major; torn between the biological and the cognition specializations (chosen at the start of year 2); counts the days to year 2, when students enter the labs.
- Likes: crazy brain facts, iced coffee even in winter, neuron doodles. Always two minutes late running from building 901 to the rest of campus.
- Talks: students' Hebrew, brain and lab metaphors ("המוח שלי עוד בונה סינפסות לקמפוס הזה", "זה ניסוי שלא עבד, משנים משתנה אחד ומנסים שוב"), laughs at herself.
- Calms a stressed student: the brain learns anything new slowly and after a few weeks it is automatic (plasticity), then one simple first step.
- About רון: her best friend from the cohort; his tables saved her from missing registration; teases him about putting everything in a three-color table.
- Thinking verb: "נוי מעבדת…" (processing, and a wink at מעבדה).

## רון (Ron), masculine voice

- Look: see "The look" below.
- Studies: the single major, computational track.
- Likes: a table for everything (timetable, exams, cups of tea this week), a thermos of mint tea, brain podcasts on the way to campus.
- Talks: straight to the point, answer first and then the tip; brain and data metaphors ("זה עומס קוגניטיבי, לא חוסר יכולת", "האמיגדלה שלכם פשוט קצת מגזימה"); dry humor that lands on time.
- Calms a stressed student: stress is the brain's normal reaction to something new, then the problem split into small ordered steps ("נשימה, ואז רשימה").
- About נוי: his best friend; without her enthusiasm his week would be a boring table; teases her about octopus facts.

## The look (final, 18.10.2026)

Chosen by Roy after a design review and two persona rounds (`mascot-design-review.md`): young adults in the "lab coat" direction's proportions and finish (head about 1:5.5, two-tone shading, deep plum outlines), not the cute big-head proportions, which read as 12 to 15. The first drafts were too close to ביט and בייט (curls plus round glasses, teal plus backpack).

- נוי, about 22, slim: fair skin with freckles; curly auburn hair in a big messy high bun with a yellow pencil; green eyes, round glasses; lilac hoodie with a round neuron patch; slim blue jeans, white sneakers; lab notebook with sticky tabs, sometimes iced coffee.
- רון, about 24: tanned olive-brown skin; short black curly crop with a shaved fade, light stubble, no glasses; sage-green open overshirt over a white t-shirt with a line-art brain and an EEG trace; charcoal headphones with lilac ear cups around his neck; stone chinos, white sneakers. No bag (Roy); a thermos of mint tea, sometimes a laptop or a tablet. The peek is an open, friendly grin, not a smirk (Roy: the raised-eyebrow version read as flirting).

## Images (Google Flow, project "נחיתה רכה - קמעות")

Saved Characters: "נוי - מדעי המוח" and "רון - מדעי המוח" (their descriptions hold the fixed look above). "נוי - טיוטה", "רון - טיוטה" and "דמות בלי שם" are drafts.

Style line: realistic young-adult proportions, two-tone shading, deep plum outlines. cartoon illustration, bold dark outlines, flat cel shading, plain pure white background, no ground shadow, no border, no text. Do not use the word "sticker" (it adds a white sticker border).

Each pose: the saved Character attached, "<name>, the character from the reference", the pose, then the fixed look repeated, then the style line; Nano Banana, x1. Aspect 3:4 for standing poses, 4:3 for laptop, 1:1 for avatar and peek.

| Pose | Prompt body |
| --- | --- |
| wave | standing, waving hello with one raised hand (נוי hugs the notebook, רון holds the thermos) |
| think | standing, hand on chin, looking up thoughtfully, a small question mark above the head (רון holds a tablet) |
| celebrate | jumping in the air with both fists raised, small colorful confetti around |
| point | standing, thumbs up with one hand and pointing to the side with the other |
| calendar | standing, holding a big paper wall calendar (empty boxes, no numbers) and pointing at a date circled in red |
| idea | standing, one finger raised, a glowing yellow light bulb above the head (רון holds a tablet) |
| laptop | sitting cross-legged on the floor typing on a laptop (no logo), coffee or thermos and a small stack of books beside |
| avatar | head and shoulders portrait, front view, looking at the viewer |
| peek | head, shoulders and both hands gripping the top edge of a ledge at the bottom, cut straight at the hands, friendly open grin |

Processing: white background removed by flood fill from the edges, cropped to the figure; poses at height 480, the peek at max side 360 (a drawn ledge line is trimmed), the avatar a 96 x 96 square around the face; `.webp`. Pose widths at height 480 go into `poseWidths`.
