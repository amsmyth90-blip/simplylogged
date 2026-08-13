# DiaryDock Android app setup

This repo is prepared to build DiaryDock as an Android app with Capacitor and Codemagic.

## What is configured

- App name: `DiaryDock`
- Android package name: `com.diarydock.app`
- Capacitor app source: `https://diarydock.com`
- Codemagic workflow: `android-dev-apk`
- Trigger: push a git tag matching `android-dev-*`, for example `android-dev-0.1.1`
- Build output: downloadable debug APK

The debug APK is intended for private testing on your own Android phone. It is not a Google Play production release.

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

- The generated `android/` folder is intentionally not committed. Codemagic creates it during the build.
- The Android app loads `https://diarydock.com`, so deploy the web app before making a test APK.
- A debug APK is fine for your own testing, but if you later want family testers through Google Play, create a signed release build and use Google Play internal testing.
- Google Play release setup needs a Play Console account, a keystore, and app listing/privacy information.
