export class RequestBodyError extends Error {
  readonly status: 400 | 413 | 415;

  constructor(message: string, status: 400 | 413 | 415) {
    super(message);
    this.name = "RequestBodyError";
    this.status = status;
  }
}

export function getRequestMediaType(request: Request) {
  return (request.headers.get("content-type") ?? "")
    .split(";", 1)[0]
    ?.trim()
    .toLowerCase() ?? "";
}

export async function readBoundedBody(
  request: Request,
  maximumBytes: number,
): Promise<Uint8Array> {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes <= 0) {
    throw new RangeError("The request body limit must be a positive safe integer.");
  }
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new RequestBodyError("The request is too large.", 413);
  }
  if (!request.body) throw new RequestBodyError("The request body is required.", 400);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      throw new RequestBodyError("The request is too large.", 413);
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
