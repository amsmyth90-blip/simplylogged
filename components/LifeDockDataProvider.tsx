"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import {
  createInitialLifeDockState,
  createLifeDockRepository,
  type LifeDockAppState,
  type RepositoryMode
} from "@/lib/lifedock-data";
import {
  loadHouseholdDirectory,
  type HouseholdDirectory
} from "@/lib/household-sharing";

type LifeDockDataContextValue = {
  repositoryMode: RepositoryMode;
  state: LifeDockAppState;
  hydrated: boolean;
  household: HouseholdDirectory | null;
  canManageHousehold: boolean;
  canEditShared: boolean;
  updateState: (updater: (current: LifeDockAppState) => LifeDockAppState) => void;
};

const LifeDockDataContext = createContext<LifeDockDataContextValue | null>(null);

export function LifeDockDataProvider({ children }: { children: ReactNode }) {
  const repository = useMemo(() => createLifeDockRepository(), []);
  const [state, setState] = useState<LifeDockAppState>(createInitialLifeDockState);
  const [household, setHousehold] = useState<HouseholdDirectory | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [stateResult, householdResult] = await Promise.allSettled([
        repository.load(),
        repository.mode === "supabase"
          ? loadHouseholdDirectory().catch(() => null)
          : Promise.resolve(null)
      ]);

      if (!cancelled) {
        if (stateResult.status === "fulfilled") {
          setState(stateResult.value);
        }
        if (householdResult.status === "fulfilled") {
          setHousehold(householdResult.value);
        }
        setHydrated(true);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [repository]);

  const updateState = (updater: (current: LifeDockAppState) => LifeDockAppState) => {
    setState((current) => {
      const next = updater(current);
      void repository.save(next).catch(() => undefined);
      return next;
    });
  };

  return (
    <LifeDockDataContext.Provider
      value={{
        repositoryMode: repository.mode,
        state,
        hydrated,
        household,
        canManageHousehold: household?.role === "owner" || repository.mode === "session",
        canEditShared:
          household?.role === "owner" ||
          household?.role === "member" ||
          repository.mode === "session",
        updateState
      }}
    >
      {children}
    </LifeDockDataContext.Provider>
  );
}

export function useLifeDockData() {
  const context = useContext(LifeDockDataContext);

  if (!context) {
    throw new Error("useLifeDockData must be used within LifeDockDataProvider");
  }

  return context;
}
