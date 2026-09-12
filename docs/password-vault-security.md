# Password Vault security design

## Security property

DiaryDock encrypts every credential in the client before it is sent to the API. The API and database receive an opaque authenticated ciphertext, a random nonce, a random item identifier, revision numbers, and timestamps. They do not receive the vault passphrase, derived key, master key, account name, username, password, website, or notes.

The web application provides end-to-end encryption against database disclosure, backups, and ordinary server-side data access. It still relies on the JavaScript delivered by `diarydock.com`; a malicious or compromised web deployment could alter that JavaScript and capture unlocked data. The signed mobile application has a stronger client boundary because its encryption code is shipped in the installed app.

## Cryptography

- A new vault creates a random 256-bit master key.
- The separate user vault passphrase derives a 256-bit wrapping key with Argon2id, a random 128-bit salt, 19 MiB of memory, two iterations, and one lane.
- AES-256-GCM wraps the master key and encrypts each credential with a fresh random 96-bit nonce.
- Authenticated additional data binds the wrapped key to the DiaryDock user ID and binds each entry to both the user ID and random entry ID. Moving ciphertext between accounts or records makes authentication fail.
- Imported AES keys are non-extractable. Temporary byte arrays that contain key material or plaintext are overwritten on a best-effort basis after use.

## Trust boundary and access control

Both API clients authenticate with the existing DiaryDock session. The server derives the user ID from the verified session or bearer token and never accepts a user ID in a vault request. All browser mutations require same-origin requests and an assertion of the account that opened the page. Reads and writes are rate limited and responses are marked private and `no-store`.

The two database tables have row-level security enabled and forced. `anon` and `authenticated` receive no direct table privileges. Only the server service role can access them, after the API has attached the verified user ID to every query. Optimistic revisions reject conflicting edits from another device. A serialized database trigger limits each vault to 500 entries.

## Device behaviour

The passphrase and unlocked master key are never written to browser storage, mobile storage, logs, URLs, or server requests. The in-memory vault locks after five minutes without interaction. Both clients also lock when the page is hidden; the mobile app locks on its native background event as well. In-flight work cannot reopen a locked vault, and locking unmounts editors and removes their drafts. Passwords are hidden by default. Clipboard contents are cleared after 30 seconds when the platform permits a safe read-before-clear check.

## Recovery and limitations

DiaryDock cannot recover a forgotten vault passphrase. A normal DiaryDock password reset does not unlock the Password Vault. Users should retain the vault passphrase in a safe place. Device compromise, browser extensions with page access, screenshots, clipboard managers, keyloggers, and a compromised client build can expose data while the vault is unlocked.
