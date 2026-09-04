export const MAILBOX_SCHEMA_VERSION = 1;

export const mailboxKinds = ["Letter", "Form", "Bill", "Statement"] as const;
export const mailboxStatuses = ["new", "vault", "reminder", "room", "ignored"] as const;
export const mailboxActions = ["SAVE_TO_FILES", "MAKE_REMINDER", "SEND_TO_ROOM", "IGNORE"] as const;

export type MailboxKind = (typeof mailboxKinds)[number];
export type MailboxStatus = (typeof mailboxStatuses)[number];
export type MailboxAction = (typeof mailboxActions)[number];

export type MailboxItem = {
  id: string;
  title: string;
  source: string;
  kind: MailboxKind;
  suggestedRoom: string;
  routeStatus: MailboxStatus;
  documentId: string | null;
  receivedAt: string;
  updatedAt: string;
};

export type MailboxSnapshot = {
  schemaVersion: typeof MAILBOX_SCHEMA_VERSION;
  revision: string | null;
  items: MailboxItem[];
};

export type MailboxMutation = {
  operation: "ROUTE_ITEM";
  itemId: string;
  itemRevision: string;
  action: MailboxAction;
};
