import type { SupabaseClient } from "@supabase/supabase-js";

import { roomDetails } from "@/lib/mock-data";
import { appStateCandidates } from "@/lib/search/app-state-candidates";
import {
  addDatedCandidate,
  stringParts,
  text,
  validDate,
} from "@/lib/search/candidate-utils";
import type { SearchCandidate } from "@/lib/search/results";

export type AuthorizedSearchLoad =
  | { candidates: SearchCandidate[]; error: null }
  | { candidates: []; error: string };

export async function loadAuthorizedSearchCandidates(
  supabase: SupabaseClient,
  userId: string,
): Promise<AuthorizedSearchLoad> {
  const [documentsResult, remindersResult, assetsResult, stateResult] =
    await Promise.all([
      supabase
        .from("documents")
        .select(
          "id, title, category, kind, room_id, room_name, issuer, due_date, review_status, updated_at",
        )
        .order("updated_at", { ascending: false })
        .limit(250),
      supabase
        .from("reminders")
        .select(
          "id, title, room_name, reminder_group, time_label, priority, document_title, due_at, source_due_at, updated_at",
        )
        .order("updated_at", { ascending: false })
        .limit(250),
      supabase
        .from("assets")
        .select(
          "id, name, category, location, manufacturer, model, warranty_due_at, next_service_at, updated_at",
        )
        .order("updated_at", { ascending: false })
        .limit(250),
      supabase
        .from("app_state")
        .select("payload")
        .eq("id", userId)
        .maybeSingle(),
    ]);
  if (
    documentsResult.error ||
    remindersResult.error ||
    assetsResult.error ||
    stateResult.error
  )
    return {
      candidates: [],
      error: "Authorised records could not be loaded safely.",
    };

  const candidates: SearchCandidate[] = [];
  (documentsResult.data ?? []).forEach((document) => {
    const roomId = text(document.room_id);
    const domains: SearchCandidate["domains"] = ["documents"];
    if (roomId === "garage") domains.push("vehicles");
    if (roomId === "garden") domains.push("pets");
    if (roomId === "driveway") domains.push("travel");
    if (roomId === "kitchen" || roomId === "office") domains.push("home");
    candidates.push({
      id: `document:${document.id}`,
      category: "documents",
      domains,
      title: text(document.title) || "Document",
      detail: stringParts(
        document.category,
        document.room_name,
        document.issuer,
      ),
      href: `/document/${document.id}`,
      dueAt: validDate(document.due_date),
      badge:
        document.review_status === "needs-review"
          ? "Review"
          : text(document.kind),
      searchText: stringParts(
        document.title,
        document.category,
        document.kind,
        document.room_name,
        document.issuer,
      ),
      updatedAt: text(document.updated_at),
    });
  });
  (remindersResult.data ?? []).forEach((reminder) =>
    candidates.push({
      id: `reminder:${reminder.id}`,
      category: "reminders",
      domains: ["reminders"],
      title: text(reminder.title) || "Reminder",
      detail: stringParts(
        reminder.time_label,
        reminder.room_name,
        reminder.document_title,
      ),
      href: "/reminders",
      dueAt: validDate(reminder.due_at) || validDate(reminder.source_due_at),
      badge: text(reminder.priority),
      searchText: stringParts(
        reminder.title,
        reminder.room_name,
        reminder.document_title,
        reminder.time_label,
      ),
      updatedAt: text(reminder.updated_at),
    }),
  );
  (assetsResult.data ?? []).forEach((asset) => {
    const id = text(asset.id);
    if (!id) return;
    const title = text(asset.name) || "Smart item";
    const detail = stringParts(
      asset.category,
      asset.location,
      asset.manufacturer,
      asset.model,
    );
    const common = stringParts(title, detail);
    candidates.push({
      id: `asset:${id}`,
      category: "assets",
      domains: ["assets", "home"],
      title,
      detail,
      href: `/assets/${id}`,
      badge: "Item",
      searchText: common,
      updatedAt: text(asset.updated_at),
    });
    addDatedCandidate(candidates, {
      id: `asset:${id}:warranty`,
      category: "assets",
      domains: ["assets", "home"],
      title: `${title} warranty`,
      detail,
      href: `/assets/${id}`,
      dueAt: asset.warranty_due_at,
      badge: "Warranty",
      searchText: stringParts(common, "warranty guarantee expiry due"),
      updatedAt: asset.updated_at,
    });
    addDatedCandidate(candidates, {
      id: `asset:${id}:service`,
      category: "assets",
      domains: ["assets", "home"],
      title: `${title} service`,
      detail,
      href: `/assets/${id}`,
      dueAt: asset.next_service_at,
      badge: "Service",
      searchText: stringParts(common, "maintenance service due"),
      updatedAt: asset.updated_at,
    });
  });
  candidates.push(...appStateCandidates(stateResult.data?.payload));
  Object.values(roomDetails).forEach((room) =>
    candidates.push({
      id: `room:${room.id}`,
      category: "home",
      domains: ["home"],
      title: room.name,
      detail: room.domain,
      href: `/room/${room.id}`,
      badge: "Area",
      searchText: stringParts(
        room.name,
        room.domain,
        room.headline,
        room.description,
      ),
    }),
  );
  return { candidates, error: null };
}
