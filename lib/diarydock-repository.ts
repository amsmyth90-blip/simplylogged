"use client";

import { createInitialDiaryDockState, hydrateDiaryDockState } from "@/lib/diarydock-initial-state";
import { loadDiaryDockBootstrap } from "@/lib/diarydock-bootstrap-client";
import { loadRemainingDiaryDockRecords } from "@/lib/diarydock-record-page-client";
import { hydrateDiaryDockBootstrap, mergeDiaryDockRecordPage, pickHouseholdState, removeNonOwnedDocumentCache } from "@/lib/diarydock-state-merge";
import { MAX_DIARYDOCK_STATE_SAVE_BYTES, parseDiaryDockStateSaveResponse } from "@/lib/diarydock-state-save";
import type { DiaryDockAppState, DiaryDockRepository } from "@/lib/diarydock-types";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

const SESSION_KEY = "diarydock-app-state-v2";

export class DiaryDockRepositoryConflictError extends Error {
  constructor() {
    super("DiaryDock changed on another device.");
    this.name = "DiaryDockRepositoryConflictError";
  }
}

function createSessionRepository(): DiaryDockRepository {
  return {
    mode: "session",
    adoptRevisions() {},
    async load() {
      if (typeof window === "undefined") return createInitialDiaryDockState();
      try {
        const raw = window.sessionStorage.getItem(SESSION_KEY);
        return raw ? hydrateDiaryDockState(JSON.parse(raw) as DiaryDockAppState) : createInitialDiaryDockState();
      } catch {
        return createInitialDiaryDockState();
      }
    },
    async save(state) {
      if (typeof window === "undefined") return;
      try {
        window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
      } catch {
        // Keep the current in-memory state when browser session storage is unavailable.
      }
    }
  };
}

function createSupabaseRepository(): DiaryDockRepository {
  let privateRevision: string | null = null;
  let householdRevision: string | null = null;
  const getCurrentUserId = async () => {
    const client = getSupabaseBrowserClient();
    if (!client) return null;
    const { data, error } = await client.auth.getUser();
    return error || !data.user ? null : data.user.id;
  };
  return {
    mode: "supabase",
    adoptRevisions(nextPrivateRevision, nextHouseholdRevision) {
      privateRevision = nextPrivateRevision;
      householdRevision = nextHouseholdRevision;
    },
    async load() {
      const bootstrap = await loadDiaryDockBootstrap();
      privateRevision = bootstrap.privateRevision;
      householdRevision = bootstrap.householdRevision;
      let state = hydrateDiaryDockBootstrap(bootstrap);
      await loadRemainingDiaryDockRecords({
        documentCursor: bootstrap.documentCursor,
        reminderCursor: bootstrap.reminderCursor,
        apply: (page) => { state = mergeDiaryDockRecordPage(state, page); },
      });
      return state;
    },
    async save(state) {
      const client = getSupabaseBrowserClient();
      if (!client) return;
      const userId = await getCurrentUserId();
      if (!userId) return;
      const privateState = {
        ...removeNonOwnedDocumentCache(state, userId),
        reminders: [],
      };
      const body = JSON.stringify({
        privateRevision,
        householdRevision,
        privateState,
        householdState: pickHouseholdState(privateState),
      });
      if (new TextEncoder().encode(body).byteLength > MAX_DIARYDOCK_STATE_SAVE_BYTES) {
        throw new Error("DiaryDock has reached its safe state size.");
      }
      const response = await fetch("/api/diarydock/state", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const payload = await response.json().catch(() => null);
      if (response.status === 409) throw new DiaryDockRepositoryConflictError();
      if (!response.ok) throw new Error("DiaryDock could not save your changes.");
      const result = parseDiaryDockStateSaveResponse(payload);
      if (result.status !== "OK") throw new DiaryDockRepositoryConflictError();
      privateRevision = result.privateRevision;
      householdRevision = result.householdRevision;
    }
  };
}

export function createDiaryDockRepository(): DiaryDockRepository {
  return isSupabaseConfigured() ? createSupabaseRepository() : createSessionRepository();
}
