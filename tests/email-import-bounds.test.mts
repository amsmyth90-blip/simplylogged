import assert from "node:assert/strict";
import test from "node:test";
import type { Resend } from "resend";

import {
  MAX_INBOUND_ATTACHMENT_BYTES,
  MAX_INBOUND_ATTACHMENTS,
  MAX_LEGACY_WEBHOOK_BYTES,
  parseInboundPayload,
  parseResendPayload,
} from "../lib/email-import/payload.ts";
import { RequestBodyError } from "../lib/http/bounded-body.ts";

const recipient = "import+11111111-1111-4111-8111-111111111111.tokenvalue123@inbound.diarydock.com";

function jsonRequest(payload: unknown, headers: HeadersInit = {}) {
  return new Request("https://diarydock.com/api/import/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
}

function fakeResend(
  attachments: Array<{ id: string; size: number }>,
  options: { detailSizes?: Record<string, number>; eventAttachments?: Array<{ id: string }> } = {},
) {
  const requested: string[] = [];
  const resend = {
    webhooks: {
      verify: () => ({
        type: "email.received",
        data: { email_id: "email-1", attachments: options.eventAttachments ?? [] },
      }),
    },
    emails: {
      receiving: {
        get: async () => ({
          data: {
            to: [recipient],
            received_for: [recipient],
            subject: "Documents",
            from: "sender@example.com",
            attachments,
          },
          error: null,
        }),
        attachments: {
          get: async ({ id }: { id: string }) => {
            requested.push(id);
            return {
              data: {
                download_url: `https://files.example/${id}`,
                filename: `${id}.pdf`,
                content_type: "application/pdf",
                size: options.detailSizes?.[id] ?? attachments.find((item) => item.id === id)?.size,
              },
              error: null,
            };
          },
        },
      },
    },
  } as unknown as Resend;
  return { resend, requested };
}

test("legacy JSON accepts a valid bounded attachment", async () => {
  const parsed = await parseInboundPayload(jsonRequest({
    to: recipient,
    subject: "Policy",
    attachments: [{ filename: "policy.pdf", contentType: "application/pdf", contentBase64: "AQID" }],
  }), async () => undefined);

  assert.equal(parsed.recipientText, recipient);
  assert.equal(parsed.attachments.length, 1);
  assert.equal(parsed.attachments[0]?.size, 3);
});

test("legacy parser rejects unsupported media types", async () => {
  const request = new Request("https://diarydock.com/api/import/email", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "hello",
  });
  await assert.rejects(
    () => parseInboundPayload(request, async () => undefined),
    (error: unknown) => error instanceof RequestBodyError && error.status === 415,
  );
});

test("legacy parser enforces streamed bytes despite a dishonest length", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(MAX_LEGACY_WEBHOOK_BYTES));
      controller.enqueue(new Uint8Array(1));
      controller.close();
    },
  });
  const request = new Request("https://diarydock.com/api/import/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": "1" },
    body: stream,
    duplex: "half",
  } as RequestInit);

  await assert.rejects(
    () => parseInboundPayload(request, async () => undefined),
    (error: unknown) => error instanceof RequestBodyError && error.status === 413,
  );
});

test("legacy parser rejects decoded attachment bytes above the total budget", async () => {
  const encoded = Buffer.alloc(MAX_INBOUND_ATTACHMENT_BYTES + 1, 1).toString("base64");
  const request = jsonRequest({
    to: recipient,
    attachments: [{ filename: "large.pdf", contentType: "application/pdf", contentBase64: encoded }],
  });

  await assert.rejects(
    () => parseInboundPayload(request, async () => undefined),
    (error: unknown) => error instanceof RequestBodyError && error.status === 413,
  );
});

test("legacy parser rejects attachment counts above the fixed ceiling", async () => {
  const attachments = Array.from({ length: MAX_INBOUND_ATTACHMENTS + 1 }, (_, index) => ({
    filename: `${index}.pdf`,
    contentType: "application/pdf",
    contentBase64: "AQ==",
  }));
  await assert.rejects(
    () => parseInboundPayload(jsonRequest({ to: recipient, attachments }), async () => undefined),
    (error: unknown) => error instanceof RequestBodyError && error.status === 413,
  );
});

test("legacy multipart is streamed without the framework form-data materializer", async () => {
  const form = new FormData();
  form.append("to", recipient);
  form.append("attachment", new Blob([new Uint8Array([1, 2, 3])], { type: "application/pdf" }), "policy.pdf");
  const request = new Request("https://diarydock.com/api/import/email", { method: "POST", body: form });
  const originalFormData = Response.prototype.formData;
  Response.prototype.formData = async () => { throw new Error("framework parser used"); };
  try {
    const parsed = await parseInboundPayload(request, async () => undefined);
    assert.equal(parsed.attachments.length, 1);
    assert.equal(parsed.attachments[0]?.size, 3);
  } finally {
    Response.prototype.formData = originalFormData;
  }
});

test("legacy multipart rejects excessive parts at the streaming parser", async () => {
  const form = new FormData();
  form.append("to", recipient);
  for (let index = 0; index <= MAX_INBOUND_ATTACHMENTS; index += 1) {
    form.append("attachment", new Blob([new Uint8Array([index])]), `${index}.pdf`);
  }
  await assert.rejects(
    () => parseInboundPayload(
      new Request("https://diarydock.com/api/import/email", { method: "POST", body: form }),
      async () => undefined,
    ),
    (error: unknown) => error instanceof RequestBodyError && error.status === 413,
  );
});

test("recipient authorization runs before any Resend attachment lookup", async () => {
  const { resend, requested } = fakeResend([{ id: "a", size: 1 }]);
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response(new Uint8Array([1]));
  };
  try {
    await assert.rejects(
      () => parseResendPayload(jsonRequest({}), resend, "secret", async () => {
        throw new Error("rate limited");
      }),
      /rate limited/,
    );
    assert.deepEqual(requested, []);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Resend metadata prevents downloads that would exceed the aggregate budget", async () => {
  const threeMiB = 3 * 1024 * 1024;
  const twoMiB = 2 * 1024 * 1024;
  const oneMiB = 1024 * 1024;
  const { resend, requested } = fakeResend([
    { id: "a", size: threeMiB },
    { id: "b", size: twoMiB },
    { id: "c", size: oneMiB },
  ]);
  const sizes = new Map([["a", threeMiB], ["b", twoMiB], ["c", oneMiB]]);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const id = new URL(String(input)).pathname.slice(1);
    const size = sizes.get(id) ?? 0;
    return new Response(new Uint8Array(size), { headers: { "Content-Length": String(size) } });
  };
  try {
    const parsed = await parseResendPayload(jsonRequest({}), resend, "secret", async () => undefined);
    assert.deepEqual(requested, ["a", "c"]);
    assert.equal(parsed?.attachments.reduce((total, item) => total + item.size, 0), MAX_INBOUND_ATTACHMENT_BYTES);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Resend event-only attachments obtain authoritative detail size before download", async () => {
  const { resend, requested } = fakeResend([], {
    detailSizes: { a: 3 },
    eventAttachments: [{ id: "a" }],
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(new Uint8Array([1, 2, 3]), {
    headers: { "Content-Length": "3" },
  });
  try {
    const parsed = await parseResendPayload(jsonRequest({}), resend, "secret", async () => undefined);
    assert.deepEqual(requested, ["a"]);
    assert.equal(parsed?.attachments[0]?.size, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Resend detail metadata blocks stale understated list sizes before fetch", async () => {
  const { resend, requested } = fakeResend([{ id: "a", size: 1 }], {
    detailSizes: { a: MAX_INBOUND_ATTACHMENT_BYTES + 1 },
  });
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response(new Uint8Array([1]));
  };
  try {
    const parsed = await parseResendPayload(jsonRequest({}), resend, "secret", async () => undefined);
    assert.deepEqual(requested, ["a"]);
    assert.equal(fetchCalls, 0);
    assert.deepEqual(parsed?.attachments, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
