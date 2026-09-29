import { promises as fs } from "fs";
import path from "path";
import type { ProjectRecord } from "@/lib/types/edit-plan";
import { storagePath } from "@/lib/ffmpeg/media";

export async function saveProject(project: ProjectRecord): Promise<void> {
  const file = storagePath("projects", `${project.id}.json`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  project.updatedAt = new Date().toISOString();
  await fs.writeFile(file, JSON.stringify(project, null, 2), "utf8");
}

export async function loadProject(id: string): Promise<ProjectRecord | null> {
  try {
    const raw = await fs.readFile(storagePath("projects", `${id}.json`), "utf8");
    return JSON.parse(raw) as ProjectRecord;
  } catch {
    return null;
  }
}

export function newProjectId() {
  return `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
