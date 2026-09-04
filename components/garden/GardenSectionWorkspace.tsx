"use client";

import { useMemo, useState, type FormEvent } from "react";

import { BottomNav } from "@/components/BottomNav";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import {
  emptyGardenReminderDraft,
  filterGardenDocuments,
  filterGardenReminders,
  formatGardenDate,
  gardenAccentClasses,
  gardenSectionMeta,
} from "@/components/garden/garden-section-model";
import { GardenReminderModal } from "@/components/garden/GardenReminderModal";
import { GardenSectionHeader } from "@/components/garden/GardenSectionHeader";
import { GardenSectionLists } from "@/components/garden/GardenSectionLists";
import {
  GardenSectionFooter,
  GardenSectionOverview,
} from "@/components/garden/GardenSectionOverview";
import type { GardenSection } from "@/lib/garden-sections";
import type { Reminder } from "@/lib/mock-data";
import { upsertStructuredReminder } from "@/lib/structured-data";

export function GardenSectionWorkspace({
  section,
}: {
  section: GardenSection;
}) {
  const { state, hydrated, repositoryMode, updateState } = useDiaryDockData();
  const [addingReminder, setAddingReminder] = useState(false);
  const [draft, setDraft] = useState(emptyGardenReminderDraft);
  const [message, setMessage] = useState("");
  const meta = gardenSectionMeta[section.id];
  const accent = gardenAccentClasses[meta.accent];
  const documents = useMemo(
    () => filterGardenDocuments(state.vaultDocuments, section.id),
    [state.vaultDocuments, section.id],
  );
  const reminders = useMemo(
    () => filterGardenReminders(state.reminders, section.id),
    [state.reminders, section.id],
  );
  const reviewCount = documents.filter(
    (document) => document.reviewStatus === "needs-review",
  ).length;

  const openReminder = () => {
    setMessage("");
    setAddingReminder(true);
  };
  async function saveReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) {
      setMessage("Add a title before saving the reminder.");
      return;
    }
    const dateLabel = formatGardenDate(draft.date);
    const reminder: Reminder = {
      id: crypto.randomUUID(),
      title: draft.title.trim(),
      note: draft.note.trim() || `${section.title} reminder`,
      roomId: "garden",
      roomName: "Garden",
      group: draft.date ? "later" : "week",
      timeLabel: [dateLabel, draft.time].filter(Boolean).join(", ") || "Later",
      priority: draft.priority,
      repeat: draft.repeat.trim() || undefined,
      dueDate: draft.date || undefined,
    };
    updateState((current) => ({
      ...current,
      reminders: [reminder, ...current.reminders],
    }));
    if (repositoryMode === "supabase") await upsertStructuredReminder(reminder);
    setDraft(emptyGardenReminderDraft);
    setAddingReminder(false);
    setMessage(`${section.title} reminder saved.`);
  }

  if (!hydrated) {
    return (
      <main className="min-h-screen bg-[#f5f2ea] p-4">
        <div className="mx-auto max-w-[760px] animate-pulse space-y-4">
          <div className="h-40 rounded-[28px] bg-white/70" />
          <div className="h-72 rounded-[24px] bg-white/70" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f2ea] pb-32 text-[#20352a]">
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <span className="absolute -right-20 top-16 h-72 w-72 rounded-full bg-[#dfe7d8]/60 blur-3xl" />
        <span className="absolute -left-20 bottom-24 h-72 w-72 rounded-full bg-[#ead9c0]/45 blur-3xl" />
      </div>
      <div className="relative mx-auto w-full max-w-[760px] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <GardenSectionHeader
          accent={accent}
          documentCount={documents.length}
          meta={meta}
          reminderCount={reminders.length}
          reviewCount={reviewCount}
          section={section}
        />
        {message ? (
          <p
            role="status"
            className="mt-4 rounded-2xl bg-[#e8eee3] px-4 py-3 text-xs font-medium text-[#48604e]"
          >
            {message}
          </p>
        ) : null}
        <GardenSectionOverview
          accent={accent}
          meta={meta}
          onAdd={openReminder}
          section={section}
        />
        <GardenSectionLists
          documents={documents}
          meta={meta}
          onAdd={() => setAddingReminder(true)}
          reminders={reminders}
          section={section}
        />
        <GardenSectionFooter notice={meta.notice} />
      </div>
      <GardenReminderModal
        draft={draft}
        message={message}
        meta={meta}
        onClose={() => setAddingReminder(false)}
        onSubmit={saveReminder}
        open={addingReminder}
        section={section}
        setDraft={setDraft}
      />
      <BottomNav />
    </main>
  );
}
