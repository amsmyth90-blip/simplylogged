# DiaryDock My Trips

## Architecture

My Trips is part of the existing Driveway/Travel Room and uses the authenticated DiaryDock app shell. Trip data is stored inside the existing per-user `app_state` payload through `LifeDockDataProvider`. In Supabase mode that row is protected by the existing owner-only Row Level Security policy. Session mode uses the existing session repository.

The feature deliberately reuses canonical DiaryDock records:

- Travel checklist items remain in `travelChecklist` and are linked by `tripId`.
- Documents remain in private All Files storage and trips store document links only.
- Reminders use the existing reminder state and structured reminder table.
- Travellers link to household members or professional contacts where available.
- Insurance links to an existing Insurance Hub policy rather than copying it.

## Route map

- `/driveway/trips` — My Trips hub, search, filters and grouped trip cards.
- `/driveway/trips/new` — opens the guided trip creation flow.
- `/driveway/trips/[tripId]` — trip overview.
- `/driveway/trips/[tripId]/overview`
- `/driveway/trips/[tripId]/itinerary`
- `/driveway/trips/[tripId]/bookings`
- `/driveway/trips/[tripId]/documents`
- `/driveway/trips/[tripId]/checklist`
- `/driveway/trips/[tripId]/travellers`
- `/driveway/trips/[tripId]/insurance`
- `/driveway/trips/[tripId]/expenses`
- `/driveway/trips/[tripId]/emergency`
- `/driveway/trips/[tripId]/settings`
- `/driveway/travel-checklist?trip=[tripId]` — full checklist focused on one trip.

## Data model

`Trip` contains basic destination and date details plus nested owner-private records for travellers, bookings, itinerary items, document links, optional expenses, emergency information and sharing metadata. The hydrator upgrades older simple trip records and supplies empty arrays/defaults for newly introduced fields.

Trip states are: draft, planning, booked, ready, happening, completed, cancelled and archived. Readiness is calculated from actual linked records and checklist state; it is not inferred from dates alone.

## Trip creation

The five-step wizard captures details, canonical travellers, optional transport, optional accommodation and optional setup actions. A draft can be saved after a title is supplied. Completing the wizard validates the destination and date range. Checklist templates and the trip-start reminder are only created after the user chooses them.

Transport and accommodation entered during creation begin with `unknown` confirmation status. DiaryDock does not claim they are confirmed.

## Bookings and itinerary

Bookings and itinerary items are separate but compatible records. Bookings hold provider, reference, confirmation state, dates, cost and payment state. Itinerary items are chronological plans and can reference booking information. A future iteration can add explicit booking-to-itinerary selection without changing the existing record shapes.

## Documents and analysis

Trips link to existing private `VaultDocument` records. Upload and scanning continue through the existing capture route and private storage bucket. The trip page exposes review state but never silently applies extracted values. The original document remains authoritative, and failed analysis does not block storage.

## Checklist integration

There is one travel checklist system. Each item has a `tripId`; the trip checklist page reads and updates those same items. The full checklist accepts a trip query parameter so the correct trip is selected.

## Reminders

Trip reminders use the existing `Reminder` record and, in Supabase mode, `upsertStructuredReminder`. Stable trip reminder IDs avoid duplicates. No second notification system was added.

## Insurance

A trip stores only `linkedInsurancePolicyId`. The original policy remains in the Insurance Hub. The UI does not state that the travellers are uninsured when no policy is linked and does not determine whether a linked policy provides suitable cover.

## Sharing permissions

External collaborator access is intentionally disabled. The current `app_state` RLS policy is owner-only and does not provide section-level trip grants. The UI does not simulate access. Implementing collaboration requires server-side trip-share tables, invitation acceptance, permission checks and document/emergency scopes before access can be enabled.

## Offline Trip Pack

The current Offline Trip Pack is a user-triggered local text download containing dates, itinerary, booking references, traveller display names, user-entered emergency contacts and checklist status. Identity documents and detailed medical information are excluded by default. It is a downloadable summary, not a claim that the whole app works offline.

## Deferred features and known limitations

- Server-enforced collaborator permissions and invitation acceptance.
- Trusted shared access to documents and emergency sections.
- A verified weather provider.
- Genuine map and calendar views.
- Cover-image upload to private storage.
- Automatic document-to-booking proposals after explicit review.
- Calendar push and device notification scheduling beyond the existing reminder records.
- Bank connections and automatic currency conversion.
- Full offline caching of the application and private document files.

No new database migration is required for the owner-private trip feature because the existing `app_state` row and document/reminder tables already have owner RLS. A future sharing implementation will require a reviewed migration and new RLS policies.
