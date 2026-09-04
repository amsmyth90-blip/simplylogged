import { DocumentService } from "@diarydock/documents";
import type { OfflineStore } from "@diarydock/offline-store";
import { ReminderService } from "@diarydock/reminders";
import type { SearchCandidate } from "@diarydock/search";

function parts(...values: Array<string | undefined>) {
  return values.filter((value): value is string => Boolean(value?.trim())).join(" ");
}

function documentDomains(roomId?: string): SearchCandidate["domains"] {
  const domains: SearchCandidate["domains"] = ["documents"];
  if (roomId === "garage") domains.push("vehicles");
  if (roomId === "garden") domains.push("pets");
  if (roomId === "driveway") domains.push("travel");
  if (roomId === "kitchen" || roomId === "office") domains.push("home");
  return domains;
}

export async function loadLocalSearchCandidates(store: OfflineStore) {
  const [documents, reminders] = await Promise.all([
    new DocumentService(store).list(),
    new ReminderService(store).list(),
  ]);
  const candidates: SearchCandidate[] = documents.map((document) => ({
    id: `document:${document.id}`,
    category: "documents",
    domains: documentDomains(document.roomId),
    title: document.title,
    detail: parts(document.category, document.roomName, document.issuer),
    href: `/document/${document.id}`,
    dueAt: document.dueDate,
    badge: document.reviewStatus === "needs-review" ? "Review" : document.kind,
    searchText: parts(
      document.title,
      document.category,
      document.kind,
      document.roomName,
      document.issuer,
    ),
    updatedAt: document.updatedAt,
  }));
  reminders.forEach((reminder) => candidates.push({
    id: `reminder:${reminder.id}`,
    category: "reminders",
    domains: ["reminders"],
    title: reminder.title,
    detail: parts(reminder.timeLabel, reminder.roomName, reminder.documentTitle),
    href: "/reminders",
    dueAt: reminder.dueAt ?? reminder.sourceDueAt,
    badge: reminder.priority,
    searchText: parts(
      reminder.title,
      reminder.note,
      reminder.roomName,
      reminder.documentTitle,
      reminder.timeLabel,
    ),
    updatedAt: reminder.dueAt,
  }));
  return candidates;
}
