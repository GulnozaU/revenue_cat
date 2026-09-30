/**
 * Client-only ffmpeg.wasm video renderer.
 * Do NOT import this module from server / Route Handlers.
 */
"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type { EditPlan, VideoFormat } from "@/lib/types/edit-plan";
import { FORMAT_PRESETS } from "@/lib/types/edit-plan";
import { getFont, getMusicTrack, getSticker } from "@/lib/assets/library";

let ffmpegSingleton: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

export type RenderProgress = {
  ratio: number;
  message: string;
};

function clampTempo(speed: number) {
  return Math.min(2, Math.max(0.5, speed));
}

async function renderTextPng(opts: {
  text: string;
  fontSize: number;
  color?: string;
  boxed?: boolean;
  outline?: boolean;
  maxWidth: number;
  fontFamily?: string;
}): Promise<Uint8Array> {
  const color = opts.color ?? "#FFFFFF";
  const pad = opts.boxed ? 18 : 8;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser does not support canvas text rendering.");

  const fontFamily = opts.fontFamily ?? "Arial, Helvetica, sans-serif";
  ctx.font = `700 ${opts.fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(opts.text);
  const textW = Math.ceil(metrics.width);
  const approxW = Math.min(
    opts.maxWidth,
    Math.max(80, textW + pad * 2)
  );
  const approxH = Math.round(opts.fontSize * 1.45) + pad * 2;
  canvas.width = approxW;
  canvas.height = approxH;

  if (opts.boxed) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    const r = 16;
    ctx.beginPath();
    ctx.roundRect(0, 0, approxW, approxH, r);
    ctx.fill();
  }

  ctx.font = `700 ${opts.fontSize}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (opts.outline) {
    ctx.lineWidth = Math.max(2, Math.round(opts.fontSize / 14));
    ctx.strokeStyle = "black";
    ctx.strokeText(opts.text, approxW / 2, approxH / 2);
  }
  ctx.fillStyle = color;
  ctx.fillText(opts.text, approxW / 2, approxH / 2);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to encode caption PNG"))),
      "image/png"
    );
  });
  return new Uint8Array(await blob.arrayBuffer());
}

async function loadFontFace(fontId: string): Promise<string> {
  const font = getFont(fontId);
  try {
    const face = new FontFace(font.name, `url(${font.url})`);
    await face.load();
    document.fonts.add(face);
    return `"${font.name}", Arial, sans-serif`;
  } catch {
    return "Arial, Helvetica, sans-serif";
  }
}

/**
 * Lazily load ~31MB ffmpeg core. Call only when rendering is needed.
 */
export async function ensureBrowserFFmpeg(
  onProgress?: (p: RenderProgress) => void
): Promise<FFmpeg> {
  if (ffmpegSingleton?.loaded) return ffmpegSingleton;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    onProgress?.({ ratio: 0.02, message: "Loading FFmpeg browser engine…" });
    const ffmpeg = new FFmpeg();
    ffmpeg.on("progress", ({ progress }) => {
      onProgress?.({
        ratio: Math.min(0.99, Math.max(0.05, progress || 0)),
        message: "Rendering video…",
      });
    });

    // Single-thread core — no SharedArrayBuffer / COOP headers required
    const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
      });
    } catch (err) {
      loadPromise = null;
      throw new Error(
        `FFmpeg browser engine failed to load. ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    ffmpegSingleton = ffmpeg;
    onProgress?.({ ratio: 0.08, message: "FFmpeg ready" });
    return ffmpeg;
  })();

  return loadPromise;
}

async function safeDelete(ffmpeg: FFmpeg, name: string) {
  try {
    await ffmpeg.deleteFile(name);
  } catch {
    /* ignore */
  }
}

/**
 * Translate EditPlan → real MP4 Blob via ffmpeg.wasm in the browser.
 */
export async function renderEditPlanInBrowser(opts: {
  source: File | Blob;
  plan: EditPlan;
  format: VideoFormat;
  quality?: "preview" | "export";
  onProgress?: (p: RenderProgress) => void;
}): Promise<Blob> {
  const quality = opts.quality ?? "preview";
  const { plan, format, source, onProgress } = opts;
  const preset = FORMAT_PRESETS[format];
  const outW =
    quality === "preview" ? Math.min(720, preset.width) : preset.width;
  const outH =
    quality === "preview"
      ? Math.round((outW * preset.height) / preset.width)
      : preset.height;

  const usableClips = plan.clips.filter(
    (c) => Number(c.sourceEnd) - Number(c.sourceStart) >= 0.15
  );
  if (usableClips.length === 0) {
    throw new Error(
      "Video rendering failed: edit plan has no valid clips."
    );
  }

  const ffmpeg = await ensureBrowserFFmpeg(onProgress);
  const tempFiles: string[] = [];
  const track = (name: string) => {
    tempFiles.push(name);
    return name;
  };

  try {
    onProgress?.({ ratio: 0.1, message: "Writing source into FFmpeg…" });
    const inputName = track("input.mp4");
    await ffmpeg.writeFile(inputName, await fetchFile(source));

    const clipFiles: string[] = [];
    for (let i = 0; i < usableClips.length; i++) {
      const clip = usableClips[i];
      const start = Number(clip.sourceStart);
      const end = Number(clip.sourceEnd);
      const dur = Math.max(0.15, end - start);
      const speed = clip.speed || 1;
      const out = track(`clip_${i}.mp4`);
      const vf = [
        `scale=${outW}:${outH}:force_original_aspect_ratio=increase`,
        `crop=${outW}:${outH}`,
        speed !== 1 ? `setpts=PTS/${speed}` : null,
      ]
        .filter(Boolean)
        .join(",");

      onProgress?.({
        ratio: 0.12 + (0.45 * i) / usableClips.length,
        message: `Cutting clip ${i + 1}/${usableClips.length}…`,
      });

      const args = [
        "-ss",
        String(start),
        "-t",
        String(dur),
        "-i",
        inputName,
        "-vf",
        vf,
        ...(speed !== 1 ? ["-af", `atempo=${clampTempo(speed)}`] : []),
        "-c:v",
        "libx264",
        "-preset",
        quality === "preview" ? "ultrafast" : "veryfast",
        "-crf",
        quality === "preview" ? "28" : "23",
        "-c:a",
        "aac",
        "-b:a",
        quality === "preview" ? "96k" : "160k",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        out,
      ];

      let code = await ffmpeg.exec(args);
      if (code !== 0) {
        // Retry with silent audio if source has no usable audio track
        code = await ffmpeg.exec([
          "-ss",
          String(start),
          "-t",
          String(dur),
          "-i",
          inputName,
          "-f",
          "lavfi",
          "-i",
          "anullsrc=channel_layout=stereo:sample_rate=44100",
          "-vf",
          vf,
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-crf",
          "28",
          "-c:a",
          "aac",
          "-shortest",
          "-pix_fmt",
          "yuv420p",
          out,
        ]);
      }
      if (code !== 0) {
        throw new Error(`Video rendering failed while cutting clip ${i + 1}.`);
      }
      clipFiles.push(out);
    }

    onProgress?.({ ratio: 0.6, message: "Concatenating clips…" });
    const concatList = track("concat.txt");
    const listBody = clipFiles.map((f) => `file '${f}'`).join("\n");
    await ffmpeg.writeFile(concatList, listBody);

    const concatOut = track("concat.mp4");
    let code = await ffmpeg.exec([
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
    if (code !== 0) {
      // Re-encode concat if stream copy fails
      code = await ffmpeg.exec([
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concatList,
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "28",
        "-c:a",
        "aac",
        "-pix_fmt",
        "yuv420p",
        concatOut,
      ]);
    }
    if (code !== 0) {
      throw new Error("Video rendering failed while concatenating clips.");
    }

    onProgress?.({ ratio: 0.7, message: "Burning overlays…" });
    const overlayOut = track("overlaid.mp4");
    await burnOverlaysBrowser({
      ffmpeg,
      inputName: concatOut,
      outputName: overlayOut,
      plan,
      width: outW,
      height: outH,
      quality,
      track,
    });

    let finalName = overlayOut;
    if (plan.music?.trackId) {
      onProgress?.({ ratio: 0.88, message: "Mixing music…" });
      const mixed = track("mixed.mp4");
      await mixMusicBrowser({
        ffmpeg,
        videoName: overlayOut,
        outputName: mixed,
        trackId: plan.music.trackId,
        volume: plan.music.volume,
        fadeIn: plan.music.fadeIn ?? 0.4,
        fadeOut: plan.music.fadeOut ?? 0.8,
        startAt: plan.music.startAt ?? 0,
        duration: plan.duration,
        track,
      });
      finalName = mixed;
    }

    onProgress?.({ ratio: 0.96, message: "Reading output…" });
    const data = await ffmpeg.readFile(finalName);
    if (!(data instanceof Uint8Array) || data.byteLength < 32) {
      throw new Error("Video rendering failed: empty output.");
    }

    // Copy into a fresh ArrayBuffer-backed view for Blob compatibility
    const copy = new Uint8Array(data.byteLength);
    copy.set(data);
    const blob = new Blob([copy.buffer], { type: "video/mp4" });
    onProgress?.({ ratio: 1, message: "Render complete" });
    return blob;
  } catch (err) {
    if (err instanceof Error && /rendering failed|FFmpeg browser|does not support/i.test(err.message)) {
      throw err;
    }
    throw new Error(
      `Video rendering failed. ${err instanceof Error ? err.message : String(err)}`
    );
  } finally {
    for (const f of tempFiles) {
      await safeDelete(ffmpeg, f);
    }
  }
}

async function burnOverlaysBrowser(opts: {
  ffmpeg: FFmpeg;
  inputName: string;
  outputName: string;
  plan: EditPlan;
  width: number;
  height: number;
  quality: "preview" | "export";
  track: (n: string) => string;
}) {
  const { ffmpeg, inputName, outputName, plan, width, height, quality, track } =
    opts;

  type OverlayItem = {
    path: string;
    x: number;
    y: number;
    start: number;
    end: number;
  };
  const overlays: OverlayItem[] = [];

  for (const sticker of plan.stickers) {
    const asset = getSticker(sticker.assetId);
    const sw = Math.max(24, Math.round(width * sticker.scale));
    const raw = await fetchFile(asset.url);
    const stkName = track(`stk_${sticker.id}.png`);
    // Resize via ffmpeg scale of the sticker itself in filter; write original
    await ffmpeg.writeFile(stkName, raw);
    const scaled = track(`stk_${sticker.id}_s.png`);
    await ffmpeg.exec([
      "-i",
      stkName,
      "-vf",
      `scale=${sw}:-1`,
      scaled,
    ]);
    overlays.push({
      path: scaled,
      x: Math.round(sticker.x * width - sw / 2),
      y: Math.round(sticker.y * height - sw / 2),
      start: sticker.start,
      end: sticker.end,
    });
  }

  for (const cap of plan.captions) {
    const fontFamily = await loadFontFace(cap.fontId || "arial_bold");
    const fontsize = Math.max(
      18,
      Math.round(
        ((cap.fontSize || 44) * height) / (quality === "preview" ? 1280 : 1920)
      )
    );
    const png = await renderTextPng({
      text: cap.text,
      fontSize: fontsize,
      boxed: cap.style === "boxed",
      outline: cap.style === "outline" || cap.style === "kinetic",
      maxWidth: Math.round(width * 0.88),
      fontFamily,
    });
    const name = track(`cap_${cap.id}.png`);
    await ffmpeg.writeFile(name, png);
    // Approximate size from canvas — measure again via Image
    const dims = await pngDimensions(png);
    overlays.push({
      path: name,
      x: Math.round((cap.x ?? 0.5) * width - dims.w / 2),
      y: Math.round((cap.y ?? 0.78) * height - dims.h / 2),
      start: cap.start,
      end: cap.end,
    });
  }

  for (const t of plan.textOverlays) {
    const fontFamily = await loadFontFace(t.fontId || "arial_bold");
    const fontsize = Math.max(
      18,
      Math.round(
        ((t.fontSize || 56) * height) / (quality === "preview" ? 1280 : 1920)
      )
    );
    const png = await renderTextPng({
      text: t.text,
      fontSize: fontsize,
      color: t.color || "#FFFFFF",
      boxed: false,
      outline: true,
      maxWidth: Math.round(width * 0.9),
      fontFamily,
    });
    const name = track(`txt_${t.id}.png`);
    await ffmpeg.writeFile(name, png);
    const dims = await pngDimensions(png);
    overlays.push({
      path: name,
      x: Math.round(t.x * width - dims.w / 2),
      y: Math.round(t.y * height - dims.h / 2),
      start: t.start,
      end: t.end,
    });
  }

  const filterParts: string[] = [];
  let lastLabel = "0:v";
  let inputIndex = 1;
  const inputs: string[] = ["-i", inputName];

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
    await ffmpeg.exec(["-i", inputName, "-c", "copy", outputName]);
    return;
  }

  const code = await ffmpeg.exec([
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
    quality === "preview" ? "ultrafast" : "veryfast",
    "-crf",
    quality === "preview" ? "28" : "23",
    "-c:a",
    "aac",
    "-shortest",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputName,
  ]);
  if (code !== 0) {
    throw new Error("Video rendering failed while burning overlays.");
  }
}

async function mixMusicBrowser(opts: {
  ffmpeg: FFmpeg;
  videoName: string;
  outputName: string;
  trackId: string;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  startAt: number;
  duration: number;
  track: (n: string) => string;
}) {
  const music = getMusicTrack(opts.trackId);
  const musicFile = opts.track(`music_${opts.trackId}.mp3`);
  await opts.ffmpeg.writeFile(musicFile, await fetchFile(music.url));

  const fadeOutStart = Math.max(0, opts.duration - opts.fadeOut);
  const musicFilter = [
    `volume=${opts.volume}`,
    opts.fadeIn > 0 ? `afade=t=in:st=0:d=${opts.fadeIn}` : null,
    opts.fadeOut > 0
      ? `afade=t=out:st=${fadeOutStart}:d=${opts.fadeOut}`
      : null,
  ]
    .filter(Boolean)
    .join(",");

  let code = await opts.ffmpeg.exec([
    "-i",
    opts.videoName,
    "-ss",
    String(opts.startAt),
    "-i",
    musicFile,
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
    opts.outputName,
  ]);

  if (code !== 0) {
    code = await opts.ffmpeg.exec([
      "-i",
      opts.videoName,
      "-ss",
      String(opts.startAt),
      "-i",
      musicFile,
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
      opts.outputName,
    ]);
  }

  if (code !== 0) {
    throw new Error("Video rendering failed while mixing music.");
  }
}

function pngDimensions(data: Uint8Array): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const blob = new Blob([data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer], {
      type: "image/png",
    });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve({ w: img.naturalWidth || 100, h: img.naturalHeight || 40 });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ w: 100, h: 40 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}
