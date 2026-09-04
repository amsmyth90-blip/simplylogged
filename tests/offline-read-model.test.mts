import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import type { OfflineDatabase } from "../apps/mobile/src/data/offline/database.ts";
import { SqliteReadModelRepository } from "../apps/mobile/src/data/offline/read-model-repository.ts";
import { OFFLINE_SCHEMA } from "../apps/mobile/src/data/offline/schema.ts";

class DatabaseAdapter {
  readonly raw = new DatabaseSync(":memory:");

  constructor() {
    this.raw.exec(OFFLINE_SCHEMA);
  }

  async query(statement: string, values: unknown[] = []) {
    return {
      values: this.raw.prepare(statement).all(...values) as Record<
        string,
        unknown
      >[],
    };
  }

  async run(statement: string, values: unknown[] = []) {
    this.raw.prepare(statement).run(...values);
    return { changes: { changes: 1 } };
  }
}

test("encrypted read models round-trip, replace, and remove bounded JSON", async () => {
  const database = new DatabaseAdapter();
  const repository = new SqliteReadModelRepository(
    database as unknown as OfflineDatabase,
  );
  await repository.put("household-directory", 1, {
    name: "Greenwood Household",
    members: [],
  });
  const first = await repository.get("household-directory");
  assert.equal(first?.schemaVersion, 1);
  assert.deepEqual(first?.payload, {
    name: "Greenwood Household",
    members: [],
  });

  await repository.put("household-directory", 2, {
    name: "Updated",
    members: [],
  });
  assert.equal((await repository.get("household-directory"))?.schemaVersion, 2);
  await repository.remove("household-directory");
  assert.equal(await repository.get("household-directory"), null);
  database.raw.close();
});

test("read-model storage rejects unsafe keys and oversized payloads", async () => {
  const database = new DatabaseAdapter();
  const repository = new SqliteReadModelRepository(
    database as unknown as OfflineDatabase,
  );
  await assert.rejects(
    () => repository.put("../household", 1, {}),
    /key is invalid/,
  );
  await assert.rejects(
    () =>
      repository.put("household-directory", 1, { value: "x".repeat(524_288) }),
    /too large/,
  );
  database.raw.close();
});
