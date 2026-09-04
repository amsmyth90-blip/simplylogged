"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { PageHeader } from "@/components/PageHeader";
import { HouseholdAccessActivity, HouseholdMembersCard, HouseholdOwnershipTransfer, PeopleSharingModals } from "@/components/people-sharing/PeopleSharingPanels";
import { emptyInvite, type InviteDraft } from "@/components/people-sharing/people-sharing-model";
import { sharedDocumentSummary } from "@/lib/household-access";
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
  }, [household?.householdId, household?.ownershipTransfer?.id]);

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
          <HouseholdMembersCard
            canManage={canManageHousehold}
            currentUserId={currentUserId}
            householdName={household?.householdName ?? ""}
            memberSummary={memberSummary}
            members={members}
            onOpenMember={openMember}
            onRename={() => { setHouseholdName(household?.householdName ?? ""); setMessage(""); setRenameOpen(true); }}
          />

          <HouseholdAccessActivity
            busy={busy}
            canManage={canManageHousehold}
            events={events}
            invites={pendingInvites}
            members={members}
            onChangeInvite={(token, action) => void changeInvite(token, action)}
            onCopyInvite={(token) => void copyInviteLink(token)}
          />

          <HouseholdOwnershipTransfer household={household!} onRefresh={refreshHousehold} />

          {currentMember?.role !== "owner" ? (
            <section className="estate-sheet flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="text-sm font-semibold text-ink">Leave this household</h2><p className="mt-1 text-xs leading-5 text-ink/48">Your selected grants will be revoked and shared household plans removed from your account.</p></div>
              <button type="button" disabled={Boolean(busy)} onClick={() => void leaveCurrentHousehold()} className="min-h-11 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700">Leave household</button>
            </section>
          ) : null}
        </>
      )}

      <PeopleSharingModals
        busy={busy}
        canManage={canManageHousehold}
        createdInviteToken={createdInviteToken}
        currentUserId={currentUserId}
        householdName={householdName}
        inviteDraft={inviteDraft}
        inviteOpen={inviteOpen}
        memberSummary={memberSummary}
        onCloseInvite={() => { setInviteOpen(false); setCreatedInviteToken(""); setMessage(""); }}
        onCloseMember={() => { setSelectedMember(null); setMessage(""); }}
        onCloseRename={() => { setRenameOpen(false); setMessage(""); }}
        onCopyInvite={(token) => void copyInviteLink(token)}
        onCreateInvite={() => void createInvite()}
        onHouseholdNameChange={setHouseholdName}
        onInviteChange={setInviteDraft}
        onRemoveMember={() => void removeMember()}
        onRoleChange={setRoleDraft}
        onSaveName={() => void saveHouseholdName()}
        onSaveRole={() => void saveMemberRole()}
        renameOpen={renameOpen}
        roleDraft={roleDraft}
        selectedMember={selectedMember}
      />

      <p className="text-center text-[11px] leading-5 text-ink/40">{ownedDocumentCount} document{ownedDocumentCount === 1 ? "" : "s"} in your account · new documents remain private unless you change them</p>
    </div>
  );
}
