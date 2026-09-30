/**
 * LOCAL DEV ONLY smoke — optional system FFmpeg for offline Mac testing.
 * Production path: browser ffmpeg.wasm (see src/lib/video/ffmpeg-browser.ts).
 *
 * Usage (local Mac with ffmpeg installed):
 *   npx tsx scripts/smoke-pipeline.ts
 */
import { promises as fs } from "fs";
import path from "path";
import { createProject, ingestUploadedFile, runProjectPipeline } from "../src/lib/pipeline";
import { assertFfmpeg, storagePath } from "../src/lib/ffmpeg/media";
import { renderEditPlan } from "../src/lib/ffmpeg/render";

async function main() {
  console.log("NOTE: Production renders with ffmpeg.wasm in the browser.");
  console.log("This script only smoke-tests AI + optional local FFmpeg.");

  if (!process.env.NVIDIA_API_KEY && !process.env.GEMINI_API_KEY) {
    throw new Error("Set NVIDIA_API_KEY and/or GEMINI_API_KEY");
  }

  const sample =
    process.argv[2] ||
    path.join(process.cwd(), "storage", "fixtures", "sample.mp4");

  let buffer: Buffer;
  try {
    buffer = await fs.readFile(sample);
  } catch {
    console.log("No sample MP4 — skipping ingest smoke.");
    return;
  }

  const project = await createProject({
    name: "Smoke",
    format: "instagram_reel",
    aestheticId: "clean_lifestyle",
    prompt: "Cut the dead air and keep the punchy moments",
  });

  const meta = { duration: 10, width: 1080, height: 1920 };
  try {
    await assertFfmpeg();
    console.log("Local system FFmpeg available (dev only)");
  } catch {
    console.log("No system FFmpeg — AI-only smoke");
  }

  const asset = await ingestUploadedFile({
    projectId: project.id,
    filename: path.basename(sample),
    mimeType: "video/mp4",
    buffer,
    ...meta,
  });

  const { loadProject, saveProject } = await import("../src/lib/projects/store");
  const p = await loadProject(project.id);
  if (!p) throw new Error("missing project");
  p.assets = [asset];
  await saveProject(p);

  const updated = await runProjectPipeline(project.id, buffer);
  console.log("provider=", updated.aiProvider);
  console.log("clips=", updated.editPlan?.clips.length);

  try {
    await assertFfmpeg();
    const out = storagePath("renders", project.id, "smoke.mp4");
    await renderEditPlan({
      plan: updated.editPlan!,
      sourcePath: storagePath(asset.sourcePath),
      outputPath: out,
      format: "instagram_reel",
      quality: "preview",
    });
    console.log("local ffmpeg preview →", out);
  } catch {
    console.log("Skipped local FFmpeg render (expected on Vercel / without brew ffmpeg)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
