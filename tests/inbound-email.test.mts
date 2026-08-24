import assert from "node:assert/strict";
import test from "node:test";

import {
  createInboundEmailAddress,
  createInboundEmailToken,
  verifyInboundEmailAddress,
} from "../lib/inbound-email.ts";

const USER_ID = "3d4c2dc0-f021-4fce-a849-13a5c8c079d7";
const SECRET = "test-only-secret";

test("creates a stable, user-specific inbound email token", () => {
  const token = createInboundEmailToken(USER_ID, SECRET);

  assert.equal(token, createInboundEmailToken(USER_ID, SECRET));
  assert.notEqual(
    token,
    createInboundEmailToken("6fb61be5-9465-4f9b-bae7-ef8476a91e42", SECRET),
  );
});

test("creates and verifies the user's forwarding address", () => {
  const previousDomain = process.env.DIARYDOCK_INBOUND_EMAIL_DOMAIN;
  process.env.DIARYDOCK_INBOUND_EMAIL_DOMAIN = "inbound.diarydock.test";

  try {
    const address = createInboundEmailAddress(USER_ID, SECRET);

    assert.match(address, /^import\+/);
    assert.equal(verifyInboundEmailAddress(address, SECRET), USER_ID);
    assert.equal(verifyInboundEmailAddress(address, "wrong-secret"), null);
  } finally {
    if (previousDomain === undefined) {
      delete process.env.DIARYDOCK_INBOUND_EMAIL_DOMAIN;
    } else {
      process.env.DIARYDOCK_INBOUND_EMAIL_DOMAIN = previousDomain;
    }
  }
});
test("rejects malformed and wrong-domain addresses", () => {
  const previousDomain = process.env.DIARYDOCK_INBOUND_EMAIL_DOMAIN;
  process.env.DIARYDOCK_INBOUND_EMAIL_DOMAIN = "inbound.diarydock.test";

  try {
    assert.equal(verifyInboundEmailAddress("hello@example.com", SECRET), null);
    assert.equal(
      verifyInboundEmailAddress(
        `import+${USER_ID}.${createInboundEmailToken(USER_ID, SECRET)}@example.com`,
        SECRET,
      ),
      null,
    );
  } finally {
    if (previousDomain === undefined) {
      delete process.env.DIARYDOCK_INBOUND_EMAIL_DOMAIN;
    } else {
      process.env.DIARYDOCK_INBOUND_EMAIL_DOMAIN = previousDomain;
    }
  }
});
