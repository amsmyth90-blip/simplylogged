# Trusted emergency access

Trusted emergency access is separate from household membership and normal document sharing. It gives a named person a read-only view of only the individual emergency resources the owner selected.

## Invitation and identity

An owner creates a trusted contact with a name, email and relationship after a recent sign-in. DiaryDock creates an opaque public identifier and a one-time random secret; only its SHA-256 verifier is stored. The invitation expires after 14 days and can only be accepted by a signed-in account whose authenticated email exactly matches the invited email. The secret is removed after acceptance.

The owner copies the one-time invitation link and chooses how to deliver it. DiaryDock does not silently contact the person.

## Explicit grants

Nothing is shared by adding a trusted contact. The owner grants items one at a time from four narrow types:

- documents already marked for emergency use;
- household emergency instructions;
- emergency contacts;
- selected home information such as a stopcock location.

The database derives a minimal snapshot from the owner's authoritative record. The browser cannot submit arbitrary snapshot content, owner IDs or recipient IDs. A trusted contact sees only active grants attached to their accepted identity. Revoking either one grant or the entire contact takes effect immediately.

Document metadata and file access are separate. The recipient gets a short grant snapshot. Opening a selected document rechecks the grant, creates a short-lived internal storage URL and streams the file through a private/no-store server response, so the reusable storage URL is not exposed to the recipient. Storage policy checks the active contact, active grant, selected document and `emergency_visible` flag before authorising the object.

## Audit and notifications

Invitation acceptance, grant, grant revocation and contact revocation create redacted audit events containing identifiers and resource type, not emergency plaintext. In-app notification rows make configuration changes visible to participants without exposing the underlying content in the notification.

Sensitive owner changes require a sign-in within the previous 15 minutes. Calls are server-authenticated, tables are RLS-protected and direct client mutations are revoked.

## Deliberate exclusions

Trusted access does not grant household membership, full-account access, edit rights or action execution. It excludes true Vault resources and does not implement delayed, inactivity-based, post-death or automatic legacy release. Those require a separate approved recovery and legal model.
