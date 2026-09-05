import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectProductionReleaseEnvironment,
  inspectProductionRuntimeEnvironment,
  type EnvironmentSource,
} from "../lib/config/production-environment.ts";

const validEnvironment: EnvironmentSource = {
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: `sb_publishable_${"p".repeat(32)}`,
  SUPABASE_SERVICE_ROLE_KEY: `sb_secret_${"s".repeat(32)}`,
  DIARYDOCK_SYNC_CURSOR_SECRET: "cursor-credential-that-is-long-enough-01",
  DIARYDOCK_CAPTURE_SCANNER_REQUIRED: "true",
  DIARYDOCK_MALWARE_SCANNER_URL: "https://scanner.internal.example/v1/scan",
  DIARYDOCK_MALWARE_SCANNER_TOKEN: "scanner-credential-that-is-long-enough-01",
  ACCOUNT_DELETION_ADMIN_TOKEN: "deletion-credential-that-is-long-enough-01",
  CRON_SECRET: "cron-credential-that-is-long-enough-0001",
  ACCOUNT_DELETION_ADMIN_EMAILS: "security@example.com",
  OPENAI_API_KEY: "provider-credential-long-enough",
  DIARYDOCK_INBOUND_EMAIL_PROVIDER_READY: "false",
};

test("production runtime configuration accepts distinct bounded credentials", () => {
  assert.deepEqual(inspectProductionRuntimeEnvironment(validEnvironment), []);
  assert.deepEqual(inspectProductionReleaseEnvironment(validEnvironment), []);
});

test("production runtime configuration accepts an explicit scanner waiver", () => {
  const environment = {
    ...validEnvironment,
    DIARYDOCK_CAPTURE_SCANNER_REQUIRED: "false",
    DIARYDOCK_MALWARE_SCANNER_URL: "",
    DIARYDOCK_MALWARE_SCANNER_TOKEN: "",
  };
  assert.deepEqual(inspectProductionRuntimeEnvironment(environment), []);
  assert.deepEqual(inspectProductionReleaseEnvironment(environment), []);
});

test("production runtime configuration rejects public server keys and unsafe endpoints", () => {
  const issues = inspectProductionRuntimeEnvironment({
    ...validEnvironment,
    SUPABASE_SERVICE_ROLE_KEY: validEnvironment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    DIARYDOCK_MALWARE_SCANNER_URL: "http://scanner.internal.example/v1/scan?token=visible",
  });
  assert.deepEqual(issues.map(({ key }) => key), [
    "SUPABASE_SERVICE_ROLE_KEY",
    "DIARYDOCK_MALWARE_SCANNER_URL",
  ]);
});

test("production runtime configuration rejects an ambiguous scanner mode", () => {
  const issues = inspectProductionRuntimeEnvironment({
    ...validEnvironment,
    DIARYDOCK_CAPTURE_SCANNER_REQUIRED: "sometimes",
  });
  assert.deepEqual(issues.map(({ key }) => key), ["DIARYDOCK_CAPTURE_SCANNER_REQUIRED"]);
});

test("release configuration requires complete enabled inbound-email credentials", () => {
  const issues = inspectProductionReleaseEnvironment({
    ...validEnvironment,
    DIARYDOCK_INBOUND_EMAIL_PROVIDER_READY: "true",
    RESEND_API_KEY: "short",
    RESEND_WEBHOOK_SECRET: "",
    DIARYDOCK_INBOUND_EMAIL_SECRET: "",
    DIARYDOCK_INBOUND_EMAIL_DOMAIN: "not a domain",
  });
  assert.deepEqual(issues.map(({ key }) => key), [
    "RESEND_API_KEY",
    "RESEND_WEBHOOK_SECRET",
    "DIARYDOCK_INBOUND_EMAIL_SECRET",
    "DIARYDOCK_INBOUND_EMAIL_DOMAIN",
  ]);
});

test("release configuration rejects shared credentials across trust boundaries", () => {
  const shared = "shared-credential-that-is-long-enough-01";
  const issues = inspectProductionReleaseEnvironment({
    ...validEnvironment,
    DIARYDOCK_SYNC_CURSOR_SECRET: shared,
    DIARYDOCK_MALWARE_SCANNER_TOKEN: shared,
    ACCOUNT_DELETION_ADMIN_TOKEN: shared,
  });
  assert.deepEqual(issues.map(({ key }) => key), [
    "server secrets",
    "privileged operation secrets",
  ]);
});
