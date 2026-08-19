export function normaliseDedupePart(value: string | undefined | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 160);
}

export function createLifeInboxFingerprint(input: {
  userId: string;
  sourceType: string;
  sourceId?: string;
  title?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
}) {
  return [
    normaliseDedupePart(input.userId),
    normaliseDedupePart(input.sourceType),
    normaliseDedupePart(input.sourceId),
    normaliseDedupePart(input.title),
    normaliseDedupePart(input.fileName),
    normaliseDedupePart(input.mimeType),
    String(input.size ?? "")
  ].join("|");
}

