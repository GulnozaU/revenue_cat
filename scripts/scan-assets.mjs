/**
 * Rebuild src/data/asset-registry.json from files on disk.
 * Drop new PNGs into public/assets/stickers/<category>/ and run:
 *   npm run assets:scan
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const STICKER_ROOT = path.join(ROOT, "public/assets/stickers");
const EXTRACTED = path.join(ROOT, "src/data/extracted-assets.json");
const OUT = path.join(ROOT, "src/data/asset-registry.json");

const CLASSICS = [
  { id: "sparkle", file: "sparkle.png", name: "Sparkle", category: "coquette", type: "sticker", tags: ["sparkle", "cute", "coquette", "glow"] },
  { id: "heart", file: "heart.png", name: "Heart", category: "coquette", type: "sticker", tags: ["heart", "cute", "romantic", "pink"] },
  { id: "bow", file: "bow.png", name: "Bow", category: "coquette", type: "sticker", tags: ["bow", "coquette", "cute", "pink"] },
  { id: "flower", file: "flower.png", name: "Flower", category: "spring", type: "sticker", tags: ["flower", "spring", "nature", "cute"] },
  { id: "star", file: "star.png", name: "Star", category: "y2k", type: "sticker", tags: ["star", "y2k", "sparkle"] },
  { id: "fire", file: "fire.png", name: "Fire", category: "urban", type: "sticker", tags: ["fire", "energy", "urban"] },
  { id: "arrow", file: "arrow.png", name: "Arrow", category: "minimal", type: "sticker", tags: ["arrow", "minimal", "direction"] },
];

const extracted = fs.existsSync(EXTRACTED)
  ? JSON.parse(fs.readFileSync(EXTRACTED, "utf8"))
  : [];
const bySrc = new Map(extracted.map((a) => [a.src, a]));

const assets = [];

for (const classic of CLASSICS) {
  const abs = path.join(STICKER_ROOT, classic.file);
  if (!fs.existsSync(abs)) continue;
  assets.push({
    id: classic.id,
    type: classic.type,
    name: classic.name,
    category: classic.category,
    tags: classic.tags,
    src: `/assets/stickers/${classic.file}`,
    thumbnail: `/assets/stickers/${classic.file}`,
    animated: false,
    animationPresets: ["fade", "pop", "float"],
  });
}

function walk(dir, folder) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith("_") || entry.name === "source") continue;
      walk(abs, entry.name);
      continue;
    }
    if (!entry.name.endsWith(".png")) continue;
    if (entry.name.includes(".thumb.") || entry.name.includes("sticker-sheet")) continue;
    if (!folder) continue;
    const src = `/assets/stickers/${folder}/${entry.name}`;
    const known = bySrc.get(src);
    const thumb = src.replace(/\.png$/, ".thumb.png");
    const thumbAbs = path.join(ROOT, "public", thumb.replace(/^\//, ""));
    const id = known?.id ?? `${folder}-${entry.name.replace(/\.png$/, "")}`;
    if (assets.some((a) => a.id === id || a.src === src)) continue;
    assets.push({
      id,
      type: known?.type ?? (folder === "frames" ? "frame" : folder === "overlays" ? "overlay" : folder === "doodles" ? "doodle" : "sticker"),
      name: known?.name ?? `${folder} ${entry.name.replace(/\.png$/, "")}`,
      category: folder,
      tags: known?.tags ?? [folder],
      src,
      thumbnail: fs.existsSync(thumbAbs) ? thumb : src,
      animated: false,
      animationPresets: ["fade", "pop", "slide-up", "float", "wiggle", "pulse"],
    });
  }
}

walk(STICKER_ROOT, "");

assets.sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id));
fs.writeFileSync(OUT, JSON.stringify(assets, null, 2));
console.log(`registry ${assets.length} assets -> ${path.relative(ROOT, OUT)}`);
