# DiaryDock Vault recovery model

Status: design gate; recovery keys and encrypted Vault recovery are not implemented.

## Recovery promise

For a true E2EE Vault, DiaryDock support and the server must not hold sufficient material to decrypt content. Recovery is possible only through:

1. an already enrolled device that can unwrap the Vault Master Key (VMK); or
2. the user's offline, high-entropy recovery key (or an explicitly approved recovery envelope protected by it).

If all enrolled devices and the recovery key are lost, encrypted Vault content is permanently unrecoverable. This must be shown before setup and repeated during recovery-material checks. Account recovery through email/password reset restores the DiaryDock account, not the Vault key.

## Recovery material

- Generate 256 random bits on the trusted client.
- Encode with checksum and version, supporting printable text and QR. The QR contains key material and must never be uploaded for analytics/support.
- Show once; require the user to confirm randomly selected groups before setup completes.
- Encourage two offline copies in separate safe locations. Do not encourage screenshots or cloud notes by default.
- Server stores a versioned verifier and a recovery-key-wrapped VMK, never the recovery key.
- Any optional memorable passphrase uses a reviewed memory-hard KDF with stored salt and versioned parameters. It is a convenience wrapper, not a replacement for high-entropy recovery material.

## Recovery flows

### Existing device approves a new device

1. User authenticates the DiaryDock account on both devices.
2. Existing device displays and verifies the new device public-key fingerprint/short code.
3. Require local device authentication and explicit approval.
4. Existing device wraps VMK to the new device key.
5. Server stores the envelope and a redacted enrolment audit event.

The server cannot fabricate approval because it cannot create the VMK envelope without an existing device key.

### Offline recovery key

1. User signs in and selects Vault recovery.
2. Client retrieves the recovery envelope and KDF/version metadata.
3. Recovery material is entered/scanned locally and checksum-validated.
4. Client unwraps VMK, proves success by decrypting/verifying the Vault manifest, then enrols a new device key.
5. Offer immediate recovery-key rotation and device review.

Do not send entered recovery material to support, server logs, crash reports or analytics. Rate limiting protects service abuse but does not replace offline-guessing resistance.

## Password and identity changes

- Supabase password reset/change does not re-encrypt Vault objects and must not invalidate device/recovery envelopes.
- Email change requires normal account verification plus recent authentication; it does not become a recovery factor automatically.
- Account takeover risk remains: an attacker with the account but without VMK must not be able to enrol a decrypting device. They may attempt deletion/denial of service, so destructive key-envelope changes require recent authentication, notifications and a cooling-off/recovery policy decided before implementation.

## Lost or stolen device

- User can revoke the device's future envelopes from another enrolled/recovered device.
- Rotation creates a new VMK version and rewraps active object DEKs for remaining devices when the threat warrants it.
- Revocation cannot erase plaintext or keys already extracted from the lost device. OS secure storage, local authentication, background lock and encrypted caches reduce this risk.
- The device list exposes platform/name, enrolment, last successful key use and revocation, but not secrets.

## Recovery-key rotation

1. Unlock with an enrolled device or existing recovery key.
2. Generate a new recovery key locally.
3. Create and upload a new recovery-wrapped VMK envelope.
4. Verify it locally before revoking the old envelope.
5. Require confirmation that new material was stored; provide a short, explicit overlap window only if approved.
6. Record redacted `VAULT_SECURITY_CHANGED` and notify all enrolled devices.

Rotation of a wrapper does not require re-encrypting every file. VMK compromise or cipher-suite migration may require VMK/DEK rotation and new object versions.

## Trusted contacts and inheritance

Current trusted emergency access is not a Vault recovery mechanism and must never inherit Vault access. A future trusted-recovery scheme would require separate recipient public keys, explicit per-user approval, delay/cancellation semantics, legal/product review and a clear explanation that the selected contact gains decryption authority. No inactivity, post-death or automatic release is approved.

## Backup, deletion and crypto-erasure

- Server backups may retain ciphertext and wrapped keys for their normal retention period; this is acceptable only if no surviving server-held material can decrypt them.
- Account/object deletion removes active ciphertext, manifests and envelopes and schedules backup expiry. Deleting the last VMK/recovery envelope produces crypto-erasure but should not substitute for storage deletion.
- Local ciphertext caches and device envelopes are removed on account deletion/sign-out where possible. Plaintext exports are outside DiaryDock control and must be disclosed.
- Deletion operations must not remove the final usable recovery path accidentally; destructive recovery changes require preview, recent authentication and confirmation.

## Required recovery tests

- new device approved by existing device;
- new device restored from printed recovery material;
- wrong/checksum-invalid recovery input fails without side effects;
- password and email changes leave Vault recovery intact;
- lost-device revocation and post-revocation envelope denial;
- recovery-key rotation with old key rejected after completion;
- interrupted rotation retains at least one verified path;
- all devices plus recovery key lost produces a clear, irreversible failure—never a server backdoor;
- logs, analytics, URLs, crash reports and support exports contain no key/recovery plaintext;
- browser/native/logout/offline-cache cleanup matches the platform-specific architecture.

## User-facing wording gate

Before E2EE setup exists, say “E2EE is not enabled.” After it exists, setup must say: “Only your enrolled devices and recovery key can open these encrypted Vault items. DiaryDock cannot recover them if both are lost.” Do not promise biometric encryption, guaranteed device deletion, universal web access or recoverability that the implementation cannot prove.
