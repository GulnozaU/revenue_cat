import type { AestheticId } from "@/lib/types/edit-plan";
import { ASSET_REGISTRY, type StyleboxAsset } from "@/lib/assets/assetRegistry";
import type { StickerAnimation } from "@/lib/assets/animations";

export type StylePack = {
  id: string;
  name: string;
  aestheticId?: AestheticId;
  categories: string[];
  tags: string[];
  assets: string[];
  fonts: string[];
  colors: string[];
  captionPreset: string;
  animations: StickerAnimation[];
  musicMood: string;
};

const PACK_DEFS: Omit<StylePack, "assets">[] = [
  {
    id: "coquette",
    name: "Coquette",
    aestheticId: "cute",
    categories: ["coquette", "kawaii", "spring"],
    tags: ["cute", "romantic", "pink"],
    fonts: ["chillax", "boska"],
    colors: ["#FF8FB8", "#FFFFFF", "#FFE56A"],
    captionPreset: "soft_bold",
    animations: ["pop", "float", "fade"],
    musicMood: "light",
  },
  {
    id: "y2k",
    name: "Y2K",
    categories: ["y2k", "retro", "tech"],
    tags: ["y2k", "retro", "dreamy"],
    fonts: ["clash_display", "satoshi"],
    colors: ["#9BE7FF", "#FF8FB8", "#FFFFFF"],
    captionPreset: "kinetic",
    animations: ["pop", "pulse", "spin"],
    musicMood: "upbeat",
  },
  {
    id: "cozy-vlog",
    name: "Cozy Vlog",
    aestheticId: "vlog",
    categories: ["kawaii", "travel", "food", "study"],
    tags: ["cozy", "cafe", "vlog"],
    fonts: ["switzer", "satoshi"],
    colors: ["#FFFFFF", "#FFE56A", "#C4A484"],
    captionPreset: "clean_bold",
    animations: ["fade", "slide-up", "float"],
    musicMood: "ambient",
  },
  {
    id: "clean-lifestyle",
    name: "Clean Lifestyle",
    aestheticId: "clean_lifestyle",
    categories: ["minimal", "luxury"],
    tags: ["minimal", "editorial", "clean"],
    fonts: ["satoshi", "general_sans"],
    colors: ["#FFFFFF", "#111111", "#E7E2DC"],
    captionPreset: "minimal",
    animations: ["fade", "scale-in"],
    musicMood: "ambient",
  },
  {
    id: "travel",
    name: "Travel",
    aestheticId: "travel",
    categories: ["travel", "summer", "nature"],
    tags: ["travel", "vacation", "scrapbook"],
    fonts: ["montserrat", "satoshi"],
    colors: ["#9BE7FF", "#FFE56A", "#FFFFFF"],
    captionPreset: "clean_bold",
    animations: ["slide-left", "pop", "fade"],
    musicMood: "upbeat",
  },
  {
    id: "food-diary",
    name: "Food Diary",
    aestheticId: "food",
    categories: ["food", "kawaii", "autumn"],
    tags: ["food", "cafe", "cozy"],
    fonts: ["boska", "literata"],
    colors: ["#FFE56A", "#FF8FB8", "#FFFFFF"],
    captionPreset: "soft_bold",
    animations: ["pop", "bounce", "fade"],
    musicMood: "light",
  },
  {
    id: "study",
    name: "Study",
    aestheticId: "educational",
    categories: ["study", "minimal", "doodles"],
    tags: ["study", "notes", "clean"],
    fonts: ["literata", "general_sans"],
    colors: ["#FFFFFF", "#111111", "#9BE7FF"],
    captionPreset: "minimal",
    animations: ["fade", "slide-up"],
    musicMood: "ambient",
  },
  {
    id: "gothic",
    name: "Dark / Gothic",
    categories: ["gothic", "halloween"],
    tags: ["gothic", "dark", "moody"],
    fonts: ["zodiak", "boska"],
    colors: ["#111111", "#FFFFFF", "#C9A0DC"],
    captionPreset: "outline",
    animations: ["fade", "float", "pulse"],
    musicMood: "cinematic",
  },
  {
    id: "cinematic",
    name: "Cinematic",
    aestheticId: "cinematic",
    categories: ["cinematic", "overlays", "frames", "vintage"],
    tags: ["cinematic", "film", "moody"],
    fonts: ["zodiak", "literata"],
    colors: ["#111111", "#FFFFFF", "#C4A484"],
    captionPreset: "minimal",
    animations: ["fade", "scale-in"],
    musicMood: "cinematic",
  },
  {
    id: "retro",
    name: "Retro",
    categories: ["retro", "vintage", "y2k"],
    tags: ["retro", "vintage", "nostalgic"],
    fonts: ["clash_display", "space_grotesk"],
    colors: ["#FFE56A", "#FF8FB8", "#111111"],
    captionPreset: "boxed",
    animations: ["pop", "wiggle", "slide-up"],
    musicMood: "upbeat",
  },
  {
    id: "nature",
    name: "Nature",
    categories: ["nature", "spring", "autumn", "summer"],
    tags: ["nature", "plants", "organic"],
    fonts: ["literata", "switzer"],
    colors: ["#FFFFFF", "#B7D7A8", "#C4A484"],
    captionPreset: "soft_bold",
    animations: ["fade", "float"],
    musicMood: "ambient",
  },
  {
    id: "fitness",
    name: "Sport / Fitness",
    aestheticId: "fast_paced",
    categories: ["fitness", "urban"],
    tags: ["fitness", "sport", "energy"],
    fonts: ["clash_display", "satoshi"],
    colors: ["#FFFFFF", "#111111", "#FFE56A"],
    captionPreset: "kinetic",
    animations: ["pop", "slide-up", "pulse"],
    musicMood: "upbeat",
  },
];

export const STYLE_PACKS: StylePack[] = PACK_DEFS.map((pack) => ({
  ...pack,
  assets: ASSET_REGISTRY.filter(
    (asset) =>
      pack.categories.includes(asset.category) ||
      asset.tags.some((tag) => pack.tags.includes(tag))
  ).map((asset) => asset.id),
}));

export function getStylePack(id: string): StylePack | undefined {
  return STYLE_PACKS.find((pack) => pack.id === id);
}

export function stylePackForAesthetic(aestheticId: AestheticId): StylePack {
  return (
    STYLE_PACKS.find((pack) => pack.aestheticId === aestheticId) ??
    STYLE_PACKS[0]
  );
}

export function assetsForPack(pack: StylePack): StyleboxAsset[] {
  const ids = new Set(pack.assets);
  return ASSET_REGISTRY.filter((asset) => ids.has(asset.id));
}
