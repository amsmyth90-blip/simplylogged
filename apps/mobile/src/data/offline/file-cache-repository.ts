import type { capTask } from "@capacitor-community/sqlite";

import type { CacheFileInput, CachedFile } from "@diarydock/offline-store";

import type { OfflineDatabase } from "./database";
import { decodeBase64, encodeBase64, joinChunks, sha256 } from "./binary.ts";

const CHUNK_BYTES = 192 * 1024;
const MAX_CACHE_BYTES = 64 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "application/pdf",
  "image/heic",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type CacheRow = {
  document_id: unknown;
  version: unknown;
  mime_type: unknown;
  byte_length: unknown;
  sha256: unknown;
  chunk_count: unknown;
  cached_at: unknown;
};

function text(value: unknown, field: string) {
  if (typeof value !== "string" || !value) throw new Error(`Cached file ${field} is invalid.`);
  return value;
}

function positiveInteger(value: unknown, field: string) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new Error(`Cached file ${field} is invalid.`);
  return number;
}

function validateInput(input: CacheFileInput) {
  if (!input.documentId || input.documentId.length > 512) throw new Error("The document identifier is invalid.");
  if (!input.version || input.version.length > 128) throw new Error("The file version is invalid.");
  if (!allowedMimeTypes.has(input.mimeType)) throw new Error("The cached file type is not allowed.");
  if (!input.bytes.byteLength || input.bytes.byteLength > MAX_DOCUMENT_BYTES) {
    throw new Error("The cached file size is not allowed.");
  }
  if (!/^[0-9a-f]{64}$/.test(input.sha256)) throw new Error("The cached file digest is invalid.");
}

export class SqliteFileCacheRepository {
  private readonly database: OfflineDatabase;

  constructor(database: OfflineDatabase) {
    this.database = database;
  }

  async cacheFile(input: CacheFileInput) {
    validateInput(input);
    if (await sha256(input.bytes) !== input.sha256) throw new Error("The cached file failed integrity checking.");
    const chunks: string[] = [];
    for (let offset = 0; offset < input.bytes.length; offset += CHUNK_BYTES) {
      chunks.push(encodeBase64(input.bytes.subarray(offset, offset + CHUNK_BYTES)));
    }
    const now = new Date().toISOString();
    const evictions = await this.evictionsFor(input.documentId, input.bytes.byteLength);
    const tasks: capTask[] = evictions.map((id) => ({
      statement: "DELETE FROM offline_file_cache WHERE document_id = ?",
      values: [id],
    }));
    tasks.push({
      statement: "DELETE FROM offline_file_cache WHERE document_id = ?",
      values: [input.documentId],
    }, {
      statement: `INSERT INTO offline_file_cache (
        document_id, version, mime_type, byte_length, sha256,
        chunk_count, cached_at, accessed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      values: [
        input.documentId, input.version, input.mimeType, input.bytes.byteLength,
        input.sha256, chunks.length, now, now,
      ],
    });
    chunks.forEach((chunk, index) => tasks.push({
      statement: `INSERT INTO offline_file_chunks (
        document_id, chunk_index, data_base64
      ) VALUES (?, ?, ?)`,
      values: [input.documentId, index, chunk],
    }));
    await this.database.executeTransaction(tasks);
  }

  async getCachedFile(documentId: string, version: string): Promise<CachedFile | null> {
    const result = await this.database.query(
      `SELECT document_id, version, mime_type, byte_length, sha256,
        chunk_count, cached_at FROM offline_file_cache
       WHERE document_id = ? AND version = ? LIMIT 1`,
      [documentId, version],
    );
    const raw = result.values?.[0] as CacheRow | undefined;
    if (!raw) return null;
    const row = {
      documentId: text(raw.document_id, "document ID"),
      version: text(raw.version, "version"),
      mimeType: text(raw.mime_type, "type"),
      byteLength: positiveInteger(raw.byte_length, "length"),
      sha256: text(raw.sha256, "digest"),
      chunkCount: positiveInteger(raw.chunk_count, "chunk count"),
      cachedAt: text(raw.cached_at, "date"),
    };
    const chunkResult = await this.database.query(
      `SELECT data_base64 FROM offline_file_chunks
       WHERE document_id = ? ORDER BY chunk_index ASC`,
      [documentId],
    );
    if ((chunkResult.values?.length ?? 0) !== row.chunkCount) return this.rejectCorrupt(documentId);
    const decoded = (chunkResult.values ?? []).map((item) => decodeBase64(text(item.data_base64, "chunk")));
    const bytes = joinChunks(decoded);
    if (bytes.length !== row.byteLength || await sha256(bytes) !== row.sha256) {
      return this.rejectCorrupt(documentId);
    }
    await this.database.run(
      "UPDATE offline_file_cache SET accessed_at = ? WHERE document_id = ?",
      [new Date().toISOString(), documentId],
    );
    return { documentId, version, mimeType: row.mimeType, bytes, sha256: row.sha256, cachedAt: row.cachedAt };
  }

  async removeCachedFile(documentId: string) {
    await this.database.run("DELETE FROM offline_file_cache WHERE document_id = ?", [documentId]);
  }

  private async rejectCorrupt(documentId: string): Promise<null> {
    await this.removeCachedFile(documentId);
    return null;
  }

  private async evictionsFor(documentId: string, incomingBytes: number) {
    const result = await this.database.query(
      `SELECT document_id, byte_length FROM offline_file_cache
       WHERE document_id <> ? ORDER BY accessed_at ASC`,
      [documentId],
    );
    const rows = result.values ?? [];
    let total = rows.reduce((sum, row) => sum + Number(row.byte_length), 0);
    const evictions: string[] = [];
    for (const row of rows) {
      if (total + incomingBytes <= MAX_CACHE_BYTES) break;
      evictions.push(text(row.document_id, "document ID"));
      total -= Number(row.byte_length);
    }
    return evictions;
  }
}
