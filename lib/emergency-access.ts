import { createHash, randomBytes } from "node:crypto";

const publicPattern = /^[A-Za-z0-9_-]{20,64}$/;
const secretPattern = /^[A-Za-z0-9_-]{32,96}$/;

export function hashEmergencyInviteSecret(secret: string) {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

export function createEmergencyInviteToken() {
  const publicId = randomBytes(18).toString("base64url");
  const secret = randomBytes(32).toString("base64url");
  return { publicId, secret, secretHash: hashEmergencyInviteSecret(secret) };
}

export function isEmergencyInvitePayload(publicId: string, secret: string) {
  return publicPattern.test(publicId) && secretPattern.test(secret);
}

export function emergencyInvitePath(publicId: string, secret: string) {
  if (!isEmergencyInvitePayload(publicId, secret)) throw new Error("Invalid emergency invitation payload.");
  return `/emergency/invite/${encodeURIComponent(publicId)}/${encodeURIComponent(secret)}`;
}
