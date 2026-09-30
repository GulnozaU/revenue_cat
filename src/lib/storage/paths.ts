import path from "path";
import { promises as fs } from "fs";

/**
 * Vercel / Lambda: app code lives in a read-only filesystem (`/var/task`).
 * Only `/tmp` is writable (and ephemeral).
 * Local/dev: use `<cwd>/storage`.
 */
export function isServerlessRuntime() {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.NETLIFY ||
      process.env.CUTLINE_FORCE_TMP_STORAGE === "1"
  );
}

export function getStorageRoot() {
  if (process.env.STORAGE_ROOT) {
    return process.env.STORAGE_ROOT;
  }
  if (isServerlessRuntime()) {
    return path.join("/tmp", "cutline-storage");
  }
  return path.join(/* turbopackIgnore: true */ process.cwd(), "storage");
}

export function storagePath(...parts: string[]) {
  return path.join(/* turbopackIgnore: true */ getStorageRoot(), ...parts);
}

export async function ensureStorageDirs() {
  const root = getStorageRoot();
  await fs.mkdir(path.join(root, "projects"), { recursive: true });
  await fs.mkdir(path.join(root, "uploads"), { recursive: true });
  await fs.mkdir(path.join(root, "renders"), { recursive: true });
  await fs.mkdir(path.join(root, "tmp"), { recursive: true });
  await fs.mkdir(path.join(root, "fixtures"), { recursive: true });
  return root;
}

export function toPublicApiUrl(absoluteOrStorageRelative: string): string {
  const root = getStorageRoot();
  let rel = absoluteOrStorageRelative;

  if (rel.startsWith(root)) {
    rel = rel.slice(root.length).replace(/^\/+/, "");
    return `/api/files/${rel.split("/").map(encodeURIComponent).join("/")}`;
  }

  const cwd = process.cwd();
  if (rel.startsWith(cwd)) {
    rel = rel.slice(cwd.length).replace(/^\/+/, "");
  }
  if (rel.startsWith("storage/")) {
    return `/api/files/${rel
      .slice("storage/".length)
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;
  }
  if (rel.startsWith("public/")) {
    return `/${rel.slice("public/".length)}`;
  }
  return `/api/files/${rel.split("/").map(encodeURIComponent).join("/")}`;
}

export function humanizeStorageError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/EROFS|read-only file system/i.test(msg)) {
    return (
      "This deployment can't write files to disk (Vercel read-only filesystem). " +
      "Run locally with `npm run dev` for the full video pipeline, or configure writable storage (STORAGE_ROOT=/tmp/...)."
    );
  }
  return msg;
}
