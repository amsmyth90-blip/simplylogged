import {
  MAILBOX_SCHEMA_VERSION,
  mailboxActions,
  mailboxKinds,
  mailboxStatuses,
  type MailboxItem,
  type MailboxMutation,
  type MailboxSnapshot,
} from "./types.ts";
import { exact, identifier, oneOf, record, text, timestamp } from "./validation.ts";

const itemKeys = ["id", "title", "source", "kind", "suggestedRoom", "routeStatus",
  "documentId", "receivedAt", "updatedAt"];

export function parseMailboxItem(value: unknown): MailboxItem {
  const item = record(value, "Mailbox item");
  exact(item, itemKeys, "Mailbox item");
  return {
    id: identifier(item.id, "Mailbox item ID"),
    title: text(item.title, "Mailbox title", 240),
    source: text(item.source, "Mailbox source", 240, true),
    kind: oneOf(item.kind, mailboxKinds, "Mailbox kind"),
    suggestedRoom: text(item.suggestedRoom, "Mailbox room", 80),
    routeStatus: oneOf(item.routeStatus, mailboxStatuses, "Mailbox status"),
    documentId: identifier(item.documentId, "Mailbox document ID", true),
    receivedAt: timestamp(item.receivedAt, "Mailbox received date"),
    updatedAt: timestamp(item.updatedAt, "Mailbox revision"),
  };
}

export function parseMailboxSnapshot(value: unknown): MailboxSnapshot {
  const snapshot = record(value, "Mailbox response");
  exact(snapshot, ["schemaVersion", "revision", "items"], "Mailbox response");
  if (snapshot.schemaVersion !== MAILBOX_SCHEMA_VERSION || !Array.isArray(snapshot.items)
    || snapshot.items.length > 300) throw new Error("Mailbox response is invalid.");
  const items = snapshot.items.map(parseMailboxItem);
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new Error("Mailbox response contains duplicate items.");
  }
  return { schemaVersion: MAILBOX_SCHEMA_VERSION,
    revision: timestamp(snapshot.revision, "Mailbox response revision", true), items };
}

export function parseMailboxMutation(value: unknown): MailboxMutation {
  const mutation = record(value, "Mailbox update");
  exact(mutation, ["operation", "itemId", "itemRevision", "action"], "Mailbox update");
  if (mutation.operation !== "ROUTE_ITEM") throw new Error("Mailbox operation is invalid.");
  return { operation: "ROUTE_ITEM",
    itemId: identifier(mutation.itemId, "Mailbox item ID"),
    itemRevision: timestamp(mutation.itemRevision, "Mailbox item revision"),
    action: oneOf(mutation.action, mailboxActions, "Mailbox action") };
}
