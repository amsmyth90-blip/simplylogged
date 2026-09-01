import assert from "node:assert/strict";
import test from "node:test";
import { assertDisposableRlsTarget } from "../tools/household-sharing-rls-safety.ts";

test("RLS target safety requires an explicit disposable confirmation", () => {
  assert.throws(
    () => assertDisposableRlsTarget({
      testUrl: "https://staging-ref.supabase.co",
      confirmation: undefined,
    }),
    /DIARYDOCK_RLS_TEST_CONFIRM=disposable/,
  );
});

test("RLS target safety rejects the linked project by URL", () => {
  assert.throws(
    () => assertDisposableRlsTarget({
      testUrl: "https://linked-ref.supabase.co/",
      linkedUrl: "https://linked-ref.supabase.co",
      confirmation: "disposable",
    }),
    /currently linked Supabase project/,
  );
});

test("RLS target safety rejects the linked project by project ref", () => {
  assert.throws(
    () => assertDisposableRlsTarget({
      testUrl: "https://linked-ref.supabase.co",
      linkedProjectRef: "linked-ref",
      confirmation: "disposable",
    }),
    /currently linked Supabase project/,
  );
});

test("RLS target safety accepts a separate staging project", () => {
  assert.deepEqual(
    assertDisposableRlsTarget({
      testUrl: "https://staging-ref.supabase.co",
      linkedUrl: "https://production-ref.supabase.co",
      linkedProjectRef: "production-ref",
      confirmation: "disposable",
    }),
    {
      host: "staging-ref.supabase.co",
      isLocal: false,
      projectRef: "staging-ref",
    },
  );
});

test("RLS target safety permits an explicitly confirmed local target", () => {
  assert.deepEqual(
    assertDisposableRlsTarget({
      testUrl: "http://127.0.0.1:54321",
      confirmation: "disposable",
    }),
    {
      host: "127.0.0.1:54321",
      isLocal: true,
      projectRef: null,
    },
  );
});
