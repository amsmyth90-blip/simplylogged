"use client";

import { useEffect, useState } from "react";

const SESSION_STATE_EVENT = "lifedock:session-state";

function isBrowser() {
  return typeof window !== "undefined";
}

export function readSessionValue<T>(key: string, initialValue: T) {
  if (!isBrowser()) {
    return initialValue;
  }

  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : initialValue;
  } catch {
    return initialValue;
  }
}

export function writeSessionValue<T>(key: string, value: T) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(SESSION_STATE_EVENT, { detail: { key, value } }));
  } catch {
    // Ignore session storage write errors and keep the in-memory state.
  }
}

export function useSessionState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => readSessionValue(key, initialValue));

  useEffect(() => {
    writeSessionValue(key, value);
  }, [key, value]);

  useEffect(() => {
    const syncFromStorage = () => {
      setValue(readSessionValue(key, initialValue));
    };

    const syncFromEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ key?: string; value?: T }>;
      if (customEvent.detail?.key === key) {
        setValue(customEvent.detail.value ?? readSessionValue(key, initialValue));
      }
    };

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(SESSION_STATE_EVENT, syncFromEvent as EventListener);

    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(SESSION_STATE_EVENT, syncFromEvent as EventListener);
    };
  }, [initialValue, key]);

  return [value, setValue] as const;
}
