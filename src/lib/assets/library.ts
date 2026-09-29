import path from "path";

export type FontDef = {
  id: string;
  name: string;
  category: "Cute" | "Clean" | "Bold" | "Minimal" | "Handwritten";
  file: string;
};

export const FONT_LIBRARY: FontDef[] = [
  {
    id: "arial",
    name: "Clean Sans",
    category: "Clean",
    file: "Arial.ttf",
  },
  {
    id: "arial_bold",
    name: "Bold Sans",
    category: "Bold",
    file: "ArialBold.ttf",
  },
  {
    id: "courier_bold",
    name: "Typewriter",
    category: "Minimal",
    file: "CourierBold.ttf",
  },
];

export function getFont(id: string): FontDef {
  return FONT_LIBRARY.find((f) => f.id === id) ?? FONT_LIBRARY[1];
}

export function getFontAbsolutePath(id: string): string {
  const font = getFont(id);
  return path.join(process.cwd(), "public", "assets", "fonts", font.file);
}

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
    | "Decorative";
  type: "image";
  url: string;
  file: string;
};

export const STICKER_LIBRARY: StickerAsset[] = [
  { id: "star", name: "Star", category: "Stars", type: "image", url: "/assets/stickers/star.png", file: "star.png" },
  { id: "heart", name: "Heart", category: "Hearts", type: "image", url: "/assets/stickers/heart.png", file: "heart.png" },
  { id: "arrow", name: "Arrow", category: "Arrows", type: "image", url: "/assets/stickers/arrow.png", file: "arrow.png" },
  { id: "sparkle", name: "Sparkle", category: "Decorative", type: "image", url: "/assets/stickers/sparkle.png", file: "sparkle.png" },
  { id: "circle", name: "Ring", category: "Shapes", type: "image", url: "/assets/stickers/circle.png", file: "circle.png" },
  { id: "fire", name: "Fire", category: "Reaction", type: "image", url: "/assets/stickers/fire.png", file: "fire.png" },
];

export function getSticker(id: string) {
  return STICKER_LIBRARY.find((s) => s.id === id) ?? STICKER_LIBRARY[0];
}

export function getStickerAbsolutePath(id: string): string {
  const s = getSticker(id);
  return path.join(process.cwd(), "public", "assets", "stickers", s.file);
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

export function getMusicAbsolutePath(id: string): string {
  const t = getMusicTrack(id);
  return path.join(process.cwd(), "public", "assets", "music", t.file);
}
