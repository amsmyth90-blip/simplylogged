import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

import { assertMobileSupabasePublicKey } from "./src/auth/supabase-config.ts";

const environmentRoot = fileURLToPath(new URL("../..", import.meta.url));

export function assertMobileBuildEnvironment(environment: Record<string, string | undefined>) {
  const configuredUrl = environment.NEXT_PUBLIC_SUPABASE_URL;
  const configuredKey = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? environment.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!configuredUrl || !configuredKey) {
    throw new Error("Mobile release requires the Supabase URL and public client key.");
  }
  const url = new URL(configuredUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/") {
    throw new Error("Mobile release requires an HTTPS Supabase origin.");
  }
  assertMobileSupabasePublicKey(configuredKey);
}

export default defineConfig(({ mode }) => {
  const environment = { ...loadEnv(mode, environmentRoot, ""), ...process.env };
  if (mode === "production") assertMobileBuildEnvironment(environment);
  return {
    envDir: environmentRoot,
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    plugins: [react()],
    publicDir: false,
    resolve: {
      alias: {
        "@mobile": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: false,
      target: "es2022",
    },
  };
});
