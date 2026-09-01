import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const physicalLookupPattern = /^[A-Za-z0-9_-]{20,64}$/;
export const physicalSecretPattern = /^[A-Za-z0-9_-]{40,96}$/;

export function hashPhysicalSecret(secret: string) {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

export function createPhysicalLinkToken() {
  const publicId = randomBytes(18).toString("base64url");
  const secret = randomBytes(32).toString("base64url");
  return { publicId, secret, secretHash: hashPhysicalSecret(secret) };
}

export function physicalLinkPath(publicId: string, secret: string) {
  if (!physicalLookupPattern.test(publicId) || !physicalSecretPattern.test(secret)) throw new Error("Invalid physical link token");
  return `/p/${publicId}/${secret}`;
}

export function verifyPhysicalSecret(secret: string, expectedHash: string) {
  if (!physicalSecretPattern.test(secret) || !/^[a-f0-9]{64}$/.test(expectedHash)) return false;
  const actual = Buffer.from(hashPhysicalSecret(secret), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
