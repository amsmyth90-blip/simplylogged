export function removeNonOwnedDocumentsFromCache<
  TDocument extends { id: string; ownerId?: string },
  TRoomDocument extends { id: string }
>(input: {
  userId: string;
  documents: TDocument[];
  roomDocuments: Record<string, TRoomDocument[]>;
}) {
  const nonOwnedIds = new Set(
    input.documents
      .filter((document) => document.ownerId && document.ownerId !== input.userId)
      .map((document) => document.id)
  );

  if (!nonOwnedIds.size) {
    return {
      documents: input.documents,
      roomDocuments: input.roomDocuments
    };
  }

  return {
    documents: input.documents.filter(
      (document) => !document.ownerId || document.ownerId === input.userId
    ),
    roomDocuments: Object.fromEntries(
      Object.entries(input.roomDocuments).map(([roomId, documents]) => [
        roomId,
        documents.filter((document) => {
          const structuredId = document.id.startsWith(`${roomId}-`)
            ? document.id.slice(roomId.length + 1)
            : "";
          return !nonOwnedIds.has(structuredId);
        })
      ])
    )
  };
}
