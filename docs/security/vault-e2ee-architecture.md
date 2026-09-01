# DiaryDock Vault E2EE architecture

Status: proposed architecture and implementation gate. This document does not mean E2EE has been implemented.

## Decision

DiaryDock will not retrofit encryption into the existing `documents` rows or relabel the current All Files screen. Existing files are RLS-protected, server-managed plaintext and may be explicitly shared using the ordinary document permission system. Because `/vault` currently aliases `/files`, it is not a distinct resource class. A future E2EE Vault must use a separate, versioned encrypted-object schema and an independently reviewed client path.

The current Capacitor apps load `https://diarydock.com` at runtime (`capacitor.config.ts:7-13`). Because that origin can change the JavaScript which handles keys, it can protect against a database/storage-only attacker but not a malicious DiaryDock server. The release gate for the strong claim “DiaryDock's server cannot decrypt” is a signed native build containing the cryptographic implementation plus platform secure-key storage. The web app may be read-only/unavailable for strong-mode Vault content unless an approved WebAuthn-based boundary meets the same threat model.

## Target object and key hierarchy

No custom primitive will be invented. The selected implementation must use a maintained, reviewed AEAD and KDF library/platform API after a separate library review.

```text
random recovery key ──wraps──┐
device secure key ───wraps───┼── Vault Master Key (VMK)
optional passphrase KEK ─────┘
                              └──wraps── per-object Data Encryption Key (DEK)
                                               └──AEAD-encrypts manifest, metadata and file chunks
```

- VMK: 256 random bits generated on a trusted client; never uploaded unwrapped.
- Device key: non-exportable where the OS supports it; used to unwrap a device-specific VMK envelope after local authentication.
- Recovery key: 256 random bits shown once in a printable/QR and human-enterable encoded form; stored offline by the user. The server stores only a verifier and recovery-wrapped VMK.
- DEK: random per object/version. This limits rotation and sharing blast radius.
- Passphrase: optional recovery convenience only, processed with an approved memory-hard KDF (for example Argon2id with versioned parameters); never the Supabase password.

## Cryptographic container

The pilot must define one stable specification before code:

- cipher suite and library version;
- 256-bit random DEK;
- authenticated, versioned manifest containing object ID, owner binding, MIME type, chunk count, chunk hashes and prior-version digest;
- fixed maximum chunk size and deterministic chunk indexes;
- a unique nonce per key/chunk, generated or derived only by the reviewed construction;
- associated data binding ciphertext to owner, object ID, version, chunk index and cipher-suite version;
- encrypted title, original filename, tags, notes, OCR and relationship metadata;
- clear server metadata limited to opaque object ID, owner ID, cipher-suite version, ciphertext size, state and timestamps;
- a digest or signature/checkpoint that lets clients detect swapped, truncated or rolled-back manifests.

AES-GCM through Web Crypto and XChaCha20-Poly1305 through a reviewed library are candidates, not interchangeable implementation details. The library review must choose one construction and publish test vectors. Home-grown chunk nonce/counter logic is prohibited.

## Proposed server schema

The pilot should add new tables rather than mutate `documents`:

- `vault_encrypted_objects`: opaque ID, owner, cipher suite, current version, ciphertext manifest, state, sizes and timestamps.
- `vault_object_versions`: immutable ciphertext manifest/version rows and previous-version digest.
- `vault_object_chunks`: version, chunk index, ciphertext, nonce/tag representation or opaque storage path, and hash.
- `vault_key_envelopes`: object/VMK envelope, recipient device/public key, algorithm version and revocation time.
- `vault_devices`: user, public key/credential, platform, enrolled/revoked timestamps and last successful use; never a raw private key.
- `vault_recovery_envelopes`: versioned KDF/wrapper metadata and encrypted VMK.
- redacted `audit_events`: setup, device enrolment/revocation, recovery use, export, rotation and deletion—never plaintext, keys, filenames or titles.

All tables are owner-deny-by-default under RLS. Service-role/background jobs may move or delete ciphertext but must not receive decryption keys. Generic `shared_resources`, trusted emergency grants, search, Guardian, reminders and Physical Links must reject the encrypted Vault resource type until their E2EE-specific designs are approved.

The existing `documents`/`VaultDocument` label cannot be used as the security discriminator. Encrypted objects must have their own table, API and client capability, and ordinary document-sharing controls must not accept that resource type.

## Client flows

### Setup

1. Require recent account authentication.
2. Generate VMK and recovery key on trusted client.
3. Create device key in platform secure storage; wrap VMK for device and recovery.
4. Show recovery material once, require confirmation of randomly selected segments and warn that DiaryDock cannot recover it.
5. Upload only public device material, wrapped VMK envelopes and verifier.
6. Record `VAULT_SECURITY_CHANGED` without key material.

### Encrypt and upload

1. Validate file locally before decryptable processing.
2. Generate DEK and encrypted manifest/chunks in the trusted client.
3. Upload ciphertext to a distinct private bucket and insert version rows atomically where possible.
4. Download and decrypt a sample/manifest locally, then mark the version complete.
5. Do not create plaintext OCR, title or filename rows. Local search may build an encrypted index unlocked with the Vault.

### Open

1. Reauthenticate/unlock device key according to platform policy.
2. Fetch ciphertext and current envelopes through normal RLS.
3. Verify manifest version, associated data and all authentication tags before rendering.
4. Keep plaintext in memory or a protected temporary file for the shortest practical period; prevent OS previews/backups where supported.
5. Clear memory references, blob URLs and temporary files on lock, backgrounding and logout.

### Multi-device enrolment

- Preferred: an existing enrolled device approves the new device's public key and creates a new VMK envelope after showing both devices a short authentication string/QR.
- Recovery: the user enters/scans offline recovery material on the new device and creates a new device envelope.
- The server may broker public keys and envelopes but cannot approve itself or unwrap VMK.
- Enrolment and revocation require recent account authentication and generate redacted notifications/audit.

### Sharing

E2EE sharing is not part of the first pilot. A future design must wrap a selected object's DEK to a recipient public key, not expose VMK or inherit generic household/emergency access. Revocation prevents future envelopes/versions; it cannot make a recipient forget plaintext already viewed.

### AI, OCR, previews and reminders

- Server OCR, Ask, Guardian and capture extraction cannot read E2EE content.
- The default is disabled for encrypted objects.
- A future client-side AI flow may explicitly decrypt one selected object and disclose exactly what plaintext goes to the provider. That content is no longer end-to-end confidential from that provider for the operation.
- Due dates/reminders must either remain encrypted and be evaluated while an enrolled client is unlocked, or be separately disclosed as clear metadata with informed consent. No silent disclosure.

## Browser, mobile and offline differences

| Capability | Browser | Signed native/Capacitor target |
|---|---|---|
| Code trust against malicious server | Cannot be guaranteed when crypto JS is served by that server | Independently signed bundled crypto code can provide this boundary |
| Key storage | Web Crypto non-exportable keys/IndexedDB are origin and browser dependent; XSS remains in boundary | iOS Keychain/Secure Enclave and Android Keystore where supported |
| Local authentication | WebAuthn/PRF support and recovery portability need proof | Platform biometric/passcode gates can protect key use, with passcode fallback |
| Offline cache | Ciphertext only; eviction unpredictable | Ciphertext files plus protected key envelopes; exclude plaintext from backups |
| Background/lock | Browser lifecycle is weak and inconsistent | Native lifecycle can lock and clear previews on background |

Biometrics authenticate local key use; they are not encryption keys and must not be described as such.

## Migration plan and gates

1. Approve this architecture, threat model and recovery model.
2. Choose/review the crypto library and native secure-storage APIs; record versions and supply-chain controls.
3. Implement an isolated pilot with synthetic data only, versioned format and published known-answer/tamper/recovery tests.
4. Prove: two-device decrypt, offline recovery, password change, lost-device revocation, corrupted chunk rejection, rollback detection, logout cleanup and deletion.
5. Conduct an independent cryptographic/security review.
6. Offer copy migration: client downloads one plaintext file, encrypts locally, uploads and verifies. Keep original until explicit verification and user confirmation.
7. Delete original object/metadata and record residual backup limitations. Never silently downgrade to plaintext if decryption fails.
8. Enable truthful claims only for successfully migrated encrypted objects and supported clients.

Until every gate passes, the technically accurate claim is: “DiaryDock stores files privately with authenticated access and short-lived links. Vault documents are not currently end-to-end encrypted.”
