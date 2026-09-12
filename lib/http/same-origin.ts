// Next may build request.url with its listening hostname behind the proxy.
// Host is the browser's target authority; do not trust a client-supplied forwarded host.
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return false;
  try {
    const target = new URL(request.url);
    const host = request.headers.get("host") || target.host;
    const expected = new URL(`${target.protocol}//${host}`);
    if (expected.host !== host || expected.username || expected.password || expected.pathname !== "/") return false;
    const source = new URL(origin);
    return source.origin === origin && source.origin === expected.origin;
  } catch {
    return false;
  }
}
