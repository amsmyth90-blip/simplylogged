"use client";

import { useEffect, useState, type FormEvent } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import type { DiaryDockAppState } from "@/lib/diarydock-data";
import {
  createInitialWillRecord,
  getCurrentWillVersion,
  hydrateWillRecord,
  type WillRecord,
} from "@/lib/will-records";

function replaceWill(
  state: DiaryDockAppState,
  record: WillRecord,
): DiaryDockAppState {
  return { ...state, willsWishes: { ...state.willsWishes, myWill: record } };
}

export function useWillDetails() {
  const { state, hydrated, updateState } = useDiaryDockData();
  const storedRecord = hydrateWillRecord(state.willsWishes.myWill);
  const [draft, setDraft] = useState<WillRecord>(createInitialWillRecord);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    if (hydrated) setDraft(storedRecord);
    // The form refreshes only after repository hydration. Edits remain local until save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const currentVersion = getCurrentWillVersion(draft);
  const updateField = <K extends keyof WillRecord>(
    key: K,
    value: WillRecord[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = { ...draft, updatedAt: new Date().toISOString() };
    updateState((current) => replaceWill(current, next));
    setDraft(next);
    setSavedMessage("Your will details have been saved privately.");
  };

  return {
    hydrated,
    draft,
    setDraft,
    currentVersion,
    updateField,
    savedMessage,
    save,
  };
}

export type WillDetailsViewModel = ReturnType<typeof useWillDetails>;
