function message(label: string, reason: "empty" | "large") {
  return reason === "empty"
    ? `The ${label} response is empty.`
    : `The ${label} is too large to open safely.`;
}

export async function readBoundedResponseBytes(
  response: Response,
  maximumBytes: number,
  label = "file",
) {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
    throw new Error("The response byte limit is invalid.");
  }
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maximumBytes) {
    throw new Error(message(label, "large"));
  }
  if (!response.body) throw new Error(message(label, "empty"));
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel().catch(() => undefined);
      throw new Error(message(label, "large"));
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return bytes;
}
