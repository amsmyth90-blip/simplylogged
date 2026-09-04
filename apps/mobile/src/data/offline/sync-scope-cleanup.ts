import type { capTask } from "@capacitor-community/sqlite";

import type { OfflineDatabase } from "./database.ts";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertHouseholdId(value: string | null) {
  if (value !== null && !uuidPattern.test(value)) {
    throw new Error("The active household scope is invalid.");
  }
}

export async function readHouseholdScope(database: OfflineDatabase) {
  const result = await database.query(
    "SELECT active_household_id FROM sync_checkpoint WHERE name = 'primary' LIMIT 1",
  );
  const row = result.values?.[0];
  return {
    found: Boolean(row),
    id: typeof row?.active_household_id === "string" ? row.active_household_id : null,
  };
}

export function purgeHouseholdTasks(activeHouseholdId: string | null): capTask[] {
  const mismatch = activeHouseholdId === null
    ? "scope_kind = 'HOUSEHOLD'"
    : "scope_kind = 'HOUSEHOLD' AND scope_id <> ?";
  const values = activeHouseholdId === null ? [] : [activeHouseholdId];
  const related = (table: string) => ({
    statement: `DELETE FROM ${table} WHERE EXISTS (
      SELECT 1 FROM offline_records AS stale
      WHERE stale.entity_type = ${table}.entity_type
        AND stale.record_id = ${table}.record_id AND ${mismatch})`,
    values,
  });
  const staleDocuments = `SELECT record_id FROM offline_records
    WHERE entity_type = 'document' AND ${mismatch}`;
  return [
    related("sync_outbox"),
    related("sync_conflicts"),
    related("sync_failures"),
    { statement: `DELETE FROM pending_document_uploads WHERE document_id IN (${staleDocuments})`, values },
    { statement: `DELETE FROM offline_file_cache WHERE document_id IN (${staleDocuments})`, values },
    { statement: `DELETE FROM offline_records WHERE ${mismatch}`, values },
  ];
}
