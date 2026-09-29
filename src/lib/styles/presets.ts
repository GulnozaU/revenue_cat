import type { AestheticId } from "@/lib/types/edit-plan";

export type StylePreset = {
  id: AestheticId;
  name: string;
  pacing: "slow" | "natural" | "medium" | "fast";
  captionStyle: "soft_bold" | "minimal" | "clean_bold" | "kinetic" | "boxed" | "outline";
  fontId: string;
  captionPosition: "lower_center" | "center" | "upper_center";
  stickerUsage: "none" | "low" | "medium" | "high";
  transitionStyle: "none" | "soft" | "hard";
  zoomFrequency: "none" | "low" | "medium" | "high";
  musicMood: "light" | "ambient" | "upbeat" | "cinematic" | "none";
  musicTrackId: string | null;
  musicVolume: number;
  maxSilenceKeep: number;
  targetClipPadding: number;
};

export const STYLE_PRESETS: Record<AestheticId, StylePreset> = {
  cute: {
    id: "cute",
    name: "Cute",
    pacing: "medium",
    captionStyle: "soft_bold",
    fontId: "arial_bold",
    captionPosition: "lower_center",
    stickerUsage: "high",
    transitionStyle: "soft",
    zoomFrequency: "medium",
    musicMood: "light",
    musicTrackId: "upbeat_01",
    musicVolume: 0.14,
    maxSilenceKeep: 0.35,
    targetClipPadding: 0.15,
  },
  vlog: {
    id: "vlog",
    name: "Vlog",
    pacing: "natural",
    captionStyle: "minimal",
    fontId: "arial",
    captionPosition: "lower_center",
    stickerUsage: "low",
    transitionStyle: "none",
    zoomFrequency: "low",
    musicMood: "ambient",
    musicTrackId: "chill_01",
    musicVolume: 0.1,
    maxSilenceKeep: 0.55,
    targetClipPadding: 0.25,
  },
  clean_lifestyle: {
    id: "clean_lifestyle",
    name: "Clean Lifestyle",
    pacing: "medium",
    captionStyle: "clean_bold",
    fontId: "arial_bold",
    captionPosition: "lower_center",
    stickerUsage: "low",
    transitionStyle: "soft",
    zoomFrequency: "medium",
    musicMood: "upbeat",
    musicTrackId: "upbeat_01",
    musicVolume: 0.12,
    maxSilenceKeep: 0.4,
    targetClipPadding: 0.18,
  },
  fast_paced: {
    id: "fast_paced",
    name: "Fast-paced",
    pacing: "fast",
    captionStyle: "kinetic",
    fontId: "arial_bold",
    captionPosition: "center",
    stickerUsage: "medium",
    transitionStyle: "hard",
    zoomFrequency: "high",
    musicMood: "upbeat",
    musicTrackId: "upbeat_01",
    musicVolume: 0.16,
    maxSilenceKeep: 0.25,
    targetClipPadding: 0.08,
    },
  cinematic: {
    id: "cinematic",
    name: "Cinematic",
    pacing: "slow",
    captionStyle: "minimal",
    fontId: "arial",
    captionPosition: "lower_center",
    stickerUsage: "none",
    transitionStyle: "soft",
    zoomFrequency: "low",
    musicMood: "cinematic",
    musicTrackId: "cinematic_01",
    musicVolume: 0.18,
    maxSilenceKeep: 0.7,
    targetClipPadding: 0.35,
  },
  educational: {
    id: "educational",
    name: "Educational",
    pacing: "natural",
    captionStyle: "boxed",
    fontId: "arial_bold",
    captionPosition: "lower_center",
    stickerUsage: "low",
    transitionStyle: "none",
    zoomFrequency: "low",
    musicMood: "ambient",
    musicTrackId: "chill_01",
    musicVolume: 0.08,
    maxSilenceKeep: 0.45,
    targetClipPadding: 0.2,
  },
  food: {
    id: "food",
    name: "Food",
    pacing: "medium",
    captionStyle: "soft_bold",
    fontId: "arial_bold",
    captionPosition: "lower_center",
    stickerUsage: "medium",
    transitionStyle: "soft",
    zoomFrequency: "medium",
    musicMood: "light",
    musicTrackId: "upbeat_01",
    musicVolume: 0.13,
    maxSilenceKeep: 0.35,
    targetClipPadding: 0.15,
  },
  travel: {
    id: "travel",
    name: "Travel",
    pacing: "medium",
    captionStyle: "outline",
    fontId: "arial_bold",
    captionPosition: "lower_center",
    stickerUsage: "medium",
    transitionStyle: "soft",
    zoomFrequency: "medium",
    musicMood: "cinematic",
    musicTrackId: "cinematic_01",
    musicVolume: 0.14,
    maxSilenceKeep: 0.4,
    targetClipPadding: 0.2,
  },
};

export function getStyle(id: AestheticId): StylePreset {
  return STYLE_PRESETS[id] ?? STYLE_PRESETS.clean_lifestyle;
}
