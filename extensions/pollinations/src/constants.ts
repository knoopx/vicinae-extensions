import { ModelOption } from "./types";

export const AUDIO_VOICES: ModelOption[] = [
  { title: "Alloy (Neutral)", value: "alloy" },
  { title: "Echo (Deep)", value: "echo" },
  { title: "Fable (Storyteller)", value: "fable" },
  { title: "Onyx (Warm)", value: "onyx" },
  { title: "Nova (Bright)", value: "nova" },
  { title: "Shimmer (Soft)", value: "shimmer" },
];

export const CACHE_KEYS = {
  TEXT_HISTORY: "text-history",
  IMAGE_HISTORY: "image-history",
  AUDIO_HISTORY: "audio-history",
  TEXT_MODELS: "text-models",
  IMAGE_MODELS: "image-models",
  TEXT_LAST_MODEL: "text-last-model",
  IMAGE_LAST_MODEL: "image-last-model",
  AUDIO_LAST_VOICE: "audio-last-voice",
} as const;

export const MAX_HISTORY_ITEMS = 50;
