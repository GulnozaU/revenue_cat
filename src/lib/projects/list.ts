import { promises as fs } from "fs";
import path from "path";
import type { ProjectRecord } from "@/lib/types/edit-plan";
import { storagePath } from "@/lib/storage/paths";

export async function listRecentProjects(limit = 12): Promise<ProjectRecord[]> {
  const dir = storagePath("projects");
  try {
    const files = await fs.readdir(dir);
    const projects: ProjectRecord[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await fs.readFile(path.join(dir, file), "utf8");
        projects.push(JSON.parse(raw) as ProjectRecord);
      } catch {
        /* skip bad file */
      }
    }
    return projects
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, limit);
  } catch {
    return [];
  }
}
