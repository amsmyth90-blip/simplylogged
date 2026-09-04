export class ExternalResponseError extends Error {}

function responseMediaType(response: Response) {
  return (response.headers.get("content-type") ?? "").split(";", 1)[0]!.trim().toLowerCase();
}

export async function readBoundedJsonResponse(response: Response, maximumBytes: number) {
  const mediaType = responseMediaType(response);
  if (mediaType !== "application/json" && !mediaType.endsWith("+json")) {
    throw new ExternalResponseError("The external service returned an unsupported response.");
  }
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    await response.body?.cancel().catch(() => undefined);
    throw new ExternalResponseError("The external service response is too large.");
  }
  if (!response.body) throw new ExternalResponseError("The external service returned an empty response.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel().catch(() => undefined);
      throw new ExternalResponseError("The external service response is too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new ExternalResponseError("The external service returned invalid JSON.");
  }
}
