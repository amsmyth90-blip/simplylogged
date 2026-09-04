import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

import {
  parsePhysicalLinksMutationResponse,
  parsePhysicalLinksSnapshot,
  type PhysicalLinksMutation,
  type PhysicalLinksSnapshot,
} from "@diarydock/physical-links";
import { readBoundedJsonResponse } from "@/lib/http/bounded-json-response";
import { emptyPhysicalAssetDraft, type NewPhysicalLink } from "./physical-link-model";

type WithoutRevision<Value> = Value extends unknown ? Omit<Value, "revision"> : never;
type DraftMutation = WithoutRevision<PhysicalLinksMutation>;

async function responseBody(response: Response) {
  return readBoundedJsonResponse(response, 512 * 1024);
}

export function usePhysicalLinks() {
  const [snapshot, setSnapshot] = useState<PhysicalLinksSnapshot | null>(null);
  const [draft, setDraft] = useState(emptyPhysicalAssetDraft);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [newLink, setNewLink] = useState<NewPhysicalLink | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const assets = snapshot?.assets ?? [];
  const links = snapshot?.links ?? [];
  const assetsById = useMemo(() => new Map(
    (snapshot?.assets ?? []).map((asset) => [asset.id, asset]),
  ), [snapshot?.assets]);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/physical-links", { cache: "no-store" });
    const value = await responseBody(response);
    if (!response.ok) throw new Error("Physical Links could not be loaded.");
    setSnapshot(parsePhysicalLinksSnapshot(value));
  }, []);

  useEffect(() => { void refresh().catch((error) => setMessage(error instanceof Error
    ? error.message : "Physical Links could not be loaded.")).finally(() => setLoading(false)); }, [refresh]);

  useEffect(() => {
    if (!newLink) { setQrDataUrl(""); return; }
    void QRCode.toDataURL(newLink.url, { width: 320, margin: 2, errorCorrectionLevel: "M",
      color: { dark: "#20352a", light: "#fffdf8" } }).then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [newLink]);

  const request = async (mutation: DraftMutation) => {
    if (!snapshot) throw new Error("Physical Links is still opening.");
    const response = await fetch("/api/physical-links", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...mutation, revision: snapshot.revision }) });
    const value = await responseBody(response);
    if (!response.ok) { await refresh(); throw new Error("That change could not be saved."); }
    const result = parsePhysicalLinksMutationResponse(value); setSnapshot(result.snapshot);
    return result;
  };

  const createAsset = async () => {
    setBusy(true); setMessage("");
    try {
      await request({ operation: "CREATE_ASSET", asset: { ...draft,
        warrantyDueAt: draft.warrantyDueAt || null, nextServiceAt: draft.nextServiceAt || null } });
      setDraft(emptyPhysicalAssetDraft); setShowAssetForm(false);
      setMessage("Item saved. You can now make a private tag for it.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "That item could not be saved."); }
    finally { setBusy(false); }
  };

  const createOrReplace = async (operation: "CREATE_LINK" | "REPLACE_LINK", id: string,
    name?: string) => {
    setBusy(true); setMessage("");
    try {
      const result = await request(operation === "CREATE_LINK"
        ? { operation, assetId: id, name: name || "Physical tag", expiresAt: null }
        : { operation, linkId: id });
      if (result.newLink) setNewLink({ id: result.newLink.id,
        url: `${window.location.origin}${result.newLink.path}` });
      setMessage(operation === "REPLACE_LINK"
        ? "The old tag is unavailable. Save the new one below."
        : "Your private tag is ready. Save it now; DiaryDock does not store the secret.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "That link could not be created."); }
    finally { setBusy(false); }
  };

  const manage = async (linkId: string, action: Extract<PhysicalLinksMutation,
    { operation: "MANAGE_LINK" }>["action"], value?: string) => {
    setBusy(true); setMessage("");
    try { await request({ operation: "MANAGE_LINK", linkId, action, value: value ?? null });
      setMessage(action === "REVOKE" ? "That tag is permanently revoked." : "Physical Link updated."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "That link could not be updated."); }
    finally { setBusy(false); }
  };

  const writeNfc = async () => {
    if (!newLink) return;
    const Reader = (window as unknown as { NDEFReader?: new () => { write: (message: {
      records: { recordType: string; data: string }[] }) => Promise<void> } }).NDEFReader;
    if (!Reader) { setMessage("NFC writing is unavailable here. Use the QR code or copy the link."); return; }
    try { await new Reader().write({ records: [{ recordType: "url", data: newLink.url }] });
      setMessage("The NFC tag was written successfully."); }
    catch { setMessage("The NFC tag was not written. Keep it close and try again."); }
  };

  return { assets, assetsById, busy, createAsset, createOrReplace, draft, links, loading, manage,
    message, newLink, qrDataUrl, setDraft, setMessage, setNewLink, setShowAssetForm, snapshot,
    showAssetForm, writeNfc };
}

export type PhysicalLinksController = ReturnType<typeof usePhysicalLinks>;
