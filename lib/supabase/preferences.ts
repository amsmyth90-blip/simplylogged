import { getCurrentUserId, getSupabaseClient } from "@/lib/supabase/client";

export type UserPreferences = {
  theme: "system" | "light" | "dark";
  season: "spring" | "summer" | "autumn" | "winter";
  emergencyAccess: boolean;
};

const preferenceKey = "simplyLoggedPreferences";

export const defaultPreferences: UserPreferences = {
  theme: "system",
  season: "summer",
  emergencyAccess: false,
};

type PreferenceRow = {
  theme: UserPreferences["theme"] | null;
  season: UserPreferences["season"] | null;
  emergency_access_enabled: boolean | null;
};

export async function getPreferences() {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  if (!supabase) {
    return getLocalPreferences();
  }

  if (!userId) {
    return defaultPreferences;
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .select("theme, season, emergency_access_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Supabase getPreferences failed", error);
    throw error;
  }

  if (!data) {
    return defaultPreferences;
  }

  return fromRow(data as PreferenceRow);
}

export async function savePreferences(preferences: UserPreferences) {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  if (!supabase) {
    saveLocalPreferences(preferences);
    return;
  }

  if (!userId) {
    throw new Error("Sign in required to save preferences.");
  }

  const { error } = await supabase.from("user_preferences").upsert({
    user_id: userId,
    theme: preferences.theme,
    season: preferences.season,
    emergency_access_enabled: preferences.emergencyAccess,
  });

  if (error) {
    console.warn("Supabase savePreferences failed", error);
    throw error;
  }
}

function fromRow(row: PreferenceRow): UserPreferences {
  return {
    theme: row.theme ?? defaultPreferences.theme,
    season: row.season ?? defaultPreferences.season,
    emergencyAccess: row.emergency_access_enabled ?? defaultPreferences.emergencyAccess,
  };
}

function getLocalPreferences() {
  if (typeof window === "undefined") {
    return defaultPreferences;
  }

  try {
    const raw = window.localStorage.getItem(preferenceKey);
    return raw ? { ...defaultPreferences, ...(JSON.parse(raw) as Partial<UserPreferences>) } : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

function saveLocalPreferences(preferences: UserPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(preferenceKey, JSON.stringify(preferences));
}
