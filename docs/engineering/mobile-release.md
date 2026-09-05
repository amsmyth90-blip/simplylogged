# Mobile release operations

DiaryDock produces independently packaged iOS and Android applications. Release builds contain the local mobile bundle; they do not load the website into a remote WebView.

## Required Codemagic configuration

Secrets and signing material must be configured in Codemagic and must never be committed to the repository.

Create the protected `mobile_runtime` environment group used by every workflow. It must provide `NEXT_PUBLIC_SUPABASE_URL`, one Supabase publishable/anonymous client key, and `VITE_API_ORIGIN=https://diarydock.com`. The production build validates that the Supabase credential is public, both origins use HTTPS and the API host is allowlisted. Never place a service-role or secret-format Supabase key in this group.

Add `diarydock://auth/confirm` and `diarydock://auth/reset` to the Supabase Authentication redirect allowlist. Native account email links use these exact callbacks so the installed app can exchange each single-use PKCE code and continue into native onboarding or password reset.

### Android

1. Upload the long-lived Google Play upload keystore under the Codemagic signing reference `diarydock_upload`.
2. Keep a separate, access-controlled backup of that keystore and its recovery information.
3. Create the `google_play_credentials` environment group.
4. Add `GOOGLE_PLAY_SERVICE_ACCOUNT_CREDENTIALS` as a secret containing the least-privilege Play service-account JSON.
5. Give that service account release access only to the DiaryDock application.

The first signed `.aab` must be downloaded from Codemagic and uploaded manually when the Play Console application is created. Later `android-release-*` tags publish draft releases to the internal-testing track.

Create a release tag with:

```powershell
npm run release:android -- -Version 0.1.1 -Push
```

The pipeline runs the repository checks, Android unit tests, release lint, resource shrinking, minification, signing, and App Bundle generation before publishing.

### iOS

1. Configure the Codemagic `appstore_credentials` environment group.
2. Add the App Store Connect private key, key identifier, and issuer identifier expected by `codemagic.yaml`.
3. Register `com.diarydock.app` and `com.diarydock.app.ShareExtension` in the Apple Developer portal.
4. Enable the `group.com.diarydock.shared` App Group on both identifiers.
5. Upload App Store provisioning profiles for both identifiers to Codemagic. The `ios_signing` bundle-prefix configuration fetches both matching profiles and `xcode-project use-profiles` applies them to their respective targets.

Create a TestFlight release tag with:

```powershell
npm run release:testflight -- -Version 0.1.1 -Push
```

The pipeline runs the complete repository checks, synchronises the native iOS project on macOS, signs both the application and Share Extension, creates the IPA, and uploads it to TestFlight without submitting it to the App Store.

## Release evidence

Retain the Codemagic build URL, source commit, dependency lockfile, unit-test reports, lint report, mapping file or dSYM, and store build number for every release. A release is not considered verified until its installation and core offline/synchronisation, conflict recovery, file-integrity and sign-out-purge smoke tests pass on a physical phone and tablet. Record the device/OS versions and test account used, but never retain the password or access token.
