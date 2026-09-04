"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { RoomActivitySections } from "@/components/room-page/RoomActivitySections";
import { RoomEditorModal } from "@/components/room-page/RoomEditorModal";
import { RoomHero } from "@/components/room-page/RoomHero";
import { RoomOverviewSections } from "@/components/room-page/RoomOverviewSections";
import {
  buildRoomDocumentEntries,
  emptyActivityDraft,
  emptyDocumentDraft,
  emptyTaskDraft,
  roomDocumentCategories,
  roomStarterSuggestions,
  swipeRoomOrder,
  type RoomModal
} from "@/components/room-page/room-page-model";
import { RoomRecordsSections } from "@/components/room-page/RoomRecordsSections";
import type { RoomDetail, RoomDocument, VaultDocument } from "@/lib/mock-data";
import { upsertStructuredDocument, upsertStructuredReminder } from "@/lib/structured-data";

export function RoomPage({ room }: { room: RoomDetail }) {
  const router = useRouter();
  const swipeStartX = useRef<number | null>(null);
  const { state, repositoryMode, updateState } = useDiaryDockData();
  const tasks = state.roomTasks[room.id] ?? room.tasks;
  const documents = state.roomDocuments[room.id] ?? room.documents;
  const activity = state.roomActivity[room.id] ?? room.activity;
  const reminders = useMemo(
    () => state.reminders.filter((item) => item.roomId === room.id).slice(0, 3),
    [room.id, state.reminders]
  );
  const vaultDocuments = useMemo(
    () =>
      state.vaultDocuments.filter(
        (document) => document.roomId === room.id || document.roomName === room.name
      ),
    [room.id, room.name, state.vaultDocuments]
  );
  const documentEntries = useMemo(
    () => buildRoomDocumentEntries(room, documents, vaultDocuments),
    [documents, room, vaultDocuments]
  );
  const mailItems = room.id === "mailbox" ? state.mailboxItems : [];
  const [modal, setModal] = useState<RoomModal>(null);
  const [taskDraft, setTaskDraft] = useState(emptyTaskDraft);
  const [documentDraft, setDocumentDraft] = useState(emptyDocumentDraft);
  const [activityDraft, setActivityDraft] = useState(emptyActivityDraft);

  const closeModal = () => {
    setModal(null);
    setTaskDraft(emptyTaskDraft);
    setDocumentDraft(emptyDocumentDraft);
    setActivityDraft(emptyActivityDraft);
  };
  const addActivityEntry = (text: string, by = "DiaryDock") => {
    updateState((current) => ({
      ...current,
      roomActivity: {
        ...current.roomActivity,
        [room.id]: [
          { id: `${room.id}-activity-${Date.now()}`, text, when: "Just now", by },
          ...(current.roomActivity[room.id] ?? [])
        ]
      }
    }));
  };
  const toggleTask = (id: string) => {
    updateState((current) => ({
      ...current,
      roomTasks: {
        ...current.roomTasks,
        [room.id]: (current.roomTasks[room.id] ?? []).map((task) =>
          task.id === id ? { ...task, done: !task.done } : task
        )
      }
    }));
  };
  const addTask = () => {
    const label = taskDraft.label.trim();
    if (!label) return;
    updateState((current) => ({
      ...current,
      roomTasks: {
        ...current.roomTasks,
        [room.id]: [
          { id: `${room.id}-task-${Date.now()}`, label, due: taskDraft.due.trim() || undefined, done: false },
          ...(current.roomTasks[room.id] ?? [])
        ]
      }
    }));
    addActivityEntry(`Added a new room task: ${label}`);
    closeModal();
  };
  const addDocument = () => {
    const title = documentDraft.title.trim();
    if (!title) return;
    const nextDocument: RoomDocument = {
      id: `${room.id}-document-${Date.now()}`,
      title,
      kind: documentDraft.kind,
      size: documentDraft.size.trim() || "Pending upload",
      updated: "Just now"
    };
    const vaultDocument: VaultDocument = {
      id: crypto.randomUUID(), title,
      category: roomDocumentCategories[room.id] ?? "Home & Property",
      kind: nextDocument.kind, size: nextDocument.size, updated: "Just now",
      roomId: room.id, roomName: room.name, reviewStatus: "needs-review",
      reviewReasons: ["Please check the document title, category and room before relying on these details."],
    };
    updateState((current) => ({
      ...current,
      roomDocuments: {
        ...current.roomDocuments,
        [room.id]: [nextDocument, ...(current.roomDocuments[room.id] ?? [])]
      },
      vaultDocuments: [
        vaultDocument,
        ...current.vaultDocuments
      ]
    }));
    if (repositoryMode === "supabase") void upsertStructuredDocument(vaultDocument);
    addActivityEntry(`Filed ${title} in this room`);
    closeModal();
  };
  const addActivity = () => {
    const text = activityDraft.text.trim();
    if (!text) return;
    addActivityEntry(text, activityDraft.by.trim() || "You");
    closeModal();
  };
  const routeMailboxItem = (id: string, target: "vault" | "reminder" | "room") => {
    const item = state.mailboxItems.find((entry) => entry.id === id);
    if (!item) return;
    const nextDocument: VaultDocument | null = target === "vault" ? {
      id: crypto.randomUUID(), title: item.title,
      category: item.suggestedRoom === "Family Room" ? "Memories" : "Home & Property",
      kind: item.kind === "Form" ? "PDF" : "Scan", size: "Pending review",
      updated: "Just now", reviewStatus: "needs-review",
      reviewReasons: ["Please check this Mailbox record before relying on it."],
    } : null;
    const nextReminder = target === "reminder" ? {
      id: crypto.randomUUID(), title: `Review ${item.title}`,
      note: `${item.source} arrived in the Mailbox and needs a decision.`,
      roomId: "mailbox", roomName: "Mailbox", group: "today" as const,
      timeLabel: "Today", priority: "high" as const,
    } : null;
    updateState((current) => {
      const nextState = {
        ...current,
        mailboxItems: current.mailboxItems.map((entry) =>
          entry.id === id ? { ...entry, routeStatus: target } : entry
        )
      };
      if (nextDocument) nextState.vaultDocuments = [nextDocument, ...nextState.vaultDocuments];
      if (nextReminder) nextState.reminders = [nextReminder, ...nextState.reminders];
      return nextState;
    });
    if (repositoryMode === "supabase" && nextDocument) void upsertStructuredDocument(nextDocument);
    if (repositoryMode === "supabase" && nextReminder) void upsertStructuredReminder(nextReminder);
    addActivityEntry(target === "vault" ? `${item.title} was sent to All Files` : target === "reminder" ? `${item.title} was turned into a reminder` : `${item.title} was routed to ${item.suggestedRoom ?? "its room"}`);
  };
  const moveToAdjacentRoom = (direction: 1 | -1) => {
    const currentIndex = swipeRoomOrder.indexOf(room.id as (typeof swipeRoomOrder)[number]);
    if (currentIndex === -1) return;
    router.push(`/room/${swipeRoomOrder[(currentIndex + direction + swipeRoomOrder.length) % swipeRoomOrder.length]}`);
  };

  const scanHref = `/capture?room=${encodeURIComponent(room.id)}`;
  const starters = roomStarterSuggestions[room.id] ?? room.belongsHere.slice(0, 3).map((item) => `Add ${item.toLowerCase()}`);
  return (
    <>
      <div
        className="immersive-page touch-pan-y"
        onTouchStart={(event) => { swipeStartX.current = event.touches[0]?.clientX ?? null; }}
        onTouchEnd={(event) => {
          if (swipeStartX.current === null) return;
          const deltaX = event.changedTouches[0]?.clientX - swipeStartX.current;
          swipeStartX.current = null;
          if (Math.abs(deltaX) >= 85) moveToAdjacentRoom(deltaX < 0 ? 1 : -1);
        }}
      >
        <RoomHero documentCount={documents.length} room={room} />
        <RoomOverviewSections
          activity={activity}
          documentCount={documents.length}
          linkedCount={room.id === "mailbox"
            ? mailItems.filter((item) => item.routeStatus !== "new").length
            : reminders.length}
          onAddTask={() => setModal("task")}
          onToggleTask={toggleTask}
          openTaskCount={tasks.filter((task) => !task.done).length}
          room={room}
          scanHref={scanHref}
          starterSuggestions={starters}
          tasks={tasks}
        />
        <RoomRecordsSections documents={documentEntries} mailItems={mailItems} onAddDocument={() => setModal("document")} onRouteMail={routeMailboxItem} reminders={reminders} roomId={room.id} />
        <RoomActivitySections activity={activity} onAdd={() => setModal("activity")} room={room} />
      </div>
      <RoomEditorModal
        activityDraft={activityDraft}
        documentDraft={documentDraft}
        modal={modal}
        onClose={closeModal}
        onSave={modal === "task"
          ? addTask
          : modal === "document" ? addDocument : addActivity}
        roomName={room.name}
        setActivityDraft={setActivityDraft}
        setDocumentDraft={setDocumentDraft}
        setTaskDraft={setTaskDraft}
        taskDraft={taskDraft}
      />
    </>
  );
}
