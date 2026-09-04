# Home Handover foundation

Status: implemented as a private draft plus explicit, time-limited, read-only recipient access. DiaryDock does not email or export a handover pack.

## Product boundary

Home Handover prepares a narrow property pack. Creating or selecting a draft item never grants another person access. Household membership, a shared address and ownership of a home do not select or transfer anything automatically. Sharing is a separate, recently authenticated action that requires an exact recipient email and explicit final confirmation.

Eligible first-pilot resources are owner-held appliances, boilers and equipment plus property/manual/warranty documents that are already linked to one of those items. The system structurally excludes private and unselected files, financial records and receipts, identity/legal/correspondence material, health/travel/pet/insurance data, emergency information and Vault content.

## Data model

- `assets.handover_eligible` and `documents.handover_eligible` record the owner's explicit transferable classification.
- `home_handover_packs` is an owner-only draft container.
- `home_handover_items` stores an owner-only, minimal preview derived by the database from the authoritative source record.
- `home_handover_publications` stores one immutable minimal snapshot for one normalized recipient email. It expires within 30 days and can be revoked by the owner.
- The browser cannot provide an owner ID, recipient, arbitrary preview snapshot or provenance.
- Each manifest entry records its source type, opaque source ID and selection time. Audit events record pack/item identifiers and never titles, notes or file content.

All tables deny direct client access. Mutations are available only through service-role RPCs that receive the already authenticated server-derived user ID, verify ownership and require the account's last sign-in to be within 15 minutes. The server route repeats authentication and recent-sign-in checks for clear user feedback. Recipients are matched only to a confirmed signed-in email through the private server boundary; it does not disclose whether an email already has a DiaryDock account.

## Selection rules

An asset must be owned by the caller and have category `APPLIANCE`, `BOILER` or `EQUIPMENT`. `OTHER` is rejected because it is too broad for safe transfer eligibility.

A document must be owned by the caller, linked from an eligible asset's `document_ids`, match a property/manual/warranty category and not match the sensitive-category deny-list. The database repeats this decision; hiding an item in the UI is not the security control.

The preview deliberately omits maintenance notes, serial numbers, file storage paths, source record IDs, extracted text, action items, prices and document contents. Publishing copies only each item's display label, safe property detail and opaque handover-item ID into an immutable snapshot. Editing the owner's draft does not silently alter an already shared copy; publishing again replaces and revokes the former copy.

Received handovers are online-only. They are intentionally excluded from the packaged app's encrypted offline cache so expiry and revocation remain meaningful. A recipient can still retain information they have already seen, photographed or manually copied; the interface describes revocation as ending future access rather than erasing prior knowledge.

A future printable/exportable pack must use the stored manifest, re-check every source and exclusion at export time, require recent authentication and explicit final confirmation, and record `DATA_EXPORT`. File download and email delivery are not part of the approved read-only sharing boundary.
