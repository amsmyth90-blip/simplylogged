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
  createInitialDiaryDockState,
  createDiaryDockRepository,
  type DiaryDockAppState,
  type RepositoryMode
} from "@/lib/diarydock-data";
import {
  loadHouseholdDirectory,
  type HouseholdDirectory
} from "@/lib/household-sharing";

type DiaryDockDataContextValue = {
  repositoryMode: RepositoryMode;
  state: DiaryDockAppState;
  hydrated: boolean;
  household: HouseholdDirectory | null;
  canManageHousehold: boolean;
  canEditShared: boolean;
  updateState: (updater: (current: DiaryDockAppState) => DiaryDockAppState) => void;
};

const DiaryDockDataContext = createContext<DiaryDockDataContextValue | null>(null);

export function DiaryDockDataProvider({ children }: { children: ReactNode }) {
  const repository = useMemo(() => createDiaryDockRepository(), []);
  const [state, setState] = useState<DiaryDockAppState>(createInitialDiaryDockState);
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

  const updateState = (updater: (current: DiaryDockAppState) => DiaryDockAppState) => {
    setState((current) => {
      const next = updater(current);
      void repository.save(next).catch(() => undefined);
      return next;
    });
  };

  return (
    <DiaryDockDataContext.Provider
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
    </DiaryDockDataContext.Provider>
  );
}

export function useDiaryDockData() {
  const context = useContext(DiaryDockDataContext);

  if (!context) {
    throw new Error("useDiaryDockData must be used within DiaryDockDataProvider");
  }

  return context;
}
