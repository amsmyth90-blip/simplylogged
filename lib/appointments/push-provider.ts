import "server-only";
import { createSign } from "node:crypto";
import { connect } from "node:http2";

export function pushConfigured(platform: string) {
  return platform === "ios"
    ? Boolean(process.env.APNS_TEAM_ID && process.env.APNS_KEY_ID && process.env.APNS_PRIVATE_KEY && process.env.APNS_BUNDLE_ID)
    : platform === "android" && Boolean(process.env.FCM_PROJECT_ID && process.env.FCM_CLIENT_EMAIL && process.env.FCM_PRIVATE_KEY);
}

const base64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
function jwt(header: object, claims: object, key: string, algorithm: string, ec = false) {
  const content = `${base64(header)}.${base64(claims)}`;
  const signer = createSign(algorithm); signer.update(content); signer.end();
  const signature = signer.sign({ key: key.replace(/\\n/g, "\n"), ...(ec ? { dsaEncoding: "ieee-p1363" as const } : {}) });
  return `${content}.${signature.toString("base64url")}`;
}

export class PushDeliveryError extends Error {
  constructor(readonly invalidToken = false) { super("Push delivery failed."); }
}

async function apple(token: string, id: string, body: string) {
  const bearer = jwt({ alg: "ES256", kid: process.env.APNS_KEY_ID },
    { iss: process.env.APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) }, process.env.APNS_PRIVATE_KEY!, "SHA256", true);
  const client = connect(process.env.APNS_ENVIRONMENT === "sandbox" ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com");
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { client.destroy(); reject(new PushDeliveryError()); }, 10_000);
      client.once("error", () => { clearTimeout(timer); reject(new PushDeliveryError()); });
      const req = client.request({ ":method": "POST", ":path": `/3/device/${token}`,
        authorization: `bearer ${bearer}`, "apns-topic": process.env.APNS_BUNDLE_ID!,
        "apns-push-type": "alert", "apns-priority": "10", "apns-collapse-id": id,
        "apns-expiration": String(Math.floor(Date.now() / 1000) + 3600) });
      let status = 0; let response = "";
      req.on("response", (headers) => { status = Number(headers[":status"]); });
      req.on("data", (chunk: Buffer) => { if (response.length < 4096) response += chunk.toString(); });
      req.on("error", () => { clearTimeout(timer); reject(new PushDeliveryError()); });
      req.on("end", () => {
        clearTimeout(timer);
        if (status === 200) resolve();
        else reject(new PushDeliveryError(status === 410 || /BadDeviceToken|DeviceTokenNotForTopic/.test(response)));
      });
      req.end(JSON.stringify({ aps: { alert: { title: "DiaryDock", body }, sound: "default" }, route: "appointments" }));
    });
  } finally { client.close(); }
}

let googleAccess: { value: string; expires: number } | null = null;
async function googleToken() {
  if (googleAccess && googleAccess.expires > Date.now()) return googleAccess.value;
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt({ alg: "RS256", typ: "JWT" }, { iss: process.env.FCM_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600 }, process.env.FCM_PRIVATE_KEY!, "RSA-SHA256");
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", signal: AbortSignal.timeout(10_000),
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) });
  const value = await response.json();
  if (!response.ok || typeof value.access_token !== "string") throw new PushDeliveryError();
  googleAccess = { value: value.access_token, expires: Date.now() + 50 * 60_000 };
  return googleAccess.value;
}

export async function sendAppointmentPush(device: { platform: string; token: string }, job: { id: string; kind: string }) {
  if (!pushConfigured(device.platform)) throw new PushDeliveryError();
  // Deliberately omit medical details and identifiers from lock-screen content.
  const body = job.kind === "added" ? "Your appointment has been added. Open DiaryDock to view it."
    : "You have an upcoming appointment. Open DiaryDock for the details.";
  if (device.platform === "ios") return apple(device.token, job.id, body);
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(process.env.FCM_PROJECT_ID!)}/messages:send`, {
    method: "POST", signal: AbortSignal.timeout(10_000),
    headers: { Authorization: `Bearer ${await googleToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { token: device.token, notification: { title: "DiaryDock", body },
      data: { route: "appointments" }, android: { priority: "high", ttl: "3600s",
        notification: { tag: job.id, channel_id: "appointments" } } } }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    const invalid = result.error?.details?.some((entry: { errorCode?: string }) => entry.errorCode === "UNREGISTERED");
    throw new PushDeliveryError(Boolean(invalid));
  }
}
