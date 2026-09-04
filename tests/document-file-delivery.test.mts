import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile document delivery is authenticated, owner-bound and content checked", async () => {
  const route = await read("app/api/mobile/documents/[documentId]/file/route.ts");
  assert.match(route, /authenticateApiRequest\(request\)/);
  assert.match(route, /\.eq\("user_id", auth\.user\.id\)/);
  assert.match(route, /isOwnedDocumentStoragePath\(auth\.user\.id, documentId, path\)/);
  assert.match(route, /validateDocumentUpload/);
  assert.match(route, /inspectCaptureFile/);
  assert.match(route, /X-Content-SHA256/);
  assert.match(route, /mobileCorsHeaders\(request\)/);
  assert.doesNotMatch(route, /request\.json|searchParams.*storage/i);
});

test("the installed client bounds and verifies every downloaded file", async () => {
  const [client, cache, index, bounded] = await Promise.all([
    read("apps/mobile/src/files/document-file-client.ts"),
    read("apps/mobile/src/data/offline/file-cache-repository.ts"),
    read("apps/mobile/index.html"),
    read("apps/mobile/src/platform/bounded-response-bytes.ts"),
  ]);
  assert.match(client, /import \{ MAX_DOCUMENT_BYTES \} from "@diarydock\/documents"/);
  assert.match(client, /readBoundedResponseBytes\(response, MAX_DOCUMENT_BYTES\)/);
  assert.match(client, /x-content-sha256/);
  assert.match(client, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(bounded, /reader\.cancel\(\)/);
  assert.match(cache, /MAX_CACHE_BYTES = 64 \* 1024 \* 1024/);
  assert.match(cache, /offline_file_chunks/);
  assert.match(cache, /rejectCorrupt/);
  assert.match(index, /object-src 'none'/);
  assert.match(index, /frame-src 'self' blob:/);
});
