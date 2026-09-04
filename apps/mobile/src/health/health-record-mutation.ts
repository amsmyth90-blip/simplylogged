import type { HealthTimelineEvent } from "@diarydock/health";

import type { HealthDraftMutation } from "./health-client";

export type HealthEditorType =
  | "medication"
  | "appointment"
  | "allergy"
  | "condition"
  | "test"
  | "vaccination"
  | "dental-optical"
  | "wellbeing"
  | "timeline";

export type HealthRecordDraft = {
  title: string;
  secondary: string;
  detail: string;
  date: string;
  time: string;
  notes: string;
};

function timeline(
  id: string,
  type: HealthTimelineEvent["type"],
  draft: HealthRecordDraft,
  now: string,
  linkedRecordId?: string,
): HealthTimelineEvent {
  return {
    id,
    type,
    title: draft.title.trim(),
    date: draft.date,
    notes: draft.notes.trim(),
    linkedRecordId,
    createdAt: now,
  };
}

export function createHealthMutation(
  type: HealthEditorType,
  draft: HealthRecordDraft,
  reminderId?: string,
): HealthDraftMutation {
  const now = new Date().toISOString();
  const recordId = crypto.randomUUID();
  const commonTimeline = (eventType: HealthTimelineEvent["type"]) => (
    timeline(crypto.randomUUID(), eventType, draft, now, recordId)
  );

  if (type === "medication") {
    return {
      operation: "ADD_MEDICATION",
      record: {
        id: recordId,
        name: draft.title.trim(),
        dose: draft.secondary.trim(),
        frequency: draft.detail.trim(),
        prescriber: "",
        status: "current",
        reviewDate: draft.date,
        notes: draft.notes.trim(),
        createdAt: now,
      },
      timeline: commonTimeline("medication"),
    };
  }
  if (type === "appointment") {
    return {
      operation: "ADD_APPOINTMENT",
      record: {
        id: recordId,
        title: draft.title.trim(),
        provider: draft.secondary.trim(),
        location: draft.detail.trim(),
        date: draft.date,
        time: draft.time,
        status: "planned",
        preparationNotes: draft.notes.trim(),
        followUpNotes: "",
        reminderId,
        createdAt: now,
      },
      timeline: commonTimeline("appointment"),
    };
  }
  if (type === "allergy") {
    const allowed = ["mild", "moderate", "severe-user-recorded"];
    const severity = allowed.includes(draft.detail)
      ? draft.detail as "mild" | "moderate" | "severe-user-recorded"
      : "not-recorded";
    return {
      operation: "ADD_ALLERGY",
      record: {
        id: recordId,
        allergen: draft.title.trim(),
        reaction: draft.secondary.trim(),
        severity,
        notes: draft.notes.trim(),
        createdAt: now,
      },
      timeline: commonTimeline("other"),
    };
  }
  if (type === "condition") {
    const status = draft.detail === "past" || draft.detail === "current"
      ? draft.detail
      : "not-set";
    return {
      operation: "ADD_CONDITION",
      record: {
        id: recordId,
        name: draft.title.trim(),
        recordedDate: draft.date,
        status,
        notes: draft.notes.trim(),
        createdAt: now,
      },
      timeline: commonTimeline("condition"),
    };
  }
  if (type === "test") {
    return {
      operation: "ADD_TEST",
      record: {
        id: recordId,
        title: draft.title.trim(),
        provider: draft.secondary.trim(),
        date: draft.date,
        followUpStatus: "not-recorded",
        notes: draft.notes.trim(),
        createdAt: now,
      },
      timeline: commonTimeline("test"),
    };
  }
  if (type === "vaccination") {
    return {
      operation: "ADD_VACCINATION",
      record: {
        id: recordId,
        name: draft.title.trim(),
        provider: draft.secondary.trim(),
        date: draft.date,
        nextDate: draft.detail,
        notes: draft.notes.trim(),
        createdAt: now,
      },
      timeline: commonTimeline("vaccination"),
    };
  }
  if (type === "dental-optical") {
    return {
      operation: "ADD_DENTAL_OPTICAL",
      record: {
        id: recordId,
        type: draft.detail === "optical" ? "optical" : "dental",
        title: draft.title.trim(),
        provider: draft.secondary.trim(),
        date: draft.date,
        nextReviewDate: "",
        notes: draft.notes.trim(),
        createdAt: now,
      },
      timeline: commonTimeline("other"),
    };
  }
  if (type === "wellbeing") {
    const numericSleep = Number(draft.secondary);
    const sleepHours = draft.secondary && Number.isFinite(numericSleep)
      ? Math.min(24, Math.max(0, numericSleep))
      : undefined;
    return {
      operation: "ADD_WELLBEING",
      record: {
        id: recordId,
        title: draft.title.trim(),
        date: draft.date,
        sleepHours,
        notes: draft.notes.trim(),
        createdAt: now,
      },
      timeline: commonTimeline("other"),
    };
  }

  const allowedEvents = ["procedure", "test", "vaccination", "document", "other"];
  const eventType = allowedEvents.includes(draft.secondary)
    ? draft.secondary as HealthTimelineEvent["type"]
    : "other";
  return {
    operation: "ADD_TIMELINE",
    record: timeline(recordId, eventType, draft, now),
  };
}
