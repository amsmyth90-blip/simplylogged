# Permission-aware universal search

DiaryDock search is an authenticated server retrieval service. The browser no longer builds an index from the full client state and no longer searches raw OCR, emergency phone numbers, private notes or contact addresses.

## Authorization boundary

`GET /api/search` authenticates the caller and retrieves candidates from `documents`, `reminders`, `assets` and the caller's exact `app_state` row. Database row-level security is therefore applied before a candidate can enter the server ranking list. Shared documents and assets use their existing resource authorization policies; private module records come only from `app_state.id = auth.uid()`.

The server does not fetch a broad privileged dataset and discard unauthorized rows in the interface. It uses the signed-in Supabase session rather than a service-role client. Signed-out requests fail with `401`, responses are private/no-store and calls are rate limited.

## Minimal searchable projection

The result schema contains only category, title, short non-sensitive detail, direct route, optional due timestamp and a small badge. Internal search text, owner IDs, permission rows and ranking fields are removed before serialization.

The current adapters cover:

- documents, with title/category/kind/room/issuer but not OCR text;
- reminders, without private notes;
- smart assets, with separate warranty and service-date results;
- vehicles, with distinct MOT, tax and insurance dates, plus trips, insurance, bills and professional contacts from the caller's private state;
- direct room navigation.

Contact search uses name, role, company and category only. It does not search or return phone, email, address or notes.

## Ranking and filters

Ranking is deterministic: exact title, title prefix, title contains, then approved secondary fields. Category filtering uses domain tags so a pet or vehicle document remains one result while still being discoverable in that module. Date filters support the next 30 days, next 90 days and dates already passed. Boundary behavior is unit tested. Recent query chips are kept only in the current browser session.
