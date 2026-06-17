export const documentsBucket = "documents";

export type SupabaseConfigStatus = {
  supabaseUrlConfigured: boolean;
  supabaseAnonKeyConfigured: boolean;
  supabaseServiceRoleConfigured: boolean;
  openAiKeyConfigured: boolean;
  supabaseConfigured: boolean;
  supabasePartiallyConfigured: boolean;
  clientError: string;
};

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const supabaseUrlConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKeyConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const supabaseServiceRoleConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const openAiKeyConfigured = Boolean(process.env.OPENAI_API_KEY);
  const supabaseConfigured = supabaseUrlConfigured && supabaseAnonKeyConfigured;
  const supabasePartiallyConfigured = supabaseUrlConfigured !== supabaseAnonKeyConfigured;

  return {
    supabaseUrlConfigured,
    supabaseAnonKeyConfigured,
    supabaseServiceRoleConfigured,
    openAiKeyConfigured,
    supabaseConfigured,
    supabasePartiallyConfigured,
    clientError: supabasePartiallyConfigured
      ? "Supabase is partially configured. Add both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or remove both to use local development fallback."
      : "",
  };
}

export function assertSupabaseClientConfig() {
  const status = getSupabaseConfigStatus();

  if (status.supabasePartiallyConfigured) {
    throw new Error(status.clientError);
  }
}
