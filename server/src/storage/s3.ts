import type { StorageAdapter } from "./storage-adapter.js";

/**
 * Placeholder for a future S3-compatible (e.g. Cloudflare R2) adapter.
 * Not needed for the Uberspace deployment target — local disk storage
 * (local.ts) is sufficient there. Implement this only if a deployment
 * target without persistent local disk is added later.
 */
export class S3StorageAdapter implements StorageAdapter {
  put(): Promise<void> {
    throw new Error("S3StorageAdapter is not implemented yet.");
  }
  getUrl(): string {
    throw new Error("S3StorageAdapter is not implemented yet.");
  }
  delete(): Promise<void> {
    throw new Error("S3StorageAdapter is not implemented yet.");
  }
}
