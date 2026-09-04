"use client";

import { useEffect, useMemo, useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { FamilyInboxModal } from "@/components/family/FamilyInboxModal";
import { FamilyMemberModal } from "@/components/family/FamilyMemberModal";
import { FamilyRoomScene } from "@/components/family/FamilyRoomScene";
import { FamilyScheduleModal } from "@/components/family/FamilyScheduleModal";
import {
  buildFamilyInboxItems,
  householdStyleOptions,
  type FamilyInboxItem,
  type HouseholdStyle
} from "@/components/family/family-workspace-model";
import type { HouseholdMember } from "@/lib/diarydock-data";
import { upsertStructuredReminder } from "@/lib/structured-data";

export function FamilyWorkspace() {
  const { state, household, hydrated, canManageHousehold, repositoryMode, updateState } =
    useDiaryDockData();
  const members = state.householdMembers;
  const [selectedMember, setSelectedMember] = useState<HouseholdMember | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [householdStyle, setHouseholdStyle] = useState<HouseholdStyle>("children");
  const [householdStyleSet, setHouseholdStyleSet] = useState(false);

  useEffect(() => {
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.classList.add("family-immersive");
    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
      document.body.classList.remove("family-immersive");
    };
  }, []);

  useEffect(() => {
    const storedStyle = window.localStorage.getItem("diarydock-household-style");
    if (householdStyleOptions.some((style) => style.id === storedStyle)) {
      setHouseholdStyle(storedStyle as HouseholdStyle);
      setHouseholdStyleSet(true);
    }
    if (new URLSearchParams(window.location.search).get("setup") === "schedules") {
      setScheduleOpen(true);
    }
  }, []);

  const activeStyle =
    householdStyleOptions.find((style) => style.id === householdStyle) ??
    householdStyleOptions[0];
  const inboxItems = useMemo(
    () =>
      buildFamilyInboxItems({
        mailboxItems: state.mailboxItems,
        reminders: state.reminders,
        vaultDocuments: state.vaultDocuments
      }),
    [state.mailboxItems, state.reminders, state.vaultDocuments]
  );
  const assignees = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...members.map((member) => member.name),
            ...state.householdProfiles
              .filter((profile) => profile.showInReminders)
              .map((profile) => profile.name)
          ].filter(Boolean)
        )
      ),
    [members, state.householdProfiles]
  );
  const activeRoutines = state.kidSchedules.filter((routine) => !routine.paused).slice(0, 3);

  const selectHouseholdStyle = (style: HouseholdStyle) => {
    setHouseholdStyle(style);
    setHouseholdStyleSet(true);
    window.localStorage.setItem("diarydock-household-style", style);
  };

  const updateInboxItem = (
    item: FamilyInboxItem,
    field: "assignedTo" | "dueDate" | "complete",
    value = ""
  ) => {
    if (!item.actionable || item.sourceType === "document") return;
    const reminderId = item.sourceType === "reminder" ? item.sourceId : item.linkedReminderId;
    const reminder = reminderId
      ? state.reminders.find((entry) => entry.id === reminderId)
      : undefined;
    const nextReminder = reminder
      ? field === "assignedTo"
        ? { ...reminder, assignedTo: value || undefined }
        : field === "dueDate"
          ? { ...reminder, dueDate: value || undefined }
          : { ...reminder, group: "done" as const, timeLabel: "Completed" }
      : undefined;

    updateState((current) => ({
      ...current,
      mailboxItems:
        item.sourceType === "mail"
          ? current.mailboxItems.map((entry) =>
              entry.id === item.sourceId
                ? field === "assignedTo"
                  ? { ...entry, assignedTo: value || undefined }
                  : field === "dueDate"
                    ? { ...entry, dueDate: value || undefined }
                    : { ...entry, familyCompletedAt: new Date().toISOString() }
                : entry
            )
          : current.mailboxItems,
      reminders: nextReminder
        ? current.reminders.map((entry) => (entry.id === nextReminder.id ? nextReminder : entry))
        : current.reminders
    }));
    if (nextReminder && repositoryMode === "supabase") {
      void upsertStructuredReminder(nextReminder).catch(() => undefined);
    }
  };

  return (
    <>
      <FamilyRoomScene
        activeStyle={activeStyle}
        householdName={household?.householdName}
        householdStyleSet={householdStyleSet}
        hydrated={hydrated}
        inboxItems={inboxItems}
        members={members}
        onOpenInbox={() => setInboxOpen(true)}
        onOpenMembers={() => members[0] && setSelectedMember(members[0])}
        onOpenSchedules={() => setScheduleOpen(true)}
      />
      <FamilyMemberModal
        canManage={canManageHousehold}
        inviteCount={state.familyInvites.length}
        members={members}
        onClose={() => setSelectedMember(null)}
        onSelect={setSelectedMember}
        selected={selectedMember}
      />
      <FamilyInboxModal
        assignees={assignees}
        items={inboxItems}
        onClose={() => setInboxOpen(false)}
        onUpdate={updateInboxItem}
        open={inboxOpen}
      />
      <FamilyScheduleModal
        activeStyle={activeStyle}
        householdStyle={householdStyle}
        householdStyleSet={householdStyleSet}
        onClose={() => setScheduleOpen(false)}
        onSelectStyle={selectHouseholdStyle}
        open={scheduleOpen}
        routines={activeRoutines}
      />
    </>
  );
}
