# Paid plans

| Plan | Monthly price (GBP) | Document storage |
| --- | --- | --- |
| Starter | £5.99 | 5 GB |
| Plus | £9.99 | 25 GB |
| Family | £15.99 | 100 GB |

The catalogue is in `lib/pricing.ts`. Storage uses 1024³ bytes per displayed GB,
consistent with the existing storage meter. Allowances are per account; Family
does not currently pool storage across household members.

The public `/pricing` page is linked from login, signup and settings. Purchases
are marked coming soon because no billing provider is connected.

The native mobile app also includes Settings → Plans & storage, with selectable
plans, a review screen, current storage usage, and terms/privacy links. Restore
and manage actions explain their upcoming availability; purchasing is disabled.
Selection stays on the device screen and never grants an entitlement. Both web
and mobile read the same catalogue. Before launch, native prices must come from
the store's localized product data rather than the GBP preview catalogue.

## Billing rollout still required

Apply the two 20260911 paid-plan migrations alongside the billing rollout, after
reviewing existing account grants. They have not been applied to a remote database
by this change. The storage migration removes the 250 MB default: accounts with
no plan get zero upload capacity. Existing free grants become `none`, Plus becomes
25 GB, and premium becomes Family at 100 GB. Stored documents are never deleted.

After verifying payment with a billing provider on the server, use the service-role
RPC `set_user_storage_plan(user_id, tier)` with `starter`, `plus` or `family`.
Use `none` when the paid entitlement ends. Never grant a plan based on a client
request, signup metadata or a checkout redirect alone. Payment verification,
webhook idempotency/order handling, renewal, cancellation and native store billing
remain to be implemented. Account creation alone does not activate a subscription.

The existing upload reservation function enforces stored bytes plus outstanding
reservations under the same per-user lock used by plan changes. Downgrades retain
documents and block further uploads while over quota. The 4 MB single-file upload
limit is separate from the total plan allowance.
