# Household Foundation

## Architecture decision

DiaryDock already has a strong household boundary: `households`, authenticated
`household_memberships`, household-scoped shared state, explicit resource grants,
invitations, ownership transfer and row-level security (RLS). Phase 1 extends that
model; it does not replace it.

- `households` is the tenant root. `owner_id` remains the primary owner and a new
  lifecycle status allows a household to be disabled without deleting data.
- `household_memberships` represents people with login accounts. Its existing
  `owner` / `member` / `viewer` access role remains the authorization contract.
  A separate member kind records the family role (`owner`, `adult`, `teen`,
  `child`, or `trusted_contact`) without coupling identity to permissions.
- `household_people` represents real household people, including children,
  dependants and partners who do not have accounts. A nullable `linked_user_id`
  connects a person to a membership only when an account exists.
- The existing `householdProfiles` shared-state collection remains a compatibility
  projection for meal, schedule and reminder presentation settings. New person
  mutations keep that projection populated while the app moves to stable person
  IDs. It is not an authorization source.
- Existing documents remain owner-private. Household access continues to require
  an explicit `shared_resources` grant; membership alone never exposes a file.

## Migration and compatibility

The additive migration:

1. adds lifecycle and family-role columns with safe defaults;
2. creates `household_people`, indexes, checks, RLS and owner-only mutation RPCs;
3. creates linked person rows for existing authenticated memberships;
4. imports valid existing non-login household profiles without deleting the JSON
   source; and
5. provisions a personal household for every existing account that does not have
   an active membership. The existing lazy and service provisioning paths remain
   as recovery paths for newly-created accounts.

The migration is idempotent where practical and retains all current tables,
columns, data and routes. Existing users continue to enter their current personal
household and keep their private data.

## Security boundaries

- Every person row carries a non-null `household_id` foreign key.
- RLS permits reads only to active members of the same active household.
- Clients receive no direct insert, update or delete grant on people.
- Owner-only, bounded RPCs derive the household and actor from `auth.uid()`;
  callers cannot supply either value.
- Linked account people cannot be edited or archived through the non-login person
  endpoints.
- Household disablement and membership disablement fail closed.
- Private document rows and storage objects keep their current owner/grant checks.

## Phase 1 user flow

The Family area shows account members and non-login people together. An owner can
open **Add someone**, enter only the person's name, relationship and person type,
and save. No email or invitation is required. Account invitations remain available
as an existing, separate capability and are not expanded in this phase.

## Deferred by design

Later phases can reference `household_people.id` from calendars, meals, tasks,
health, documents and reminders. Teen/child login permissions, richer invitations,
notifications, audit UI and household recovery workflows are intentionally not
introduced here.
