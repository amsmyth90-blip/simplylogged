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

type LifeDockDataContextValue = {
  repositoryMode: RepositoryMode;
  state: LifeDockAppState;
  hydrated: boolean;
  updateState: (updater: (current: LifeDockAppState) => LifeDockAppState) => void;
};

const LifeDockDataContext = createContext<LifeDockDataContextValue | null>(null);

export function LifeDockDataProvider({ children }: { children: ReactNode }) {
  const repository = useMemo(() => createLifeDockRepository(), []);
  const [state, setState] = useState<LifeDockAppState>(createInitialLifeDockState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const nextState = await repository.load();
      if (!cancelled) {
        setState(nextState);
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
      void repository.save(next);
      return next;
    });
  };

  return (
    <LifeDockDataContext.Provider
      value={{
        repositoryMode: repository.mode,
        state,
        hydrated,
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
