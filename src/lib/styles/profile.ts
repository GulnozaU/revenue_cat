/**
 * Style learning foundation.
 * Full "teach from example videos" is intentionally not faked yet.
 */
export type StyleProfile = {
  id: string;
  name: string;
  pacing: "slow" | "natural" | "medium" | "fast";
  captions: "minimal" | "soft_bold" | "clean_bold" | "kinetic" | "boxed" | "outline";
  fontId: string;
  stickers: "none" | "low" | "medium" | "high";
  zooms: "none" | "low" | "medium" | "high";
  transitions: "none" | "soft" | "hard";
  musicMood: "light" | "ambient" | "upbeat" | "cinematic" | "none";
  exampleProjectIds: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export function createEmptyStyleProfile(name = "My Style"): StyleProfile {
  const now = new Date().toISOString();
  return {
    id: `style_${Date.now().toString(36)}`,
    name,
    pacing: "medium",
    captions: "clean_bold",
    fontId: "arial_bold",
    stickers: "medium",
    zooms: "medium",
    transitions: "soft",
    musicMood: "upbeat",
    exampleProjectIds: [],
    notes: "Upload example videos later to refine this profile.",
    createdAt: now,
    updatedAt: now,
  };
}
