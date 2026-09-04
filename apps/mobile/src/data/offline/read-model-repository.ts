import type { JsonObject } from "@diarydock/contracts";
import {
  assertSchemaVersion,
  parsePayload,
  serializePayload,
  type CachedReadModel,
} from "@diarydock/offline-store";

import type { OfflineDatabase } from "./database";

const keyPattern = /^[a-z][a-z0-9-]{0,63}$/;

function validKey(value: string) {
  if (!keyPattern.test(value))
    throw new Error("The cached read-model key is invalid.");
  return value;
}

export class SqliteReadModelRepository {
  private readonly database: OfflineDatabase;

  constructor(database: OfflineDatabase) {
    this.database = database;
  }

  async get(key: string): Promise<CachedReadModel | null> {
    const result = await this.database.query(
      "SELECT cache_key,schema_version,payload_json,updated_at FROM cached_read_models WHERE cache_key = ? LIMIT 1",
      [validKey(key)],
    );
    const row = result.values?.[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      key: String(row.cache_key),
      schemaVersion: assertSchemaVersion(Number(row.schema_version)),
      payload: parsePayload(row.payload_json),
      updatedAt: String(row.updated_at),
    };
  }

  async put(key: string, schemaVersion: number, payload: JsonObject) {
    const serialized = serializePayload(payload);
    if (serialized.length > 524_288)
      throw new Error("The cached read model is too large.");
    await this.database.run(
      `INSERT INTO cached_read_models (cache_key,schema_version,payload_json,updated_at)
       VALUES (?,?,?,?) ON CONFLICT(cache_key) DO UPDATE SET
       schema_version=excluded.schema_version,payload_json=excluded.payload_json,updated_at=excluded.updated_at`,
      [
        validKey(key),
        assertSchemaVersion(schemaVersion),
        serialized,
        new Date().toISOString(),
      ],
    );
  }

  async remove(key: string) {
    await this.database.run(
      "DELETE FROM cached_read_models WHERE cache_key = ?",
      [validKey(key)],
    );
  }
}
