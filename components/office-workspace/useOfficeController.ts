"use client";

import { useEffect, useMemo, useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import {
  documentBelongsInDrawer,
  officeDrawers,
  type OfficeDrawerId,
  type OfficePanel,
} from "@/components/office-workspace/office-workspace-model";
import type { WillsWishesRecord } from "@/lib/diarydock-data";
import type { VaultDocument } from "@/lib/mock-data";
import { upsertStructuredReminder } from "@/lib/structured-data";

export function useOfficeController(initialDrawer?: OfficeDrawerId) {
  const { state, repositoryMode, updateState } = useDiaryDockData();
  const [panel, setPanel] = useState<OfficePanel>(initialDrawer ? "documents" : null);
  const [selectedDrawer, setSelectedDrawer] = useState<OfficeDrawerId | null>(initialDrawer ?? null);
  const [drawerQuery, setDrawerQuery] = useState("");
  const [wishesDraft, setWishesDraft] = useState<WillsWishesRecord>(state.willsWishes);

  useEffect(() => { setWishesDraft(state.willsWishes); }, [state.willsWishes]);
  const officeInbox = useMemo(() => state.mailboxItems.filter((item) =>
    item.routeStatus === "new" && item.suggestedRoom?.toLowerCase() === "office",
  ), [state.mailboxItems]);
  const officeTasks = (state.roomTasks.office ?? []).filter((task) => !task.done);
  const officeReminders = state.reminders.filter((reminder) =>
    reminder.roomId === "office" && reminder.group !== "done",
  );
  const officeFiles = useMemo(() => state.vaultDocuments.filter((document) =>
    officeDrawers.some((drawer) => documentBelongsInDrawer(document, drawer.id)),
  ), [state.vaultDocuments]);
  const drawerFiles = useMemo(() => Object.fromEntries(officeDrawers.map((drawer) => [
    drawer.id,
    officeFiles.filter((document) => documentBelongsInDrawer(document, drawer.id)),
  ])) as Record<OfficeDrawerId, VaultDocument[]>, [officeFiles]);
  const adminCount = officeTasks.length + officeReminders.length;
  const selectedDrawerConfig = officeDrawers.find((drawer) => drawer.id === selectedDrawer) ?? null;
  const selectedDrawerFiles = selectedDrawer
    ? drawerFiles[selectedDrawer].filter((document) =>
      `${document.title} ${document.category}`.toLowerCase().includes(drawerQuery.trim().toLowerCase()),
    )
    : [];

  const openDocumentDrawer = (drawer: OfficeDrawerId) => {
    setSelectedDrawer(drawer);
    setDrawerQuery("");
    setPanel("documents");
  };
  const closeDocumentDrawer = () => {
    setPanel(null);
    setSelectedDrawer(null);
    setDrawerQuery("");
  };
  const saveWishes = () => {
    const nextRecord = { ...wishesDraft, updatedAt: "Just now" };
    setWishesDraft(nextRecord);
    updateState((current) => ({ ...current, willsWishes: nextRecord }));
  };
  const completeTask = (id: string) => {
    updateState((current) => ({
      ...current,
      roomTasks: {
        ...current.roomTasks,
        office: (current.roomTasks.office ?? []).map((task) =>
          task.id === id ? { ...task, done: true } : task,
        ),
      },
    }));
  };
  const completeReminder = (id: string) => {
    const reminder = state.reminders.find((item) => item.id === id);
    const completed = reminder
      ? { ...reminder, group: "done" as const, timeLabel: "Completed" }
      : null;
    updateState((current) => ({
      ...current,
      reminders: current.reminders.map((reminder) => reminder.id === id
        ? completed ?? reminder
        : reminder),
    }));
    if (repositoryMode === "supabase" && completed) void upsertStructuredReminder(completed);
  };

  return {
    panel, setPanel, officeInbox, officeTasks, officeReminders, adminCount,
    drawerFiles, selectedDrawer, selectedDrawerConfig, selectedDrawerFiles,
    drawerQuery, setDrawerQuery, wishesDraft, setWishesDraft, saveWishes,
    openDocumentDrawer, closeDocumentDrawer, completeTask, completeReminder,
  };
}

export type OfficeController = ReturnType<typeof useOfficeController>;
