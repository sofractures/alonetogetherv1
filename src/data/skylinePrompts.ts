/** Prompts shown when adding a text memory on the skyline page. */
export const SKYLINE_PROMPTS = [
  "Share a moment when music made you feel connected to others.",
  "Describe a time when a crowd felt like a single heartbeat.",
  "Share a memory that shaped you.",
  "Tell us about a moment when you felt the city listening with you.",
  "Share a memory of dancing where everyone moved as one.",
] as const;

export type SkylinePrompt = (typeof SKYLINE_PROMPTS)[number];
