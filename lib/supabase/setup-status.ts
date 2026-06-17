import { createClient } from "@supabase/supabase-js";
import { documentsBucket, getSupabaseConfigStatus } from "@/lib/supabase/config";

export type SetupConnectionStatus = "Pending" | "Connected";

export type SetupStatus = {
  supabaseUrlConfigured: boolean;
  supabaseAnonKeyConfigured: boolean;
  supabaseServiceRoleConfigured: boolean;
  openAiKeyConfigured: boolean;
  databaseConnected: SetupConnectionStatus;
  storageBucketAvailable: SetupConnectionStatus;
  storageBucketPrivate: boolean;
  message: string;
};

export async function getSetupStatus(): Promise<SetupStatus> {
  const config = getSupabaseConfigStatus();
  const baseStatus: SetupStatus = {
    supabaseUrlConfigured: config.supabaseUrlConfigured,
    supabaseAnonKeyConfigured: config.supabaseAnonKeyConfigured,
    supabaseServiceRoleConfigured: config.supabaseServiceRoleConfigured,
    openAiKeyConfigured: config.openAiKeyConfigured,
    databaseConnected: "Pending",
    storageBucketAvailable: "Pending",
    storageBucketPrivate: false,
    message: config.clientError,
  };

  if (!config.supabaseConfigured) {
    return {
      ...baseStatus,
      message: config.clientError || "Supabase is not configured yet. Add the required env vars to enable production mode.",
    };
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    return baseStatus;
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error: databaseError } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  const nextStatus: SetupStatus = {
    ...baseStatus,
    databaseConnected: databaseError ? "Pending" : "Connected",
    message: databaseError ? `Database check pending: ${databaseError.message}` : "",
  };

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ...nextStatus,
      message: nextStatus.message || "Storage bucket check needs SUPABASE_SERVICE_ROLE_KEY on the server.",
    };
  }

  const { data: bucket, error: bucketError } = await supabase.storage.getBucket(documentsBucket);

  return {
    ...nextStatus,
    storageBucketAvailable: bucketError || !bucket ? "Pending" : "Connected",
    storageBucketPrivate: Boolean(bucket && !bucket.public),
    message: bucketError ? `Storage check pending: ${bucketError.message}` : nextStatus.message,
  };
}
