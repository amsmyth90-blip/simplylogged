/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_MOBILE_PREVIEW?: string;
  readonly VITE_API_ORIGIN?: string;
  readonly NEXT_PUBLIC_SUPABASE_URL?: string;
  readonly NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
