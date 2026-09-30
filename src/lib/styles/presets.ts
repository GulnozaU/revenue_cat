import type { AestheticId } from "@/lib/types/edit-plan";

export type StylePreset = {
  id: AestheticId;
  name: string;
  tagline: string;
  pacing: "slow" | "natural" | "medium" | "fast";
  captionStyle: "soft_bold" | "minimal" | "clean_bold" | "kinetic" | "boxed" | "outline";
  fontId: string;
  captionPosition: "lower_center" | "center" | "upper_center";
  stickerUsage: "none" | "low" | "medium" | "high";
  stickerCategories: string[];
  transitionStyle: "none" | "soft" | "hard";
  zoomFrequency: "none" | "low" | "medium" | "high";
  musicMood: "light" | "ambient" | "upbeat" | "cinematic" | "none";
  musicTrackId: string | null;
  musicVolume: number;
  maxSilenceKeep: number;
  targetClipPadding: number;
  accent: string;
  swatch: [string, string, string];
};

export const STYLE_PRESETS: Record<AestheticId, StylePreset> = {
  cute: {
    id: "cute",
    name: "Cute / Coquette",
    tagline: "Soft, playful, decorative",
    pacing: "medium",
    captionStyle: "soft_bold",
    fontId: "chillax",
    captionPosition: "lower_center",
    stickerUsage: "high",
    stickerCategories: ["Cute", "Hearts", "Decorative"],
    transitionStyle: "soft",
    zoomFrequency: "medium",
    musicMood: "light",
    musicTrackId: "upbeat_01",
    musicVolume: 0.14,
    maxSilenceKeep: 0.35,
    targetClipPadding: 0.15,
    accent: "#E8A0BF",
    swatch: ["#FFF5F8", "#E8A0BF", "#5C3A4A"],
  },
  vlog: {
    id: "vlog",
    name: "Cozy Vlog",
    tagline: "Natural pacing, soft captions",
    pacing: "natural",
    captionStyle: "minimal",
    fontId: "switzer",
    captionPosition: "lower_center",
    stickerUsage: "low",
    stickerCategories: ["Lifestyle", "Decorative"],
    transitionStyle: "none",
    zoomFrequency: "low",
    musicMood: "ambient",
    musicTrackId: "chill_01",
    musicVolume: 0.1,
    maxSilenceKeep: 0.55,
    targetClipPadding: 0.25,
    accent: "#C4A484",
    swatch: ["#F7F1EA", "#C4A484", "#3F342B"],
  },
  clean_lifestyle: {
    id: "clean_lifestyle",
    name: "Clean Lifestyle",
    tagline: "Minimal, bright, intentional",
    pacing: "medium",
    captionStyle: "clean_bold",
    fontId: "satoshi",
    captionPosition: "lower_center",
    stickerUsage: "low",
    stickerCategories: ["Lifestyle", "Shapes"],
    transitionStyle: "soft",
    zoomFrequency: "medium",
    musicMood: "upbeat",
    musicTrackId: "upbeat_01",
    musicVolume: 0.12,
    maxSilenceKeep: 0.4,
    targetClipPadding: 0.18,
    accent: "#7EB8A8",
    swatch: ["#F4F8F6", "#7EB8A8", "#243530"],
  },
  fast_paced: {
    id: "fast_paced",
    name: "Fast-Paced",
    tagline: "Punchy cuts, kinetic text",
    pacing: "fast",
    captionStyle: "kinetic",
    fontId: "clash_display",
    captionPosition: "center",
    stickerUsage: "medium",
    stickerCategories: ["Reaction", "Arrows"],
    transitionStyle: "hard",
    zoomFrequency: "high",
    musicMood: "upbeat",
    musicTrackId: "upbeat_01",
    musicVolume: 0.16,
    maxSilenceKeep: 0.25,
    targetClipPadding: 0.08,
    accent: "#F0A06A",
    swatch: ["#FFF8F2", "#F0A06A", "#3A2A1E"],
  },
  cinematic: {
    id: "cinematic",
    name: "Cinematic",
    tagline: "Wide emotion, slow moves",
    pacing: "slow",
    captionStyle: "minimal",
    fontId: "zodiak",
    captionPosition: "lower_center",
    stickerUsage: "none",
    stickerCategories: [],
    transitionStyle: "soft",
    zoomFrequency: "low",
    musicMood: "cinematic",
    musicTrackId: "cinematic_01",
    musicVolume: 0.18,
    maxSilenceKeep: 0.7,
    targetClipPadding: 0.35,
    accent: "#8B9DC3",
    swatch: ["#F3F5F9", "#8B9DC3", "#1E2433"],
  },
  educational: {
    id: "educational",
    name: "Study",
    tagline: "Clear, boxed captions",
    pacing: "natural",
    captionStyle: "boxed",
    fontId: "literata",
    captionPosition: "lower_center",
    stickerUsage: "low",
    stickerCategories: ["Study", "Shapes"],
    transitionStyle: "none",
    zoomFrequency: "low",
    musicMood: "ambient",
    musicTrackId: "chill_01",
    musicVolume: 0.08,
    maxSilenceKeep: 0.45,
    targetClipPadding: 0.2,
    accent: "#7C9CBF",
    swatch: ["#F5F7FA", "#7C9CBF", "#2A3340"],
  },
  food: {
    id: "food",
    name: "Food",
    tagline: "Warm tones, tasty emphasis",
    pacing: "medium",
    captionStyle: "soft_bold",
    fontId: "boska",
    captionPosition: "lower_center",
    stickerUsage: "medium",
    stickerCategories: ["Food", "Decorative"],
    transitionStyle: "soft",
    zoomFrequency: "medium",
    musicMood: "light",
    musicTrackId: "upbeat_01",
    musicVolume: 0.13,
    maxSilenceKeep: 0.35,
    targetClipPadding: 0.15,
    accent: "#E09F7D",
    swatch: ["#FFF6F0", "#E09F7D", "#3D2A20"],
  },
  travel: {
    id: "travel",
    name: "Travel",
    tagline: "Scenic, outlined captions",
    pacing: "medium",
    captionStyle: "outline",
    fontId: "montserrat",
    captionPosition: "lower_center",
    stickerUsage: "medium",
    stickerCategories: ["Travel", "Decorative"],
    transitionStyle: "soft",
    zoomFrequency: "medium",
    musicMood: "cinematic",
    musicTrackId: "cinematic_01",
    musicVolume: 0.14,
    maxSilenceKeep: 0.4,
    targetClipPadding: 0.2,
    accent: "#6BA3A3",
    swatch: ["#F2F8F8", "#6BA3A3", "#1F3333"],
  },
};

export function getStyle(id: AestheticId): StylePreset {
  return STYLE_PRESETS[id] ?? STYLE_PRESETS.clean_lifestyle;
}

export const AESTHETIC_ORDER: AestheticId[] = [
  "cute",
  "clean_lifestyle",
  "vlog",
  "cinematic",
  "fast_paced",
  "educational",
  "food",
  "travel",
];
