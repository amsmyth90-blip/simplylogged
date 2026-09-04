export const PRODUCT_ANALYTICS_EVENTS = {
  SIGNUP_COMPLETED: "signup_completed",
  ONBOARDING_COMPLETED: "onboarding_completed",
  FIRST_HOME_ADDED: "first_home_added",
  FIRST_VEHICLE_ADDED: "first_vehicle_added",
  FIRST_PET_ADDED: "first_pet_added",
  FIRST_DOCUMENT_ADDED: "first_document_added",
  FIRST_SCAN_COMPLETED: "first_scan_completed",
  FIRST_REMINDER_CREATED: "first_reminder_created",
  FIRST_GUARDIAN_ACTION: "first_guardian_action",
  FIRST_HOUSEHOLD_INVITE: "first_household_invite",
  HOUSEHOLD_INVITE_ACCEPTED: "household_invite_accepted",
  FIRST_NFC_LINK: "first_nfc_link",
  FIRST_AI_QUESTION: "first_ai_question",
  ORGANISATION_SCORE_VIEWED: "organisation_score_viewed",
  VAULT_SETUP_COMPLETED: "vault_setup_completed",
  RETURN_SESSION: "return_session",
  SUBSCRIPTION_STARTED: "subscription_started",
} as const;

export type ProductAnalyticsEvent = (typeof PRODUCT_ANALYTICS_EVENTS)[keyof typeof PRODUCT_ANALYTICS_EVENTS];
export type ProductAnalyticsProperties = {
  signup_completed: Record<string, never>;
  onboarding_completed: Record<string, never>;
  first_home_added: Record<string, never>;
  first_vehicle_added: Record<string, never>;
  first_pet_added: Record<string, never>;
  first_document_added: { source: "MANUAL" | "CAPTURE" | "IMPORT" | "EMAIL" | "SHARE" };
  first_scan_completed: { source: "CAPTURE" | "IMPORT" | "SHARE" };
  first_reminder_created: { origin: "USER" | "SYSTEM" };
  first_guardian_action: { action: "OPEN" | "RESOLVE" | "DISMISS" | "SNOOZE" };
  first_household_invite: Record<string, never>;
  household_invite_accepted: Record<string, never>;
  first_nfc_link: { resourceType: "ASSET" };
  first_ai_question: { surface: "ASK" };
  organisation_score_viewed: { scoreBand: "0_24" | "25_49" | "50_74" | "75_100" };
  vault_setup_completed: { clientType: "NATIVE" };
  return_session: Record<string, never>;
  subscription_started: { planTier: "FREE" | "PLUS" | "FAMILY" };
};

const eventNames = new Set<string>(Object.values(PRODUCT_ANALYTICS_EVENTS));
const rules: Record<ProductAnalyticsEvent, Record<string, readonly string[]>> = {
  signup_completed: {}, onboarding_completed: {}, first_home_added: {}, first_vehicle_added: {}, first_pet_added: {},
  first_document_added: { source: ["MANUAL", "CAPTURE", "IMPORT", "EMAIL", "SHARE"] },
  first_scan_completed: { source: ["CAPTURE", "IMPORT", "SHARE"] },
  first_reminder_created: { origin: ["USER", "SYSTEM"] },
  first_guardian_action: { action: ["OPEN", "RESOLVE", "DISMISS", "SNOOZE"] },
  first_household_invite: {}, household_invite_accepted: {},
  first_nfc_link: { resourceType: ["ASSET"] },
  first_ai_question: { surface: ["ASK"] },
  organisation_score_viewed: { scoreBand: ["0_24", "25_49", "50_74", "75_100"] },
  vault_setup_completed: { clientType: ["NATIVE"] },
  return_session: {},
  subscription_started: { planTier: ["FREE", "PLUS", "FAMILY"] },
};

export function validateProductAnalyticsEvent(eventName: unknown, properties: unknown) {
  if (typeof eventName !== "string" || !eventNames.has(eventName)) throw new Error("Unknown analytics event.");
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) throw new Error("Analytics properties must be an object.");
  const event = eventName as ProductAnalyticsEvent;
  const supplied = properties as Record<string, unknown>;
  const eventRules = rules[event];
  const suppliedKeys = Object.keys(supplied);
  const allowedKeys = Object.keys(eventRules);
  if (suppliedKeys.length !== allowedKeys.length || suppliedKeys.some((key) => !Object.hasOwn(eventRules, key))) throw new Error("Analytics properties are not allowed.");
  for (const key of allowedKeys) {
    if (typeof supplied[key] !== "string" || !eventRules[key].includes(supplied[key])) throw new Error("Analytics property value is not allowed.");
  }
  return { event, properties: supplied };
}

export function organisationScoreBand(score: number): ProductAnalyticsProperties["organisation_score_viewed"]["scoreBand"] {
  if (score < 25) return "0_24";
  if (score < 50) return "25_49";
  if (score < 75) return "50_74";
  return "75_100";
}

export async function trackProductAnalytics<E extends ProductAnalyticsEvent>(event: E, properties: ProductAnalyticsProperties[E]) {
  try {
    await fetch("/api/product-analytics", { method: "POST", cache: "no-store", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation: "TRACK", event, properties }) });
  } catch {
    // Analytics must never interrupt the user's task.
  }
}

