import {
  resourceVisibilities,
  type ResourceVisibility,
} from "./resource-access.ts";

export type DocumentSharing = {
  visibility: ResourceVisibility;
  selectedUserIds: string[];
};

export type DocumentSharingMutation = DocumentSharing & { documentId: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length
    && actual.every((key, index) => key === wanted[index]);
}

function selectedUsers(value: unknown) {
  if (!Array.isArray(value) || value.length > 12
    || value.some((item) => typeof item !== "string" || !uuidPattern.test(item))
    || new Set(value).size !== value.length) {
    throw new Error("Invalid selected household members.");
  }
  return value as string[];
}

function visibility(value: unknown): ResourceVisibility {
  if (typeof value !== "string"
    || !resourceVisibilities.includes(value as ResourceVisibility)) {
    throw new Error("Invalid document visibility.");
  }
  return value as ResourceVisibility;
}

export function parseDocumentSharingMutation(value: unknown): DocumentSharingMutation {
  if (!record(value) || !exactKeys(value, [
    "documentId", "visibility", "selectedUserIds",
  ]) || typeof value.documentId !== "string" || !uuidPattern.test(value.documentId)) {
    throw new Error("Invalid document sharing request.");
  }
  const requestedVisibility = visibility(value.visibility);
  const users = selectedUsers(value.selectedUserIds);
  if (requestedVisibility !== "SELECTED_MEMBERS" && users.length) {
    throw new Error("Selected members require selected visibility.");
  }
  return {
    documentId: value.documentId,
    visibility: requestedVisibility,
    selectedUserIds: users,
  };
}

export function parseDocumentSharingResponse(value: unknown): DocumentSharing {
  if (!record(value) || !exactKeys(value, ["visibility", "selectedUserIds"])) {
    throw new Error("Invalid document sharing response.");
  }
  const response = {
    visibility: visibility(value.visibility),
    selectedUserIds: selectedUsers(value.selectedUserIds),
  };
  if (response.visibility !== "SELECTED_MEMBERS" && response.selectedUserIds.length) {
    throw new Error("Invalid document sharing response members.");
  }
  return response;
}

export function parseDocumentSharingQuery(entries: Array<[string, string]>) {
  if (entries.length !== 1 || entries[0]?.[0] !== "documentId"
    || !uuidPattern.test(entries[0][1])) {
    throw new Error("Invalid document sharing query.");
  }
  return entries[0][1];
}
