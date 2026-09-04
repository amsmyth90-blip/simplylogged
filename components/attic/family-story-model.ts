import { sanitizeDocumentFileName, uploadPrivateDocument } from "@/lib/document-storage";
import type { VaultDocument } from "@/lib/mock-data";
import { upsertStructuredDocument } from "@/lib/structured-data";

export const MAX_STORY_IMAGES = 8;

export type FamilyStoryDraft = {
  dateLabel: string;
  people: string;
  place: string;
  storyText: string;
  tagsInput: string;
  title: string;
};

export const emptyFamilyStoryDraft: FamilyStoryDraft = {
  dateLabel: "",
  people: "",
  place: "",
  storyText: "",
  tagsInput: "",
  title: ""
};

export function parseStoryTags(value: string) {
  return value.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 8);
}

function formatStoryFileSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function prepareFamilyStoryImages(input: {
  files: File[];
  now: string;
  repositoryMode: string;
  title: string;
}) {
  const documents: VaultDocument[] = [];
  for (const file of input.files) {
    const documentId = crypto.randomUUID();
    const storedFile = input.repositoryMode === "supabase" ? await uploadPrivateDocument(file, documentId) : null;
    const safeTitle = sanitizeDocumentFileName(file.name.replace(/\.[^.]+$/, "")).replace(/-/g, " ") || "family story photo";
    const document: VaultDocument = {
      id: documentId,
      title: `${input.title} - ${safeTitle}`,
      category: "Memories",
      kind: "Image",
      size: formatStoryFileSize(file.size),
      updated: "Just now",
      storageBucket: storedFile?.bucket,
      storagePath: storedFile?.path,
      originalFileName: file.name,
      mimeType: file.type || "image/jpeg",
      roomId: "attic",
      roomName: "Attic",
      extractionSummary: `Photo linked to the family story "${input.title}".`,
      reviewStatus: "reviewed",
      reviewedAt: input.now
    };
    documents.push(document);
    if (input.repositoryMode === "supabase") await upsertStructuredDocument(document);
  }
  return documents;
}
