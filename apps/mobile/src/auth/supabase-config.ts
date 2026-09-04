export type MobileSupabaseConfig = {
  publicKey: string;
  url: string;
};

function decodeJwtPayload(token: string) {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function assertMobileSupabasePublicKey(input: string) {
  const value = input.trim();
  if (value.length < 20 || value.length > 2_048) {
    throw new Error("The mobile authentication key is invalid.");
  }
  if (value.startsWith("sb_publishable_")) {
    if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(value)) {
      throw new Error("The mobile authentication key is invalid.");
    }
    return value;
  }
  const payload = decodeJwtPayload(value);
  if (payload?.role !== "anon") {
    throw new Error("A server credential cannot be used by the mobile application.");
  }
  return value;
}

export function readMobileSupabaseConfig(): MobileSupabaseConfig {
  const value = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!value || !publicKey) {
    throw new Error("Mobile authentication is not configured.");
  }

  const url = new URL(value);
  if (import.meta.env.PROD && url.protocol !== "https:") {
    throw new Error("Mobile authentication requires HTTPS.");
  }
  if (url.username || url.password || url.pathname !== "/") {
    throw new Error("The mobile authentication origin is invalid.");
  }

  return { publicKey: assertMobileSupabasePublicKey(publicKey), url: url.origin };
}
