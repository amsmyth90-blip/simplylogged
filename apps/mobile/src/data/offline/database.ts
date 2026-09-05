import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from "@capacitor-community/sqlite";
import { Capacitor } from "@capacitor/core";

import { createDatabasePassphrase, databaseNameForAccount } from "./database-key";
import { OFFLINE_DATABASE_VERSION, OFFLINE_UPGRADES } from "./schema";

export type OfflineDatabase = SQLiteDBConnection;

export type OpenOfflineDatabase = {
  connection: SQLiteConnection;
  database: OfflineDatabase;
  databaseName: string;
};

function assertNativePlatform() {
  const platform = Capacitor.getPlatform();
  if (platform !== "android" && platform !== "ios") {
    throw new Error("Encrypted offline storage is available only in the installed application.");
  }
}

async function ensureEncryptionSecret(connection: SQLiteConnection) {
  const encryptionConfigured = await connection.isInConfigEncryption();
  if (!encryptionConfigured.result) {
    throw new Error("Encrypted offline storage is not configured.");
  }

  const stored = await connection.isSecretStored();
  if (!stored.result) {
    await connection.setEncryptionSecret(createDatabasePassphrase());
  }
}

async function acquireConnection(connection: SQLiteConnection, databaseName: string) {
  const consistent = await connection.checkConnectionsConsistency();
  const exists = await connection.isConnection(databaseName, false);
  if (consistent.result && exists.result) {
    return connection.retrieveConnection(databaseName, false);
  }
  await connection.addUpgradeStatement(databaseName, OFFLINE_UPGRADES);
  return connection.createConnection(
    databaseName,
    true,
    "secret",
    OFFLINE_DATABASE_VERSION,
    false,
  );
}

async function assertDatabasePolicy(database: OfflineDatabase) {
  await database.execute("PRAGMA foreign_keys = ON; PRAGMA secure_delete = ON;", false);
  const [version, foreignKeys, secureDelete] = await Promise.all([
    database.getVersion(),
    database.query("PRAGMA foreign_keys"),
    database.query("PRAGMA secure_delete"),
  ]);
  const foreignKeysEnabled = Number(foreignKeys.values?.[0]?.foreign_keys) === 1;
  const secureDeleteEnabled = Number(secureDelete.values?.[0]?.secure_delete) > 0;
  if (version.version !== OFFLINE_DATABASE_VERSION || !foreignKeysEnabled || !secureDeleteEnabled) {
    throw new Error("The offline database security policy could not be applied.");
  }
}

export async function openEncryptedOfflineDatabase(accountId: string): Promise<OpenOfflineDatabase> {
  assertNativePlatform();
  const databaseName = await databaseNameForAccount(accountId);
  const connection = new SQLiteConnection(CapacitorSQLite);
  await ensureEncryptionSecret(connection);

  let registered = false;
  try {
    const database = await acquireConnection(connection, databaseName);
    registered = true;
    await database.open();

    const encrypted = await connection.isDatabaseEncrypted(databaseName);
    if (!encrypted.result) {
      throw new Error("DiaryDock refused to open an unencrypted offline database.");
    }
    await assertDatabasePolicy(database);

    return { connection, database, databaseName };
  } catch (error) {
    if (registered) {
      await connection.closeConnection(databaseName, false).catch(() => undefined);
    }
    throw error;
  }
}

export async function deleteEncryptedOfflineDatabase(databaseName: string) {
  assertNativePlatform();
  if (!/^diarydock_[0-9a-f]{24}$/.test(databaseName)) {
    throw new Error("The offline database name is invalid.");
  }
  const connection = new SQLiteConnection(CapacitorSQLite);
  const exists = await connection.isDatabase(databaseName);
  if (!exists.result) return;
  const connected = await connection.isConnection(databaseName, false);
  if (connected.result) await connection.closeConnection(databaseName, false);
  await CapacitorSQLite.deleteDatabase({ database: databaseName, readonly: false });
  if ((await connection.isDatabase(databaseName)).result) {
    throw new Error("The encrypted offline database could not be removed.");
  }
}
