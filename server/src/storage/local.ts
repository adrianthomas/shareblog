import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { StorageAdapter } from "./storage-adapter.js";

export class LocalDiskStorageAdapter implements StorageAdapter {
  constructor(
    private readonly baseDir: string,
    private readonly publicBaseUrl: string,
  ) {}

  async put(key: string, data: Buffer, _contentType: string): Promise<void> {
    const filePath = join(this.baseDir, key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
  }

  getUrl(key: string): string {
    return `${this.publicBaseUrl}/files/${key}`;
  }

  async delete(key: string): Promise<void> {
    await rm(join(this.baseDir, key), { force: true });
  }
}
