/**
 * Smoke test — uses AI_MODE=mock by default so Gemini is not billed.
 * Usage: AI_MODE=mock npx tsx scripts/smoke-pipeline.ts
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
  process.env.AI_MODE = process.env.AI_MODE || "mock";
  await assertFfmpeg();
  const source = path.join(process.cwd(), "storage/tmp/smoke_source.mp4");
  const buf = await fs.readFile(source);

  console.log("AI_MODE=", process.env.AI_MODE);
  console.log("1. Create project");
  const project = await createProject({
    name: "smoke-test",
    format: "instagram_reel",
    aestheticId: "cute",
    prompt: "Make this cute and cozy. Remove pauses, add soft captions.",
  });

  console.log("2. Ingest");
  const asset = await ingestUploadedFile({
    projectId: project.id,
    filename: "smoke_source.mp4",
    mimeType: "video/mp4",
    buffer: buf,
  });
  project.assets = [asset];
  await saveProject(project);
  console.log("   duration/fps", asset.duration, asset.fps);

  console.log("3. Pipeline (Gemini or mock → FFmpeg)");
  const ready = await runProjectPipeline(project.id);
  console.log("   status", ready.status, "provider", ready.aiProvider);
  console.log("   clips/captions", ready.editPlan?.clips.length, ready.editPlan?.captions.length);
  if (!ready.previewPath) throw new Error("No preview");
  console.log("   preview bytes", (await fs.stat(storagePath(ready.previewPath))).size);

  console.log("4. Manual edit + export");
  const plan = ready.editPlan!;
  plan.captions.push({
    id: `cap_smoke_${Date.now()}`,
    start: 0,
    end: Math.min(1.5, plan.duration),
    text: "SMOKE CAPTION",
    style: "soft_bold",
    fontId: "arial_bold",
    fontSize: 48,
    x: 0.5,
    y: 0.78,
    animation: "none",
  });
  plan.stickers.push({
    id: "stk_smoke",
    assetId: "bow",
    start: 0.2,
    end: Math.min(2, plan.duration),
    x: 0.8,
    y: 0.2,
    scale: 0.3,
    rotation: 0,
  });
  const updated = await loadProject(project.id);
  if (!updated) throw new Error("missing");
  updated.editPlan = plan;
  await saveProject(updated);
  const exported = await reRenderProject(project.id, "export");
  if (!exported.exportPath) throw new Error("No export");
  console.log("   export bytes", (await fs.stat(storagePath(exported.exportPath))).size);
  console.log("\nPASS");
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
