import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { parseHomeHandoverSnapshot } from "@diarydock/home-handover";
import { readBoundedJsonResponse } from "@/lib/http/bounded-json-response";

import type {
  HandoverCandidate,
  HandoverDraft,
  HandoverItem,
  HandoverPublication,
  ReceivedHandover,
} from "./home-handover-model";

export function useHomeHandover() {
  const [draft, setDraft] = useState<HandoverDraft | null>(null);
  const [items, setItems] = useState<HandoverItem[]>([]);
  const [candidates, setCandidates] = useState<HandoverCandidate[]>([]);
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [publication, setPublication] = useState<HandoverPublication | null>(null);
  const [received, setReceived] = useState<ReceivedHandover[]>([]);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [name, setName] = useState("My home handover");
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [message, setMessage] = useState("");
  const selectedKeys = useMemo(
    () =>
      new Set(items.map((item) => `${item.resourceType}:${item.resourceId}`)),
    [items],
  );

  const adopt = useCallback((value: unknown) => {
    const payload = parseHomeHandoverSnapshot(value);
    setDraft(payload.draft); setItems(payload.items);
    setCandidates(payload.candidates); setExclusions(payload.exclusions);
    setPublication(payload.publication); setReceived(payload.received);
    return payload;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/home-handover", { cache: "no-store" });
      const payload = await readBoundedJsonResponse(response, 512 * 1024);
      if (!response.ok) {
        const error = payload && typeof payload === "object" && "error" in payload
          ? String(payload.error) : "Home Handover could not be loaded.";
        throw new Error(error);
      }
      adopt(payload);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Home Handover could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [adopt]);

  useEffect(() => {
    void load();
  }, [load]);

  const request = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/home-handover", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await readBoundedJsonResponse(response, 512 * 1024);
    if (!response.ok) {
      if (response.status === 409 && payload && typeof payload === "object"
        && "snapshot" in payload) adopt(payload.snapshot);
      const message = payload && typeof payload === "object" && "error" in payload
        ? String(payload.error) : "That handover change could not be saved.";
      throw new Error(
        message,
      );
    }
    return adopt(payload);
  };

  const createDraft = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusyKey("create");
    setMessage("");
    try {
      await request({ operation: "CREATE_PACK", name });
      setMessage(
        "Your private draft is ready. Nothing has been shared or exported.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "That draft could not be created.",
      );
    } finally {
      setBusyKey("");
    }
  };

  const toggleItem = async (candidate: HandoverCandidate) => {
    if (!draft) return;
    const key = `${candidate.resourceType}:${candidate.resourceId}`;
    const selected = selectedKeys.has(key);
    setBusyKey(key);
    setMessage("");
    try {
      await request({
        operation: "SET_ITEM",
        packId: draft.id,
        revision: draft.revision,
        resourceType: candidate.resourceType,
        resourceId: candidate.resourceId,
        selected: !selected,
      });
      setMessage(
        selected
          ? "Item removed from the private preview."
          : "Item added to the private preview.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "That item could not be changed.",
      );
    } finally {
      setBusyKey("");
    }
  };

  const publish = async () => {
    if (!draft || !recipientEmail.trim()) return;
    setBusyKey("publish"); setMessage("");
    try {
      await request({ operation: "PUBLISH", packId: draft.id,
        revision: draft.revision, recipientEmail });
      setRecipientEmail("");
      setMessage("A read-only copy is now available to that verified email for 30 days.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Home Handover could not be shared.");
    } finally { setBusyKey(""); }
  };

  const revoke = async () => {
    if (!publication) return;
    setBusyKey("revoke"); setMessage("");
    try {
      await request({ operation: "REVOKE", publicationId: publication.id,
        publicationRevision: publication.revision });
      setMessage("Recipient access has been revoked.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Recipient access could not be revoked.");
    } finally { setBusyKey(""); }
  };

  return {
    busyKey,
    candidates,
    createDraft,
    draft,
    exclusions,
    items,
    loading,
    message,
    name,
    publication,
    publish,
    received,
    recipientEmail,
    revoke,
    selectedKeys,
    setName,
    setRecipientEmail,
    toggleItem,
  };
}
