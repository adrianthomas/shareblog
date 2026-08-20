import sharp from "sharp";

interface ProcessMessage {
  type: "process";
  buffer: Buffer;
  variants: { name: string; width: number }[];
}

process.on("message", async (msg: ProcessMessage) => {
  if (msg?.type !== "process") return;

  try {
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

    process.send?.({ type: "result", width: meta.width, height: meta.height, variants });
  } catch (err) {
    process.send?.({ type: "error", message: err instanceof Error ? err.message : String(err) });
  } finally {
    process.exit(0);
  }
});
