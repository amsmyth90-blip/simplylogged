"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { ModalShell } from "@/components/ModalShell";
import { PageHeader } from "@/components/PageHeader";
import { UiIcon } from "@/components/UiIcon";
import {
  householdAuditLabel,
  householdRoleDescription,
  householdRoleLabel,
  sharedDocumentSummary
} from "@/lib/household-access";
import {
  cancelHouseholdInvite,
  createHouseholdRoleInvite,
  leaveHousehold,
  loadHouseholdAccessEvents,
  removeHouseholdMember,
  renameHousehold,
  renewHouseholdInvite,
  updateHouseholdMemberRole,
  type HouseholdAccessEvent,
  type HouseholdDirectoryMember,
  type HouseholdRole
} from "@/lib/household-sharing";

type InviteDraft = {
  name: string;
  email: string;
  relation: string;
  role: Exclude<HouseholdRole, "owner">;
};

const emptyInvite: InviteDraft = {
  name: "",
  email: "",
  relation: "",
  role: "viewer"
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "DD";
}

function friendlyDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function PeopleSharingWorkspace() {
  const {
    state,
    household,
    hydrated,
    repositoryMode,
    canManageHousehold,
    refreshHousehold
  } = useDiaryDockData();
  const [selectedMember, setSelectedMember] = useState<HouseholdDirectoryMember | null>(null);
  const [roleDraft, setRoleDraft] = useState<Exclude<HouseholdRole, "owner">>("viewer");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [inviteDraft, setInviteDraft] = useState<InviteDraft>(emptyInvite);
  const [householdName, setHouseholdName] = useState("");
  const [createdInviteToken, setCreatedInviteToken] = useState("");
  const [events, setEvents] = useState<HouseholdAccessEvent[]>([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const connected = repositoryMode === "supabase" && Boolean(household);
  const members = household?.members ?? [];
  const currentUserId = household?.currentUserId ?? "";
  const currentMember = members.find((member) => member.userId === currentUserId) ?? null;
  const pendingInvites = household?.invites ?? [];

  const ownedDocumentCount = useMemo(
    () => state.vaultDocuments.filter((document) => !document.ownerId || document.ownerId === currentUserId).length,
    [currentUserId, state.vaultDocuments]
  );

  const refreshEvents = async (householdId = household?.householdId) => {
    if (!householdId) {
      setEvents([]);
      return;
    }
    setEvents(await loadHouseholdAccessEvents(householdId));
  };

  useEffect(() => {
    let cancelled = false;
    if (!household?.householdId) {
      setEvents([]);
      return;
    }

    void loadHouseholdAccessEvents(household.householdId).then((nextEvents) => {
      if (!cancelled) setEvents(nextEvents);
    });

    return () => {
      cancelled = true;
    };
  }, [household?.householdId]);

  const openMember = (member: HouseholdDirectoryMember) => {
    setMessage("");
    setSelectedMember(member);
    if (member.role !== "owner") setRoleDraft(member.role);
  };

  const memberSummary = (member: HouseholdDirectoryMember) =>
    sharedDocumentSummary({
      documents: state.vaultDocuments,
      currentUserId,
      targetUserId: member.userId
    });

  const saveMemberRole = async () => {
    if (!selectedMember || selectedMember.role === "owner") return;
    setBusy("role");
    setMessage("");
    try {
      await updateHouseholdMemberRole(selectedMember.userId, roleDraft);
      const next = await refreshHousehold();
      const refreshedMember = next?.members.find((member) => member.userId === selectedMember.userId) ?? null;
      setSelectedMember(refreshedMember);
      await refreshEvents(next?.householdId);
      setMessage("Access role updated. Existing document visibility choices are unchanged.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Access could not be updated.");
    } finally {
      setBusy("");
    }
  };

  const removeMember = async () => {
    if (!selectedMember || selectedMember.role === "owner") return;
    if (!window.confirm(`Remove ${selectedMember.name} from this household? Their access will stop immediately.`)) return;

    setBusy("remove");
    setMessage("");
    try {
      await removeHouseholdMember(selectedMember.userId);
      const next = await refreshHousehold();
      setSelectedMember(null);
      await refreshEvents(next?.householdId);
      setMessage(`${selectedMember.name} was removed. Selected document grants were revoked.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "This member could not be removed.");
    } finally {
      setBusy("");
    }
  };

  const saveHouseholdName = async () => {
    if (!householdName.trim()) return;
    setBusy("rename");
    setMessage("");
    try {
      await renameHousehold(householdName);
      const next = await refreshHousehold();
      setRenameOpen(false);
      await refreshEvents(next?.householdId);
      setMessage("Household name updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The household name could not be changed.");
    } finally {
      setBusy("");
    }
  };

  const createInvite = async () => {
    if (!inviteDraft.name.trim() || !inviteDraft.email.includes("@")) {
      setMessage("Add their name and a valid email address.");
      return;
    }

    setBusy("invite");
    setMessage("");
    try {
      const token = await createHouseholdRoleInvite(inviteDraft);
      setCreatedInviteToken(token);
      const next = await refreshHousehold();
      await refreshEvents(next?.householdId);
      setMessage("Invitation created. Copy the secure link and send it to the invited email address.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The invitation could not be created.");
    } finally {
      setBusy("");
    }
  };

  const copyInviteLink = async (token: string) => {
    const link = `${window.location.origin}/family/invite/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      setMessage("Invitation link copied.");
    } catch {
      setMessage(link);
    }
  };

  const changeInvite = async (token: string, action: "renew" | "cancel") => {
    setBusy(`${action}-${token}`);
    setMessage("");
    try {
      if (action === "renew") await renewHouseholdInvite(token);
      else await cancelHouseholdInvite(token);
      const next = await refreshHousehold();
      await refreshEvents(next?.householdId);
      setMessage(action === "renew" ? "Invitation renewed for 14 days." : "Invitation cancelled.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The invitation could not be changed.");
    } finally {
      setBusy("");
    }
  };

  const leaveCurrentHousehold = async () => {
    if (!window.confirm("Leave this household? Shared household plans will be removed from your account and your selected access will be revoked.")) return;
    setBusy("leave");
    setMessage("");
    try {
      await leaveHousehold();
      await refreshHousehold(true);
      setEvents([]);
      setMessage("You left the household. DiaryDock created a new private household for your account.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "You could not leave this household.");
    } finally {
      setBusy("");
    }
  };

  if (!hydrated) {
    return <div className="estate-sheet p-5 text-sm text-ink/55">Loading your household access…</div>;
  }

  return (
    <div className="immersive-page space-y-5 pb-6">
      <PageHeader
        eyebrow="Family Room"
        title="People & Sharing"
        subtitle="See who belongs to your household and what you have deliberately shared."
        backHref="/family"
        backLabel="People"
        action={canManageHousehold && connected ? (
          <button type="button" onClick={() => { setInviteDraft(emptyInvite); setCreatedInviteToken(""); setMessage(""); setInviteOpen(true); }} className="rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-white">
            Invite
          </button>
        ) : undefined}
      />

      {message ? <p role="status" className="rounded-2xl border border-moss/15 bg-sage/55 px-4 py-3 text-sm font-semibold text-moss">{message}</p> : null}

      {!connected ? (
        <section className="estate-sheet p-5">
          <h2 className="text-base font-semibold text-ink">Household sync is unavailable</h2>
          <p className="mt-2 text-sm leading-6 text-ink/55">Profiles can still help organise schedules and meals, but account access is only managed when secure sync is connected.</p>
          <Link href="/family/household/profiles" className="mt-4 inline-flex rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white">Open household profiles</Link>
        </section>
      ) : (
        <>
          <section className="estate-sheet p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/40">Your household</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">{household?.householdName}</h2>
                <p className="mt-1 text-sm text-ink/50">{members.length} active account{members.length === 1 ? "" : "s"}</p>
              </div>
              {canManageHousehold ? (
                <button type="button" onClick={() => { setHouseholdName(household?.householdName ?? ""); setMessage(""); setRenameOpen(true); }} className="rounded-full border border-black/10 bg-white/80 px-3 py-2 text-xs font-semibold text-ink/65">Rename</button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {members.map((member) => {
                const summary = memberSummary(member);
                const isCurrent = member.userId === currentUserId;
                return (
                  <button key={member.userId} type="button" onClick={() => openMember(member)} className="flex min-h-24 items-center gap-3 rounded-[22px] border border-white/80 bg-white/72 p-3.5 text-left shadow-sm transition hover:bg-white">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sage/65 text-sm font-bold text-moss">{initials(member.name)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-ink">{member.name}</span>
                        {isCurrent ? <span className="rounded-full bg-mist px-2 py-0.5 text-[9px] font-bold text-ink/55">You</span> : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink/48">{householdRoleLabel(member.role)} · {member.relation}</span>
                      <span className="mt-1.5 block text-[11px] font-semibold text-moss">
                        {isCurrent ? "Your DiaryDock account" : `${summary.totalCount} of your documents visible`}
                      </span>
                    </span>
                    <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-ink/30" />
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col gap-2 border-t border-black/5 pt-4 sm:flex-row">
              <Link href="/family/household/profiles" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white/75 px-4 text-sm font-semibold text-ink/65">
                <UiIcon name="users" className="h-4 w-4" />
                Profiles for meals & schedules
              </Link>
              <Link href="/files?filter=shared" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-ink px-4 text-sm font-semibold text-white">
                <UiIcon name="folder" className="h-4 w-4" />
                Review shared documents
              </Link>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="estate-sheet p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-ink">Pending invitations</h2>
                  <p className="mt-1 text-xs leading-5 text-ink/48">Links work only for the invited email address.</p>
                </div>
                {canManageHousehold ? <span className="rounded-full bg-sage/60 px-2.5 py-1 text-xs font-semibold text-moss">{pendingInvites.length}</span> : null}
              </div>
              <div className="mt-3 space-y-2">
                {pendingInvites.length ? pendingInvites.map((invite) => (
                  <div key={invite.token} className="rounded-2xl bg-white/72 p-3">
                    <p className="truncate text-sm font-semibold text-ink">{invite.name}</p>
                    <p className="mt-0.5 truncate text-xs text-ink/48">{invite.email} · expires {friendlyDate(invite.expiresAt)}</p>
                    {canManageHousehold ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button type="button" onClick={() => void copyInviteLink(invite.token)} className="rounded-full bg-sage/60 px-3 py-1.5 text-[11px] font-semibold text-moss">Copy link</button>
                        <button type="button" disabled={Boolean(busy)} onClick={() => void changeInvite(invite.token, "renew")} className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-[11px] font-semibold text-ink/55">Renew</button>
                        <button type="button" disabled={Boolean(busy)} onClick={() => void changeInvite(invite.token, "cancel")} className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-rose-600">Cancel</button>
                      </div>
                    ) : null}
                  </div>
                )) : <p className="rounded-2xl border border-dashed border-black/10 bg-white/45 px-4 py-5 text-center text-sm text-ink/45">No invitations are waiting.</p>}
              </div>
            </div>

            <div className="estate-sheet p-4 sm:p-5">
              <h2 className="text-base font-semibold text-ink">Recent access changes</h2>
              <p className="mt-1 text-xs leading-5 text-ink/48">Security history avoids document titles and personal content.</p>
              <div className="mt-3 space-y-2">
                {events.length ? events.slice(0, 6).map((event) => {
                  const actor = members.find((member) => member.userId === event.actorUserId);
                  return (
                    <div key={event.id} className="flex items-center gap-3 rounded-2xl bg-white/72 px-3 py-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mist text-ink/50"><UiIcon name="shield" className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-ink">{householdAuditLabel(event.eventType)}</span><span className="mt-0.5 block text-[10px] text-ink/42">{actor?.name ?? "Household member"} · {friendlyDate(event.createdAt)}</span></span>
                    </div>
                  );
                }) : <p className="rounded-2xl border border-dashed border-black/10 bg-white/45 px-4 py-5 text-center text-sm text-ink/45">No access changes recorded yet.</p>}
              </div>
            </div>
          </section>

          {currentMember?.role !== "owner" ? (
            <section className="estate-sheet flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="text-sm font-semibold text-ink">Leave this household</h2><p className="mt-1 text-xs leading-5 text-ink/48">Your selected grants will be revoked and shared household plans removed from your account.</p></div>
              <button type="button" disabled={Boolean(busy)} onClick={() => void leaveCurrentHousehold()} className="min-h-11 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700">Leave household</button>
            </section>
          ) : null}
        </>
      )}

      <ModalShell open={Boolean(selectedMember)} title={selectedMember?.name ?? "Household member"} subtitle={selectedMember ? `${householdRoleLabel(selectedMember.role)} · ${selectedMember.relation}` : undefined} onClose={() => { setSelectedMember(null); setMessage(""); }}>
        {selectedMember ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-sage/45 p-4"><p className="text-sm font-semibold text-ink">What can they see?</p>{selectedMember.userId === currentUserId ? <p className="mt-2 text-sm leading-6 text-ink/58">Your own records remain available to you. Household membership never makes another person's private records visible.</p> : (() => { const summary = memberSummary(selectedMember); return <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-white/75 p-3"><p className="text-xl font-semibold text-ink">{summary.householdCount}</p><p className="text-xs text-ink/48">Shared with household</p></div><div className="rounded-xl bg-white/75 p-3"><p className="text-xl font-semibold text-ink">{summary.selectedCount}</p><p className="text-xs text-ink/48">Shared just with them</p></div></div>; })()}<p className="mt-3 text-xs leading-5 text-ink/48">These counts cover documents you own. Private documents and other people's choices are not revealed.</p></div>
            <div className="rounded-2xl border border-black/8 bg-white/72 p-4"><p className="text-sm font-semibold text-ink">{householdRoleLabel(selectedMember.role)}</p><p className="mt-1 text-xs leading-5 text-ink/52">{householdRoleDescription(selectedMember.role)}</p></div>
            {canManageHousehold && selectedMember.role !== "owner" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">{([['member', 'Adult', 'Can contribute to shared spaces'], ['viewer', 'Member', 'Can view deliberately shared items']] as const).map(([role, label, detail]) => <button key={role} type="button" onClick={() => setRoleDraft(role)} aria-pressed={roleDraft === role} className={`rounded-2xl border p-3 text-left ${roleDraft === role ? "border-moss/30 bg-sage/60" : "border-black/10 bg-white/70"}`}><span className="block text-sm font-semibold text-ink">{label}</span><span className="mt-1 block text-[11px] leading-4 text-ink/45">{detail}</span></button>)}</div>
                <button type="button" disabled={Boolean(busy)} onClick={() => void saveMemberRole()} className="min-h-11 w-full rounded-2xl bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50">{busy === "role" ? "Saving…" : "Save role"}</button>
                <button type="button" disabled={Boolean(busy)} onClick={() => void removeMember()} className="min-h-11 w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 disabled:opacity-50">{busy === "remove" ? "Removing…" : "Remove from household"}</button>
              </div>
            ) : null}
          </div>
        ) : null}
      </ModalShell>

      <ModalShell open={inviteOpen} title="Invite someone" subtitle="Create an email-bound link. It is not sent automatically." onClose={() => { setInviteOpen(false); setCreatedInviteToken(""); setMessage(""); }} footer={<button type="button" disabled={Boolean(busy) || Boolean(createdInviteToken)} onClick={() => void createInvite()} className="min-h-11 w-full rounded-2xl bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50">{busy === "invite" ? "Creating…" : createdInviteToken ? "Invitation created" : "Create invitation link"}</button>}>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5"><span className="text-xs font-semibold text-ink/60">Name</span><input value={inviteDraft.name} onChange={(event) => setInviteDraft((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm outline-none" /></label><label className="space-y-1.5"><span className="text-xs font-semibold text-ink/60">Relationship</span><input value={inviteDraft.relation} onChange={(event) => setInviteDraft((current) => ({ ...current, relation: event.target.value }))} className="w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm outline-none" /></label></div>
          <label className="block space-y-1.5"><span className="text-xs font-semibold text-ink/60">Email address</span><input type="email" autoComplete="email" value={inviteDraft.email} onChange={(event) => setInviteDraft((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm outline-none" /></label>
          <div className="grid grid-cols-2 gap-2">{([['viewer', 'Member', 'View deliberately shared items'], ['member', 'Adult', 'Contribute to shared spaces']] as const).map(([role, label, detail]) => <button key={role} type="button" onClick={() => setInviteDraft((current) => ({ ...current, role }))} aria-pressed={inviteDraft.role === role} className={`rounded-2xl border p-3 text-left ${inviteDraft.role === role ? "border-moss/30 bg-sage/60" : "border-black/10 bg-white/70"}`}><span className="block text-sm font-semibold text-ink">{label}</span><span className="mt-1 block text-[11px] leading-4 text-ink/45">{detail}</span></button>)}</div>
          {createdInviteToken ? <button type="button" onClick={() => void copyInviteLink(createdInviteToken)} className="min-h-11 w-full rounded-2xl bg-sage/65 px-4 text-sm font-semibold text-moss">Copy secure invitation link</button> : null}
        </div>
      </ModalShell>

      <ModalShell open={renameOpen} title="Household name" subtitle="This is shown to active household members." onClose={() => { setRenameOpen(false); setMessage(""); }} footer={<button type="button" disabled={Boolean(busy) || !householdName.trim()} onClick={() => void saveHouseholdName()} className="min-h-11 w-full rounded-2xl bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50">{busy === "rename" ? "Saving…" : "Save name"}</button>}>
        <label className="block space-y-1.5"><span className="text-xs font-semibold text-ink/60">Name</span><input maxLength={80} value={householdName} onChange={(event) => setHouseholdName(event.target.value)} className="w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm outline-none" /></label>
      </ModalShell>

      <p className="text-center text-[11px] leading-5 text-ink/40">{ownedDocumentCount} document{ownedDocumentCount === 1 ? "" : "s"} in your account · new documents remain private unless you change them</p>
    </div>
  );
}
