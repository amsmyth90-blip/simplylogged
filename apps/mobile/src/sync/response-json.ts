const MAXIMUM_SYNC_RESPONSE_BYTES = 2 * 1024 * 1024;

export async function readSyncResponseJson(response: Response): Promise<unknown> {
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAXIMUM_SYNC_RESPONSE_BYTES) {
    throw new Error("The sync response is too large.");
  }
  if (!response.body) throw new Error("The sync response is empty.");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAXIMUM_SYNC_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("The sync response is too large.");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new Error("The sync response is invalid.");
  }
}
