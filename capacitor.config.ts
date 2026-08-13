import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.diarydock.app",
  appName: "DiaryDock",
  webDir: "public",
  server: {
    url: "https://diarydock.com",
    cleartext: false
  },
  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: false
  },
  plugins: {
    Camera: {
      ios: {
        NSCameraUsageDescription:
          "DiaryDock uses the camera so you can scan documents and keep household records organised.",
        NSPhotoLibraryUsageDescription:
          "DiaryDock lets you choose photos or documents from your library to add to your private records.",
        NSPhotoLibraryAddUsageDescription:
          "DiaryDock may save generated images or document previews to your photo library if you choose to export them."
      }
    }
  }
};

export default config;
