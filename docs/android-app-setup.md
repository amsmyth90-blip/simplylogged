# DiaryDock Android app setup

This repo is prepared to build DiaryDock as an Android app with Capacitor and Codemagic.

## What is configured

- App name: `DiaryDock`
- Android package name: `com.diarydock.app`
- Capacitor app source: the locally packaged `apps/mobile/dist` bundle
- Codemagic workflow: `android-dev-apk`
- Trigger: push a git tag matching `android-dev-*`, for example `android-dev-0.1.1`
- Build output: downloadable debug APK
- Android Share target for bounded PDF/image handoff into the packaged review screen

The debug APK is intended for private testing on your own Android phone. It is not a Google Play production release.

Before running any Codemagic mobile workflow, create the protected `mobile_runtime`
environment group with `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. These values are public application
configuration, but the build validates that the key is publishable rather than a
server credential. `VITE_API_ORIGIN` may be set only to the approved DiaryDock HTTPS origin.

## Create an Android test build

After changes are committed and pushed:

```powershell
npm run release:android -- -Version 0.1.1 -Push
```

Codemagic should then run the `DiaryDock Android - Developer APK` workflow and produce an APK artifact.

## Install it on an Android phone

1. Open the completed Codemagic build.
2. Download the APK artifact to your phone.
3. If Android asks, allow installs from the browser or file manager.
4. Open the APK and install DiaryDock.

## Important notes

- The `android/` project is committed so native security settings, plugins and release behaviour are reviewed and versioned with the application.
- The APK contains the mobile application bundle. It uses HTTPS APIs for authenticated online services and synchronisation, but it does not load `https://diarydock.com` as its executable application.
- Shared PDFs and images are copied only into DiaryDock's private cache, limited to 12 items and 4 MB combined, checked again by byte signature, and removed after entering the encrypted review queue.
- A debug APK is fine for your own testing, but if you later want family testers through Google Play, create a signed release build and use Google Play internal testing.
- Google Play release setup needs a Play Console account, a keystore, and app listing/privacy information.
- Google Play also needs public URLs for privacy and account deletion:
  - `https://diarydock.com/privacy`
  - `https://diarydock.com/account-deletion`
