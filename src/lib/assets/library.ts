import {
  EDITOR_FONTS,
  getEditorFont,
  type EditorFont,
} from "@/data/fonts";
import { getAsset } from "@/lib/assets/assetRegistry";

/** @deprecated Prefer EditorFont from @/data/fonts — kept for existing imports */
export type FontDef = {
  id: string;
  name: string;
  category: string;
  file: string;
  url: string;
  family?: string;
};

export const FONT_LIBRARY: FontDef[] = EDITOR_FONTS.map((f) => ({
  id: f.id,
  name: f.name,
  category: f.aesthetics[0] ?? "clean",
  file: f.file,
  url: f.url,
  family: f.family,
}));

export function getFont(id: string): FontDef & { family: string } {
  const f: EditorFont = getEditorFont(id);
  return {
    id: f.id,
    name: f.name,
    category: f.aesthetics[0] ?? "clean",
    file: f.file,
    url: f.url,
    family: f.family,
  };
}

export { EDITOR_FONTS, getEditorFont };

export type StickerAsset = {
  id: string;
  name: string;
  category:
    | "Cute"
    | "Arrows"
    | "Stars"
    | "Hearts"
    | "Doodles"
    | "Shapes"
    | "Reaction"
    | "Lifestyle"
    | "Food"
    | "Travel"
    | "Decorative"
    | "Study";
  type: "image";
  url: string;
  file: string;
};

export const STICKER_LIBRARY: StickerAsset[] = [
  { id: "star", name: "Star", category: "Stars", type: "image", url: "/assets/stickers/star.png", file: "star.png" },
  { id: "star2", name: "Gold Star", category: "Stars", type: "image", url: "/assets/stickers/star2.png", file: "star2.png" },
  { id: "heart", name: "Heart", category: "Hearts", type: "image", url: "/assets/stickers/heart.png", file: "heart.png" },
  { id: "heart2", name: "Soft Heart", category: "Hearts", type: "image", url: "/assets/stickers/heart2.png", file: "heart2.png" },
  { id: "bow", name: "Bow", category: "Cute", type: "image", url: "/assets/stickers/bow.png", file: "bow.png" },
  { id: "flower", name: "Flower", category: "Cute", type: "image", url: "/assets/stickers/flower.png", file: "flower.png" },
  { id: "spark", name: "Spark", category: "Decorative", type: "image", url: "/assets/stickers/spark.png", file: "spark.png" },
  { id: "sparkle", name: "Sparkle", category: "Decorative", type: "image", url: "/assets/stickers/sparkle.png", file: "sparkle.png" },
  { id: "arrow", name: "Arrow", category: "Arrows", type: "image", url: "/assets/stickers/arrow.png", file: "arrow.png" },
  { id: "circle", name: "Ring", category: "Shapes", type: "image", url: "/assets/stickers/circle.png", file: "circle.png" },
  { id: "fire", name: "Fire", category: "Reaction", type: "image", url: "/assets/stickers/fire.png", file: "fire.png" },
];

export function getSticker(id: string) {
  const asset = getAsset(id);
  if (asset?.src) {
    return {
      id: asset.id,
      name: asset.name,
      category: "Decorative" as const,
      type: "image" as const,
      url: asset.src,
      file: asset.src.split("/").pop() ?? `${asset.id}.png`,
    };
  }
  return STICKER_LIBRARY.find((s) => s.id === id) ?? STICKER_LIBRARY[0];
}

export type MusicTrack = {
  id: string;
  title: string;
  mood: string;
  url: string;
  file: string;
  duration: number;
  bpm?: number;
};

export const MUSIC_LIBRARY: MusicTrack[] = [
  {
    id: "ocean_dreams",
    title: "Ocean Dreams",
    mood: "ambient",
    url: "/music/ocean-dreams.mp3",
    file: "ocean-dreams.mp3",
    duration: 60,
    bpm: 92,
  },
  {
    id: "upbeat_01",
    title: "Pulse Drive",
    mood: "upbeat",
    url: "/assets/music/upbeat_01.mp3",
    file: "upbeat_01.mp3",
    duration: 60,
    bpm: 118,
  },
  {
    id: "chill_01",
    title: "Soft Focus",
    mood: "ambient",
    url: "/assets/music/chill_01.mp3",
    file: "chill_01.mp3",
    duration: 60,
    bpm: 92,
  },
  {
    id: "cinematic_01",
    title: "Wide Frame",
    mood: "cinematic",
    url: "/assets/music/cinematic_01.mp3",
    file: "cinematic_01.mp3",
    duration: 60,
    bpm: 100,
  },
];

export function getMusicTrack(id: string) {
  return MUSIC_LIBRARY.find((t) => t.id === id) ?? MUSIC_LIBRARY[0];
}
