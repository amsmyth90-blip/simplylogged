import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

import { getSecureRuntime } from "@mobile/platform/runtime-security";

export function physicalLinkUrl(path: string) {
  return new URL(path, getSecureRuntime().apiOrigin).toString();
}

export async function copyPhysicalLink(url: string) {
  await navigator.clipboard.writeText(url);
}

export async function sharePhysicalLink(url: string) {
  await Share.share({ title: "DiaryDock private tag", text: "Private DiaryDock smart-item link",
    url, dialogTitle: "Share private tag" });
}

export async function savePhysicalQr(dataUrl: string) {
  const encoded = dataUrl.split(",", 2)[1];
  if (!encoded) throw new Error("The QR code is not ready.");
  const path = `diarydock-private-tag-${crypto.randomUUID()}.png`;
  try {
    await Filesystem.writeFile({ path, data: encoded, directory: Directory.Cache });
    const file = await Filesystem.getUri({ path, directory: Directory.Cache });
    await Share.share({ title: "DiaryDock private tag", files: [file.uri],
      dialogTitle: "Save or share QR code" });
  } finally {
    await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => undefined);
  }
}

export async function writePhysicalNfc(url: string) {
  const Reader = (window as unknown as { NDEFReader?: new () => { write: (message: {
    records: { recordType: string; data: string }[] }) => Promise<void> } }).NDEFReader;
  if (!Reader) throw new Error("NFC writing is unavailable on this device. Use the QR code instead.");
  await new Reader().write({ records: [{ recordType: "url", data: url }] });
}
