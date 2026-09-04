const allowedOrigins = new Set([
  "capacitor://localhost",
  "http://localhost",
  "https://diarydock.com",
  "https://localhost",
  "https://www.diarydock.com",
]);

export function mobileCorsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const headers = new Headers({
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Expose-Headers": "Content-Disposition, Content-Length, Retry-After, Server-Timing, X-Content-SHA256, X-Request-Id",
    "Access-Control-Allow-Methods": "DELETE, GET, POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    "Cache-Control": "private, no-store, max-age=0",
    "Vary": "Origin",
  });
  if (origin && allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
}

export function mobilePreflight(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins.has(origin)) {
    return Response.json({ error: "Origin not allowed." }, { status: 403 });
  }
  return new Response(null, { status: 204, headers: mobileCorsHeaders(request) });
}
