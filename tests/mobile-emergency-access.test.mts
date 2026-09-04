import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile trusted access is authenticated, bounded, recently authenticated and observed", async () => {
  const [route, service] = await Promise.all([
    read("app/api/mobile/emergency-access/route.ts"),
    read("lib/emergency-access/service.ts"),
  ]);
  assert.match(route, /authenticateHybridRequest/);
  assert.match(route, /readBoundedJson\(request, 8 \* 1024\)/);
  assert.match(route, /hasRecentAuthentication/);
  assert.match(route, /checkServerRateLimit/);
  assert.match(route, /RequestObservation/);
  assert.doesNotMatch(route, /body\.ownerId|body\.userId/);
  assert.match(service, /\.eq\("owner_id", userId\)/);
  assert.match(service, /\.eq\("user_id", userId\)/);
  assert.doesNotMatch(service, /error\.message|result\.error\.message/);
});

test("trusted access remains online-only and invitation secrets are never cached", async () => {
  const [hook, form, screen] = await Promise.all([
    read("apps/mobile/src/emergency-access/use-emergency-access.ts"),
    read("apps/mobile/src/emergency-access/TrustedContactForm.tsx"),
    read("apps/mobile/src/emergency-access/TrustedAccessScreen.tsx"),
  ]);
  assert.doesNotMatch(hook, /getReadModel|putReadModel|localStorage|sessionStorage/);
  assert.doesNotMatch(form, /store|localStorage|sessionStorage/);
  assert.match(form, /Share\.share/);
  assert.match(screen, /This screen is deliberately not stored offline/);
});

test("received emergency files re-check the live grant and verify bytes end to end", async () => {
  const [route, client] = await Promise.all([
    read("app/api/mobile/emergency-access/files/[grantId]/route.ts"),
    read("apps/mobile/src/emergency-access/received-file-client.ts"),
  ]);
  assert.match(route, /authenticateApiRequest/);
  assert.match(route, /get_emergency_document_location/);
  assert.match(route, /inspectCaptureFile/);
  assert.match(route, /X-Content-SHA256/);
  assert.match(route, /checkServerRateLimit/);
  assert.match(client, /readBoundedResponseBytes\(response, MAX_DOCUMENT_BYTES/);
  assert.match(client, /crypto\.subtle\.digest/);
  assert.match(client, /redirect: "error"/);
  assert.doesNotMatch(client, /cacheFile|putReadModel/);
});
