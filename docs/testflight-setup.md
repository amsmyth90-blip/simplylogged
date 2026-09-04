# DiaryDock TestFlight setup

This repo is prepared to build the packaged iOS application with Capacitor and submit it to TestFlight through Codemagic.

## What is already configured

- App name: `DiaryDock`
- Bundle ID: `com.diarydock.app`
- Capacitor app source: the locally packaged `apps/mobile/dist` bundle
- Codemagic workflow: `ios-testflight`
- Trigger: push a git tag matching `ios-*`, for example `ios-0.1.1`
- iOS app icons/splash source: `resources/icon.png` and `resources/splash.png`
- Camera/photo permission wording for document scanning
- iOS Share Extension: `com.diarydock.app.ShareExtension`
- Private share-handoff App Group: `group.com.diarydock.shared`

## Apple Developer setup

You need an active Apple Developer Program membership.

In Apple Developer / App Store Connect:

1. Create or confirm the app identifier:
   - Bundle ID: `com.diarydock.app`
   - Name: `DiaryDock`
   - Enable App Groups and attach `group.com.diarydock.shared`
2. Create or confirm the Share Extension identifier:
   - Bundle ID: `com.diarydock.app.ShareExtension`
   - Name: `DiaryDock Share Extension`
   - Enable the same `group.com.diarydock.shared` App Group
3. Create the app in App Store Connect:
   - Platform: iOS
   - Name: `DiaryDock`
   - Bundle ID: `com.diarydock.app`
   - SKU: `diarydock-ios`
4. Create an App Store Connect API key:
   - Access: App Manager or Admin
   - Download the `.p8` private key once
   - Note the Issuer ID and Key ID

## Codemagic setup

In Codemagic:

1. Connect the GitHub repository.
2. Create the `mobile_runtime` environment group with
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   The workflow refuses to package a missing configuration or a server credential.
3. Add the App Store Connect API key integration, or create an environment group named:
   - `appstore_credentials`
4. If using variables instead of the built-in integration, add:
   - `APP_STORE_CONNECT_ISSUER_ID`
   - `APP_STORE_CONNECT_KEY_IDENTIFIER`
   - `APP_STORE_CONNECT_PRIVATE_KEY`
5. Make sure Codemagic can create/fetch signing files for:
   - Bundle ID: `com.diarydock.app`
   - Type: iOS App Store
   - Embedded extension: `com.diarydock.app.ShareExtension`

The application and extension profiles must contain the same App Group entitlement. Signing should fail rather than package a mismatched or unprovisioned handoff container.

The workflow uses Codemagic's `app-store-connect fetch-signing-files`, `xcode-project use-profiles`, and `xcode-project build-ipa` commands.

## Create a TestFlight build

After your changes are committed and pushed:

```powershell
npm run release:testflight -- -Version 0.1.1 -Push
```

That creates and pushes a tag such as `ios-0.1.1`. Codemagic should then run the `DiaryDock iOS - TestFlight` workflow and submit the IPA to TestFlight.

## Before inviting testers

In App Store Connect, complete:

- App privacy nutrition labels
- Export compliance
- Age rating
- Beta app review contact info
- Demo login account for Apple review
- TestFlight beta notes

Use `docs/app-store-listing.md` as the starting point for listing copy and privacy answers, but review it before submission.

## Notes

- The `ios/` project is committed so native security settings, permissions and release behaviour are reviewed and versioned with the application.
- The IPA contains the mobile application bundle. It uses HTTPS APIs for authenticated online services and synchronisation, but it does not load `https://diarydock.com` as its executable application.
- If Codemagic fails at signing, the most likely issue is missing Apple Developer permissions or an App Store Connect API key without sufficient access.
