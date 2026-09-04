import {
  DOCUMENT_BUCKET,
  MAX_DOCUMENT_BYTES,
  sanitizeDocumentFileName,
  validateDocumentUpload,
} from "./document-rules.ts";

export const DOCUMENT_QUARANTINE_BUCKET = "diarydock-document-quarantine";
export const DEFAULT_USER_STORAGE_BYTES = 250 * 1024 * 1024;
export const MAX_USER_STORAGE_BYTES = 10 * 1024 * 1024 * 1024;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StoredDocumentReference = {
  bucket: string;
  path: string;
  mimeType?: string;
  originalFileName?: string;
};

export function validateDocumentId(documentId: string) {
  return uuidPattern.test(documentId);
}

export function buildDocumentStoragePath(userId: string, documentId: string, fileName: string) {
  return `${userId}/${documentId}/${sanitizeDocumentFileName(fileName)}`;
}

export function isOwnedDocumentStoragePath(userId: string, documentId: string, path: string) {
  return path.startsWith(`${userId}/${documentId}/`) && path.split("/").length === 3;
}

export function isOwnedStoredDocument(userId: string, reference: StoredDocumentReference) {
  if (reference.bucket !== DOCUMENT_BUCKET) return false;
  const [ownerId, documentId, fileName, ...rest] = reference.path.split("/");
  return ownerId === userId && validateDocumentId(documentId ?? "") && Boolean(fileName) && rest.length === 0;
}

export function validatePreparedUpload(input: {
  documentId: string;
  fileName: string;
  mimeType: string;
  size: number;
}) {
  if (!validateDocumentId(input.documentId)) return "The document identifier is invalid.";
  if (!input.fileName.trim() || input.fileName.length > 255) return "The document filename is invalid.";
  if (!Number.isSafeInteger(input.size) || input.size > MAX_DOCUMENT_BYTES) {
    return "Please choose a file no larger than 4 MB.";
  }
  return validateDocumentUpload({ type: input.mimeType, size: input.size });
}
