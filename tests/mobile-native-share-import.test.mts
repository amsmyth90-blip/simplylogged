import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { parseNativeSharePayload } from "../apps/mobile/src/capture/native-share-import.ts";
import { MAX_DOCUMENT_BYTES } from "../packages/documents/src/index.ts";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const png = Uint8Array.from(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
));

function item(bytes = png, overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Policy Scan.png",
    mimeType: "image/png",
    size: bytes.byteLength,
    base64: Buffer.from(bytes).toString("base64"),
    ...overrides,
  };
}

test("native shared files pass the same signature and filename boundary as capture", () => {
  const captures = parseNativeSharePayload({ files: [item()] });
  assert.equal(captures.length, 1);
  assert.equal(captures[0]?.fileName, "policy-scan.png");
  assert.equal(captures[0]?.mimeType, "image/png");
  assert.deepEqual(captures[0]?.bytes, png);
  if (captures[0]?.previewUrl) URL.revokeObjectURL(captures[0].previewUrl);
});

test("native shared files reject size lies, disguised content and excess parts", () => {
  assert.throws(() => parseNativeSharePayload({ files: [item(png, { size: 1 })] }), /size check/);
  assert.throws(() => parseNativeSharePayload({
    files: [item(Uint8Array.of(1, 2, 3), { mimeType: "image/png" })],
  }), /supported document or image/);
  assert.throws(() => parseNativeSharePayload({
    files: Array.from({ length: 13 }, (_, index) => item(png, { id: `file-${index}` })),
  }), /one and twelve/);
});

test("native shared files enforce the four-megabyte aggregate before capture", () => {
  const half = new Uint8Array(Math.floor(MAX_DOCUMENT_BYTES / 2) + 1);
  half.set(png.subarray(0, 8));
  assert.throws(() => parseNativeSharePayload({
    files: [item(half, { id: "first" }), item(half, { id: "second" })],
  }), /combined shared documents under 4 MB/);
});

test("native shared PDFs remain one complete document", () => {
  const pdf = Uint8Array.from(Buffer.from("%PDF-1.7\n%%EOF", "ascii"));
  assert.throws(() => parseNativeSharePayload({
    files: [
      item(pdf, { id: "pdf", name: "policy.pdf", mimeType: "application/pdf" }),
      item(png, { id: "image" }),
    ],
  }), /one complete document/);
});

test("Android and iOS share receivers feed the bounded packaged capture flow", async () => {
  const [androidFiles, androidPlugin, androidManifest, mobileBridge, project, appController,
    appPlugin, extension, appEntitlements, extensionEntitlements, extensionPlist, storyboard] = await Promise.all([
    read("android/app/src/main/java/com/diarydock/app/ShareImportFiles.java"),
    read("android/app/src/main/java/com/diarydock/app/DiaryDockShareImportPlugin.java"),
    read("android/app/src/main/AndroidManifest.xml"),
    read("apps/mobile/src/capture/native-share-import.ts"),
    read("ios/App/App.xcodeproj/project.pbxproj"),
    read("ios/App/App/AppViewController.swift"),
    read("ios/App/App/DiaryDockShareImportPlugin.swift"),
    read("ios/App/ShareExtension/ShareViewController.swift"),
    read("ios/App/App/App.entitlements"),
    read("ios/App/ShareExtension/ShareExtension.entitlements"),
    read("ios/App/ShareExtension/Info.plist"),
    read("ios/App/App/Base.lproj/Main.storyboard"),
  ]);

  assert.match(androidFiles, /MAX_FILE_BYTES = 4L \* 1024L \* 1024L/);
  assert.match(androidFiles, /MAX_TOTAL_BYTES = 4L \* 1024L \* 1024L/);
  assert.match(androidFiles, /LinkedHashSet<Uri>/);
  assert.doesNotMatch(androidFiles, /subList\(0, MAX_FILES\)/);
  assert.match(androidPlugin, /uris\.size\(\) > ShareImportFiles\.MAX_FILES/);
  assert.match(androidPlugin, /"content"\.equalsIgnoreCase\(data\.getScheme\(\)\)/);
  assert.doesNotMatch(androidManifest, /android:scheme="file"/);
  assert.doesNotMatch(androidPlugin, /window\.location\.assign/);
  assert.match(mobileBridge, /inspectDocumentBytes|capturedDocumentFromBytes/);
  assert.match(mobileBridge, /shareImportReceived/);
  assert.match(project, /ShareExtension\.appex in Embed App Extensions/);
  assert.match(project, /PRODUCT_BUNDLE_IDENTIFIER = com\.diarydock\.app\.ShareExtension/);
  assert.match(project, /CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements/);
  assert.match(storyboard, /customClass="AppViewController"/);
  assert.match(appController, /registerPluginType\(DiaryDockShareImportPlugin\.self\)/);
  assert.match(appPlugin, /Data\(contentsOf: url, options: \[\.mappedIfSafe\]\)/);
  assert.match(extension, /copyBounded/);
  assert.match(extension, /providers\.count <= maximumFiles/);
  assert.doesNotMatch(extension, /\.prefix\(maximumFiles\)/);
  assert.match(extension, /diarydock:\/\/import\/share/);
  assert.doesNotMatch(extension, /Data\(contentsOf: source/);
  assert.match(appEntitlements, /group\.com\.diarydock\.shared/);
  assert.match(extensionEntitlements, /group\.com\.diarydock\.shared/);
  assert.match(extensionPlist, /NSExtensionActivationSupportsFileWithMaxCount/);
});
