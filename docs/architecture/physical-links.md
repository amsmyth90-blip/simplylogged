# Physical Links and smart items

Physical Links connect a printed QR code or writable NFC tag to an appliance, boiler or equipment record. A tag never contains a raw asset, user, household or document identifier.

## Payload and verifier

The public payload is `https://diarydock.com/p/{publicId}/{secret}`. `publicId` is 144 random bits and `secret` is 256 random bits, both encoded with URL-safe Base64. The database stores only the SHA-256 verifier for the secret. The full payload is returned exactly once when a tag is created or replaced; after that DiaryDock cannot redisplay it.

QR images are generated locally in the signed-in browser. The link is not sent to a third-party QR service. Where the browser exposes standards-based Web NFC writing, the same HTTPS URL can be written as an NDEF URL record. Copy and QR download remain available on other devices.

## Resolution and non-disclosure

The resolver requires an authenticated DiaryDock session, validates bounded token syntax, hashes the presented secret, and calls the database resolver. Resolution succeeds only when all of these are true:

- lookup and verifier match;
- the link is `ACTIVE` and not expired;
- the linked asset still exists;
- `can_access_shared_resource(..., 'VIEW')` grants the signed-in user access.

Unknown, malformed, expired, disabled, revoked, replaced and unauthorized links all lead to the same unavailable screen with no asset metadata. Signed-out users are asked to sign in and scan again, so the secret is not copied into a login return query.

## Lifecycle

Owners can create/activate, rename, reassign, disable/re-enable, permanently revoke or replace a tag. Replacement atomically creates a fresh secret and marks the old tag `REPLACED`. Direct writes to `physical_links` are revoked from the authenticated role; security-definer functions derive the caller from `auth.uid()` and verify ownership. Successful opens update last-used metadata and append an audit event without recording the raw secret.

## Smart item record

The initial progressive asset record stores name, kind, location, maker/model, a deliberately masked serial suffix, warranty and service dates, document IDs, service history, maintenance notes and explicit visibility. Asset RLS uses the same owner/household resource authorization model as other shareable resources. The initial UI starts with a short form and reveals the fuller record only after creation.
