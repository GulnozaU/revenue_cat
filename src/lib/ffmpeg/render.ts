import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import type { EditPlan } from "@/lib/types/edit-plan";
import { FORMAT_PRESETS, type VideoFormat } from "@/lib/types/edit-plan";
import { runFfmpeg, storagePath } from "@/lib/ffmpeg/media";
import {
  getMusicAbsolutePath,
  getStickerAbsolutePath,
} from "@/lib/assets/library";

export type RenderOptions = {
  plan: EditPlan;
  sourcePath: string;
  outputPath: string;
  format: VideoFormat;
  quality: "preview" | "export";
};

export async function renderEditPlan(opts: RenderOptions): Promise<{
  outputPath: string;
  duration: number;
}> {
  const { plan, sourcePath, outputPath, format, quality } = opts;
  const preset = FORMAT_PRESETS[format];
  const outW = quality === "preview" ? Math.min(720, preset.width) : preset.width;
  const outH =
    quality === "preview"
      ? Math.round((outW * preset.height) / preset.width)
      : preset.height;

  const workDir = storagePath("tmp", `render_${Date.now()}`);
  await fs.mkdir(workDir, { recursive: true });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  try {
    const clipFiles: string[] = [];

    for (let i = 0; i < plan.clips.length; i++) {
      const clip = plan.clips[i];
      const out = path.join(workDir, `clip_${i}.mp4`);
      const speed = clip.speed || 1;
      const vf = [
        `scale=${outW}:${outH}:force_original_aspect_ratio=increase`,
        `crop=${outW}:${outH}`,
        speed !== 1 ? `setpts=PTS/${speed}` : null,
      ]
        .filter(Boolean)
        .join(",");

      try {
        await runFfmpeg([
          "-y",
          "-ss",
          String(clip.sourceStart),
          "-to",
          String(clip.sourceEnd),
          "-i",
          sourcePath,
          "-vf",
          vf,
          ...(speed !== 1 ? ["-af", `atempo=${clampTempo(speed)}`] : []),
          "-c:v",
          "libx264",
          "-preset",
          quality === "preview" ? "veryfast" : "medium",
          "-crf",
          quality === "preview" ? "28" : "20",
          "-c:a",
          "aac",
          "-b:a",
          quality === "preview" ? "96k" : "160k",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          out,
        ]);
      } catch {
        await runFfmpeg([
          "-y",
          "-ss",
          String(clip.sourceStart),
          "-to",
          String(clip.sourceEnd),
          "-i",
          sourcePath,
          "-f",
          "lavfi",
          "-i",
          "anullsrc=channel_layout=stereo:sample_rate=44100",
          "-vf",
          vf,
          "-c:v",
          "libx264",
          "-preset",
          quality === "preview" ? "veryfast" : "medium",
          "-crf",
          quality === "preview" ? "28" : "20",
          "-c:a",
          "aac",
          "-shortest",
          "-pix_fmt",
          "yuv420p",
          out,
        ]);
      }
      clipFiles.push(out);
    }

    const concatList = path.join(workDir, "concat.txt");
    await fs.writeFile(
      concatList,
      clipFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n"),
      "utf8"
    );

    const concatOut = path.join(workDir, "concat.mp4");
    await runFfmpeg([
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatList,
      "-c",
      "copy",
      concatOut,
    ]);

    const overlayOut = path.join(workDir, "overlaid.mp4");
    await burnOverlays({
      inputPath: concatOut,
      outputPath: overlayOut,
      plan,
      width: outW,
      height: outH,
      workDir,
      quality,
    });

    if (plan.music?.trackId) {
      await mixMusic({
        videoPath: overlayOut,
        musicPath: getMusicAbsolutePath(plan.music.trackId),
        outputPath,
        volume: plan.music.volume,
        fadeIn: plan.music.fadeIn ?? 0.4,
        fadeOut: plan.music.fadeOut ?? 0.8,
        startAt: plan.music.startAt ?? 0,
        duration: plan.duration,
      });
    } else {
      await fs.copyFile(overlayOut, outputPath);
    }

    return { outputPath, duration: plan.duration };
  } finally {
    try {
      await fs.rm(workDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

async function burnOverlays(opts: {
  inputPath: string;
  outputPath: string;
  plan: EditPlan;
  width: number;
  height: number;
  workDir: string;
  quality: "preview" | "export";
}) {
  const { inputPath, outputPath, plan, width, height, workDir, quality } = opts;

  type OverlayItem = {
    path: string;
    x: number;
    y: number;
    start: number;
    end: number;
  };

  const overlays: OverlayItem[] = [];

  // Stickers
  for (const sticker of plan.stickers) {
    const src = getStickerAbsolutePath(sticker.assetId);
    const sw = Math.max(24, Math.round(width * sticker.scale));
    const out = path.join(workDir, `stk_${sticker.id}.png`);
    await sharp(src).resize({ width: sw }).png().toFile(out);
    overlays.push({
      path: out,
      x: Math.round(sticker.x * width - sw / 2),
      y: Math.round(sticker.y * height - sw / 2),
      start: sticker.start,
      end: sticker.end,
    });
  }

  // Captions as PNG (no drawtext dependency)
  for (const cap of plan.captions) {
    const fontsize = Math.max(
      18,
      Math.round(((cap.fontSize || 44) * height) / (quality === "preview" ? 1280 : 1920))
    );
    const png = await renderTextPng({
      text: cap.text,
      fontSize: fontsize,
      boxed: cap.style === "boxed",
      outline: cap.style === "outline" || cap.style === "kinetic",
      maxWidth: Math.round(width * 0.88),
    });
    const out = path.join(workDir, `cap_${cap.id}.png`);
    await fs.writeFile(out, png);
    const meta = await sharp(png).metadata();
    const tw = meta.width ?? 100;
    const th = meta.height ?? 40;
    overlays.push({
      path: out,
      x: Math.round((cap.x ?? 0.5) * width - tw / 2),
      y: Math.round((cap.y ?? 0.78) * height - th / 2),
      start: cap.start,
      end: cap.end,
    });
  }

  for (const t of plan.textOverlays) {
    const fontsize = Math.max(
      18,
      Math.round(((t.fontSize || 56) * height) / (quality === "preview" ? 1280 : 1920))
    );
    const png = await renderTextPng({
      text: t.text,
      fontSize: fontsize,
      color: t.color || "#FFFFFF",
      boxed: false,
      outline: true,
      maxWidth: Math.round(width * 0.9),
    });
    const out = path.join(workDir, `txt_${t.id}.png`);
    await fs.writeFile(out, png);
    const meta = await sharp(png).metadata();
    const tw = meta.width ?? 100;
    const th = meta.height ?? 40;
    overlays.push({
      path: out,
      x: Math.round(t.x * width - tw / 2),
      y: Math.round(t.y * height - th / 2),
      start: t.start,
      end: t.end,
    });
  }

  const inputs: string[] = ["-y", "-i", inputPath];
  const filterParts: string[] = [];
  let lastLabel = "0:v";
  let inputIndex = 1;

  if (plan.zooms.length > 0) {
    const scale = plan.zooms[0].scale || 1.08;
    filterParts.push(
      `[${lastLabel}]scale=iw*${scale}:ih*${scale},crop=${width}:${height}:(iw-ow)/2:(ih-oh)/2[z0]`
    );
    lastLabel = "z0";
  }

  for (const item of overlays) {
    inputs.push("-i", item.path);
    const enable = `between(t\\,${item.start}\\,${item.end})`;
    const out = `o${inputIndex}`;
    filterParts.push(
      `[${lastLabel}][${inputIndex}:v]overlay=x=${item.x}:y=${item.y}:enable='${enable}'[${out}]`
    );
    lastLabel = out;
    inputIndex++;
  }

  if (filterParts.length === 0) {
    await fs.copyFile(inputPath, outputPath);
    return;
  }

  await runFfmpeg([
    ...inputs,
    "-filter_complex",
    filterParts.join(";"),
    "-map",
    `[${lastLabel}]`,
    "-map",
    "0:a?",
    "-c:v",
    "libx264",
    "-preset",
    quality === "preview" ? "veryfast" : "medium",
    "-crf",
    quality === "preview" ? "28" : "20",
    "-c:a",
    "aac",
    "-shortest",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputPath,
  ]);
}

async function renderTextPng(opts: {
  text: string;
  fontSize: number;
  color?: string;
  boxed?: boolean;
  outline?: boolean;
  maxWidth: number;
}): Promise<Buffer> {
  const color = opts.color ?? "#FFFFFF";
  const safe = opts.text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const pad = opts.boxed ? 18 : 8;
  const stroke = opts.outline
    ? `stroke="black" stroke-width="${Math.max(2, Math.round(opts.fontSize / 14))}" paint-order="stroke"`
    : "";
  const bg = opts.boxed
    ? `<rect x="0" y="0" width="100%" height="100%" rx="16" fill="rgba(0,0,0,0.55)"/>`
    : "";

  // Approximate text width for SVG canvas
  const approxW = Math.min(
    opts.maxWidth,
    Math.max(80, Math.round(opts.text.length * opts.fontSize * 0.55) + pad * 2)
  );
  const approxH = Math.round(opts.fontSize * 1.45) + pad * 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${approxW}" height="${approxH}">
  ${bg}
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif" font-size="${opts.fontSize}" font-weight="700"
    fill="${color}" ${stroke}>${safe}</text>
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function mixMusic(opts: {
  videoPath: string;
  musicPath: string;
  outputPath: string;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  startAt: number;
  duration: number;
}) {
  const fadeOutStart = Math.max(0, opts.duration - opts.fadeOut);
  const musicFilter = [
    `volume=${opts.volume}`,
    opts.fadeIn > 0 ? `afade=t=in:st=0:d=${opts.fadeIn}` : null,
    opts.fadeOut > 0 ? `afade=t=out:st=${fadeOutStart}:d=${opts.fadeOut}` : null,
  ]
    .filter(Boolean)
    .join(",");

  try {
    await runFfmpeg([
      "-y",
      "-i",
      opts.videoPath,
      "-ss",
      String(opts.startAt),
      "-i",
      opts.musicPath,
      "-filter_complex",
      `[1:a]${musicFilter}[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
      "-map",
      "0:v",
      "-map",
      "[aout]",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-shortest",
      opts.outputPath,
    ]);
  } catch {
    await runFfmpeg([
      "-y",
      "-i",
      opts.videoPath,
      "-ss",
      String(opts.startAt),
      "-i",
      opts.musicPath,
      "-filter_complex",
      `[1:a]${musicFilter}[aout]`,
      "-map",
      "0:v",
      "-map",
      "[aout]",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-shortest",
      opts.outputPath,
    ]);
  }
}

function clampTempo(speed: number) {
  return Math.min(2, Math.max(0.5, speed));
}

export {
  timelineToSource,
  activeCaption,
  activeZoom,
  activeTexts,
} from "@/lib/renderer/timeline";
