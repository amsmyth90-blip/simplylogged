// Generates:
//   resources/icon.png    - 1024x1024, no alpha - source for @capacitor/assets (iOS icon set)
//   resources/splash.png  - 2732x2732, no alpha - source for @capacitor/assets (iOS splash screens)
//   public/icons/*.png    - web/meta-tag icons (apple-touch-icon, PWA sizes)
//
// Run: node tools/generate-app-icons.mjs

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE_ICON = path.join(ROOT, "public/brand/lifedock-app-icon.png");
const BACKGROUND = "#f8f4ec"; // matches tailwind.config.ts `cream`

async function main() {
  await mkdir(path.join(ROOT, "resources"), { recursive: true });
  await mkdir(path.join(ROOT, "public/icons"), { recursive: true });

  // Apple rejects App Store icons that carry an alpha channel, so flatten
  // the source onto the brand background before anything else uses it.
  const flattened = await sharp(SOURCE_ICON)
    .resize(1024, 1024, { fit: "cover" })
    .flatten({ background: BACKGROUND })
    .png()
    .toBuffer();

  await sharp(flattened).toFile(path.join(ROOT, "resources/icon.png"));

  // Splash source: brand-colored canvas with the mark centered at ~40% width.
  const markSize = 1100;
  const mark = await sharp(flattened).resize(markSize, markSize).toBuffer();
  await sharp({
    create: {
      width: 2732,
      height: 2732,
      channels: 3,
      background: BACKGROUND
    }
  })
    .composite([{ input: mark, gravity: "center" }])
    .flatten({ background: BACKGROUND })
    .removeAlpha()
    .png()
    .toFile(path.join(ROOT, "resources/splash.png"));

  const webSizes = [
    { name: "apple-touch-icon.png", size: 180 },
    { name: "icon-512.png", size: 512 },
    { name: "icon-192.png", size: 192 },
    { name: "favicon-32.png", size: 32 },
    { name: "favicon-16.png", size: 16 }
  ];

  for (const { name, size } of webSizes) {
    await sharp(flattened)
      .resize(size, size)
      .toFile(path.join(ROOT, "public/icons", name));
  }

  console.log("Generated resources/icon.png, resources/splash.png, and public/icons/*.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
