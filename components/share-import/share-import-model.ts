import type { MailItem } from "@/lib/diarydock-data";
import { roomDetails, type VaultDocument } from "@/lib/mock-data";

type NativeSharedFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  base64: string;
};

type NativeShareImportPayload = {
  files?: NativeSharedFile[];
  receivedAt?: string;
  source?: string;
};

type NativeShareImportPlugin = {
  getPendingImport?: () => Promise<NativeShareImportPayload>;
  clearPendingImport?: () => Promise<void>;
};

declare global {
  interface Window {
    Capacitor?: { Plugins?: { DiaryDockShareImport?: NativeShareImportPlugin } };
  }
}

export type ImportFile = { id: string; file: File };

export const shareImportRoomOptions = Object.values(roomDetails).map((room) => ({
  id: room.id,
  name: room.name
}));

export function sharedFileToFile(sharedFile: NativeSharedFile) {
  const cleanBase64 = sharedFile.base64.includes(",") ? sharedFile.base64.split(",").pop() ?? "" : sharedFile.base64;
  const binary = window.atob(cleanBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], sharedFile.name || "shared-document", {
    type: sharedFile.mimeType || "application/octet-stream",
    lastModified: Date.now()
  });
}

export function formatImportBytes(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function titleFromSharedName(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

export function sharedDocumentKind(file: File): VaultDocument["kind"] {
  if (file.type === "application/pdf") return "PDF";
  return file.type.startsWith("image/") ? "Image" : "Scan";
}

export function sharedMailKind(title: string): MailItem["kind"] {
  const text = title.toLowerCase();
  if (text.includes("bill") || text.includes("invoice")) return "Bill";
  if (text.includes("statement")) return "Statement";
  return text.includes("form") ? "Form" : "Letter";
}
