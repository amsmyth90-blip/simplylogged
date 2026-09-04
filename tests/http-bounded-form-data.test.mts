import assert from "node:assert/strict";
import test from "node:test";

import {
  readBoundedFormData,
  RequestBodyError,
} from "../lib/http/bounded-form-data.ts";

function requestWithStream(
  chunks: Uint8Array[],
  contentType = "multipart/form-data; boundary=diarydock",
) {
  let index = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks[index++];
      if (chunk) controller.enqueue(chunk);
      else controller.close();
    },
  });
  return new Request("https://diarydock.com/api/capture/extract", {
    method: "POST",
    headers: { "Content-Type": contentType },
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

test("bounded form data preserves valid multipart fields", async () => {
  const source = new FormData();
  source.set("mode", "voice");
  source.set("file", new File([new Uint8Array([1, 2, 3])], "note.bin", {
    type: "application/octet-stream",
  }));
  const request = new Request("https://diarydock.com/api/kitchen/noticeboard/extract", {
    method: "POST",
    body: source,
  });
  const parsed = await readBoundedFormData(request, 1_024);
  assert.equal(parsed.get("mode"), "voice");
  assert.equal((parsed.get("file") as File).size, 3);
});

test("bounded form data preserves case-sensitive boundaries at the exact limit", async () => {
  const boundary = "DiaryDockBoundaryABC";
  const bytes = new TextEncoder().encode([
    `--${boundary}`,
    'Content-Disposition: form-data; name="mode"',
    "",
    "photo",
    `--${boundary}--`,
    "",
  ].join("\r\n"));
  const request = requestWithStream(
    [bytes],
    `multipart/form-data; boundary=${boundary}`,
  );
  const parsed = await readBoundedFormData(request, bytes.byteLength);
  assert.equal(parsed.get("mode"), "photo");
});

test("bounded form data rejects a streamed body with no declared length", async () => {
  const request = requestWithStream([
    new Uint8Array(32),
    new Uint8Array(33),
  ]);
  await assert.rejects(
    () => readBoundedFormData(request, 64),
    (error: unknown) => error instanceof RequestBodyError && error.status === 413,
  );
});

test("bounded form data rejects a dishonest declared length", async () => {
  const request = requestWithStream([new Uint8Array(80)]);
  request.headers.set("Content-Length", "8");
  await assert.rejects(
    () => readBoundedFormData(request, 64),
    (error: unknown) => error instanceof RequestBodyError && error.status === 413,
  );
});

test("bounded form data keeps type and syntax failures distinct", async () => {
  const wrongType = requestWithStream([new Uint8Array([1])], "application/json");
  await assert.rejects(
    () => readBoundedFormData(wrongType, 64),
    (error: unknown) => error instanceof RequestBodyError && error.status === 415,
  );

  const misleadingType = requestWithStream(
    [new Uint8Array([1])],
    "multipart/form-datax; boundary=diarydock",
  );
  await assert.rejects(
    () => readBoundedFormData(misleadingType, 64),
    (error: unknown) => error instanceof RequestBodyError && error.status === 415,
  );

  const malformed = requestWithStream([new TextEncoder().encode("not multipart")]);
  await assert.rejects(
    () => readBoundedFormData(malformed, 64),
    (error: unknown) => error instanceof RequestBodyError && error.status === 400,
  );
});
