import type { WillsMutation } from "@diarydock/wills";

export type WillsDocumentRow = {
  id: string;
  room_id: string | null;
  room_name: string | null;
  category: string | null;
};

export function requiredWillsDocumentIds(mutation: WillsMutation) {
  const ids = mutation.operation === "ADD_WILL_VERSION"
    ? [mutation.version.documentId]
    : mutation.operation === "UPSERT_LETTER"
      ? mutation.letter.attachmentDocumentIds
      : [];
  return [...new Set(ids)];
}

export function validWillsDocumentRows(
  mutation: WillsMutation,
  requiredIds: string[],
  rows: WillsDocumentRow[],
) {
  const returnedIds = new Set(rows.map((row) => row.id));
  if (returnedIds.size !== requiredIds.length ||
    requiredIds.some((id) => !returnedIds.has(id))) return false;
  if (mutation.operation !== "ADD_WILL_VERSION") return true;
  const document = rows.find((row) => row.id === mutation.version.documentId);
  return Boolean(document?.room_id === "safe-room" ||
    document?.room_name?.toLowerCase() === "safe room" ||
    document?.category === "Legal & Estate");
}
