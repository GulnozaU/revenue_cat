import { promises as fs } from "fs";
import path from "path";
import type {
  AestheticId,
  ProjectRecord,
  VideoFormat,
} from "@/lib/types/edit-plan";

function projectsRoot() {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "storage", "projects");
}

export async function saveProject(project: ProjectRecord): Promise<void> {
  const dir = projectsRoot();
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(/* turbopackIgnore: true */ dir, `${project.id}.json`);
  project.updatedAt = new Date().toISOString();
  await fs.writeFile(file, JSON.stringify(project, null, 2), "utf8");
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
}): Promise<ProjectRecord> {
  const now = new Date().toISOString();
  const project: ProjectRecord = {
    id: newProjectId(),
    name: input.name,
    format: input.format,
    aestheticId: input.aestheticId,
    prompt: input.prompt,
    assets: [],
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
  await saveProject(project);
  return project;
}
