import {
  KITCHEN_NOTICEBOARD_SCHEMA_VERSION,
  buildNoticeArtifacts,
  parseKitchenNotice,
  parseKitchenNoticeboardSnapshot,
  type KitchenNotice,
  type KitchenNoticeMutation,
  type NoticeReminder,
} from "@diarydock/kitchen";

type AppStatePayload = Record<string, unknown>;
type NoticeEffect = { deleteReminderId: string | null; upsertReminder: NoticeReminder | null };
type NoticeMutationResult =
  | { status: "OK"; payload: AppStatePayload; effect: NoticeEffect }
  | { status: "CAPACITY" | "NOT_FOUND"; payload: null; effect: null };

function object(value: unknown): AppStatePayload {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as AppStatePayload : {};
}

function validNotices(value: unknown) {
  if (!Array.isArray(value)) return [];
  const notices: KitchenNotice[] = [];
  const ids = new Set<string>();
  for (const candidate of value.slice(0, 300)) {
    try {
      const notice = parseKitchenNotice(candidate);
      if (!ids.has(notice.id)) { ids.add(notice.id); notices.push(notice); }
    } catch { /* Invalid legacy entries do not cross the mobile contract. */ }
  }
  return notices;
}

function assignees(payload: AppStatePayload) {
  const names = new Set(["Family"]);
  const add = (value: unknown) => {
    const name = object(value).name;
    if (typeof name === "string" && name.trim() && name.trim().length <= 120) names.add(name.trim());
  };
  const profiles = Array.isArray(payload.householdProfiles) ? payload.householdProfiles : [];
  profiles.slice(0, 100).forEach((profile) => {
    if (object(profile).showInReminders === true) add(profile);
  });
  const members = Array.isArray(payload.householdMembers) ? payload.householdMembers : [];
  members.slice(0, 100).forEach(add);
  return [...names].slice(0, 100);
}

export function projectKitchenNoticeboard(payload: unknown, revision: string | null) {
  const state = object(payload);
  return parseKitchenNoticeboardSnapshot({
    schemaVersion: KITCHEN_NOTICEBOARD_SCHEMA_VERSION,
    revision,
    notices: validNotices(state.kitchenNoticeboard),
    assignees: assignees(state),
  });
}

function replaceById(items: unknown[], id: string, value: unknown) {
  const index = items.findIndex((item) => object(item).id === id);
  if (index < 0) return false;
  items[index] = value;
  return true;
}

function updateLegacyReminder(payload: AppStatePayload, effect: NoticeEffect) {
  const reminders = Array.isArray(payload.reminders) ? [...payload.reminders] : [];
  if (effect.deleteReminderId) {
    payload.reminders = reminders.filter((item) => object(item).id !== effect.deleteReminderId);
  } else if (effect.upsertReminder) {
    payload.reminders = [effect.upsertReminder,
      ...reminders.filter((item) => object(item).id !== effect.upsertReminder?.id)];
  }
}

function updateLegacyCalendar(payload: AppStatePayload, notice: KitchenNotice, calendar: unknown) {
  const events = Array.isArray(payload.familyCalendarEvents) ? [...payload.familyCalendarEvents] : [];
  if (calendar) {
    const eventId = object(calendar).id;
    payload.familyCalendarEvents = [calendar,
      ...events.filter((item) => object(item).id !== eventId)];
  } else if (notice.linkedCalendarEventId) {
    payload.familyCalendarEvents = events
      .filter((item) => object(item).id !== notice.linkedCalendarEventId);
  }
}

function saveNotice(
  payload: AppStatePayload,
  mutation: Extract<KitchenNoticeMutation, { operation: "SAVE_NOTICE" }>,
  createId: () => string,
  now: Date,
): NoticeMutationResult {
  const raw = Array.isArray(payload.kitchenNoticeboard) ? [...payload.kitchenNoticeboard] : [];
  const existing = mutation.noticeId
    ? validNotices(raw).find((notice) => notice.id === mutation.noticeId) : undefined;
  if (mutation.noticeId && !existing) return { status: "NOT_FOUND", payload: null, effect: null };
  if (!existing && validNotices(raw).length >= 300) {
    return { status: "CAPACITY", payload: null, effect: null };
  }
  const noticeId = existing?.id ?? `notice-${createId()}`;
  const result = buildNoticeArtifacts({
    draft: {
      title: mutation.title, detail: mutation.detail, category: mutation.category,
      assignedTo: mutation.assignedTo, due: mutation.due, colour: mutation.colour,
      pinned: mutation.pinned, completed: mutation.completed, archived: existing?.archived ?? false,
      archivedAt: existing?.archivedAt, completedAt: existing?.completedAt, source: mutation.source,
    },
    existing, linkCalendar: mutation.linkCalendar, linkReminder: mutation.linkReminder,
    noticeId, now,
  });
  if (existing) replaceById(raw, existing.id, result.notice);
  else raw.unshift(result.notice);
  payload.kitchenNoticeboard = raw;
  const effect = {
    deleteReminderId: !result.reminder ? existing?.linkedReminderId ?? null : null,
    upsertReminder: result.reminder,
  };
  updateLegacyReminder(payload, effect);
  updateLegacyCalendar(payload, existing ?? result.notice, result.calendarEvent);
  return { status: "OK", payload, effect };
}

function setNoticeState(
  payload: AppStatePayload,
  mutation: Extract<KitchenNoticeMutation, { operation: "SET_NOTICE_STATE" }>,
  now: Date,
): NoticeMutationResult {
  const raw = Array.isArray(payload.kitchenNoticeboard) ? [...payload.kitchenNoticeboard] : [];
  const existing = validNotices(raw).find((notice) => notice.id === mutation.noticeId);
  if (!existing) return { status: "NOT_FOUND", payload: null, effect: null };
  const next: KitchenNotice = { ...existing };
  if (mutation.state === "PINNED" || mutation.state === "UNPINNED") {
    next.pinned = mutation.state === "PINNED";
  } else if (mutation.state === "COMPLETED" || mutation.state === "OPEN") {
    next.completed = mutation.state === "COMPLETED";
    next.completedAt = next.completed ? next.completedAt ?? now.toISOString() : undefined;
  } else {
    next.archived = mutation.state === "ARCHIVED";
    next.archivedAt = next.archived ? now.toISOString() : undefined;
  }
  replaceById(raw, existing.id, next);
  payload.kitchenNoticeboard = raw;
  let effect: NoticeEffect = { deleteReminderId: null, upsertReminder: null };
  if (next.linkedReminderId && (mutation.state === "COMPLETED" || mutation.state === "OPEN")) {
    const result = buildNoticeArtifacts({
      draft: { ...next }, existing, linkCalendar: Boolean(next.linkedCalendarEventId),
      linkReminder: true, noticeId: next.id, now,
    });
    effect = { deleteReminderId: null, upsertReminder: result.reminder };
    updateLegacyReminder(payload, effect);
  }
  return { status: "OK", payload, effect };
}

export function mutateKitchenNoticeboard(
  current: unknown,
  mutation: KitchenNoticeMutation,
  createId: () => string = () => crypto.randomUUID(),
  now = new Date(),
): NoticeMutationResult {
  const payload = structuredClone(object(current));
  return mutation.operation === "SAVE_NOTICE"
    ? saveNotice(payload, mutation, createId, now)
    : setNoticeState(payload, mutation, now);
}
