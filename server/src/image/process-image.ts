import { fork, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

export interface ImageVariantSpec {
  name: string;
  width: number;
}

export interface ProcessedImage {
  width?: number;
  height?: number;
  variants: Record<string, Buffer>;
}

const here = fileURLToPath(import.meta.url);
const isTs = here.endsWith(".ts");
const workerPath = path.join(path.dirname(here), isTs ? "worker.ts" : "worker.js");

// sharp's native addon can't safely share a process with got's HTTPS calls
// on some hosts — see ../resolvers/article.ts and the investigation that
// found it segfaults the whole server. Running sharp in a short-lived child
// process keeps that crash contained to a single upload instead of taking
// down article/music lookups (or vice versa) for the whole server.
export function processImage(buffer: Buffer, variants: ImageVariantSpec[]): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const child: ChildProcess = fork(workerPath, {
      serialization: "advanced",
      execArgv: isTs ? ["--import", "tsx/esm"] : [],
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    });

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error("Image processing timed out."));
    }, 30_000);

    child.once("message", (msg: { type: "result" | "error"; message?: string; width?: number; height?: number; variants?: Record<string, Buffer> }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      if (msg?.type === "result") {
        resolve({ width: msg.width, height: msg.height, variants: msg.variants ?? {} });
      } else {
        reject(new Error(msg?.message ?? "Image processing failed."));
      }
    });

    child.once("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });

    child.once("exit", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`Image worker exited unexpectedly (code=${code}, signal=${signal}).`));
    });

    child.send({ type: "process", buffer, variants });
  });
}
