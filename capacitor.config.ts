import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.diarydock.app",
  appName: "DiaryDock",
  webDir: "apps/mobile/dist",
  backgroundColor: "#f8f4ec",
  loggingBehavior: "none",
  server: {
    cleartext: false
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false
  },
  ios: {
    contentInset: "always",
    webContentsDebuggingEnabled: false
  },
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: "Library/DiaryDock",
      iosIsEncryption: true,
      iosKeychainPrefix: "com.diarydock.app.offline",
      iosBiometric: {
        biometricAuth: false
      },
      androidIsEncryption: true,
      androidBiometric: {
        biometricAuth: false
      }
    }
  }
};

export default config;
