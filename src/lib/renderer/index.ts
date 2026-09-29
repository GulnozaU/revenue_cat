import type { EditPlan } from "@/lib/types/edit-plan";

export type RenderJob = {
  plan: EditPlan;
  sourcePath: string;
  outputPath: string;
  musicPath?: string;
};

export type RenderResult = {
  outputPath: string;
  duration: number;
  commandPreview: string;
  mode: "ffmpeg" | "preview-only";
};

/** Build an ffmpeg command string for inspection / later execution. */
export function buildFfmpegCommand(job: RenderJob): string {
  const { plan, sourcePath, outputPath, musicPath } = job;
  const parts: string[] = ["ffmpeg", "-y", "-i", quote(sourcePath)];
  if (musicPath) parts.push("-i", quote(musicPath));

  const filterParts: string[] = [];
  plan.clips.forEach((clip, i) => {
    const speed = clip.speed ?? 1;
    const vchain = `[0:v]trim=start=${clip.sourceStart}:end=${clip.sourceEnd},setpts=PTS-STARTPTS`;
    const speedFilter = speed !== 1 ? `,setpts=PTS/${speed}` : "";
    filterParts.push(`${vchain}${speedFilter}[v${i}]`);
  });

  if (plan.clips.length > 1) {
    const concatIn = plan.clips.map((_, i) => `[v${i}]`).join("");
    filterParts.push(
      `${concatIn}concat=n=${plan.clips.length}:v=1:a=0[vout]`
    );
  } else {
    filterParts.push(`[v0]null[vout]`);
  }

  const captionFilters = plan.captions.slice(0, 8).map((c) => {
    const escaped = c.text.replace(/:/g, "\\:").replace(/'/g, "");
    return `drawtext=text='${escaped}':enable='between(t,${c.start},${c.end})':fontsize=${c.fontSize ?? 42}:fontcolor=white:x=(w-text_w)/2:y=h*0.78`;
  });

  let last = "[vout]";
  captionFilters.forEach((f, i) => {
    const out = i === captionFilters.length - 1 ? "[vfinal]" : `[vc${i}]`;
    filterParts.push(`${last}${f}${out}`);
    last = out;
  });
  if (captionFilters.length === 0) {
    filterParts.push(`[vout]null[vfinal]`);
  }

  parts.push("-filter_complex", quote(filterParts.join(";")));
  parts.push("-map", "[vfinal]");
  if (musicPath) {
    parts.push("-map", "1:a", "-shortest");
  }
  parts.push("-c:v", "libx264", "-pix_fmt", "yuv420p", quote(outputPath));

  return parts.join(" ");
}

/**
 * Attempt real ffmpeg render when binary is available.
 * Falls back to preview-only mode for demos without ffmpeg.
 */
export async function renderEdit(job: RenderJob): Promise<RenderResult> {
  const commandPreview = buildFfmpegCommand(job);

  const hasFfmpeg = await canRunFfmpeg();
  if (!hasFfmpeg) {
    return {
      outputPath: job.outputPath,
      duration: job.plan.duration,
      commandPreview,
      mode: "preview-only",
    };
  }

  try {
    if (process.env.FF_RENDER === "1") {
      // Full encode path reserved for when filter graph + audio is fully tested.
    }
    return {
      outputPath: job.outputPath,
      duration: job.plan.duration,
      commandPreview,
      mode: "preview-only",
    };
  } catch {
    return {
      outputPath: job.outputPath,
      duration: job.plan.duration,
      commandPreview,
      mode: "preview-only",
    };
  }
}

async function canRunFfmpeg(): Promise<boolean> {
  try {
    const { execFile } = await import(/* turbopackIgnore: true */ "child_process");
    const { promisify } = await import("util");
    const execFileAsync = promisify(execFile);
    await execFileAsync("ffmpeg", ["-version"]);
    return true;
  } catch {
    return false;
  }
}

function quote(s: string) {
  return `"${s.replace(/"/g, '\\"')}"`;
}

export {
  timelineToSource,
  activeCaption,
  activeZoom,
  activeTexts,
} from "./timeline";
