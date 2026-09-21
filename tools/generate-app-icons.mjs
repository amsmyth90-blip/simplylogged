// Generates:
//   resources/icon.png    - 1024x1024, no alpha - source for @capacitor/assets (iOS icon set)
//   resources/splash.png  - 2732x2732, no alpha - source for @capacitor/assets (iOS splash screens)
//   public/icons/*.png    - web/meta-tag icons (apple-touch-icon, PWA sizes)
//
// Run: node tools/generate-app-icons.mjs

import sharp from "sharp";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE_ICON = path.join(ROOT, "public/brand/diarydock-app-icon.png");
const SOURCE_MARK = path.join(ROOT, "public/brand/diarydock-mark.png");
const BACKGROUND = "#fcfcfb";

async function generateIosAssets(icon, splash) {
  const assets = path.join(ROOT, "ios", "App", "App", "Assets.xcassets");
  const iconDirectory = path.join(assets, "AppIcon.appiconset");
  const splashDirectory = path.join(assets, "Splash.imageset");
  await Promise.all([mkdir(iconDirectory, { recursive: true }), mkdir(splashDirectory, { recursive: true })]);
  await writeFile(path.join(iconDirectory, "AppIcon-512@2x.png"), icon);
  await Promise.all([
    "splash-2732x2732.png",
    "splash-2732x2732-1.png",
    "splash-2732x2732-2.png",
  ].map((name) => writeFile(path.join(splashDirectory, name), splash)));
}

async function generateAndroidIcons(icon, mark) {
  const sizes = { ldpi: 36, mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  const androidResources = path.join(ROOT, "android", "app", "src", "main", "res");
  for (const [density, size] of Object.entries(sizes)) {
    const directory = path.join(androidResources, `mipmap-${density}`);
    await mkdir(directory, { recursive: true });
    const adaptiveSize = Math.round(size * 2.25);
    const foregroundMark = await sharp(mark)
      .resize({ width: Math.round(adaptiveSize * 0.68), height: Math.round(adaptiveSize * 0.68), fit: "inside" })
      .png()
      .toBuffer();
    const foreground = await sharp({
      create: { width: adaptiveSize, height: adaptiveSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    }).composite([{ input: foregroundMark, gravity: "center" }]).png().toBuffer();
    const background = await sharp({
      create: { width: adaptiveSize, height: adaptiveSize, channels: 3, background: BACKGROUND }
    }).png().toBuffer();
    await Promise.all([
      sharp(icon).resize(size, size).png().toFile(path.join(directory, "ic_launcher.png")),
      sharp(icon).resize(size, size).png().toFile(path.join(directory, "ic_launcher_round.png")),
      writeFile(path.join(directory, "ic_launcher_foreground.png"), foreground),
      writeFile(path.join(directory, "ic_launcher_background.png"), background),
    ]);
  }
}

async function generateAndroidSplashes(splash) {
  const resources = path.join(ROOT, "android", "app", "src", "main", "res");
  const directories = await readdir(resources, { withFileTypes: true });
  for (const directory of directories) {
    if (!directory.isDirectory() || !directory.name.startsWith("drawable")) continue;
    const directoryPath = path.join(resources, directory.name);
    if (!(await readdir(directoryPath)).includes("splash.png")) continue;
    const target = path.join(directoryPath, "splash.png");
    const metadata = await sharp(target).metadata();
    if (!metadata.width || !metadata.height) continue;
    await sharp(splash).resize(metadata.width, metadata.height, { fit: "cover" }).png().toFile(target);
  }
}

async function main() {
  await mkdir(path.join(ROOT, "resources"), { recursive: true });
  await mkdir(path.join(ROOT, "public/icons"), { recursive: true });

  const sourceMark = await sharp(SOURCE_MARK).png().toBuffer();

  // Apple rejects App Store icons that carry an alpha channel, so flatten the
  // supplied artwork onto its warm-white background before generating assets.
  const flattened = await sharp(SOURCE_ICON)
    .resize(1024, 1024, { fit: "cover" })
    .flatten({ background: BACKGROUND })
    .removeAlpha()
    .png()
    .toBuffer();

  await sharp(flattened).toFile(path.join(ROOT, "resources/icon.png"));

  // Splash source: warm-white canvas with the transparent mark centred at
  // roughly 35% width, leaving comfortable space around it on every device.
  const mark = await sharp(sourceMark)
    .resize({ width: 960, height: 960, fit: "inside" })
    .png()
    .toBuffer();
  const splash = await sharp({
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
    .toBuffer();
  await writeFile(path.join(ROOT, "resources/splash.png"), splash);

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

  await Promise.all([
    generateIosAssets(flattened, splash),
    generateAndroidIcons(flattened, sourceMark),
    generateAndroidSplashes(splash),
  ]);

  console.log("Generated DiaryDock web, iOS, and Android application assets.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
