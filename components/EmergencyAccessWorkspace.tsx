"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { UiIcon } from "@/components/UiIcon";

type Grant = { id: string; resource_type: string; resource_id: string; label: string; granted_at: string; revoked_at: string | null };
type Contact = { id: string; name: string; email: string; relation: string; status: string; expires_at: string; accepted_at: string | null; emergency_access_grants: Grant[] };
type Resource = { type: "DOCUMENT" | "INSTRUCTION" | "CONTACT" | "HOME_INFO"; id: string; label: string; detail: string };
type AccessNotice = { id: string; event_type: string; label: string; created_at: string };
type AccessPayload = { contacts?: Contact[]; resources?: Resource[]; notifications?: AccessNotice[]; error?: string };

export function EmergencyAccessWorkspace() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [notices, setNotices] = useState<AccessNotice[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [draft, setDraft] = useState({ name: "", email: "", relation: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/emergency-access", { cache: "no-store" });
      const payload = await response.json() as AccessPayload;
      if (!response.ok) throw new Error(payload.error || "Trusted access could not be loaded.");
      setContacts(payload.contacts ?? []); setResources(payload.resources ?? []); setNotices(payload.notifications ?? []);
      setSelectedContactId((current) => current || payload.contacts?.find((contact) => contact.status !== "REVOKED")?.id || "");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Trusted access could not be loaded."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const selected = contacts.find((contact) => contact.id === selectedContactId);
  const activeKeys = useMemo(() => new Set((selected?.emergency_access_grants ?? []).filter((grant) => !grant.revoked_at).map((grant) => `${grant.resource_type}:${grant.resource_id}`)), [selected]);

  const request = async (body: Record<string, unknown>) => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/emergency-access", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json() as { error?: string; invitePath?: string };
      if (!response.ok) throw new Error(payload.error || "Trusted access could not be changed.");
      if (payload.invitePath) setInviteUrl(`${window.location.origin}${payload.invitePath}`);
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Trusted access could not be changed."); }
    finally { setBusy(false); }
  };

  const create = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.email.trim()) return;
    void request({ operation: "CREATE_CONTACT", ...draft }).then(() => setDraft({ name: "", email: "", relation: "" }));
  };

  return <div className="space-y-5 pb-28">
    <PageHeader eyebrow="Trusted access" title="Emergency sharing" subtitle="Choose a trusted person, then select only the individual emergency items they may open. This is separate from household sharing." backHref="/emergency" backLabel="Emergency" action={<Link href="/emergency/shared" className="inline-flex min-h-11 items-center rounded-full border border-[#315443]/10 bg-white px-3 text-xs font-semibold text-[#52705a]">Received access</Link>} meta={<><span className="estate-chip">Nothing shared by default</span><span className="estate-chip">Revocable</span></>} />

    <section className="estate-sheet p-5"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8efe5] text-[#52705a]"><UiIcon name="shield" className="h-5 w-5" /></span><div><h2 className="font-serif text-xl">A narrow emergency view</h2><p className="mt-1 text-sm leading-6 text-[#667068]">Trusted people never receive your whole account or Vault. Invitations expire after 14 days, must be accepted by the invited email, and changes require a recent sign-in.</p></div></div></section>

    {error ? <div role="alert" className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}{error.includes("sign in again") ? <Link href="/login" className="ml-2 font-semibold underline">Sign in again</Link> : null}</div> : null}
    {inviteUrl ? <section className="rounded-[22px] border border-[#d8c9ad] bg-[#f4ead7] p-4"><h2 className="text-sm font-semibold">Copy this invitation now</h2><p className="mt-1 text-xs leading-5 text-[#6f604a]">For safety, the private invitation secret is shown only once. Send it to the named person using a channel you trust.</p><div className="mt-3 flex gap-2"><input readOnly value={inviteUrl} className="min-w-0 flex-1 rounded-xl border border-[#6f604a]/15 bg-white px-3 text-xs"/><button type="button" onClick={() => void navigator.clipboard.writeText(inviteUrl)} className="min-h-11 rounded-xl bg-[#315443] px-4 text-xs font-semibold text-white">Copy link</button></div><button type="button" onClick={() => setInviteUrl("")} className="mt-2 text-xs font-semibold text-[#6f604a] underline">I have saved it</button></section> : null}

    <section className="estate-sheet p-5"><h2 className="font-serif text-xl">Add a trusted person</h2><form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-3"><label className="text-xs font-semibold text-[#667068]">Name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} maxLength={120} className="form-control" /></label><label className="text-xs font-semibold text-[#667068]">Email<input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} maxLength={254} className="form-control" /></label><label className="text-xs font-semibold text-[#667068]">Relationship<input value={draft.relation} onChange={(event) => setDraft({ ...draft, relation: event.target.value })} maxLength={120} className="form-control" placeholder="Neighbour, sibling…" /></label><button disabled={busy || !draft.name.trim() || !draft.email.trim()} className="min-h-12 rounded-[15px] bg-[#315443] px-4 text-sm font-semibold text-white disabled:opacity-45 sm:col-span-3">Create invitation</button></form></section>

    <section className="space-y-3"><div className="flex items-center justify-between gap-3"><div><h2 className="font-serif text-2xl">Trusted people</h2><p className="mt-1 text-sm text-[#667068]">Pending people have no access until they accept.</p></div>{loading ? <span className="text-xs text-[#667068]">Loading…</span> : null}</div>{contacts.length ? <div className="grid gap-3 sm:grid-cols-2">{contacts.map((contact) => <button key={contact.id} type="button" onClick={() => setSelectedContactId(contact.id)} className={`rounded-[20px] border p-4 text-left ${selectedContactId === contact.id ? "border-[#6f8e72] bg-[#eef2e9]" : "border-white/80 bg-white/80"}`}><div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{contact.name}</p><p className="mt-1 text-xs text-[#667068]">{contact.email} · {contact.relation || "Trusted person"}</p></div><span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold tracking-[0.12em] text-[#52705a]">{contact.status}</span></div><p className="mt-3 text-xs text-[#667068]">{contact.emergency_access_grants.filter((grant) => !grant.revoked_at).length} selected item(s)</p>{contact.status !== "REVOKED" ? <span role="button" onClick={(event) => { event.stopPropagation(); if (window.confirm(`Remove all emergency access for ${contact.name}?`)) void request({ operation: "REVOKE_CONTACT", contactId: contact.id }); }} className="mt-3 inline-flex min-h-10 items-center text-xs font-semibold text-red-600">Revoke all access</span> : null}</button>)}</div> : <div className="estate-sheet p-5 text-sm text-[#667068]">No trusted people have been added.</div>}</section>

    {selected && selected.status !== "REVOKED" ? <section className="space-y-3"><div><h2 className="font-serif text-2xl">Items for {selected.name}</h2><p className="mt-1 text-sm text-[#667068]">Select items one at a time. Document choices are limited to records already marked for emergency use.</p></div><div className="estate-sheet divide-y divide-white/70 overflow-hidden">{resources.length ? resources.map((resource) => { const granted = activeKeys.has(`${resource.type}:${resource.id}`); return <div key={`${resource.type}:${resource.id}`} className="flex items-center gap-3 px-4 py-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef2e9] text-[#52705a]"><UiIcon name={resource.type === "CONTACT" ? "phone" : resource.type === "DOCUMENT" ? "file" : "shield"} className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{resource.label}</span><span className="block truncate text-xs text-[#667068]">{resource.detail || resource.type.replace("_", " ")}</span></span><button disabled={busy} onClick={() => void request({ operation: granted ? "REVOKE_GRANT" : "GRANT", contactId: selected.id, resourceType: resource.type, resourceId: resource.id })} className={`min-h-10 rounded-xl px-3 text-xs font-semibold ${granted ? "bg-red-50 text-red-600" : "bg-[#315443] text-white"}`}>{granted ? "Remove" : "Allow"}</button></div>; }) : <p className="p-5 text-sm text-[#667068]">Add emergency contacts, plans or home information—or mark a document for emergency use—to make it selectable here.</p>}</div></section> : null}

    {notices.length ? <section className="estate-sheet p-5"><h2 className="font-serif text-xl">Recent access changes</h2><div className="mt-3 space-y-2">{notices.slice(0, 8).map((notice) => <div key={notice.id} className="flex items-center justify-between gap-3 text-xs"><span className="font-semibold text-[#33423a]">{notice.event_type.replaceAll("_", " ").toLowerCase()} {notice.label ? `· ${notice.label}` : ""}</span><time className="shrink-0 text-[#667068]">{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(notice.created_at))}</time></div>)}</div></section> : null}

    <p className="text-xs leading-5 text-[#667068]">DiaryDock does not automatically release information after inactivity or death. Any future delayed-access feature requires separate approval and design.</p>
  </div>;
}
