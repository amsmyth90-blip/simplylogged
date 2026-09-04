import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { boundedSupabaseFetch } from "../platform/bounded-supabase-fetch";
import { createAuthStorage } from "./secure-auth-storage";
import { readMobileSupabaseConfig } from "./supabase-config";

let client: SupabaseClient | null = null;

export function getMobileSupabase() {
  if (!client) {
    const config = readMobileSupabaseConfig();
    client = createClient(config.url, config.publicKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: "pkce",
        persistSession: true,
        storage: createAuthStorage(),
      },
      global: {
        fetch: boundedSupabaseFetch,
        headers: {
          "X-Client-Info": "diarydock-mobile/0.1.0",
        },
      },
    });
  }
  return client;
}
