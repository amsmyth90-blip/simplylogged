# Home Handover foundation

Status: implemented as a private selection and preview foundation. DiaryDock does not yet send, publish or export a handover pack.

## Product boundary

Home Handover prepares a narrow future property pack. Creating or selecting a draft item never grants another person access. Household membership, a shared address and ownership of a home do not select or transfer anything automatically.

Eligible first-pilot resources are owner-held appliances, boilers and equipment plus property/manual/warranty documents that are already linked to one of those items. The system structurally excludes private and unselected files, financial records and receipts, identity/legal/correspondence material, health/travel/pet/insurance data, emergency information and Vault content.

## Data model

- `assets.handover_eligible` and `documents.handover_eligible` record the owner's explicit transferable classification.
- `home_handover_packs` is an owner-only draft container.
- `home_handover_items` stores an owner-only, minimal preview derived by the database from the authoritative source record.
- The browser cannot provide an owner ID, recipient, arbitrary preview snapshot or provenance.
- Each manifest entry records its source type, opaque source ID and selection time. Audit events record pack/item identifiers and never titles, notes or file content.

All tables have owner-only RLS. Mutations are available only through security-definer RPCs that derive `auth.uid()`, verify ownership and require the account's last sign-in to be within 15 minutes. The server route repeats authentication and recent-sign-in checks for clear user feedback.

## Selection rules

An asset must be owned by the caller and have category `APPLIANCE`, `BOILER` or `EQUIPMENT`. `OTHER` is rejected because it is too broad for safe transfer eligibility.

A document must be owned by the caller, linked from an eligible asset's `document_ids`, match a property/manual/warranty category and not match the sensitive-category deny-list. The database repeats this decision; hiding an item in the UI is not the security control.

The preview deliberately omits maintenance notes, serial numbers, file storage paths, extracted text, action items, prices and document contents. A future printable/exportable pack must use the stored manifest, re-check every source and exclusion at export time, require recent authentication and explicit final confirmation, and record `DATA_EXPORT`. No recipient delivery is approved in this foundation.

