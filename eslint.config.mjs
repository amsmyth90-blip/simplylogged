import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  globalIgnores([
    ".claude/**",
    ".codex-*.log",
    ".next/**",
    "node_modules/**",
    "output/**",
    "promo-video/**",
    "public/**",
    "resources/**",
    "supabase/**",
    "test-fixtures/**",
    "tools/**",
    "*.config.js",
    "*.config.ts",
    "next-env.d.ts"
  ]),
  {
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "off"
    }
  }
]);
