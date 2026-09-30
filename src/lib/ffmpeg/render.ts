/**
 * LOCAL DEV ONLY — system FFmpeg clip concat.
 * Production uses `@/lib/video/ffmpeg-browser` (ffmpeg.wasm).
 */
import { promises as fs } from "fs";
import path from "path";
import type { EditPlan } from "@/lib/types/edit-plan";
import { FORMAT_PRESETS, type VideoFormat } from "@/lib/types/edit-plan";
import { runFfmpeg, storagePath } from "@/lib/ffmpeg/media";

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
    const usableClips = plan.clips.filter(
      (c) => Number(c.sourceEnd) - Number(c.sourceStart) >= 0.15
    );
    if (usableClips.length === 0) {
      throw new Error("Edit plan has no valid clips to render.");
    }

    for (let i = 0; i < usableClips.length; i++) {
      const clip = usableClips[i];
      const out = path.join(workDir, `clip_${i}.mp4`);
      const speed = clip.speed || 1;
      const start = Number(clip.sourceStart);
      const end = Number(clip.sourceEnd);
      const dur = Math.max(0.15, end - start);
      const vf = [
        `scale=${outW}:${outH}:force_original_aspect_ratio=increase`,
        `crop=${outW}:${outH}`,
        speed !== 1 ? `setpts=PTS/${speed}` : null,
      ]
        .filter(Boolean)
        .join(",");

      await runFfmpeg([
        "-y",
        "-ss",
        String(start),
        "-t",
        String(dur),
        "-i",
        sourcePath,
        "-vf",
        vf,
        ...(speed !== 1
          ? ["-af", `atempo=${Math.min(2, Math.max(0.5, speed))}`]
          : []),
        "-c:v",
        "libx264",
        "-preset",
        quality === "preview" ? "veryfast" : "medium",
        "-crf",
        quality === "preview" ? "28" : "20",
        "-c:a",
        "aac",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        out,
      ]);
      clipFiles.push(out);
    }

    const concatList = path.join(workDir, "concat.txt");
    await fs.writeFile(
      concatList,
      clipFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n"),
      "utf8"
    );

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
      outputPath,
    ]);

    return { outputPath, duration: plan.duration };
  } finally {
    try {
      await fs.rm(workDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

export {
  timelineToSource,
  activeCaption,
  activeZoom,
  activeTexts,
} from "@/lib/renderer/timeline";
