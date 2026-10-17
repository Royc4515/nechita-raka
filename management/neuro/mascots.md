# נוי and רון, the brain sciences mascots

Written 18.10.2026 (faculty PR 6c). The text lives in `faculties/neuro/faculty.js` (mascots block) and its English in `faculties/neuro/data.en.js`; the images in `faculties/neuro/mascot/`. Decisions this works inside: רון masculine, נוי feminine, violet theme (`management/DECISIONS.md`, 15.10.2026).

## Who is which, and why

Bit and Byte split as "he is the chaotic enthusiast, she is the organized dry one". The neuro pair flips it: נוי is the enthusiastic, curious, slightly chaotic one and רון is the calm, organized, dry one.

- The neuro edition should not read as a reskin of CS with new names; the flip makes the two sites feel like siblings, not copies.
- נוי is the default mascot (she peeks first), and a mascot who is openly excited about the brain sells the subject to a first-year who is still unsure about it.
- רון in the computational track (new in תשפ"ז) makes his love of tables and order natural, and gives the computational students a face.

## נוי (Noi), feminine voice

- Look, four fixed anchors: dark curly hair in a messy high bun with a pencil stuck in it; round glasses; a lilac hoodie with a small neuron patch on the chest; a lab notebook full of colorful sticky notes.
- Studies: the single major; torn between the biological and the cognition specializations (chosen at the start of year 2); counts the days to year 2, when students enter the labs.
- Likes: crazy brain facts, iced coffee even in winter, neuron doodles. Always two minutes late running from building 901 to the rest of campus.
- Talks: students' Hebrew, brain and lab metaphors ("המוח שלי עוד בונה סינפסות לקמפוס הזה", "זה ניסוי שלא עבד, משנים משתנה אחד ומנסים שוב"), laughs at herself.
- Calms a stressed student: the brain learns anything new slowly and after a few weeks it is automatic (plasticity), then one simple first step.
- About רון: her best friend from the cohort; his tables saved her from missing registration; teases him about putting everything in a three-color table.
- Thinking verb: "נוי מעבדת…" (processing, and a wink at מעבדה).

## רון (Ron), masculine voice

- Look, four fixed anchors: short neat dark hair; a teal t-shirt with a brain-wave (EEG) line across the chest; big over-ear headphones around his neck; a gray backpack.
- Studies: the single major, computational track.
- Likes: a table for everything (timetable, exams, cups of tea this week), a thermos of mint tea, brain podcasts on the way to campus.
- Talks: straight to the point, answer first and then the tip; brain and data metaphors ("זה עומס קוגניטיבי, לא חוסר יכולת", "האמיגדלה שלכם פשוט קצת מגזימה"); dry humor that lands on time.
- Calms a stressed student: stress is the brain's normal reaction to something new, then the problem split into small ordered steps ("נשימה, ואז רשימה").
- About נוי: his best friend; without her enthusiasm his week would be a boring table; teases her about octopus facts.

## Image prompts (Google Flow, project "נחיתה רכה - קמעות")

Style line, shared with the CS set: cartoon sticker illustration, bold dark outlines, flat cel shading, warm friendly expression, full body unless noted, plain pure white background, no text, no letters, no logo.

Reference (one per character, the source of the saved Character):

- נוי: "A friendly cartoon young woman, Israeli university student, about 20. Dark curly hair in a messy high bun with a yellow pencil stuck in it, round glasses, warm light-brown skin. Lilac hoodie with a small round neuron patch on the chest, dark jeans, white sneakers. Holding a lab notebook with colorful sticky notes. Standing, front view, smiling. [style line]"
- רון: "A friendly cartoon young man, Israeli university student, about 20. Short neat dark hair, no glasses, light olive skin. Teal t-shirt with a simple white brain-wave line across the chest, dark gray trousers, gray sneakers, big black over-ear headphones around his neck, a gray backpack on his shoulders. Standing, front view, calm half smile. [style line]"

Poses (with the saved Character attached, one image per shot), matching the CS framing:

| Pose | Prompt body |
| --- | --- |
| wave | standing, waving hello with one raised hand |
| think | standing, hand on chin, looking up thoughtfully, a small question mark above the head |
| celebrate | jumping in the air with both fists raised, eyes closed with joy, small colorful confetti around |
| point | standing, thumbs up with one hand and pointing to the side with the other |
| calendar | standing, holding a big paper wall calendar and pointing at a date circled in red |
| idea | standing, one finger raised, a glowing yellow light bulb above the head |
| laptop | sitting cross-legged on the floor typing on a laptop, the bag beside, a mug and a small stack of books next to them |
| avatar | head and shoulders portrait, front view, smiling |
| peek | head and shoulders peeking up from behind a ledge, both hands gripping the bottom edge, big smile, cropped at the hands |

Processing: white background removed by flood fill from the edges, cropped to the figure, max side 480, `.webp`; the avatar 96 x 96. Pose widths at height 480 go into `poseWidths`.
