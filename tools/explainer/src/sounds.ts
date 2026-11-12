/* The sound design. Prompts go to ElevenLabs (scripts/generate-audio.mts); the video places them (src/Sound.tsx). */

export const SFX = {
  riser: { prompt: "Soft cinematic riser with shimmering airy pads building up, clean modern tech intro, no drums", seconds: 3 },
  logo: { prompt: "Bright friendly logo sting, soft bell and warm synth chord with a gentle sparkle, modern app brand reveal", seconds: 2.5 },
  whoosh: { prompt: "Smooth fast air whoosh transition, clean, modern motion graphics, short", seconds: 1 },
  swoosh: { prompt: "Soft subtle swipe swoosh for a UI card sliding in, very short, clean", seconds: 0.6 },
  pop: { prompt: "Soft rounded bubble pop for a UI element appearing, playful, clean, very short", seconds: 0.5 },
  click: { prompt: "Crisp soft UI tap click, modern phone interface, very short", seconds: 0.5 },
  chime: { prompt: "Gentle glass chime notification with a soft sparkle, friendly, short", seconds: 1.2 },
  stamp: { prompt: "Rubber stamp thud on paper, satisfying, short", seconds: 0.6 },
  success: { prompt: "Positive success ding with a soft shimmer, modern app, short", seconds: 1 },
  error: { prompt: "Soft low error buzz, friendly not harsh, modern UI, short", seconds: 0.7 },
  typing: { prompt: "Fast quiet mechanical keyboard typing, close mic, clean", seconds: 2 },
  confetti: { prompt: "Celebration confetti cannon pop with paper flutter and light crowd cheer, short", seconds: 2.5 },
} as const;
export type SfxName = keyof typeof SFX;

/** Shown on the outro whenever a music bed is used. The current bed is a CC BY 4.0 track that requires it. */
export const MUSIC_CREDIT = "Music: “Wallpaper” by Kevin MacLeod (incompetech.com), CC BY 4.0";

export const MUSIC = {
  prompt:
    "Light, optimistic instrumental background music for an animated explainer video about students building a website. " +
    "Warm lo-fi hip hop groove with soft plucked synths, mellow electric piano, gentle bass and light brushed drums, 92 BPM. " +
    "Positive, curious, modern, never distracting, leaves room for a voice-over. Smooth even dynamics with no big drops, ends with a soft resolved outro.",
  seconds: 240,
};
