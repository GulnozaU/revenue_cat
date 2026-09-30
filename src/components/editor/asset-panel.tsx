"use client";

import { useMemo, useState } from "react";
import { useProjectStore } from "@/store/project-store";
import {
  assetCategories,
  searchAssets,
  type StyleboxAsset,
  type StyleboxAssetType,
} from "@/lib/assets/assetRegistry";
import { UNICODE_EMOJI } from "@/lib/assets/animations";

const TABS: { id: StyleboxAssetType | "text"; label: string }[] = [
  { id: "sticker", label: "Stickers" },
  { id: "emoji", label: "Emoji" },
  { id: "frame", label: "Frames" },
  { id: "doodle", label: "Doodles" },
  { id: "overlay", label: "Overlays" },
  { id: "text", label: "Text" },
];

const FAV_KEY = "stylebox-asset-favs";
const RECENT_KEY = "stylebox-asset-recent";

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeList(key: string, ids: string[]) {
  localStorage.setItem(key, JSON.stringify(ids.slice(0, 24)));
}

export function AssetPanel() {
  const plan = useProjectStore((s) => s.project?.editPlan);
  const setEditPlanLocal = useProjectStore((s) => s.setEditPlanLocal);
  const setSelection = useProjectStore((s) => s.setSelection);
  const playhead = useProjectStore((s) => s.playhead);
  const setPlayhead = useProjectStore((s) => s.setPlayhead);

  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("sticker");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [favs, setFavs] = useState<string[]>(() => readList(FAV_KEY));
  const [recent, setRecent] = useState<string[]>(() => readList(RECENT_KEY));

  const categories = useMemo(() => assetCategories(), []);
  const assets = useMemo(() => {
    if (tab === "emoji" || tab === "text") return [];
    return searchAssets({
      type: tab,
      category: category === "all" ? undefined : category,
      query,
    });
  }, [tab, category, query]);

  const recentAssets = recent
    .map((id) => searchAssets({ query: id }).find((asset) => asset.id === id))
    .filter((asset): asset is StyleboxAsset => Boolean(asset))
    .slice(0, 8);

  if (!plan) return null;

  const place = (length: number) => {
    const duration = plan.duration || 1;
    let start = playhead;
    let end = Math.min(duration, start + length);
    if (end - start < 0.5) {
      end = duration;
      start = Math.max(0, end - length);
    }
    setPlayhead(start + 0.05);
    return { start, end };
  };

  const remember = (id: string) => {
    const next = [id, ...recent.filter((item) => item !== id)].slice(0, 12);
    setRecent(next);
    writeList(RECENT_KEY, next);
  };

  const addAsset = (asset: StyleboxAsset) => {
    const id = `stk_${Date.now()}`;
    const range = place(2.8);
    setEditPlanLocal({
      ...plan,
      stickers: [
        ...plan.stickers,
        {
          id,
          assetId: asset.id,
          ...range,
          x: 0.7,
          y: 0.28,
          scale: asset.type === "frame" || asset.type === "overlay" ? 0.72 : 0.34,
          rotation: 0,
          opacity: asset.type === "overlay" ? 0.85 : 1,
          animation: "pop",
        },
      ],
    });
    setSelection({ type: "sticker", id });
    remember(asset.id);
  };

  const addEmoji = (emoji: string) => {
    const id = `stk_${Date.now()}`;
    const range = place(2.4);
    setEditPlanLocal({
      ...plan,
      stickers: [
        ...plan.stickers,
        {
          id,
          assetId: "emoji",
          emoji,
          ...range,
          x: 0.72,
          y: 0.22,
          scale: 0.28,
          rotation: 0,
          opacity: 1,
          animation: "pop",
        },
      ],
    });
    setSelection({ type: "sticker", id });
  };

  const addTitle = () => {
    const id = `text_${Date.now()}`;
    const range = place(3);
    setEditPlanLocal({
      ...plan,
      textOverlays: [
        ...plan.textOverlays,
        {
          id,
          ...range,
          text: "Your title",
          fontId: "satoshi",
          fontSize: 56,
          color: "#FFFFFF",
          x: 0.5,
          y: 0.18,
        },
      ],
    });
    setSelection({ type: "text", id });
  };

  const toggleFav = (id: string) => {
    const next = favs.includes(id) ? favs.filter((item) => item !== id) : [id, ...favs];
    setFavs(next);
    writeList(FAV_KEY, next);
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search assets..."
        className="h-8 w-full shrink-0 rounded-lg border border-[var(--editor-border)] bg-[var(--editor-panel-2)] px-2 text-xs text-[var(--editor-fg)] outline-none"
      />
      <div className="flex min-w-0 shrink-0 flex-wrap gap-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${
              tab === item.id
                ? "bg-[var(--editor-accent)] text-[#3a1f2a]"
                : "bg-[var(--editor-panel-2)] text-[var(--editor-muted)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab !== "emoji" && tab !== "text" && (
        <div className="flex min-w-0 shrink-0 gap-1 overflow-x-auto pb-1">
          <FilterChip active={category === "all"} onClick={() => setCategory("all")} label="All" />
          {categories.map((item) => (
            <FilterChip
              key={item}
              active={category === item}
              onClick={() => setCategory(item)}
              label={item}
            />
          ))}
        </div>
      )}

      {recentAssets.length > 0 && tab !== "emoji" && tab !== "text" && (
        <div className="shrink-0">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-[var(--editor-subtle)]">
            Recent
          </p>
          <div className="flex gap-1 overflow-x-auto">
            {recentAssets.map((asset) => (
              <AssetThumb key={asset.id} asset={asset} fav={favs.includes(asset.id)} onAdd={addAsset} onFav={toggleFav} />
            ))}
          </div>
        </div>
      )}

      {tab === "emoji" && (
        <div className="grid grid-cols-5 gap-1">
          {UNICODE_EMOJI.filter((emoji) => !query || emoji.includes(query)).map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="rounded-lg bg-[var(--editor-panel-2)] py-2 text-xl"
              onClick={() => addEmoji(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {tab === "text" && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={addTitle}
            className="w-full rounded-lg bg-[var(--editor-accent)] px-3 py-2 text-xs font-medium text-[#3a1f2a]"
          >
            Add title at playhead
          </button>
          <div className="grid grid-cols-3 gap-1.5">
            {searchAssets({ type: "doodle", query }).map((asset) => (
              <AssetThumb
                key={asset.id}
                asset={asset}
                fav={favs.includes(asset.id)}
                onAdd={addAsset}
                onFav={toggleFav}
              />
            ))}
          </div>
        </div>
      )}

      {tab !== "emoji" && tab !== "text" && (
        <div className="grid min-h-0 flex-1 grid-cols-3 gap-1.5 overflow-y-auto">
          {assets.map((asset) => (
            <AssetThumb
              key={asset.id}
              asset={asset}
              fav={favs.includes(asset.id)}
              onAdd={addAsset}
              onFav={toggleFav}
            />
          ))}
        </div>
      )}
      {tab !== "emoji" && tab !== "text" && assets.length === 0 && (
        <p className="text-[11px] text-[var(--editor-subtle)]">
          No assets in this filter. Drop PNGs into public/assets/stickers and run npm run assets:scan.
        </p>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] capitalize ${
        active ? "bg-white/15 text-white" : "text-[var(--editor-subtle)]"
      }`}
    >
      {label}
    </button>
  );
}

function AssetThumb({
  asset,
  fav,
  onAdd,
  onFav,
}: {
  asset: StyleboxAsset;
  fav: boolean;
  onAdd: (asset: StyleboxAsset) => void;
  onFav: (id: string) => void;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onAdd(asset)}
        title={asset.name}
        className="flex aspect-square w-full items-center justify-center rounded-lg border border-[var(--editor-border)] bg-[var(--editor-panel-2)] p-1"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.thumbnail || asset.src}
          alt={asset.name}
          loading="lazy"
          className="max-h-full max-w-full object-contain"
        />
      </button>
      <button
        type="button"
        aria-label={fav ? "Unfavorite" : "Favorite"}
        onClick={() => onFav(asset.id)}
        className="absolute right-0.5 top-0.5 text-[10px] text-white/80"
      >
        {fav ? "★" : "☆"}
      </button>
    </div>
  );
}
