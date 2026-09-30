/**
 * LOCAL DEV ONLY — system FFmpeg via child_process.
 * Production rendering uses `@/lib/video/ffmpeg-browser` (ffmpeg.wasm).
 * Do not import this module from production API routes that must run on Vercel.
 */
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { promises as fs } from "fs";

const execFileAsync = promisify(execFile);

const FFMPEG = process.env.FFMPEG_PATH ?? "ffmpeg";
const FFPROBE = process.env.FFPROBE_PATH ?? "ffprobe";

export async function assertFfmpeg(): Promise<void> {
  await execFileAsync(FFMPEG, ["-version"]);
  await execFileAsync(FFPROBE, ["-version"]);
}

export async function runFfmpeg(args: string[], timeoutMs = 300_000): Promise<string> {
  const { stderr, stdout } = await execFileAsync(FFMPEG, args, {
    timeout: timeoutMs,
    maxBuffer: 20 * 1024 * 1024,
  });
  return `${stdout}\n${stderr}`;
}

export async function runFfprobe(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(FFPROBE, args, {
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}

export type ProbedVideo = {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec?: string;
  hasAudio: boolean;
  sizeBytes: number;
};

export async function probeVideo(filePath: string): Promise<ProbedVideo> {
  const raw = await runFfprobe([
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath,
  ]);
  const data = JSON.parse(raw) as {
    format?: { duration?: string; size?: string };
    streams?: Array<{
      codec_type?: string;
      codec_name?: string;
      width?: number;
      height?: number;
      avg_frame_rate?: string;
      r_frame_rate?: string;
    }>;
  };

  const video = data.streams?.find((s) => s.codec_type === "video");
  const audio = data.streams?.find((s) => s.codec_type === "audio");
  const rate = video?.avg_frame_rate || video?.r_frame_rate || "30/1";
  const [num, den] = rate.split("/").map(Number);
  const fps = den ? num / den : 30;

  return {
    duration: Number(data.format?.duration ?? 0),
    width: video?.width ?? 1280,
    height: video?.height ?? 720,
    fps: Number.isFinite(fps) && fps > 0 ? fps : 30,
    codec: video?.codec_name,
    hasAudio: Boolean(audio),
    sizeBytes: Number(data.format?.size ?? 0),
  };
}

export async function generateThumbnail(
  sourcePath: string,
  outputPath: string,
  atSeconds = 1
): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await runFfmpeg([
    "-y",
    "-ss",
    String(Math.max(0, atSeconds)),
    "-i",
    sourcePath,
    "-frames:v",
    "1",
    "-q:v",
    "3",
    outputPath,
  ]);
}

export async function generateProxy(
  sourcePath: string,
  outputPath: string
): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await runFfmpeg([
    "-y",
    "-i",
    sourcePath,
    "-vf",
    "scale='min(720,iw)':-2",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "28",
    "-c:a",
    "aac",
    "-b:a",
    "96k",
    "-movflags",
    "+faststart",
    outputPath,
  ]);
}

export async function extractAudioWav(
  sourcePath: string,
  outputPath: string
): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await runFfmpeg([
    "-y",
    "-i",
    sourcePath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "pcm_s16le",
    outputPath,
  ]);
}

export async function detectSilences(
  mediaPath: string,
  noiseDb = -35,
  minDuration = 0.35
): Promise<Array<{ start: number; end: number; duration: number }>> {
  const log = await runFfmpeg([
    "-i",
    mediaPath,
    "-af",
    `silencedetect=noise=${noiseDb}dB:d=${minDuration}`,
    "-f",
    "null",
    "-",
  ]);

  const starts: number[] = [];
  const ends: number[] = [];
  for (const line of log.split("\n")) {
    const s = line.match(/silence_start:\s*([0-9.]+)/);
    const e = line.match(/silence_end:\s*([0-9.]+)/);
    if (s) starts.push(Number(s[1]));
    if (e) ends.push(Number(e[1]));
  }

  const regions: Array<{ start: number; end: number; duration: number }> = [];
  for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
    regions.push({
      start: starts[i],
      end: ends[i],
      duration: ends[i] - starts[i],
    });
  }
  return regions;
}

export function publicAssetPath(...parts: string[]) {
  return path.join(process.cwd(), "public", "assets", ...parts);
}

export { storagePath, toPublicApiUrl } from "@/lib/storage/paths";
