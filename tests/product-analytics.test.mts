import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { organisationScoreBand, PRODUCT_ANALYTICS_EVENTS, validateProductAnalyticsEvent } from "../lib/product-analytics.ts";

const migrationPath = new URL("../supabase/migrations/20260901210000_privacy_conscious_product_analytics.sql", import.meta.url);
const routePath = new URL("../app/api/product-analytics/route.ts", import.meta.url);

test("the central catalogue validates exact event-specific properties", () => {
  assert.deepEqual(validateProductAnalyticsEvent(PRODUCT_ANALYTICS_EVENTS.FIRST_AI_QUESTION, { surface: "ASK" }), { event: "first_ai_question", properties: { surface: "ASK" } });
  assert.throws(() => validateProductAnalyticsEvent("made_up_event", {}), /Unknown/);
  assert.throws(() => validateProductAnalyticsEvent(PRODUCT_ANALYTICS_EVENTS.FIRST_AI_QUESTION, { surface: "ASK", question: "private" }), /not allowed/);
  assert.throws(() => validateProductAnalyticsEvent(PRODUCT_ANALYTICS_EVENTS.FIRST_DOCUMENT_ADDED, { source: "MANUAL", filename: "secret.pdf" }), /not allowed/);
  assert.throws(() => validateProductAnalyticsEvent(PRODUCT_ANALYTICS_EVENTS.SUBSCRIPTION_STARTED, { planTier: "amy@example.com" }), /value is not allowed/);
});

test("organisation scores are reduced to non-identifying bands", () => {
  assert.equal(organisationScoreBand(0), "0_24");
  assert.equal(organisationScoreBand(25), "25_49");
  assert.equal(organisationScoreBand(74), "50_74");
  assert.equal(organisationScoreBand(100), "75_100");
});

test("analytics is consent-gated, separately stored and automatically expires", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /product_analytics_preferences/);
  assert.match(sql, /enabled = true/);
  assert.match(sql, /interval '90 days'/);
  assert.match(sql, /delete from public\.product_analytics_events where user_id = current_user_id/);
  assert.doesNotMatch(sql, /audit_events.*product_analytics|product_analytics.*audit_events/is);
});

test("the API is authenticated, bounded and never accepts arbitrary event fields", async () => {
  const route = await readFile(routePath, "utf8");
  assert.match(route, /auth\.getUser\(\)/);
  assert.match(route, /readBoundedJson\(request, 2_048\)/);
  assert.match(route, /checkServerRateLimit/);
  assert.match(route, /validateProductAnalyticsEvent/);
  assert.doesNotMatch(route, /body\.(question|title|filename|email|phone|notes|content)/);
});
