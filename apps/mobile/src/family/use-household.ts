import { useCallback, useEffect, useState } from "react";

import type { JsonObject } from "@diarydock/contracts";
import {
  HOUSEHOLD_DIRECTORY_SCHEMA_VERSION,
  parseHouseholdDirectory,
  type HouseholdDirectory,
} from "@diarydock/household";
import { type OfflineStore, tryGetReadModel, tryPutReadModel,
  tryRemoveReadModel } from "@diarydock/offline-store";

import {
  loadMobileHousehold,
  mutateMobileHousehold,
  type HouseholdMutation,
} from "./household-client";

const CACHE_KEY = "household-directory";

async function cacheDirectory(store: OfflineStore, household: HouseholdDirectory) {
  await tryPutReadModel(store,
    CACHE_KEY,
    HOUSEHOLD_DIRECTORY_SCHEMA_VERSION,
    household as unknown as JsonObject,
  );
}

export function useHousehold(
  accessToken: string,
  store: OfflineStore,
  initialHousehold?: HouseholdDirectory,
) {
  const [household, setHousehold] = useState<HouseholdDirectory | null>(initialHousehold ?? null);
  const [loading, setLoading] = useState(!initialHousehold);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<"CACHE" | "NETWORK">(initialHousehold ? "NETWORK" : "CACHE");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await loadMobileHousehold(accessToken);
      await cacheDirectory(store, result.household);
      setHousehold(result.household);
      setSource("NETWORK");
      setError(null);
      return result.household;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your household could not be refreshed.");
      throw reason;
    }
  }, [accessToken, store]);

  useEffect(() => {
    if (initialHousehold) return undefined;
    let active = true;
    void (async () => {
      let cached = false;
      try {
        const item = await tryGetReadModel(store, CACHE_KEY);
        if (item?.schemaVersion === HOUSEHOLD_DIRECTORY_SCHEMA_VERSION) {
          const parsed = parseHouseholdDirectory(item.payload);
          if (active) { setHousehold(parsed); setSource("CACHE"); }
          cached = true;
        } else if (item) {
          await tryRemoveReadModel(store, CACHE_KEY);
        }
      } catch {
        await tryRemoveReadModel(store, CACHE_KEY);
      }
      try {
        const result = await loadMobileHousehold(accessToken);
        await cacheDirectory(store, result.household);
        if (active) {
          setHousehold(result.household);
          setSource("NETWORK");
          setError(null);
        }
      } catch (reason) {
        if (active) setError(cached
          ? "You are seeing the encrypted copy saved on this device. Access changes need a connection."
          : reason instanceof Error ? reason.message : "Your household could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [accessToken, initialHousehold, store]);

  const mutate = useCallback(async (mutation: HouseholdMutation) => {
    setBusy(true);
    setError(null);
    try {
      const result = await mutateMobileHousehold(accessToken, mutation);
      await cacheDirectory(store, result.household);
      setHousehold(result.household);
      setSource("NETWORK");
      return result;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Household access could not be changed.");
      throw reason;
    } finally {
      setBusy(false);
    }
  }, [accessToken, store]);

  return { household, loading, busy, source, error, setError, refresh, mutate };
}
