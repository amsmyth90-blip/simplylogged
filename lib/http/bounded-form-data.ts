import {
  getRequestMediaType,
  readBoundedBody,
  RequestBodyError,
} from "./bounded-body.ts";

export { RequestBodyError } from "./bounded-body.ts";

export async function readBoundedFormData(
  request: Request,
  maximumBytes: number,
): Promise<FormData> {
  const contentType = request.headers.get("content-type") ?? "";
  if (getRequestMediaType(request) !== "multipart/form-data") {
    throw new RequestBodyError("The request must contain multipart form data.", 415);
  }
  const bytes = await readBoundedBody(request, maximumBytes);
  try {
    return await new Response(bytes, {
      headers: { "Content-Type": contentType },
    }).formData();
  } catch {
    throw new RequestBodyError("The request contains invalid form data.", 400);
  }
}
