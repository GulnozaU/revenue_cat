import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

export type StoredObject = {
  key: string;
  url: string;
  sizeBytes: number;
  contentType: string;
};

export interface StorageProvider {
  put(
    key: string,
    data: Buffer | Uint8Array,
    contentType: string
  ): Promise<StoredObject>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}

/**
 * Local filesystem storage for development.
 * Swap to Supabase/S3/R2 by implementing StorageProvider.
 */
export class LocalStorageProvider implements StorageProvider {
  private root: string;

  constructor(root = path.join(process.cwd(), "storage")) {
    this.root = root;
  }

  private resolve(key: string) {
    const safe = key.replace(/\.\./g, "").replace(/^\/+/, "");
    return path.join(this.root, safe);
  }

  async put(
    key: string,
    data: Buffer | Uint8Array,
    contentType: string
  ): Promise<StoredObject> {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
    return {
      key,
      url: this.getPublicUrl(key),
      sizeBytes: data.byteLength,
      contentType,
    };
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.resolve(key));
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolve(key));
    } catch {
      /* ignore */
    }
  }

  getPublicUrl(key: string): string {
    return `/api/files/${key.split("/").map(encodeURIComponent).join("/")}`;
  }
}

/** Placeholder for future cloud storage. */
export class CloudStorageProvider implements StorageProvider {
  constructor(
    private bucket: string,
    private publicBaseUrl: string
  ) {}

  async put(
    key: string,
    data: Buffer | Uint8Array,
    contentType: string
  ): Promise<StoredObject> {
    void this.bucket;
    void data;
    void contentType;
    throw new Error(
      "CloudStorageProvider not configured. Set STORAGE_PROVIDER=local or implement S3/R2."
    );
  }

  async get(): Promise<Buffer | null> {
    return null;
  }

  async delete(): Promise<void> {}

  getPublicUrl(key: string): string {
    return `${this.publicBaseUrl.replace(/\/$/, "")}/${key}`;
  }
}

let cached: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (cached) return cached;
  const provider = process.env.STORAGE_PROVIDER ?? "local";
  if (provider === "cloud") {
    cached = new CloudStorageProvider(
      process.env.STORAGE_BUCKET ?? "cutline",
      process.env.STORAGE_PUBLIC_URL ?? ""
    );
  } else {
    cached = new LocalStorageProvider();
  }
  return cached;
}

export function makeAssetKey(projectId: string, filename: string) {
  const ext = path.extname(filename) || ".mp4";
  return `uploads/${projectId}/${randomUUID()}${ext}`;
}

export function makeProjectKey(projectId: string) {
  return `projects/${projectId}.json`;
}
