"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { usePathname } from "next/navigation";

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
  persistState: (state: DiaryDockAppState) => Promise<void>;
};

const DiaryDockDataContext = createContext<DiaryDockDataContextValue | null>(null);

export function DiaryDockDataProvider({ children, accountId }: { children: ReactNode; accountId?: string | null }) {
  const pathname = usePathname();
  const publicPage = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/pricing", "/privacy", "/terms", "/support", "/cookies", "/account-deletion"].includes(pathname);
  const saverLifecycle = useRef({ generation: 0 });
  const repository = useMemo(() => createDiaryDockRepository(accountId), [accountId]);
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
        if (!accountId) return;
        const bootstrap = await loadDiaryDockBootstrap();
        if (bootstrap.userId !== accountId) throw new Error("Account changed while loading.");
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
      if (!cancelled) setPersistenceError("Your account data could not be loaded. Reload to try again; editing is paused to protect your saved information.");
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [repository, accountId]);

  useEffect(() => {
    if (hydrated && repository.mode === "supabase") {
      void trackProductAnalytics(PRODUCT_ANALYTICS_EVENTS.RETURN_SESSION, {});
    }
  }, [hydrated, repository]);

  useEffect(() => {
    const lifecycle = saverLifecycle.current;
    const generation = ++lifecycle.generation;
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
      void stateSaver.flush().catch(() => undefined).finally(() => {
        // Strict Mode immediately reattaches this effect; keep that saver alive.
        if (lifecycle.generation === generation) stateSaver.dispose();
      });
    };
  }, [stateSaver, saverLifecycle]);

  const refreshHousehold = useCallback(async (reloadState = false) => {
    if (repository.mode !== "supabase") {
      return household;
    }

    if (reloadState) {
      const bootstrap = await loadDiaryDockBootstrap();
      if (bootstrap.userId !== accountId) throw new Error("Account changed while loading.");
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
  }, [household, repository, accountId]);

  const updateState = useCallback((updater: (current: DiaryDockAppState) => DiaryDockAppState) => {
    if (!hydrated) return;
    setState((current) => {
      const next = updater(current);
      stateSaver.schedule(next);
      return next;
    });
  }, [stateSaver, hydrated]);

  const persistState = useCallback(async (next: DiaryDockAppState) => {
    if (!hydrated) throw new Error("Please wait for your account data to load.");
    stateSaver.schedule(next);
    await stateSaver.flush();
  }, [stateSaver, hydrated]);

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
        updateState,
        persistState,
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
      {accountId && !publicPage && !hydrated ? <div className="mx-auto max-w-lg rounded-3xl border border-[#20352a]/10 bg-white p-8 text-center text-[#20352a]" role="status">
        {persistenceError ? "Your saved information is safe. Please reload to reconnect." : "Loading your DiaryDock account…"}
      </div> : children}
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
