export type OfflineAccountMarker = {
  databaseName: string;
  state: "ACTIVE" | "PURGE_PENDING";
};

export type OfflineAccountRegistryDependencies = {
  databaseName(accountId: string): Promise<string>;
  deleteDatabase(databaseName: string): Promise<void>;
  getMarker(): Promise<string | null>;
  removeMarker(): Promise<void>;
  setMarker(value: string): Promise<void>;
};

function parseMarker(value: string | null): OfflineAccountMarker | null {
  if (!value) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error("The offline account marker is invalid."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("The offline account marker is invalid.");
  }
  const row = parsed as Record<string, unknown>;
  if (Object.keys(row).some((key) => !["databaseName", "state"].includes(key))
    || typeof row.databaseName !== "string" || !/^diarydock_[0-9a-f]{24}$/.test(row.databaseName)
    || (row.state !== "ACTIVE" && row.state !== "PURGE_PENDING")) {
    throw new Error("The offline account marker is invalid.");
  }
  return row as OfflineAccountMarker;
}

function encoded(marker: OfflineAccountMarker) {
  return JSON.stringify(marker);
}

export function createOfflineAccountRegistry(dependencies: OfflineAccountRegistryDependencies) {
  async function marker() {
    return parseMarker(await dependencies.getMarker());
  }
  async function databaseName(accountId: string) {
    const value = await dependencies.databaseName(accountId);
    if (!/^diarydock_[0-9a-f]{24}$/.test(value)) {
      throw new Error("The offline account identity is invalid.");
    }
    return value;
  }
  return {
    async recoverPendingPurge() {
      const current = await marker();
      if (current?.state !== "PURGE_PENDING") return;
      await dependencies.deleteDatabase(current.databaseName);
      await dependencies.removeMarker();
    },
    async prepare(accountId: string) {
      const next = await databaseName(accountId);
      const current = await marker();
      if (current && (current.state === "PURGE_PENDING" || current.databaseName !== next)) {
        await dependencies.deleteDatabase(current.databaseName);
      }
      await dependencies.setMarker(encoded({ databaseName: next, state: "ACTIVE" }));
    },
    async requestPurge(accountId: string) {
      const current = await databaseName(accountId);
      await dependencies.setMarker(encoded({ databaseName: current, state: "PURGE_PENDING" }));
    },
    async completePurge(accountId: string) {
      const current = await marker();
      if (current?.databaseName === await databaseName(accountId)) {
        await dependencies.removeMarker();
      }
    },
  };
}
