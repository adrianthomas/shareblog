import sharp from "sharp";
import exifr from "exifr";
import type { AssetExif } from "../db/schema.js";

interface ProcessMessage {
  type: "process";
  buffer: Buffer;
  variants: { name: string; width: number }[];
}

type ResultMessage = { type: "result"; width?: number; height?: number; variants: Record<string, Buffer>; exif?: AssetExif };
type ErrorMessage = { type: "error"; message: string };

// process.send() only queues the message for an async write to the IPC
// pipe — it doesn't wait for that write to land. Calling process.exit()
// right after it is a race: on an idle machine the write usually wins, but
// under load the process can tear down (closing the IPC channel) before the
// message is flushed, and it's silently dropped — the parent then sees the
// child exit with no result. Awaiting send's own callback, which only fires
// once the write has actually gone out, closes that race.
function send(message: ResultMessage | ErrorMessage): Promise<void> {
  return new Promise((resolve) => {
    if (!process.send) return resolve();
    process.send(message, () => resolve());
  });
}

// Reads the same curated tags exifr can pull straight from the *original*
// buffer's EXIF/TIFF block. Done before sharp's rotate() below, which
// normalizes orientation into the pixels and then strips the EXIF block
// entirely — this is the only point in the pipeline where the tags still
// exist. Any failure (corrupt block, no EXIF at all, e.g. a screenshot or a
// scan) is swallowed: EXIF is a bonus, not something the upload should ever
// fail over.
async function readExif(buffer: Buffer): Promise<AssetExif | undefined> {
  try {
    const tags = await exifr.parse(buffer, [
      "Make",
      "Model",
      "LensModel",
      "FNumber",
      "ExposureTime",
      "ISO",
      "FocalLength",
      "DateTimeOriginal",
    ]);
    if (!tags) return undefined;
    const exif: AssetExif = {
      make: tags.Make,
      model: tags.Model,
      lensModel: tags.LensModel,
      fNumber: tags.FNumber,
      exposureTime: tags.ExposureTime,
      iso: tags.ISO,
      focalLength: tags.FocalLength,
      takenAt: tags.DateTimeOriginal instanceof Date ? tags.DateTimeOriginal.toISOString() : undefined,
    };
    return Object.values(exif).some((v) => v !== undefined) ? exif : undefined;
  } catch {
    return undefined;
  }
}

process.on("message", async (msg: ProcessMessage) => {
  if (msg?.type !== "process") return;

  try {
    const exif = await readExif(msg.buffer);
    const image = sharp(msg.buffer).rotate(); // rotate() normalizes EXIF orientation, then strips it
    const meta = await image.metadata();

    const variants: Record<string, Buffer> = {};
    for (const variant of msg.variants) {
      variants[variant.name] = await image
        .clone()
        .resize({ width: variant.width, withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    }

    await send({ type: "result", width: meta.width, height: meta.height, variants, exif });
  } catch (err) {
    await send({ type: "error", message: err instanceof Error ? err.message : String(err) });
  } finally {
    process.exit(0);
  }
});
