# Web and mobile access

The website and mobile app use the same Supabase identity and saved account records. People sign in with their existing DiaryDock email and password. Mobile changes must finish syncing; reload the website to retrieve changes made on another device. This is not continuous real-time browser synchronization.

The website now has a public home page, a searchable `/features` directory with 48 destinations, desktop navigation, and `/subscription` plan selection and review using the shared pricing catalogue.

| Mobile area | Web entry points |
| --- | --- |
| Capture, mailbox, files, search and reminders | `/capture`, `/intake`, `/files`, `/search`, `/reminders` |
| Ask, Guardian and proposed actions | `/ask`, `/guardian`, `/review-actions` |
| Kitchen calendar, meals, pantry, recipes and notes | `/room/kitchen`, `/kitchen/*` |
| Family, household profiles and schedules | `/family`, `/family/household`, `/family/schedules`, `/family/kids-schedules` |
| Health | `/bedroom` |
| Bills, insurance, contracts, correspondence and contacts | `/room/office`, `/office/*` |
| Vehicles, travel, property and pets | `/room/garage`, `/driveway/trips`, `/garden`, `/home-handover` |
| Memories, wills and wishes | `/room/attic`, `/wills` |
| Vault, emergency access and physical links | `/vault`, `/emergency/access`, `/physical-links` |
| Setup, Life Check, privacy, settings and subscriptions | `/onboarding`, `/life-check`, `/analytics-privacy`, `/settings`, `/subscription` |

This map describes existing browser implementations and navigation coverage, not an assertion that every operation has been exercised against a live account. Device keychain/biometric locking, the native encrypted offline cache, native share-sheet handling and store purchases remain platform-specific. Browser capture/upload follows browser capabilities and permissions.

## Account lifecycle

`AccountDataBoundary` replaces the data provider when the signed-in identity changes and hides stale server-rendered content while the session refreshes. Bootstrap responses must match that identity. Failed initial loading blocks edits rather than replacing saved data with an empty state. Queued saves remain bound to their original identity; the state API rejects an account-header mismatch before writing. Existing database ownership and household-sharing rules continue to determine access.

## Verification and remaining setup

- Production build and 551 automated tests passed, including delayed-write account mismatch tests.
- Read-only live sign-in succeeded locally on 11 September 2026. Dashboard hydration, feature filtering and Family subscription review were checked in the browser. Desktop and narrow layouts were visually checked.
- Live cross-device writes and a two-user isolation test were not performed on the user's account.
- Local `SUPABASE_SERVICE_ROLE_KEY` is configured in the ignored `.env.local` file. A read-only storage RPC and the signed-in subscription page both returned storage usage successfully. Production server configuration still needs separate verification; never expose this credential as a `NEXT_PUBLIC_*` value. Replace the supplied credential because it was shared in a conversation comment.
- Billing remains unavailable until store accounts and verified purchase handling are configured. Selecting a plan cannot charge or grant storage. See `paid-plans.md` for the pending storage migrations; they were not applied as part of this website work.
- These changes are local and have not been deployed to the public website.
