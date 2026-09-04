const DATABASE_KEY_BYTES = 32;

export function createDatabasePassphrase() {
  const bytes = crypto.getRandomValues(new Uint8Array(DATABASE_KEY_BYTES));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function databaseNameForAccount(accountId: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(accountId),
  );
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `diarydock_${hash.slice(0, 24)}`;
}
