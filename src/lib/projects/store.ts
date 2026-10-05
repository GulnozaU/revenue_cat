import { promises as fs } from "fs";
import path from "path";
import type {
  AestheticId,
  ProjectRecord,
  VideoFormat,
} from "@/lib/types/edit-plan";
import {
  ensureStorageDirs,
  humanizeStorageError,
  storagePath,
} from "@/lib/storage/paths";

function projectsRoot() {
  return storagePath("projects");
}

export async function saveProject(project: ProjectRecord): Promise<void> {
  try {
    await ensureStorageDirs();
    const dir = projectsRoot();
    const file = path.join(/* turbopackIgnore: true */ dir, `${project.id}.json`);
    project.updatedAt = new Date().toISOString();
    await fs.writeFile(file, JSON.stringify(project, null, 2), "utf8");
  } catch (err) {
    throw new Error(humanizeStorageError(err));
  }
}

export async function loadProject(id: string): Promise<ProjectRecord | null> {
  try {
    const file = path.join(/* turbopackIgnore: true */ projectsRoot(), `${id}.json`);
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as ProjectRecord;
  } catch {
    return null;
  }
}

export function newProjectId() {
  return `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Lightweight create — do not import the FFmpeg/Whisper pipeline here. */
export async function createProject(input: {
  name: string;
  format: VideoFormat;
  aestheticId: AestheticId;
  prompt: string;
  session?: "demo" | "try";
}): Promise<ProjectRecord> {
  const now = new Date().toISOString();
  const project: ProjectRecord = {
    id: newProjectId(),
    name: input.name,
    format: input.format,
    aestheticId: input.aestheticId,
    prompt: input.prompt,
    session: input.session ?? "try",
    assets: [],
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
  await saveProject(project);
  return project;
}
