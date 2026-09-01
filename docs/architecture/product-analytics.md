# Privacy-conscious product analytics

Status: implemented as first-party, opt-in analytics. Product analytics is separate from security audit logging.

## Decisions

- Provider: DiaryDock's existing Supabase Postgres project; no advertising, cross-site analytics or additional analytics SDK.
- Consent: off by default. A signed-in user opts in or out from Settings → Product analytics.
- Region: the same configured Supabase project region as the rest of the account data. The geographic project region must be verified in the provider console before store/legal declarations are finalised.
- Retention: each product event expires after 90 days. Expired rows are pruned as events are recorded and can also be removed by scheduled maintenance later.
- Deletion: opting out immediately deletes all product events for that account; the foreign key also cascades account deletion.
- Subscription linkage: only the internal authenticated user ID and the fixed `FREE`, `PLUS` or `FAMILY` tier are accepted. No payment-provider ID, email or transaction detail is an analytics property.

## Enforcement

`lib/product-analytics.ts` is the typed event catalogue. Each event has an exact property allow-list and fixed enum values; most events accept no properties. `POST /api/product-analytics` authenticates, limits request size, rate-limits and repeats validation. The `record_product_analytics_event` database function checks consent, repeats the event/property allow-list, rejects nested values and derives its own deduplication key.

The browser cannot supply a user ID, retention time or deduplication key. Direct table inserts/updates are revoked. Owner read access exists for transparency, while writes use authenticated security-definer functions deriving `auth.uid()`.

The event catalogue covers signup, onboarding, first home/vehicle/pet/document/scan/reminder/Guardian/household/Physical Link/Ask actions, Organisation Score views, Vault setup, return use and subscription start. `vault_setup_completed` is defined for a future reviewed native E2EE implementation but is not emitted by the current non-E2EE Vault.

## Data minimisation

Never include questions or AI answers; document titles, content, filenames, extracted text or notes; names, contact details or addresses; policy/account/registration/serial numbers; Vault keys/recovery material; or security audit contents. Score views use one of four broad bands, not Life Check answers. Analytics failures never block the user's primary task.

