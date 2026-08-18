import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_BYTES = 18;

function base64Url(input: Buffer) {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function getInboundEmailDomain() {
  return process.env.DIARYDOCK_INBOUND_EMAIL_DOMAIN?.trim() || "inbound.diarydock.com";
}

export function getInboundEmailSecret() {
  return process.env.DIARYDOCK_INBOUND_EMAIL_SECRET?.trim() || null;
}

export function createInboundEmailToken(userId: string, secret: string) {
  return base64Url(createHmac("sha256", secret).update(`diarydock-inbound:${userId}`).digest()).slice(0, TOKEN_BYTES);
}

export function createInboundEmailAddress(userId: string, secret: string) {
  return `import+${userId}.${createInboundEmailToken(userId, secret)}@${getInboundEmailDomain()}`;
}

export function verifyInboundEmailAddress(value: string, secret: string) {
  const domain = getInboundEmailDomain().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = value.match(new RegExp(`import\\+([a-f0-9-]{36})\\.([A-Za-z0-9_-]{12,64})@${domain}`, "i"));

  if (!match) {
    return null;
  }

  const [, userId, suppliedToken] = match;
  const expectedToken = createInboundEmailToken(userId, secret);
  const suppliedBuffer = Buffer.from(suppliedToken);
  const expectedBuffer = Buffer.from(expectedToken);

  if (suppliedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  return timingSafeEqual(suppliedBuffer, expectedBuffer) ? userId : null;
}
