import { useState, type FormEvent } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import type {
  BedroomSectionId,
  HealthTimelineEvent,
} from "@/lib/health-records";
import type { Reminder } from "@/lib/mock-data";
import { upsertStructuredReminder } from "@/lib/structured-data";

import {
  addableBedroomSections,
  bedroomSectionMeta,
  emptyBedroomDraft,
  formatHealthDate,
  genuineHealthDocuments,
} from "./bedroom-section-model";

export function useBedroomSection(
  section: BedroomSectionId,
  initiallyAdding: boolean,
) {
  const data = useDiaryDockData();
  const [adding, setAdding] = useState(initiallyAdding);
  const [draft, setDraft] = useState(emptyBedroomDraft);
  const [message, setMessage] = useState("");
  const health = data.state.health;
  const contacts = data.state.professionalContacts.contacts;
  const healthContacts = contacts.filter(
    (contact) =>
      contact.category === "Healthcare" ||
      [
        health.profile.gpContactId,
        health.profile.pharmacyContactId,
        health.profile.emergencyContactId,
      ].includes(contact.id),
  );
  const documents = genuineHealthDocuments(data.state.vaultDocuments);
  const addable = addableBedroomSections.includes(section);

  const saveRecord = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim()) {
      setMessage("Add a name or title before saving.");
      return;
    }
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const title = draft.title.trim();
    const timelineType = timelineTypeFor(section);
    const reminder = appointmentReminder(section, draft, title);

    data.updateState((current) => {
      const next = { ...current.health, updatedAt: now };
      if (section === "medications") {
        next.medications = [
          {
            id,
            name: title,
            dose: draft.secondary,
            frequency: draft.detail,
            prescriber: "",
            status: "current",
            reviewDate: draft.date,
            reminderId: reminder?.id,
            notes: draft.notes,
            createdAt: now,
          },
          ...next.medications,
        ];
      }
      if (section === "appointments") {
        next.appointments = [
          {
            id,
            title,
            provider: draft.secondary,
            location: draft.detail,
            date: draft.date,
            time: draft.time,
            status: "planned",
            preparationNotes: draft.notes,
            followUpNotes: "",
            reminderId: reminder?.id,
            createdAt: now,
          },
          ...next.appointments,
        ];
      }
      if (section === "tests") {
        next.tests = [
          {
            id,
            title,
            provider: draft.secondary,
            date: draft.date,
            followUpStatus: "not-recorded",
            notes: draft.notes,
            createdAt: now,
          },
          ...next.tests,
        ];
      }
      if (section === "vaccinations") {
        next.vaccinations = [
          {
            id,
            name: title,
            provider: draft.secondary,
            date: draft.date,
            nextDate: draft.detail,
            notes: draft.notes,
            createdAt: now,
          },
          ...next.vaccinations,
        ];
      }
      if (section === "dental-optical") {
        next.dentalOptical = [
          {
            id,
            type: draft.detail === "optical" ? "optical" : "dental",
            title,
            provider: draft.secondary,
            date: draft.date,
            nextReviewDate: "",
            notes: draft.notes,
            createdAt: now,
          },
          ...next.dentalOptical,
        ];
      }
      if (section === "wellbeing") {
        next.wellbeing = [
          {
            id,
            title,
            date: draft.date,
            sleepHours: draft.secondary ? Number(draft.secondary) : undefined,
            notes: draft.notes,
            createdAt: now,
          },
          ...next.wellbeing,
        ];
      }
      if (section === "allergies") {
        next.allergies = [
          {
            id,
            allergen: title,
            reaction: draft.secondary,
            severity: allergySeverity(draft.detail),
            notes: draft.notes,
            createdAt: now,
          },
          ...next.allergies,
        ];
      }
      if (section === "conditions") {
        next.conditions = [
          {
            id,
            name: title,
            recordedDate: draft.date,
            status: conditionStatus(draft.detail),
            notes: draft.notes,
            createdAt: now,
          },
          ...next.conditions,
        ];
      }

      const standalone = [
        "health-timeline",
        "medical-devices",
        "procedures",
      ].includes(section);
      next.timeline = [
        {
          id: standalone ? id : crypto.randomUUID(),
          type: timelineType,
          title,
          date: draft.date,
          notes: standalone
            ? [draft.secondary, draft.detail, draft.notes]
                .filter(Boolean)
                .join(" · ")
            : draft.notes,
          linkedRecordId: standalone ? undefined : id,
          createdAt: now,
        },
        ...next.timeline,
      ];
      return {
        ...current,
        health: next,
        reminders: reminder
          ? [reminder, ...current.reminders]
          : current.reminders,
      };
    });
    if (reminder && data.repositoryMode === "supabase") {
      await upsertStructuredReminder(reminder);
    }
    setDraft(emptyBedroomDraft);
    setAdding(false);
    setMessage("Saved to your private health area.");
  };

  return {
    ...data,
    addable,
    adding,
    documents,
    draft,
    health,
    healthContacts,
    message,
    meta: bedroomSectionMeta[section],
    saveRecord,
    section,
    setAdding,
    setDraft,
    setMessage,
  };
}

export type BedroomSectionController = ReturnType<typeof useBedroomSection>;

function timelineTypeFor(
  section: BedroomSectionId,
): HealthTimelineEvent["type"] {
  if (section === "appointments") return "appointment";
  if (section === "medications") return "medication";
  if (section === "tests") return "test";
  if (section === "vaccinations") return "vaccination";
  if (section === "conditions") return "condition";
  if (section === "procedures") return "procedure";
  return "other";
}

function appointmentReminder(
  section: BedroomSectionId,
  draft: typeof emptyBedroomDraft,
  title: string,
): Reminder | undefined {
  if (section !== "appointments" || !draft.makeReminder || !draft.date) {
    return undefined;
  }
  return {
    id: crypto.randomUUID(),
    title,
    note: draft.notes || "Healthcare appointment added from My Health.",
    roomId: "bedroom",
    roomName: "Bedroom",
    group: "later",
    timeLabel: `${formatHealthDate(draft.date)}${draft.time ? `, ${draft.time}` : ""}`,
    priority: "normal",
    dueDate: draft.date,
  };
}

function allergySeverity(value: string) {
  return value === "mild" ||
    value === "moderate" ||
    value === "severe-user-recorded"
    ? value
    : "not-recorded";
}

function conditionStatus(value: string) {
  if (value === "past") return "past";
  if (value === "current") return "current";
  return "not-set";
}
