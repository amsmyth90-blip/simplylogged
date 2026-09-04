import type { capTask } from "@capacitor-community/sqlite";

import {
  type PendingDocumentUpload,
  type PendingDocumentDetails,
  type PendingDocumentUploadInput,
  type PendingDocumentUploadSummary,
  type ReleaseDocumentUploadInput,
} from "@diarydock/offline-store";
import { MAX_DOCUMENT_BYTES, MAX_DOCUMENT_METADATA_BYTES } from "@diarydock/documents";

import { decodeBase64, encodeBase64, joinChunks, sha256 } from "./binary.ts";
import type { OfflineDatabase } from "./database";

const CHUNK_BYTES = 192 * 1024;
const MAX_PENDING_BYTES = 32 * 1024 * 1024;
const MAX_PENDING_FILES = 16;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedMimeTypes = new Set(["application/pdf", "image/heic", "image/jpeg", "image/png", "image/webp"]);

type UploadRow = Record<string, unknown>;

function text(row: UploadRow, key: string) {
  const value = row[key];
  if (typeof value !== "string" || !value) throw new Error(`Pending upload ${key} is invalid.`);
  return value;
}

function optionalText(row: UploadRow, key: string) {
  const value = row[key];
  return typeof value === "string" && value ? value : null;
}

function integer(row: UploadRow, key: string) {
  const value = Number(row[key]);
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Pending upload ${key} is invalid.`);
  return value;
}

function boundedOptionalText(value: unknown, maximum: number, field: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > maximum) throw new Error(`Pending upload ${field} is invalid.`);
  return value || undefined;
}

function boundedRequiredText(value: unknown, maximum: number, field: string) {
  const result = boundedOptionalText(value, maximum, field);
  if (!result) throw new Error(`Pending upload ${field} is invalid.`);
  return result;
}

function detailsFrom(value: unknown): PendingDocumentDetails | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Pending upload metadata is invalid.");
  const item = value as Record<string, unknown>;
  const allowed = new Set(["actionItems", "captureJobId", "confidence", "confirmedFields", "dueDate",
    "extractedText", "issuer", "reminder", "summary"]);
  if (Object.keys(item).some((key) => !allowed.has(key))) throw new Error("Pending upload metadata is invalid.");
  const result: PendingDocumentDetails = {
    issuer: boundedOptionalText(item.issuer, 240, "issuer"),
    dueDate: boundedOptionalText(item.dueDate, 32, "date"),
    summary: boundedOptionalText(item.summary, 2_000, "summary"),
    extractedText: boundedOptionalText(item.extractedText, 20_000, "text"),
    captureJobId: boundedOptionalText(item.captureJobId, 64, "capture job"),
  };
  if (result.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(result.dueDate)) {
    throw new Error("Pending upload date is invalid.");
  }
  if (result.captureJobId && !uuidPattern.test(result.captureJobId)) {
    throw new Error("Pending upload capture job is invalid.");
  }
  if (item.confidence !== undefined) {
    if (typeof item.confidence !== "number" || item.confidence < 0 || item.confidence > 1) {
      throw new Error("Pending upload confidence is invalid.");
    }
    result.confidence = item.confidence;
  }
  if (item.actionItems !== undefined) {
    if (!Array.isArray(item.actionItems) || item.actionItems.length > 24
      || item.actionItems.some((entry) => typeof entry !== "string" || entry.length > 500)) {
      throw new Error("Pending upload actions are invalid.");
    }
    result.actionItems = item.actionItems;
  }
  if (item.confirmedFields !== undefined) {
    if (!Array.isArray(item.confirmedFields) || item.confirmedFields.length > 24) {
      throw new Error("Pending upload fields are invalid.");
    }
    result.confirmedFields = item.confirmedFields.map((entry) => {
      if (!entry || typeof entry !== "object") throw new Error("Pending upload field is invalid.");
      const field = entry as Record<string, unknown>;
      const confidence = field.confidence;
      if (typeof confidence !== "number" || confidence < 0 || confidence > 1) {
        throw new Error("Pending upload field confidence is invalid.");
      }
      return {
        key: boundedRequiredText(field.key, 80, "field key"),
        label: boundedRequiredText(field.label, 120, "field label"),
        value: boundedRequiredText(field.value, 500, "field value"),
        confidence,
      };
    });
  }
  if (item.reminder !== undefined) {
    if (!item.reminder || typeof item.reminder !== "object" || Array.isArray(item.reminder)) {
      throw new Error("Pending upload reminder is invalid.");
    }
    const reminder = item.reminder as Record<string, unknown>;
    result.reminder = {
      id: boundedRequiredText(reminder.id, 64, "reminder ID"),
      title: boundedRequiredText(reminder.title, 240, "reminder title"),
      timeLabel: boundedRequiredText(reminder.timeLabel, 120, "reminder time"),
    };
    if (!uuidPattern.test(result.reminder.id)) throw new Error("Pending upload reminder ID is invalid.");
  }
  return Object.values(result).some((entry) => entry !== undefined) ? result : undefined;
}

function parseDetails(value: unknown) {
  if (typeof value !== "string"
    || new TextEncoder().encode(value).byteLength > MAX_DOCUMENT_METADATA_BYTES) {
    throw new Error("Pending upload metadata is invalid.");
  }
  try {
    return detailsFrom(JSON.parse(value) as unknown);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Pending upload")) throw error;
    throw new Error("Pending upload metadata is invalid.");
  }
}

function summary(row: UploadRow): PendingDocumentUploadSummary {
  return {
    jobId: text(row, "job_id"),
    documentId: text(row, "document_id"),
    fileName: text(row, "file_name"),
    mimeType: text(row, "mime_type"),
    sha256: text(row, "sha256"),
    title: text(row, "title"),
    category: text(row, "category"),
    roomId: optionalText(row, "room_id") ?? undefined,
    roomName: optionalText(row, "room_name") ?? undefined,
    details: parseDetails(text(row, "metadata_json")),
    byteLength: integer(row, "byte_length"),
    state: text(row, "state") as PendingDocumentUploadSummary["state"],
    attemptCount: integer(row, "attempt_count"),
    retryAfter: optionalText(row, "retry_after"),
    errorCode: optionalText(row, "error_code"),
    createdAt: text(row, "created_at"),
  };
}

function validate(input: PendingDocumentUploadInput) {
  if (!uuidPattern.test(input.jobId) || !uuidPattern.test(input.documentId)) throw new Error("Upload IDs are invalid.");
  if (!input.fileName || input.fileName.length > 96) throw new Error("The upload filename is invalid.");
  if (!allowedMimeTypes.has(input.mimeType)) throw new Error("The upload file type is invalid.");
  if (!input.bytes.length || input.bytes.length > MAX_DOCUMENT_BYTES) throw new Error("The upload size is invalid.");
  if (!/^[0-9a-f]{64}$/.test(input.sha256)) throw new Error("The upload digest is invalid.");
  if (!input.title.trim() || input.title.length > 240) throw new Error("The upload title is invalid.");
  if (!input.category.trim() || input.category.length > 160) throw new Error("The upload category is invalid.");
  const metadataJson = JSON.stringify(detailsFrom(input.details ?? {}) ?? {});
  if (new TextEncoder().encode(metadataJson).byteLength > MAX_DOCUMENT_METADATA_BYTES) {
    throw new Error("Pending upload metadata is too large.");
  }
  return metadataJson;
}

export class SqlitePendingUploadRepository {
  private readonly database: OfflineDatabase;

  constructor(database: OfflineDatabase) {
    this.database = database;
  }

  async recoverInterrupted() {
    await this.database.run(
      "UPDATE pending_document_uploads SET state = 'QUEUED', retry_after = NULL WHERE state = 'IN_FLIGHT'",
    );
  }

  async stage(input: PendingDocumentUploadInput) {
    const metadataJson = validate(input);
    if (await sha256(input.bytes) !== input.sha256) throw new Error("The upload failed integrity checking.");
    const capacity = await this.database.query(
      "SELECT count(*) AS file_count, coalesce(sum(byte_length), 0) AS total_bytes FROM pending_document_uploads",
    );
    const values = capacity.values?.[0] ?? {};
    if (Number(values.file_count) >= MAX_PENDING_FILES || Number(values.total_bytes) + input.bytes.length > MAX_PENDING_BYTES) {
      throw new Error("The encrypted upload queue is full. Connect DiaryDock before adding another document.");
    }
    const chunks: string[] = [];
    for (let offset = 0; offset < input.bytes.length; offset += CHUNK_BYTES) {
      chunks.push(encodeBase64(input.bytes.subarray(offset, offset + CHUNK_BYTES)));
    }
    const now = new Date().toISOString();
    const tasks: capTask[] = [{
      statement: `INSERT INTO pending_document_uploads (
        job_id, document_id, file_name, mime_type, byte_length, sha256, chunk_count,
        title, category, room_id, room_name, metadata_json, state, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED', ?, ?)`,
      values: [input.jobId, input.documentId, input.fileName, input.mimeType, input.bytes.length,
        input.sha256, chunks.length, input.title.trim(), input.category.trim(), input.roomId ?? null,
        input.roomName ?? null, metadataJson, now, now],
    }];
    chunks.forEach((chunk, index) => tasks.push({
      statement: "INSERT INTO pending_document_upload_chunks (job_id, chunk_index, data_base64) VALUES (?, ?, ?)",
      values: [input.jobId, index, chunk],
    }));
    await this.database.executeTransaction(tasks);
  }

  async list() {
    const result = await this.database.query(
      "SELECT * FROM pending_document_uploads ORDER BY created_at DESC LIMIT 16",
    );
    return (result.values ?? []).map(summary);
  }

  async claimNext(): Promise<PendingDocumentUpload | null> {
    const result = await this.database.query(
      `SELECT * FROM pending_document_uploads WHERE state = 'QUEUED'
       AND (retry_after IS NULL OR retry_after <= ?) ORDER BY created_at ASC LIMIT 1`,
      [new Date().toISOString()],
    );
    const row = result.values?.[0];
    if (!row) return null;
    const item = summary(row);
    await this.database.run(
      `UPDATE pending_document_uploads SET state = 'IN_FLIGHT', attempt_count = attempt_count + 1,
       updated_at = ? WHERE job_id = ? AND state = 'QUEUED'`,
      [new Date().toISOString(), item.jobId],
    );
    const chunks = await this.database.query(
      "SELECT data_base64 FROM pending_document_upload_chunks WHERE job_id = ? ORDER BY chunk_index ASC",
      [item.jobId],
    );
    const decoded = (chunks.values ?? []).map((value) => decodeBase64(text(value, "data_base64")));
    const bytes = joinChunks(decoded);
    if (bytes.length !== item.byteLength || await sha256(bytes) !== item.sha256) {
      await this.release({ jobId: item.jobId, errorCode: "INTEGRITY_FAILURE", retryAfter: null, permanent: true });
      throw new Error("An encrypted pending upload failed integrity checking.");
    }
    return { ...item, attemptCount: item.attemptCount + 1, state: "IN_FLIGHT", bytes };
  }

  async release(input: ReleaseDocumentUploadInput) {
    await this.database.run(
      `UPDATE pending_document_uploads SET state = ?, retry_after = ?, error_code = ?, updated_at = ?
       WHERE job_id = ? AND state = 'IN_FLIGHT'`,
      [input.permanent ? "FAILED" : "QUEUED", input.retryAfter, input.errorCode.slice(0, 64),
        new Date().toISOString(), input.jobId],
    );
  }

  async retry(jobId: string) {
    await this.database.run(
      "UPDATE pending_document_uploads SET state = 'QUEUED', retry_after = NULL, error_code = NULL WHERE job_id = ?",
      [jobId],
    );
  }

  async complete(jobId: string) {
    await this.database.run("DELETE FROM pending_document_uploads WHERE job_id = ?", [jobId]);
  }
}
