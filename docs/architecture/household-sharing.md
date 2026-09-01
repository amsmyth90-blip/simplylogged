# Household sharing

Date: 31 August 2026
Initial supported resource: non-Vault documents

## Security contract

- Creating or changing invitations, roles, membership and household identity requires a sign-in within the previous 15 minutes. The API derives that timestamp from the authenticated Supabase user; the browser cannot assert it.

Every document is private unless its owner explicitly changes its visibility. Authorization is decided in Postgres from the authenticated user, the document owner, active household memberships, and—when needed—a stable selected-user grant. Display names are never authorization subjects.

| Visibility | Owner | Active member in same household | Selected active member | Removed or other-household user |
|---|---:|---:|---:|---:|
| `PRIVATE` | Manage | No access | No access | No access |
| `HOUSEHOLD` | Manage | View | View | No access |
| `SELECTED_MEMBERS` | Manage | No access | View | No access |

Shared access is read-only in this first vertical slice. A recipient cannot update or delete the document, alter sharing, or mark the owner's review state. Vault resources remain excluded from the generic sharing helper.

## Data model

- `shared_resources` records the owner, household, immutable resource key, and visibility.
- `resource_permissions` records selected authenticated user IDs and action flags. Only the atomic `set_document_sharing` function can mutate these rows from the application role.
- legacy `documents.shared_with` and `document_permissions.subject_name` remain readable during migration but no longer grant access.
- new sharing changes clear `documents.shared_with` so a display-name entry cannot be mistaken for an active grant.

The current schema supports one active household membership per user. The authorization function requires both the recipient and the resource owner to have active memberships in the resource's household. Removing either member therefore invalidates access without a grant-cleanup race.

## Enforcement path

1. The owner calls `set_document_sharing` with a document ID, visibility, and selected user IDs.
2. The function derives the caller from `auth.uid()`, verifies ownership, resolves the caller's active household, validates every selected user, and replaces grants in one transaction.
3. Document row RLS calls `can_access_shared_resource` for recipient reads. Owner insert, update, and delete policies remain separate.
4. Storage object RLS calls `can_read_document_storage`, which resolves the object to an authorized document row and uses the same access function.
5. The UI exposes only owner controls and never persists a recipient's shared document into that recipient's private `app_state` cache.

`RESOURCE_SHARED` and `RESOURCE_UNSHARED` audit events contain only resource identifiers, visibility, and selected-member count. They do not record document titles or extracted text.

The People & Sharing screen distinguishes authenticated household accounts from local profiles used only for meals, schedules, and reminders. Database roles retain their legacy names internally while the product presents them as Owner, Adult, and Member. Owners can create email-bound invitation links, copy or renew them, cancel pending invitations, change non-owner roles, remove members, and rename the household. Creating a link does not send an email, and the UI says so explicitly.

Membership, invitation, role, rename, share, and unshare changes write append-only audit events with identifiers and role transitions only. Authenticated clients cannot insert, update, or delete audit rows directly. The actor can read their own events and the active household owner can read household access events.

## Revocation behaviour

Changing visibility or selected members replaces grants transactionally. A membership status change to `removed` is effective on the next database/storage authorization check. Already-issued signed object URLs cannot be recalled; current preview links expire after at most five minutes and explicit open links after one minute. Reducing those lifetimes or proxying downloads through a fresh authorization check is a future hardening option.

Removing or leaving also stamps every selected-member grant in that household as revoked, preventing a later rejoin from restoring selected access. A non-owner who leaves receives a new empty private household in the same transaction. Broad household-state keys are removed from their private JSON snapshot before that household is created, preventing the previous household's shared plans from being copied into the new one. Owners cannot leave until an ownership-transfer design is implemented.

The client removes non-owned documents from private cache before load merging and before every save. A document already visible in an open browser can remain rendered until refresh, but it cannot be fetched again after database revocation (apart from an unexpired signed URL).

## Deployment and verification

Apply `supabase/schema.sql` and all preceding migrations before `20260831120000_household_resource_sharing.sql`. The Life OS foundation migration now uses the existing text document identifier type; confirm production migration history before deployment rather than editing an already-applied production migration.

Repository checks cover the pure authorization matrix, consumer role mapping, per-person document summaries, cache isolation, migration invariants, capture confirmation, type checking, lint, and the production build. The migration invariant tests are static checks and complement, rather than replace, the live Postgres gate.

`npm run test:rls:household` is the live integration gate. It requires separate `DIARYDOCK_RLS_*` credentials and `DIARYDOCK_RLS_TEST_CONFIRM=disposable`; it never falls back to the application's normal credentials or applies migrations. The runner refuses the currently linked project unless `DIARYDOCK_RLS_ALLOW_LINKED_PROJECT=true` is also set. That override is only appropriate when the linked project is known to be disposable.

After the migrations have been applied to a disposable/local Supabase project, the runner creates uniquely marked test accounts for an owner, a selected member, a non-selected household member, a member who is subsequently removed, and an unrelated account. It checks document rows and stored files for private, household, and selected-member access; recipient write/delete/escalation denial; immediate removal revocation; and cross-household denial. Cleanup targets only the generated document IDs, object paths, households, and auth users, and auth-user deletion requires the test-purpose marker.

On 31 August 2026, the user confirmed that the linked DiaryDock project contained no live data and authorized it as the disposable target. Migrations `20260831120000`, `20260831130000`, and the UUID-compatibility forward fix `20260831140000` were applied. The live gate passed all 46 database and storage checks, and cleanup completed without warnings. A final dry run must remain up to date before release.

Post-removal checks use a fresh authenticated client because bytes downloaded before revocation may remain in the original client/device cache. Server authorization, new signed-link creation, and fresh-session downloads are all denied immediately; already-downloaded bytes cannot be retroactively removed from a device.

## Deliberately deferred

- repeat the live RLS gate for future deployment candidates;
- recent-auth challenge before changing sensitive sharing;
- ownership transfer and last-owner resolution;
- sharing for resources beyond ordinary documents;
- migration of broad `household_state` JSON modules;
- recipient notifications and a complete access-history screen.
