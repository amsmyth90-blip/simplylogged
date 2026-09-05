import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { assertMobileBuildEnvironment } from "../apps/mobile/vite.config.ts";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the mobile application packages local assets instead of a remote website", async () => {
  const config = await read("capacitor.config.ts");
  assert.match(config, /webDir:\s*"apps\/mobile\/dist"/);
  assert.doesNotMatch(config, /server:\s*\{[^}]*url:/s);
});

test("the mobile entry document applies a restrictive content security policy", async () => {
  const document = await read("apps/mobile/index.html");
  assert.match(document, /default-src 'self'/);
  assert.match(document, /script-src 'self'/);
  assert.match(document, /object-src 'none'/);
  assert.doesNotMatch(document, /unsafe-inline|unsafe-eval/);
});

test("release workflows build the packaged application before Capacitor sync", async () => {
  const [packageSource, codemagic] = await Promise.all([
    read("package.json"),
    read("codemagic.yaml"),
  ]);
  assert.match(packageSource, /mobile:build/);
  assert.match(codemagic, /npm run mobile:build[\s\S]*npx cap sync android/);
  assert.match(codemagic, /android-play-internal:[\s\S]*android_signing:[\s\S]*diarydock_upload/);
  assert.match(codemagic, /testDebugUnitTest lintRelease bundleRelease/);
  assert.match(codemagic, /google_play:[\s\S]*track:\s*internal/);
  assert.match(codemagic, /ios-testflight:[\s\S]*npm run mobile:build[\s\S]*npx cap sync ios/);
  assert.match(codemagic, /distribution_type:\s*app_store/);
  assert.match(codemagic, /submit_to_testflight:\s*true/);
  assert.equal((codemagic.match(/- mobile_runtime/g) ?? []).length, 3);
});

test("production mobile builds require an HTTPS backend and public client key", () => {
  const valid = { NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: `sb_publishable_${"a".repeat(32)}` };
  assert.doesNotThrow(() => assertMobileBuildEnvironment(valid));
  assert.throws(() => assertMobileBuildEnvironment({}), /requires the Supabase/i);
  assert.throws(() => assertMobileBuildEnvironment({ ...valid,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: `sb_secret_${"a".repeat(40)}` }), /server credential/i);
  assert.throws(() => assertMobileBuildEnvironment({ ...valid,
    NEXT_PUBLIC_SUPABASE_URL: "http://example.supabase.co" }), /HTTPS/i);
});

test("the Android release shell blocks cleartext traffic and removes debug code", async () => {
  const [manifest, networkPolicy, buildConfig, filePaths, activity] = await Promise.all([
    read("android/app/src/main/AndroidManifest.xml"),
    read("android/app/src/main/res/xml/network_security_config.xml"),
    read("android/app/build.gradle"),
    read("android/app/src/main/res/xml/file_paths.xml"),
    read("android/app/src/main/java/com/diarydock/app/MainActivity.java"),
  ]);

  assert.match(manifest, /android:allowBackup="false"/);
  assert.match(manifest, /android:usesCleartextTraffic="false"/);
  assert.match(networkPolicy, /cleartextTrafficPermitted="false"/);
  assert.match(buildConfig, /release\s*\{[\s\S]*minifyEnabled true/);
  assert.match(buildConfig, /release\s*\{[\s\S]*shrinkResources true/);
  assert.match(buildConfig, /CM_KEYSTORE_PATH/);
  assert.match(buildConfig, /signingConfig signingConfigs\.release/);
  assert.doesNotMatch(filePaths, /external-path|path="\."/);
  assert.match(activity, /WindowManager\.LayoutParams\.FLAG_SECURE/);
});

test("the iPhone and iPad shell protects app-switcher snapshots", async () => {
  const [config, project, delegate, shield, privacy] = await Promise.all([
    read("capacitor.config.ts"),
    read("ios/App/App.xcodeproj/project.pbxproj"),
    read("ios/App/App/AppDelegate.swift"),
    read("ios/App/App/PrivacyShield.swift"),
    read("ios/App/App/PrivacyInfo.xcprivacy"),
  ]);
  assert.match(config, /loggingBehavior:\s*"none"/);
  assert.match(config, /ios:[\s\S]*webContentsDebuggingEnabled:\s*false/);
  assert.match(project, /TARGETED_DEVICE_FAMILY = "1,2"/);
  assert.match(project, /PrivacyShield\.swift in Sources/);
  assert.match(project, /PrivacyInfo\.xcprivacy in Resources/);
  assert.match(delegate, /PrivacyShield\.show\(in: window\)/);
  assert.match(shield, /window\.addSubview\(shield\)/);
  assert.match(privacy, /<key>NSPrivacyTracking<\/key>[\s\S]*<false\/>/);
});

test("native capture declares permissions, restoration, and encrypted offline queuing", async () => {
  const [plist, manifest, capture, restored, schema] = await Promise.all([
    read("ios/App/App/Info.plist"),
    read("android/app/src/main/AndroidManifest.xml"),
    read("apps/mobile/src/capture/capture-source.ts"),
    read("apps/mobile/src/capture/use-restored-capture.ts"),
    read("apps/mobile/src/data/offline/schema.ts"),
  ]);
  assert.match(plist, /NSCameraUsageDescription/);
  assert.match(plist, /NSPhotoLibraryUsageDescription/);
  assert.match(manifest, /photopicker_activity:0:required/);
  assert.doesNotMatch(manifest, /READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE/);
  assert.match(capture, /saveToGallery:\s*false/);
  assert.match(capture, /Camera\.takePhoto/);
  assert.match(capture, /Camera\.chooseFromGallery/);
  assert.match(restored, /appRestoredResult/);
  assert.match(schema, /pending_document_uploads/);
  assert.match(schema, /pending_document_upload_chunks/);
});

test("mobile authentication persists tokens only in native secure storage", async () => {
  const [storage, session, registry, mobilePackage, rootPackage] = await Promise.all([
    read("apps/mobile/src/auth/secure-auth-storage.ts"),
    read("apps/mobile/src/auth/use-mobile-session.ts"),
    read("apps/mobile/src/auth/native-offline-account-registry.ts"),
    read("apps/mobile/package.json"),
    read("package.json"),
  ]);
  assert.match(storage, /setSynchronize\(false\)/);
  assert.match(storage, /whenUnlockedThisDeviceOnly/);
  assert.doesNotMatch(storage, /localStorage|sessionStorage/);
  assert.match(mobilePackage, /@aparajita\/capacitor-secure-storage/);
  assert.match(rootPackage, /@aparajita\/capacitor-secure-storage/);
  assert.match(session, /purgeOnSignOutRef\.current[\s\S]*storeRef\.current\?\.clear\(\)/);
  assert.match(session, /recoverPendingPurge/);
  assert.match(session, /requestPurge/);
  assert.match(session, /import\("\.\/native-offline-account-registry"\)/);
  assert.doesNotMatch(session, /^import .*native-offline-account-registry/m);
  assert.match(registry, /offline-account-state/);
});

test("mobile account creation and password recovery are native", async () => {
  const [login, signup, forgot, reset, session, links, manifest] = await Promise.all([
    read("apps/mobile/src/auth/LoginScreen.tsx"),
    read("apps/mobile/src/auth/SignUpScreen.tsx"),
    read("apps/mobile/src/auth/ForgotPasswordScreen.tsx"),
    read("apps/mobile/src/auth/ResetPasswordScreen.tsx"),
    read("apps/mobile/src/auth/use-mobile-session.ts"),
    read("apps/mobile/src/auth/use-mobile-auth-links.ts"),
    read("android/app/src/main/AndroidManifest.xml"),
  ]);
  assert.match(login, /onCreateAccount/);
  assert.match(login, /onForgotPassword/);
  assert.match(signup, /autoComplete="new-password"/);
  assert.match(forgot, /onRequest/);
  assert.match(reset, /onUpdate/);
  assert.match(session, /auth\.signUp/);
  assert.match(session, /resetPasswordForEmail/);
  assert.match(session, /auth\.updateUser/);
  assert.match(links, /exchangeCodeForSession/);
  assert.match(manifest, /android:scheme="diarydock" android:host="auth" android:path="\/confirm"/);
  assert.match(manifest, /android:scheme="diarydock" android:host="auth" android:path="\/reset"/);
  assert.doesNotMatch(login, /Browser\.open|forgot-password/);
});
