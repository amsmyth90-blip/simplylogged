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
  DiaryDockRepositoryConflictError,
  hydrateDiaryDockBootstrap,
  mergeDiaryDockRecordPage,
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
import { loadDiaryDockBootstrap } from "@/lib/diarydock-bootstrap-client";
import { loadRemainingDiaryDockRecords } from "@/lib/diarydock-record-page-client";

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

export function DiaryDockDataProvider({ children }: { children: ReactNode }) {
  const repository = useMemo(() => createDiaryDockRepository(), []);
  const [persistenceError, setPersistenceError] = useState("");
  const stateSaver = useMemo(
    () => createCoalescedSaver<DiaryDockAppState>(async (next) => {
      try {
        await repository.save(next);
        setPersistenceError("");
      } catch (error) {
        setPersistenceError(error instanceof DiaryDockRepositoryConflictError
          ? "DiaryDock changed on another device. Reload the secure copy before making more changes."
          : "DiaryDock could not save these changes. Check your connection and reload before continuing.");
        throw error;
      }
    }),
    [repository],
  );
  const [state, setState] = useState<DiaryDockAppState>(createInitialDiaryDockState);
  const [household, setHousehold] = useState<HouseholdDirectory | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      if (repository.mode === "supabase") {
        const bootstrap = await loadDiaryDockBootstrap();
        if (!cancelled) {
          repository.adoptRevisions(
            bootstrap.privateRevision,
            bootstrap.householdRevision,
          );
          setState(hydrateDiaryDockBootstrap(bootstrap));
          setHousehold(bootstrap.household);
          setHydrated(true);
          void loadRemainingDiaryDockRecords({
            documentCursor: bootstrap.documentCursor,
            reminderCursor: bootstrap.reminderCursor,
            signal: controller.signal,
            apply: (page) => {
              if (!cancelled) setState((current) => mergeDiaryDockRecordPage(current, page));
            },
          }).catch(() => {
            if (!cancelled && !controller.signal.aborted) {
              setPersistenceError("DiaryDock could not finish loading every record. Reload to try again safely.");
            }
          });
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
      controller.abort();
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
      const bootstrap = await loadDiaryDockBootstrap();
      repository.adoptRevisions(
        bootstrap.privateRevision,
        bootstrap.householdRevision,
      );
      setHousehold(bootstrap.household);
      setState(hydrateDiaryDockBootstrap(bootstrap));
      void loadRemainingDiaryDockRecords({
        documentCursor: bootstrap.documentCursor,
        reminderCursor: bootstrap.reminderCursor,
        apply: (page) => setState((current) => mergeDiaryDockRecordPage(current, page)),
      }).catch(() => setPersistenceError(
        "DiaryDock could not finish loading every record. Reload to try again safely.",
      ));
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
      {persistenceError ? <div role="alert"
        className="sticky top-0 z-[100] flex flex-col gap-2 bg-[#7b2d2d] px-4 py-3 text-sm text-white shadow-lg sm:flex-row sm:items-center sm:justify-center">
        <span>{persistenceError}</span>
        <button type="button" onClick={() => window.location.reload()}
          className="min-h-10 rounded-full bg-white px-4 font-semibold text-[#7b2d2d]">
          Reload secure copy
        </button>
      </div> : null}
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
