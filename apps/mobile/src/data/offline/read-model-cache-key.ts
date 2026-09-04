export async function readModelCacheKey(namespace: string, identifier: string) {
  if (!/^[a-z][a-z0-9-]{0,23}$/.test(namespace) || !identifier) {
    throw new Error("Encrypted cache key input is invalid.");
  }
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(identifier),
  );
  const suffix = Array.from(new Uint8Array(digest).slice(0, 16), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
  return `${namespace}-${suffix}`;
}
