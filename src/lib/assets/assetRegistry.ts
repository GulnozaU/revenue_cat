import registry from "@/data/asset-registry.json";
import { STICKER_ANIMATIONS, type StickerAnimation } from "@/lib/assets/animations";

export type StyleboxAssetType = "sticker" | "frame" | "overlay" | "doodle" | "emoji";

export type StyleboxAsset = {
  id: string;
  type: StyleboxAssetType;
  name: string;
  category: string;
  tags: string[];
  src: string;
  thumbnail?: string;
  animated?: boolean;
  animationPresets?: StickerAnimation[];
};

export const ASSET_REGISTRY: StyleboxAsset[] = registry as StyleboxAsset[];

const BY_ID = new Map(ASSET_REGISTRY.map((asset) => [asset.id, asset]));

export function getAsset(id: string): StyleboxAsset | undefined {
  return BY_ID.get(id);
}

export function assetCategories(): string[] {
  return [...new Set(ASSET_REGISTRY.map((asset) => asset.category))].sort();
}

export function assetsByType(type: StyleboxAssetType): StyleboxAsset[] {
  return ASSET_REGISTRY.filter((asset) => asset.type === type);
}

export function searchAssets(input: {
  type?: StyleboxAssetType | "all";
  category?: string;
  query?: string;
}): StyleboxAsset[] {
  const q = input.query?.trim().toLowerCase() ?? "";
  return ASSET_REGISTRY.filter((asset) => {
    if (input.type && input.type !== "all" && asset.type !== input.type) return false;
    if (input.category && input.category !== "all") {
      const hit =
        asset.category === input.category || asset.tags.includes(input.category);
      if (!hit) return false;
    }
    if (!q) return true;
    return (
      asset.name.toLowerCase().includes(q) ||
      asset.category.includes(q) ||
      asset.tags.some((tag) => tag.includes(q)) ||
      asset.id.includes(q)
    );
  });
}

/** Compact catalog so the model can only recommend ids that exist. */
export function assetCatalogText(): string {
  const groups = new Map<string, string[]>();
  for (const asset of ASSET_REGISTRY) {
    const list = groups.get(asset.category) ?? [];
    list.push(asset.id);
    groups.set(asset.category, list);
  }
  return [...groups.entries()]
    .map(([category, ids]) => `${category}: ${ids.join(", ")}`)
    .join("\n");
}

export function fallbackAssetId(category?: string): string {
  const match = category
    ? ASSET_REGISTRY.find((asset) => asset.category === category || asset.tags.includes(category))
    : undefined;
  return match?.id ?? ASSET_REGISTRY[0]?.id ?? "sparkle";
}

export { STICKER_ANIMATIONS };
