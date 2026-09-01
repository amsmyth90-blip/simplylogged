import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const foundation = readFileSync(
  new URL("../supabase/migrations/20260819120000_life_os_foundation.sql", import.meta.url),
  "utf8"
);
const sharing = readFileSync(
  new URL("../supabase/migrations/20260831120000_household_resource_sharing.sql", import.meta.url),
  "utf8"
);
const lifecycle = readFileSync(
  new URL("../supabase/migrations/20260831130000_household_lifecycle_audit.sql", import.meta.url),
  "utf8"
);
const sharingAmbiguityFix = readFileSync(
  new URL("../supabase/migrations/20260831140000_fix_document_sharing_ambiguity.sql", import.meta.url),
  "utf8"
);

test("uses the same text identifier type as the documents table", () => {
  assert.doesNotMatch(foundation, /document_id uuid/);
  assert.doesNotMatch(foundation, /source_document_id uuid/);
  assert.match(foundation, /document_id text/);
});

test("revokes selected grants when a member leaves or is removed", () => {
  assert.match(lifecycle, /revoke_removed_member_permissions/);
  assert.match(lifecycle, /permission\.subject_user_id = new\.user_id/);
  assert.match(lifecycle, /permission\.revoked_at is null/);
  assert.match(lifecycle, /set revoked_at = timezone\('utc', now\(\)\)/);
  assert.match(lifecycle, /set payload = payload[\s\S]*- 'householdProfiles'/);
  assert.match(lifecycle, /insert into public\.household_state \(household_id, payload\)/);
});

test("keeps audit events append-only for authenticated clients", () => {
  assert.match(lifecycle, /revoke insert, update, delete on public\.audit_events from authenticated/);
  assert.match(lifecycle, /Users and household owners can read audit events/);
  assert.match(lifecycle, /HOUSEHOLD_MEMBER_REMOVED/);
  assert.match(lifecycle, /HOUSEHOLD_LEFT/);
});

test("keeps resource permission writes behind the atomic sharing function", () => {
  assert.match(sharing, /create or replace function public\.set_document_sharing/);
  assert.match(sharing, /revoke insert, update, delete on public\.shared_resources from authenticated/);
  assert.match(sharing, /revoke insert, update, delete on public\.resource_permissions from authenticated/);
  assert.match(sharing, /membership\.status = 'active'/);
  assert.match(sharing, /permission\.shared_resource_id = resource_id_value/);
  assert.match(sharingAmbiguityFix, /permission\.shared_resource_id = resource_id_value/);
});

test("enforces shared document and file access through the same permission function", () => {
  assert.match(sharing, /Authorized members can read shared documents/);
  assert.match(sharing, /public\.can_access_shared_resource\('document', id::text, user_id, 'VIEW'\)/);
  assert.match(sharing, /public\.can_read_document_storage\(name\)/);
  assert.match(sharing, /owner_membership\.status = 'active'/);
  assert.match(sharing, /return requested_action = 'VIEW'/);
});

test("supports legacy UUID and fresh-install text document identifiers", () => {
  assert.match(sharing, /document\.id::text = target_document_id/);
  assert.match(sharing, /resource_id = old\.id::text/);
  assert.match(sharing, /document\.id::text, document\.user_id, 'VIEW'/);
});
