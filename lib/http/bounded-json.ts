import {
  getRequestMediaType,
  readBoundedBody,
  RequestBodyError,
} from "./bounded-body.ts";

export { RequestBodyError } from "./bounded-body.ts";

export async function readBoundedJson(request: Request, maximumBytes: number): Promise<unknown> {
  if (getRequestMediaType(request) !== "application/json") {
    throw new RequestBodyError("The request must contain JSON.", 415);
  }
  const bytes = await readBoundedBody(request, maximumBytes);
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return JSON.parse(text) as unknown;
  } catch {
    throw new RequestBodyError("The request contains invalid JSON.", 400);
  }
}
