import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.lifedock.app",
  appName: "LifeDock",
  webDir: "public",
  server: {
    url: "https://www.thelifedock.com",
    cleartext: false
  },
  ios: {
    contentInset: "always"
  }
};

export default config;
