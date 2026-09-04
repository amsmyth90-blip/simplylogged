import { App } from "@capacitor/app";
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { useEffect } from "react";

import { MAX_DOCUMENT_BYTES } from "@diarydock/documents";

import {
  capturedDocumentFromBytes,
  type CapturedDocument,
} from "./capture-source.ts";

type NativeSharedFile = {
  base64: string;
  id: string;
  mimeType: string;
  name: string;
  size: number;
};

type NativeSharePayload = {
  files?: NativeSharedFile[];
};

type NativeSharePlugin = {
  addListener(
    eventName: "shareImportReceived",
    listener: () => void,
  ): Promise<PluginListenerHandle>;
  clearPendingImport(): Promise<void>;
  getPendingImport(): Promise<NativeSharePayload>;
  hasPendingImport(): Promise<{ count: number }>;
};

const sharePlugin = registerPlugin<NativeSharePlugin>("DiaryDockShareImport");
const MAX_FILES = 12;
const MAX_ENCODED_BYTES = Math.ceil(MAX_DOCUMENT_BYTES / 3) * 4 + 4;

function decodedBytes(value: unknown) {
  if (typeof value !== "string" || !value || value.length > MAX_ENCODED_BYTES) {
    throw new Error("The shared document is too large.");
  }
  const encoded = value.includes(",") ? value.slice(value.indexOf(",") + 1) : value;
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 === 1) {
    throw new Error("The shared document could not be read safely.");
  }
  const binary = atob(encoded);
  if (!binary.length || binary.length > MAX_DOCUMENT_BYTES) {
    throw new Error("The shared document is too large.");
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function parseNativeSharePayload(value: unknown): CapturedDocument[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The shared documents could not be read safely.");
  }
  const files = (value as NativeSharePayload).files;
  if (!Array.isArray(files) || !files.length || files.length > MAX_FILES) {
    throw new Error("Share between one and twelve documents at a time.");
  }
  const captures: CapturedDocument[] = [];
  let totalBytes = 0;
  try {
    for (const file of files) {
      if (!file || typeof file !== "object" || typeof file.id !== "string"
        || !/^[A-Za-z0-9-]{1,64}$/.test(file.id) || typeof file.name !== "string"
        || typeof file.mimeType !== "string" || !Number.isSafeInteger(file.size)) {
        throw new Error("The shared documents could not be read safely.");
      }
      const bytes = decodedBytes(file.base64);
      if (bytes.byteLength !== file.size) {
        throw new Error("The shared document failed its size check.");
      }
      totalBytes += bytes.byteLength;
      if (totalBytes > MAX_DOCUMENT_BYTES) {
        throw new Error("Keep the combined shared documents under 4 MB.");
      }
      captures.push(capturedDocumentFromBytes(bytes, file.name, file.mimeType));
    }
    if (captures.some((capture) => capture.mimeType === "application/pdf")
      && captures.length > 1) {
      throw new Error("Share a PDF as one complete document.");
    }
    return captures;
  } catch (error) {
    captures.forEach((capture) => {
      if (capture.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(capture.previewUrl);
    });
    throw error;
  }
}

export async function readPendingNativeShare() {
  if (!Capacitor.isNativePlatform()) return [];
  const { count } = await sharePlugin.hasPendingImport();
  if (!Number.isSafeInteger(count) || count < 0 || count > MAX_FILES) {
    throw new Error("The shared documents could not be read safely.");
  }
  if (count === 0) return [];
  return parseNativeSharePayload(await sharePlugin.getPendingImport());
}

export async function clearPendingNativeShare() {
  if (Capacitor.isNativePlatform()) await sharePlugin.clearPendingImport();
}

function isImportUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "diarydock:" && url.hostname === "import"
      && url.pathname === "/share" && !url.search && !url.hash;
  } catch {
    return false;
  }
}

export function useNativeShareNavigation(onImport: () => void) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let active = true;
    const showIfPending = () => void sharePlugin.hasPendingImport()
      .then(({ count }) => {
        if (active && Number.isSafeInteger(count) && count > 0) onImport();
      }).catch(() => undefined);
    showIfPending();
    const shared = sharePlugin.addListener("shareImportReceived", onImport);
    const opened = App.addListener("appUrlOpen", ({ url }) => {
      if (isImportUrl(url)) showIfPending();
    });
    return () => {
      active = false;
      void shared.then((handle) => handle.remove());
      void opened.then((handle) => handle.remove());
    };
  }, [onImport]);
}

export function usePendingNativeShare(
  add: (captures: CapturedDocument[]) => void,
  canImport: boolean,
  onError: (message: string) => void,
) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let active = true;
    let loading = false;
    const load = () => {
      if (!active || loading) return;
      if (!canImport) {
        onError("Save or remove the current document before opening a shared file.");
        return;
      }
      loading = true;
      void readPendingNativeShare().then(async (captures) => {
        if (!active || !captures.length) return;
        add(captures);
        await clearPendingNativeShare();
      }).catch(async (error) => {
        await clearPendingNativeShare().catch(() => undefined);
        if (active) onError(error instanceof Error
          ? error.message : "The shared documents could not be opened.");
      }).finally(() => { loading = false; });
    };
    load();
    const shared = sharePlugin.addListener("shareImportReceived", load);
    const opened = App.addListener("appUrlOpen", ({ url }) => {
      if (isImportUrl(url)) load();
    });
    return () => {
      active = false;
      void shared.then((handle) => handle.remove());
      void opened.then((handle) => handle.remove());
    };
  }, [add, canImport, onError]);
}
