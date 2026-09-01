"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import {
  createInitialDiaryDockState,
  createDiaryDockRepository,
  hydrateDiaryDockBootstrap,
  type DiaryDockBootstrapPayload,
  type DiaryDockAppState,
  type RepositoryMode,
  familyInvitesFromDirectory,
  householdMembersFromDirectory
} from "@/lib/diarydock-data";
import {
  loadHouseholdDirectory,
  type HouseholdDirectory
} from "@/lib/household-sharing";
import { PRODUCT_ANALYTICS_EVENTS, trackProductAnalytics } from "@/lib/product-analytics";
import { createCoalescedSaver } from "@/lib/coalesced-save";

type DiaryDockDataContextValue = {
  repositoryMode: RepositoryMode;
  state: DiaryDockAppState;
  hydrated: boolean;
  household: HouseholdDirectory | null;
  canManageHousehold: boolean;
  canEditShared: boolean;
  refreshHousehold: (reloadState?: boolean) => Promise<HouseholdDirectory | null>;
  updateState: (updater: (current: DiaryDockAppState) => DiaryDockAppState) => void;
};

const DiaryDockDataContext = createContext<DiaryDockDataContextValue | null>(null);

async function loadServerBootstrap() {
  const response = await fetch("/api/diarydock/bootstrap", {
    cache: "no-store",
    credentials: "same-origin"
  });
  const payload = await response.json().catch((): { error?: string } => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? "DiaryDock could not load your secure data.");
  }
  return payload as DiaryDockBootstrapPayload;
}

export function DiaryDockDataProvider({ children }: { children: ReactNode }) {
  const repository = useMemo(() => createDiaryDockRepository(), []);
  const stateSaver = useMemo(
    () => createCoalescedSaver<DiaryDockAppState>((next) => repository.save(next)),
    [repository],
  );
  const [state, setState] = useState<DiaryDockAppState>(createInitialDiaryDockState);
  const [household, setHousehold] = useState<HouseholdDirectory | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (repository.mode === "supabase") {
        const bootstrap = await loadServerBootstrap();
        if (!cancelled) {
          setState(hydrateDiaryDockBootstrap(bootstrap));
          setHousehold(bootstrap.household);
          setHydrated(true);
        }
        return;
      }

      const stateResult = await repository.load();

      if (!cancelled) {
        setState(stateResult);
        setHydrated(true);
      }
    };

    void load().catch(() => {
      if (!cancelled) setHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, [repository]);

  useEffect(() => {
    if (hydrated && repository.mode === "supabase") {
      void trackProductAnalytics(PRODUCT_ANALYTICS_EVENTS.RETURN_SESSION, {});
    }
  }, [hydrated, repository]);

  useEffect(() => {
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") {
        void stateSaver.flush().catch(() => undefined);
      }
    };
    const flushBeforeLeaving = () => {
      void stateSaver.flush().catch(() => undefined);
    };

    document.addEventListener("visibilitychange", flushWhenHidden);
    window.addEventListener("pagehide", flushBeforeLeaving);
    return () => {
      document.removeEventListener("visibilitychange", flushWhenHidden);
      window.removeEventListener("pagehide", flushBeforeLeaving);
      void stateSaver.flush().catch(() => undefined).finally(() => stateSaver.dispose());
    };
  }, [stateSaver]);

  const refreshHousehold = useCallback(async (reloadState = false) => {
    if (repository.mode !== "supabase") {
      return household;
    }

    if (reloadState) {
      const bootstrap = await loadServerBootstrap();
      setHousehold(bootstrap.household);
      setState(hydrateDiaryDockBootstrap(bootstrap));
      return bootstrap.household;
    }

    const nextHousehold = await loadHouseholdDirectory();
    setHousehold(nextHousehold);
    if (nextHousehold) {
      setState((current) => ({
        ...current,
        householdMembers: householdMembersFromDirectory(nextHousehold),
        familyInvites: familyInvitesFromDirectory(nextHousehold)
      }));
    }
    return nextHousehold;
  }, [household, repository]);

  const updateState = useCallback((updater: (current: DiaryDockAppState) => DiaryDockAppState) => {
    setState((current) => {
      const next = updater(current);
      stateSaver.schedule(next);
      return next;
    });
  }, [stateSaver]);

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
        refreshHousehold,
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
