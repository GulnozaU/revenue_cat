/**
 * Split the Stylebox sticker sheet into individual transparent PNGs.
 * Cells that cannot be separated cleanly are skipped (not saved as a whole sheet).
 *
 * Usage: node scripts/extract-sticker-sheet.mjs
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SHEET = path.join(ROOT, "public/assets/source/stylebox-sticker-sheet.png");
const OUT = path.join(ROOT, "public/assets/stickers");
const MANIFEST = path.join(ROOT, "src/data/extracted-assets.json");

const COLS = [0, 219, 437, 656, 875, 1093, 1312];
const ROWS = [0, 240, 480, 719, 959, 1199];

/** Row-major categories matching the sheet. */
const CELLS = [
  [
    { folder: "coquette", type: "sticker", tags: ["coquette", "cute", "romantic", "pink"] },
    { folder: "y2k", type: "sticker", tags: ["y2k", "retro", "dreamy", "2000s"] },
    { folder: "nature", type: "sticker", tags: ["nature", "plants", "green", "organic"] },
    { folder: "travel", type: "sticker", tags: ["travel", "vacation", "scrapbook"] },
    { folder: "food", type: "sticker", tags: ["food", "drink", "cafe", "cozy"] },
    { folder: "study", type: "sticker", tags: ["study", "school", "notes"] },
  ],
  [
    { folder: "kawaii", type: "sticker", tags: ["kawaii", "cute", "playful"] },
    { folder: "gothic", type: "sticker", tags: ["gothic", "dark", "moody"] },
    { folder: "minimal", type: "sticker", tags: ["minimal", "editorial", "clean"] },
    { folder: "retro", type: "sticker", tags: ["retro", "vintage", "playful"] },
    { folder: "cinematic", type: "sticker", tags: ["cinematic", "film", "moody"] },
    { folder: "urban", type: "sticker", tags: ["urban", "street", "bold"] },
  ],
  [
    { folder: "luxury", type: "sticker", tags: ["luxury", "elegant", "gold"] },
    { folder: "vintage", type: "sticker", tags: ["vintage", "paper", "nostalgic"] },
    { folder: "fantasy", type: "sticker", tags: ["fantasy", "magic", "storybook"] },
    { folder: "music", type: "sticker", tags: ["music", "audio", "pop"] },
    { folder: "fitness", type: "sticker", tags: ["fitness", "sport", "energy"] },
    { folder: "seasonal", type: "sticker", tags: ["winter", "holiday", "seasonal"] },
  ],
  [
    { folder: "summer", type: "sticker", tags: ["summer", "sun", "vacation"] },
    { folder: "spring", type: "sticker", tags: ["spring", "floral", "fresh"] },
    { folder: "autumn", type: "sticker", tags: ["autumn", "warm", "seasonal"] },
    { folder: "halloween", type: "sticker", tags: ["halloween", "spooky", "october"] },
    { folder: "emoji", type: "sticker", tags: ["emoji", "face", "reaction"] },
    { folder: "doodles", type: "doodle", tags: ["doodle", "handwritten", "sketch"] },
  ],
  [
    { folder: "frames", type: "frame", tags: ["frame", "border", "layout"] },
    { folder: "tech", type: "sticker", tags: ["tech", "ui", "digital"] },
    { folder: "abstract", type: "sticker", tags: ["abstract", "shape", "gradient"] },
    { folder: "overlays", type: "overlay", tags: ["overlay", "light", "texture"] },
    { folder: "doodles", type: "doodle", tags: ["text", "phrase", "caption"] },
    { folder: "abstract", type: "sticker", tags: ["motion", "animated", "accent"] },
  ],
];

function isInk(r, g, b, a) {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return a > 90 && (mx - mn > 18 || mn < 190);
}

function components(mask, w, h) {
  const seen = new Uint8Array(w * h);
  const stack = [];
  const boxes = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = y * w + x;
      if (!mask[s] || seen[s]) continue;
      let minx = x;
      let maxx = x;
      let miny = y;
      let maxy = y;
      let count = 0;
      stack.push(s);
      seen[s] = 1;
      while (stack.length) {
        const p = stack.pop();
        const py = (p / w) | 0;
        const px = p - py * w;
        count++;
        if (px < minx) minx = px;
        if (px > maxx) maxx = px;
        if (py < miny) miny = py;
        if (py > maxy) maxy = py;
        for (const n of [p - 1, p + 1, p - w, p + w]) {
          if (n < 0 || n >= mask.length || seen[n] || !mask[n]) continue;
          const ny = (n / w) | 0;
          const nx = n - ny * w;
          if (Math.abs(nx - px) > 1) continue;
          seen[n] = 1;
          stack.push(n);
        }
      }
      boxes.push({ minx, miny, maxx, maxy, count });
    }
  }
  return boxes;
}

const { data, info } = await sharp(SHEET).ensureAlpha().raw().toBuffer({
  resolveWithObject: true,
});
const W = info.width;
const H = info.height;
const CH = info.channels;

const manifest = [];
let seqByFolder = {};

for (let r = 0; r < CELLS.length; r++) {
  for (let c = 0; c < CELLS[r].length; c++) {
    const meta = CELLS[r][c];
    const x0 = COLS[c];
    const y0 = ROWS[r];
    const x1 = COLS[c + 1];
    const y1 = ROWS[r + 1];
    const w = x1 - x0;
    const h = y1 - y0;
    const mask = new Uint8Array(w * h);
    for (let y = 20; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        const i = ((y0 + y) * W + (x0 + x)) * CH;
        if (isInk(data[i], data[i + 1], data[i + 2], data[i + 3])) {
          mask[y * w + x] = 1;
        }
      }
    }
    const boxes = components(mask, w, h).filter((b) => {
      const bw = b.maxx - b.minx + 1;
      const bh = b.maxy - b.miny + 1;
      if (b.count < 70 || bw < 16 || bh < 16) return false;
      if (bw > 100 || bh > 110) return false;
      if (bw * bh > w * h * 0.22) return false;
      return true;
    });

    const dir = path.join(OUT, meta.folder);
    fs.mkdirSync(dir, { recursive: true });

    for (const b of boxes.sort((a, z) => a.miny - z.miny || a.minx - z.minx)) {
      seqByFolder[meta.folder] = (seqByFolder[meta.folder] ?? 0) + 1;
      const n = String(seqByFolder[meta.folder]).padStart(2, "0");
      const id = `${meta.folder}-${n}`;
      const file = `${n}.png`;
      const pad = 4;
      const left = Math.max(0, x0 + b.minx - pad);
      const top = Math.max(0, y0 + b.miny - pad);
      const right = Math.min(W, x0 + b.maxx + 1 + pad);
      const bottom = Math.min(H, y0 + b.maxy + 1 + pad);
      const cropW = right - left;
      const cropH = bottom - top;
      const raw = Buffer.alloc(cropW * cropH * 4);
      for (let y = 0; y < cropH; y++) {
        for (let x = 0; x < cropW; x++) {
          const si = ((top + y) * W + (left + x)) * CH;
          const di = (y * cropW + x) * 4;
          let rch = data[si];
          let gch = data[si + 1];
          let bch = data[si + 2];
          let a = data[si + 3];
          const mx = Math.max(rch, gch, bch);
          const mn = Math.min(rch, gch, bch);
          if (a < 80 || (mn > 232 && mx - mn < 18)) a = 0;
          else if (mn > 210 && mx - mn < 22) a = Math.round(a * 0.35);
          raw[di] = rch;
          raw[di + 1] = gch;
          raw[di + 2] = bch;
          raw[di + 3] = a;
        }
      }
      const dest = path.join(dir, file);
      await sharp(raw, { raw: { width: cropW, height: cropH, channels: 4 } })
        .png()
        .toFile(dest);
      const thumbName = `${n}.thumb.png`;
      await sharp(dest)
        .resize(96, 96, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toFile(path.join(dir, thumbName));
      manifest.push({
        id,
        type: meta.type,
        name: `${meta.folder} ${n}`,
        category: meta.folder,
        tags: [...meta.tags, meta.folder],
        src: `/assets/stickers/${meta.folder}/${file}`,
        thumbnail: `/assets/stickers/${meta.folder}/${thumbName}`,
        animated: false,
      });
    }
  }
}

fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
console.log(`extracted ${manifest.length} assets`);
const by = {};
for (const a of manifest) by[a.category] = (by[a.category] ?? 0) + 1;
console.log(by);
