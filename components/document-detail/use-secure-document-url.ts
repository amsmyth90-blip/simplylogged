import { useEffect, useState } from "react";

import type { VaultDocument } from "@/lib/mock-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function useSecureDocumentUrl(document: VaultDocument | null) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [fileMessage, setFileMessage] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function createPreviewUrl() {
      setSignedUrl(null);
      setFileMessage(null);
      if (!document?.storageBucket || !document.storagePath) return;
      const client = getSupabaseBrowserClient();
      if (!client) {
        setFileMessage("Supabase storage is not available in this session.");
        return;
      }
      const { data, error } = await client.storage
        .from(document.storageBucket)
        .createSignedUrl(document.storagePath, 300);
      if (cancelled) return;
      if (error || !data?.signedUrl) {
        setFileMessage(error?.message ?? "DiaryDock could not load the stored file preview.");
        return;
      }
      setSignedUrl(data.signedUrl);
    }
    void createPreviewUrl();
    return () => {
      cancelled = true;
    };
  }, [document?.storageBucket, document?.storagePath]);

  const openStoredFile = async () => {
    if (!document?.storageBucket || !document.storagePath) return;
    const client = getSupabaseBrowserClient();
    if (!client) {
      setFileMessage("Supabase storage is not available in this session.");
      return;
    }
    setIsOpening(true);
    setFileMessage(null);
    const { data, error } = await client.storage
      .from(document.storageBucket)
      .createSignedUrl(document.storagePath, 60);
    setIsOpening(false);
    if (error || !data?.signedUrl) {
      setFileMessage(error?.message ?? "DiaryDock could not open the stored file.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return { fileMessage, isOpening, openStoredFile, setFileMessage, signedUrl };
}
