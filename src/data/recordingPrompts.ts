/** Prompts shown on the create / record overlay. */
export const RECORDING_PROMPTS = [
  "Share a moment when music made you feel less alone.",
  "Tell me about a moment music was playing and you felt totally present. A dancefloor, a wedding, a gig?",
  "Tell me about a moment from your past that music or a song takes you straight back to.",
  "What does music do for you that nothing else can?",
] as const;

export type RecordingPrompt = (typeof RECORDING_PROMPTS)[number];
