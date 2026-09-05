import type { capSQLiteVersionUpgrade } from "@capacitor-community/sqlite";

export const OFFLINE_DATABASE_VERSION = 8;

const CORE_SCHEMA = `
CREATE TABLE IF NOT EXISTS offline_records (
  entity_type TEXT NOT NULL,
  record_id TEXT NOT NULL,
  scope_kind TEXT NOT NULL CHECK (scope_kind IN ('USER', 'HOUSEHOLD')),
  scope_id TEXT NOT NULL,
  revision TEXT NOT NULL,
  schema_version INTEGER NOT NULL CHECK (schema_version > 0),
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  payload_json TEXT NOT NULL,
  sync_state TEXT NOT NULL CHECK (sync_state IN ('CLEAN', 'CONFLICT', 'PENDING')),
  PRIMARY KEY (entity_type, record_id)
);

CREATE INDEX IF NOT EXISTS offline_records_entity_updated
  ON offline_records (entity_type, updated_at DESC);

CREATE TABLE IF NOT EXISTS sync_outbox (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  idempotency_key TEXT NOT NULL UNIQUE,
  record_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('UPSERT', 'DELETE')),
  expected_revision TEXT,
  schema_version INTEGER NOT NULL CHECK (schema_version > 0),
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  state TEXT NOT NULL DEFAULT 'QUEUED' CHECK (state IN ('BLOCKED', 'IN_FLIGHT', 'QUEUED')),
  batch_id TEXT,
  retry_after TEXT,
  error_code TEXT
);

CREATE INDEX IF NOT EXISTS sync_outbox_ready
  ON sync_outbox (state, retry_after, sequence);
CREATE INDEX IF NOT EXISTS sync_outbox_record
  ON sync_outbox (entity_type, record_id, sequence);

CREATE TABLE IF NOT EXISTS sync_checkpoint (
  name TEXT PRIMARY KEY,
  cursor TEXT,
  updated_at TEXT NOT NULL
);
`;

const CURRENT_CORE_SCHEMA = CORE_SCHEMA
  .replace(
    "CREATE INDEX IF NOT EXISTS offline_records_entity_updated",
    `CREATE INDEX IF NOT EXISTS offline_records_scope
  ON offline_records (scope_kind, scope_id);

CREATE INDEX IF NOT EXISTS offline_records_entity_updated`,
  )
  .replace(
    "  cursor TEXT,\n  updated_at TEXT NOT NULL",
    "  cursor TEXT,\n  active_household_id TEXT,\n  updated_at TEXT NOT NULL",
  );

const CONFLICT_SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS sync_conflicts (
  idempotency_key TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  local_payload_json TEXT NOT NULL,
  server_record_json TEXT NOT NULL,
  detected_at TEXT NOT NULL
);
`;

const CONFLICT_SCHEMA_V2 = `
CREATE TABLE IF NOT EXISTS sync_conflicts (
  idempotency_key TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  local_operation TEXT NOT NULL CHECK (local_operation IN ('UPSERT', 'DELETE')),
  local_schema_version INTEGER NOT NULL CHECK (local_schema_version > 0),
  local_payload_json TEXT NOT NULL,
  server_record_json TEXT NOT NULL,
  detected_at TEXT NOT NULL
);
`;

const FINAL_SCHEMA = `
CREATE INDEX IF NOT EXISTS sync_conflicts_detected
  ON sync_conflicts (detected_at DESC);

CREATE TABLE IF NOT EXISTS sync_failures (
  idempotency_key TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  error_code TEXT NOT NULL,
  detected_at TEXT NOT NULL
);
`;

const FILE_CACHE_TABLE = `CREATE TABLE IF NOT EXISTS offline_file_cache (
  document_id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_length INTEGER NOT NULL CHECK (byte_length BETWEEN 1 AND 4194304),
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
  chunk_count INTEGER NOT NULL CHECK (chunk_count BETWEEN 1 AND 32),
  cached_at TEXT NOT NULL,
  accessed_at TEXT NOT NULL
)`;

const FILE_CHUNKS_TABLE = `CREATE TABLE IF NOT EXISTS offline_file_chunks (
  document_id TEXT NOT NULL REFERENCES offline_file_cache(document_id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL CHECK (chunk_index BETWEEN 0 AND 31),
  data_base64 TEXT NOT NULL,
  PRIMARY KEY (document_id, chunk_index)
)`;

const FILE_CACHE_INDEX = `CREATE INDEX IF NOT EXISTS offline_file_cache_accessed
  ON offline_file_cache (accessed_at ASC)`;

const FILE_CACHE_SCHEMA = `${FILE_CACHE_TABLE};${FILE_CHUNKS_TABLE};${FILE_CACHE_INDEX};`;

const PENDING_UPLOAD_TABLE_V4 = `CREATE TABLE IF NOT EXISTS pending_document_uploads (
  job_id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL CHECK (length(file_name) BETWEEN 1 AND 96),
  mime_type TEXT NOT NULL,
  byte_length INTEGER NOT NULL CHECK (byte_length BETWEEN 1 AND 4194304),
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
  chunk_count INTEGER NOT NULL CHECK (chunk_count BETWEEN 1 AND 32),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 240),
  category TEXT NOT NULL CHECK (length(category) BETWEEN 1 AND 160),
  room_id TEXT,
  room_name TEXT,
  state TEXT NOT NULL CHECK (state IN ('FAILED', 'IN_FLIGHT', 'QUEUED')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  retry_after TEXT,
  error_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`;

const PENDING_UPLOAD_TABLE = PENDING_UPLOAD_TABLE_V4.replace(
  "  state TEXT NOT NULL",
  "  metadata_json TEXT NOT NULL DEFAULT '{}',\n  state TEXT NOT NULL",
);

const PENDING_UPLOAD_CHUNKS = `CREATE TABLE IF NOT EXISTS pending_document_upload_chunks (
  job_id TEXT NOT NULL REFERENCES pending_document_uploads(job_id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL CHECK (chunk_index BETWEEN 0 AND 31),
  data_base64 TEXT NOT NULL,
  PRIMARY KEY (job_id, chunk_index)
)`;

const PENDING_UPLOAD_INDEX = `CREATE INDEX IF NOT EXISTS pending_document_upload_ready
  ON pending_document_uploads (state, retry_after, created_at)`;

const PENDING_UPLOAD_SCHEMA = `${PENDING_UPLOAD_TABLE};${PENDING_UPLOAD_CHUNKS};${PENDING_UPLOAD_INDEX};`;

const READ_MODEL_TABLE = `CREATE TABLE IF NOT EXISTS cached_read_models (
  cache_key TEXT PRIMARY KEY CHECK (cache_key GLOB '[a-z]*' AND length(cache_key) BETWEEN 1 AND 64),
  schema_version INTEGER NOT NULL CHECK (schema_version > 0),
  payload_json TEXT NOT NULL CHECK (length(payload_json) <= 524288),
  updated_at TEXT NOT NULL
)`;

const VERSION_1_SCHEMA = `${CORE_SCHEMA}${CONFLICT_SCHEMA_V1}${FINAL_SCHEMA}`;

function splitSchema(schema: string) {
  return schema
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export const OFFLINE_SCHEMA = `${CURRENT_CORE_SCHEMA}${CONFLICT_SCHEMA_V2}${FINAL_SCHEMA}${FILE_CACHE_SCHEMA}${PENDING_UPLOAD_SCHEMA}${READ_MODEL_TABLE};`;

export const OFFLINE_MIGRATIONS = [
  {
    fromVersion: 1,
    toVersion: 2,
    statements: [
      "ALTER TABLE sync_conflicts ADD COLUMN local_operation TEXT NOT NULL DEFAULT 'UPSERT'",
      "ALTER TABLE sync_conflicts ADD COLUMN local_schema_version INTEGER NOT NULL DEFAULT 1",
    ],
  },
  {
    fromVersion: 2,
    toVersion: 3,
    statements: [FILE_CACHE_TABLE, FILE_CHUNKS_TABLE, FILE_CACHE_INDEX],
  },
  {
    fromVersion: 3,
    toVersion: 4,
    statements: [
      PENDING_UPLOAD_TABLE_V4,
      PENDING_UPLOAD_CHUNKS,
      PENDING_UPLOAD_INDEX,
    ],
  },
  {
    fromVersion: 4,
    toVersion: 5,
    statements: [
      "ALTER TABLE pending_document_uploads ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}'",
    ],
  },
  {
    fromVersion: 5,
    toVersion: 6,
    statements: [READ_MODEL_TABLE],
  },
  {
    fromVersion: 6,
    toVersion: 7,
    statements: [
      "ALTER TABLE cached_read_models RENAME TO cached_read_models_v6",
      READ_MODEL_TABLE,
      `INSERT INTO cached_read_models (cache_key,schema_version,payload_json,updated_at)
     SELECT cache_key,schema_version,payload_json,updated_at FROM cached_read_models_v6`,
      "DROP TABLE cached_read_models_v6",
    ],
  },
  {
    fromVersion: 7,
    toVersion: 8,
    statements: [
      "ALTER TABLE sync_checkpoint ADD COLUMN active_household_id TEXT",
      "CREATE INDEX IF NOT EXISTS offline_records_scope ON offline_records (scope_kind, scope_id)",
    ],
  },
] as const;

export const OFFLINE_UPGRADES: capSQLiteVersionUpgrade[] = [
  { toVersion: 1, statements: splitSchema(VERSION_1_SCHEMA) },
  ...OFFLINE_MIGRATIONS.map((migration) => ({
    toVersion: migration.toVersion,
    statements: [...migration.statements],
  })),
];
