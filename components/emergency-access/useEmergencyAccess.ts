import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { AccessPayload } from "./emergency-access-model";

export function useEmergencyAccess() {
  const [contacts, setContacts] = useState<
    NonNullable<AccessPayload["contacts"]>
  >([]);
  const [resources, setResources] = useState<
    NonNullable<AccessPayload["resources"]>
  >([]);
  const [notices, setNotices] = useState<
    NonNullable<AccessPayload["notifications"]>
  >([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [draft, setDraft] = useState({ name: "", email: "", relation: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/emergency-access", {
        cache: "no-store",
      });
      const payload = (await response.json()) as AccessPayload;
      if (!response.ok) {
        throw new Error(payload.error || "Trusted access could not be loaded.");
      }
      setContacts(payload.contacts ?? []);
      setResources(payload.resources ?? []);
      setNotices(payload.notifications ?? []);
      setSelectedContactId(
        (current) =>
          current ||
          payload.contacts?.find((contact) => contact.status !== "REVOKED")
            ?.id ||
          "",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Trusted access could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selected = contacts.find((contact) => contact.id === selectedContactId);
  const activeKeys = useMemo(
    () =>
      new Set(
        (selected?.emergency_access_grants ?? [])
          .filter((grant) => !grant.revoked_at)
          .map((grant) => `${grant.resource_type}:${grant.resource_id}`),
      ),
    [selected],
  );

  const request = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/emergency-access", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as {
        error?: string;
        invitePath?: string;
      };
      if (!response.ok) {
        throw new Error(
          payload.error || "Trusted access could not be changed.",
        );
      }
      if (payload.invitePath) {
        setInviteUrl(`${window.location.origin}${payload.invitePath}`);
      }
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Trusted access could not be changed.",
      );
    } finally {
      setBusy(false);
    }
  };

  const create = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.email.trim()) return;
    void request({ operation: "CREATE_CONTACT", ...draft }).then(() =>
      setDraft({ name: "", email: "", relation: "" }),
    );
  };

  return {
    activeKeys,
    busy,
    contacts,
    create,
    draft,
    error,
    inviteUrl,
    loading,
    notices,
    request,
    resources,
    selected,
    selectedContactId,
    setDraft,
    setInviteUrl,
    setSelectedContactId,
  };
}

export type EmergencyAccessController = ReturnType<typeof useEmergencyAccess>;
