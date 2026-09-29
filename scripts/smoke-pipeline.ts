/**
 * End-to-end smoke test for the real pipeline (no UI).
 * Usage: npx tsx scripts/smoke-pipeline.ts
 */
import { promises as fs } from "fs";
import path from "path";
import {
  createProject,
  ingestUploadedFile,
  runProjectPipeline,
  reRenderProject,
} from "../src/lib/pipeline";
import { loadProject, saveProject } from "../src/lib/projects/store";
import { assertFfmpeg, storagePath } from "../src/lib/ffmpeg/media";

async function main() {
  await assertFfmpeg();
  const source = path.join(process.cwd(), "storage/tmp/smoke_source.mp4");
  const buf = await fs.readFile(source);

  console.log("1. Create project");
  const project = await createProject({
    name: "smoke-test",
    format: "instagram_reel",
    aestheticId: "fast_paced",
    prompt:
      "Make this energetic. Cut pauses, add captions, subtle zooms, and upbeat music.",
  });

  console.log("2. Ingest video + probe/proxy/thumb/audio");
  const asset = await ingestUploadedFile({
    projectId: project.id,
    filename: "smoke_source.mp4",
    mimeType: "video/mp4",
    buffer: buf,
  });
  console.log("   asset", {
    duration: asset.duration,
    width: asset.width,
    height: asset.height,
    fps: asset.fps,
    proxyUrl: asset.proxyUrl,
  });

  project.assets = [asset];
  await saveProject(project);

  console.log("3–6. Transcribe → analyze → edit plan → render preview");
  const ready = await runProjectPipeline(project.id);
  console.log("   status", ready.status);
  console.log("   transcript provider", ready.analysis?.transcript.provider);
  console.log("   segments", ready.analysis?.transcript.segments.length);
  console.log("   clips", ready.editPlan?.clips.length);
  console.log("   captions", ready.editPlan?.captions.length);
  console.log("   preview", ready.previewUrl);

  if (!ready.previewPath) throw new Error("No preview rendered");
  const previewStat = await fs.stat(storagePath(ready.previewPath));
  console.log("   preview bytes", previewStat.size);
  if (previewStat.size < 1000) throw new Error("Preview file too small");

  console.log("7. Trim first clip in edit plan");
  const plan = ready.editPlan!;
  const clip = plan.clips[0];
  clip.sourceEnd = Math.max(
    clip.sourceStart + 0.8,
    clip.sourceStart + (clip.sourceEnd - clip.sourceStart) * 0.7
  );
  const len = (clip.sourceEnd - clip.sourceStart) / (clip.speed || 1);
  clip.timelineEnd = clip.timelineStart + len;
  // repack
  let cursor = 0;
  for (const c of plan.clips) {
    const l = (c.sourceEnd - c.sourceStart) / (c.speed || 1);
    c.timelineStart = cursor;
    c.timelineEnd = cursor + l;
    cursor += l;
  }
  plan.duration = cursor;
  plan.captions.push({
    id: `cap_smoke_${Date.now()}`,
    start: 0,
    end: Math.min(1.5, plan.duration),
    text: "SMOKE TEST CAPTION",
    style: "clean_bold",
    fontId: "arial_bold",
    fontSize: 48,
    x: 0.5,
    y: 0.78,
    animation: "none",
  });
  plan.stickers.push({
    id: `stk_smoke`,
    assetId: "star",
    start: 0.2,
    end: Math.min(2, plan.duration),
    x: 0.8,
    y: 0.2,
    scale: 0.35,
    rotation: 0,
  });
  plan.music = {
    trackId: "upbeat_01",
    volume: 0.2,
    startAt: 0,
    fadeIn: 0.3,
    fadeOut: 0.5,
  };

  const updated = await loadProject(project.id);
  if (!updated) throw new Error("missing project");
  updated.editPlan = plan;
  await saveProject(updated);

  console.log("8. Re-render preview + export");
  const preview2 = await reRenderProject(project.id, "preview");
  const exported = await reRenderProject(project.id, "export");
  console.log("   export", exported.exportUrl);
  if (!exported.exportPath) throw new Error("No export");
  const exportStat = await fs.stat(storagePath(exported.exportPath));
  console.log("   export bytes", exportStat.size);
  if (exportStat.size < 1000) throw new Error("Export too small");

  console.log("\nPASS — pipeline produced real preview + export MP4s");
  console.log("Preview:", preview2.previewUrl);
  console.log("Export:", exported.exportUrl);
}

main().catch((err) => {
  console.error("\nFAIL", err);
  process.exit(1);
});
