import { resolve } from "node:path";
import type { StorageAdapter } from "./storage-adapter.js";
import { LocalDiskStorageAdapter } from "./local.js";
import { S3StorageAdapter } from "./s3.js";

function createStorageAdapter(): StorageAdapter {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "local") {
    const baseDir = resolve(process.env.LOCAL_STORAGE_DIR ?? "./data/uploads");
    const publicBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3000";
    return new LocalDiskStorageAdapter(baseDir, publicBaseUrl);
  }
  if (driver === "s3") {
    return new S3StorageAdapter();
  }
  throw new Error(`Unknown STORAGE_DRIVER: ${driver}`);
}

export const storage = createStorageAdapter();
export type { StorageAdapter } from "./storage-adapter.js";
