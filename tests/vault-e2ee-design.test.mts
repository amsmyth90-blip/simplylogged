import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const threatModelPath = new URL("../docs/security/vault-e2ee-threat-model.md", import.meta.url);
const architecturePath = new URL("../docs/security/vault-e2ee-architecture.md", import.meta.url);
const recoveryPath = new URL("../docs/security/vault-recovery-model.md", import.meta.url);
const settingsPath = new URL("../lib/diarydock-data.ts", import.meta.url);

test("Vault documentation does not misrepresent the current storage model as E2EE", async () => {
  const [threatModel, architecture, settings] = await Promise.all([
    readFile(threatModelPath, "utf8"),
    readFile(architecturePath, "utf8"),
    readFile(settingsPath, "utf8"),
  ]);

  assert.match(threatModel, /no DiaryDock content is currently end-to-end encrypted/i);
  assert.match(architecture, /RLS-protected, server-managed plaintext/i);
  assert.match(architecture, /\/vault.*aliases `\/files`/i);
  assert.match(settings, /Not currently enabled for Vault documents/);
});

test("the proposed design keeps the strong server-confidentiality claim behind a signed-client gate", async () => {
  const architecture = await readFile(architecturePath, "utf8");

  assert.match(architecture, /signed native build/i);
  assert.match(architecture, /not a malicious DiaryDock server/i);
  assert.match(architecture, /Home-grown chunk nonce\/counter logic is prohibited/i);
  assert.match(architecture, /synthetic data only/i);
});

test("the recovery promise contains no server escrow or automatic trusted-contact release", async () => {
  const recovery = await readFile(recoveryPath, "utf8");

  assert.match(recovery, /permanently unrecoverable/i);
  assert.match(recovery, /Account recovery.*not the Vault key/i);
  assert.match(recovery, /must never inherit Vault access/i);
  assert.match(recovery, /No inactivity, post-death or automatic release is approved/i);
});
