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
    contentInset: "always"
  }
};

export default config;
