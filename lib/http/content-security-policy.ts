export function createContentSecurityPolicy(nonce: string, development: boolean, supabaseUrl?: string) {
  if (!/^[A-Za-z0-9+/]{22,}={0,2}$/.test(nonce)) throw new Error("Invalid CSP nonce");
  const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "https://*.supabase.co";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${development ? " 'unsafe-eval'" : ""}`,
    "script-src-attr 'none'",
    `connect-src 'self' ${supabaseOrigin} https://*.supabase.co wss://*.supabase.co https://www.themealdb.com`,
    `frame-src 'self' blob: data: ${supabaseOrigin} https://*.supabase.co`,
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    ...(!development ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}
