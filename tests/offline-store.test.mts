import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import {
  createDatabasePassphrase,
  databaseNameForAccount,
} from "../apps/mobile/src/data/offline/database-key.ts";
import {
  OFFLINE_DATABASE_VERSION,
  OFFLINE_MIGRATIONS,
  OFFLINE_SCHEMA,
  OFFLINE_UPGRADES,
} from "../apps/mobile/src/data/offline/schema.ts";

const accountId = "f330a7d2-8ef1-4f6e-a6ec-118ea3a14f51";
const read = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("creates unpredictable database passphrases without embedding account data", async () => {
  const first = createDatabasePassphrase();
  const second = createDatabasePassphrase();
  assert.notEqual(first, second);
  assert.equal(Buffer.from(first, "base64").length, 32);

  const databaseName = await databaseNameForAccount(accountId);
  assert.match(databaseName, /^diarydock_[0-9a-f]{24}$/);
  assert.equal(databaseName.includes(accountId), false);
});

test("the offline schema is versioned and uses durable outbox state", () => {
  assert.equal(OFFLINE_DATABASE_VERSION, 8);
  assert.match(OFFLINE_SCHEMA, /CREATE TABLE IF NOT EXISTS sync_outbox/);
  assert.match(OFFLINE_SCHEMA, /idempotency_key TEXT NOT NULL UNIQUE/);
  assert.match(
    OFFLINE_SCHEMA,
    /CHECK \(state IN \('BLOCKED', 'IN_FLIGHT', 'QUEUED'\)\)/,
  );
  assert.match(OFFLINE_SCHEMA, /CREATE TABLE IF NOT EXISTS sync_conflicts/);
  assert.match(OFFLINE_SCHEMA, /local_operation TEXT NOT NULL/);
  assert.match(OFFLINE_SCHEMA, /CREATE TABLE IF NOT EXISTS offline_file_cache/);
  assert.match(
    OFFLINE_SCHEMA,
    /REFERENCES offline_file_cache\(document_id\) ON DELETE CASCADE/,
  );
  assert.match(
    OFFLINE_SCHEMA,
    /CREATE TABLE IF NOT EXISTS pending_document_uploads/,
  );
  assert.match(
    OFFLINE_SCHEMA,
    /REFERENCES pending_document_uploads\(job_id\) ON DELETE CASCADE/,
  );
  assert.match(OFFLINE_SCHEMA, /CREATE TABLE IF NOT EXISTS cached_read_models/);
  assert.match(OFFLINE_SCHEMA, /active_household_id TEXT/);
  assert.match(OFFLINE_SCHEMA, /offline_records_scope/);
  assert.deepEqual(
    OFFLINE_MIGRATIONS.map((migration) => [
      migration.fromVersion,
      migration.toVersion,
    ]),
    [
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
    ],
  );
  assert.deepEqual(
    OFFLINE_UPGRADES.map((upgrade) => upgrade.toVersion),
    [1, 2, 3, 4, 5, 6, 7, 8],
  );
  for (const upgrade of OFFLINE_UPGRADES) {
    for (const statement of upgrade.statements) {
      assert.equal(
        statement.trim().replace(/;$/, "").includes(";"),
        false,
        `version ${upgrade.toVersion} contains a multi-statement upgrade`,
      );
    }
  }
});

test("a fresh offline database creates the complete current schema", () => {
  const database = new DatabaseSync(":memory:");
  database.exec(OFFLINE_SCHEMA);
  const columns = database
    .prepare("PRAGMA table_info(sync_conflicts)")
    .all()
    .map((column) => String(column.name));
  assert.ok(columns.includes("local_operation"));
  assert.ok(columns.includes("local_schema_version"));
  const fileTables = database
    .prepare(
      "select name from sqlite_master where type = 'table' and name like 'offline_file_%' order by name",
    )
    .all()
    .map((row) => String(row.name));
  assert.deepEqual(fileTables, ["offline_file_cache", "offline_file_chunks"]);
  const pendingTables = database
    .prepare(
      "select name from sqlite_master where type = 'table' and name like 'pending_document_upload%' order by name",
    )
    .all()
    .map((row) => String(row.name));
  assert.deepEqual(pendingTables, [
    "pending_document_upload_chunks",
    "pending_document_uploads",
  ]);
  const pendingColumns = database
    .prepare("PRAGMA table_info(pending_document_uploads)")
    .all()
    .map((column) => String(column.name));
  assert.ok(pendingColumns.includes("metadata_json"));
  assert.equal(
    database
      .prepare(
        "select count(*) as count from sqlite_master where type = 'table' and name = 'cached_read_models'",
      )
      .get()?.count,
    1,
  );
  database.close();
});

test("incremental upgrades preserve conflicts and add the encrypted file cache", () => {
  const database = new DatabaseSync(":memory:");
  database.exec(OFFLINE_UPGRADES[0]!.statements.join(";"));
  database.exec(`insert into sync_conflicts (
    idempotency_key, record_id, entity_type, local_payload_json,
    server_record_json, detected_at
  ) values ('key', 'record', 'reminder', '{}', '{}', '2026-09-01T00:00:00Z')`);
  database.exec(OFFLINE_UPGRADES[1]!.statements.join(";"));
  database.exec(OFFLINE_UPGRADES[2]!.statements.join(";"));
  database.exec(OFFLINE_UPGRADES[3]!.statements.join(";"));
  database.exec(OFFLINE_UPGRADES[4]!.statements.join(";"));
  database.exec(OFFLINE_UPGRADES[5]!.statements.join(";"));
  database.exec(`insert into cached_read_models (
    cache_key, schema_version, payload_json, updated_at
  ) values ('garage-records', 1, '{"vehicles":[]}', '2026-09-02T00:00:00Z')`);
  database.exec(OFFLINE_UPGRADES[6]!.statements.join(";"));
  database.exec(OFFLINE_UPGRADES[7]!.statements.join(";"));
  const upgraded = database
    .prepare(
      "select local_operation, local_schema_version from sync_conflicts where idempotency_key = 'key'",
    )
    .get();
  assert.equal(upgraded?.local_operation, "UPSERT");
  assert.equal(upgraded?.local_schema_version, 1);
  assert.equal(
    database
      .prepare(
        "select count(*) as count from sqlite_master where type = 'table' and name = 'offline_file_cache'",
      )
      .get()?.count,
    1,
  );
  const checkpointColumns = database
    .prepare("PRAGMA table_info(sync_checkpoint)")
    .all()
    .map((column) => String(column.name));
  assert.ok(checkpointColumns.includes("active_household_id"));
  assert.equal(
    database
      .prepare(
        "select payload_json from cached_read_models where cache_key = 'garage-records'",
      )
      .get()?.payload_json,
    '{"vehicles":[]}',
  );
  assert.equal(
    database
      .prepare(
        "select count(*) as count from sqlite_master where type = 'table' and name = 'pending_document_uploads'",
      )
      .get()?.count,
    1,
  );
  assert.equal(
    database
      .prepare(
        "select count(*) as count from sqlite_master where type = 'table' and name = 'cached_read_models'",
      )
      .get()?.count,
    1,
  );
  database.close();
});

test("native configuration requires SQLCipher on iOS and Android", async () => {
  const [config, databaseSource] = await Promise.all([
    read("capacitor.config.ts"),
    read("apps/mobile/src/data/offline/database.ts"),
  ]);
  assert.match(config, /iosIsEncryption:\s*true/);
  assert.match(config, /androidIsEncryption:\s*true/);
  assert.match(databaseSource, /isDatabaseEncrypted/);
  assert.match(
    databaseSource,
    /refused to open an unencrypted offline database/,
  );
  assert.match(databaseSource, /addUpgradeStatement/);
  assert.match(
    databaseSource,
    /PRAGMA foreign_keys = ON; PRAGMA secure_delete = ON/,
  );
});
