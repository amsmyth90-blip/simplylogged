"use client";

import { useMemo, useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";

const gardenDocumentTerms = [
  "garden",
  "outdoor",
  "pet",
  "vet",
  "vaccination",
  "shed",
  "fence",
  "equipment",
  "bin",
  "recycling",
];

export function useGardenWorkspace() {
  const { state, hydrated } = useDiaryDockData();
  const [addOpen, setAddOpen] = useState(false);
  const gardenReminders = useMemo(
    () =>
      state.reminders.filter(
        (reminder) => reminder.roomId === "garden" && reminder.group !== "done",
      ),
    [state.reminders],
  );
  const gardenDocuments = useMemo(
    () =>
      state.vaultDocuments.filter((document) => {
        if (document.roomId === "garden") return true;
        const searchable =
          `${document.category} ${document.title}`.toLowerCase();
        return gardenDocumentTerms.some((term) => searchable.includes(term));
      }),
    [state.vaultDocuments],
  );
  const reviewDocuments = gardenDocuments.filter(
    (document) => document.reviewStatus === "needs-review",
  );
  const attentionItems = [
    ...gardenReminders.slice(0, 3).map((reminder) => ({
      id: `reminder-${reminder.id}`,
      href: "/reminders",
      icon: "calendar" as const,
      title: reminder.title,
      detail: [reminder.timeLabel, reminder.note].filter(Boolean).join(" · "),
    })),
    ...reviewDocuments.slice(0, 3).map((document) => ({
      id: `document-${document.id}`,
      href: `/document/${document.id}?from=garden`,
      icon: "file" as const,
      title: document.title,
      detail: "Check the extracted details against the original file.",
    })),
  ].slice(0, 4);

  return {
    hydrated,
    gardenReminders,
    gardenDocuments,
    reviewDocuments,
    attentionItems,
    addOpen,
    setAddOpen,
  };
}

export type GardenViewModel = ReturnType<typeof useGardenWorkspace>;
