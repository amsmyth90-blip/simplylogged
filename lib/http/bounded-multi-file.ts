import { Buffer } from "node:buffer";
import { once } from "node:events";

import Busboy from "@fastify/busboy";

import { getRequestMediaType, RequestBodyError } from "./bounded-body.ts";

export type BoundedUploadedFile = {
  bytes: Uint8Array;
  mimeType: string;
  name: string;
};

type MultiFileOptions = {
  fieldName: string;
  maximumFileBytes: number;
  maximumFiles: number;
  maximumTotalBytes: number;
  maximumTransportBytes: number;
};

function assertOptions(options: MultiFileOptions) {
  const values = [
    options.maximumFileBytes,
    options.maximumFiles,
    options.maximumTotalBytes,
    options.maximumTransportBytes,
  ];
  if (!options.fieldName || values.some((value) => !Number.isSafeInteger(value) || value <= 0)
    || options.maximumFileBytes > options.maximumTotalBytes
    || options.maximumTotalBytes > options.maximumTransportBytes) {
    throw new RangeError("The multipart limits are invalid.");
  }
}

export async function readBoundedMultiFile(
  request: Request,
  options: MultiFileOptions,
): Promise<BoundedUploadedFile[]> {
  assertOptions(options);
  if (getRequestMediaType(request) !== "multipart/form-data") {
    throw new RequestBodyError("The request must contain multipart form data.", 415);
  }
  const contentType = request.headers.get("content-type") ?? "";
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > options.maximumTransportBytes) {
    throw new RequestBodyError("The request is too large.", 413);
  }
  if (!request.body) throw new RequestBodyError("The request body is required.", 400);

  let parser: ReturnType<typeof Busboy>;
  try {
    parser = Busboy({
      headers: { "content-type": contentType },
      limits: {
        fieldNameSize: 100,
        fieldSize: 1,
        fields: 0,
        fileSize: options.maximumFileBytes,
        files: options.maximumFiles,
        parts: options.maximumFiles,
        headerPairs: 25,
        headerSize: 8 * 1024,
      },
    });
  } catch {
    throw new RequestBodyError("The request contains invalid form data.", 400);
  }

  const uploads: BoundedUploadedFile[] = [];
  let failure: unknown = null;
  let totalFileBytes = 0;
  let settle: () => void = () => undefined;
  const complete = new Promise<void>((resolve) => { settle = resolve; });
  const fail = (error: unknown) => {
    if (failure) return;
    failure = error;
    parser.destroy();
    settle();
  };

  parser.on("file", (fieldName, stream, filename, _encoding, mimeType) => {
    if (fieldName !== options.fieldName) {
      stream.resume();
      fail(new RequestBodyError("The upload contains unsupported parts.", 400));
      return;
    }
    const chunks: Buffer[] = [];
    let fileBytes = 0;
    stream.on("limit", () => fail(new RequestBodyError("An uploaded file is too large.", 413)));
    stream.on("data", (chunk: Buffer) => {
      if (failure) return;
      fileBytes += chunk.byteLength;
      totalFileBytes += chunk.byteLength;
      if (totalFileBytes > options.maximumTotalBytes) {
        fail(new RequestBodyError("The uploaded files are too large.", 413));
        return;
      }
      chunks.push(chunk);
    });
    stream.on("error", () => fail(new RequestBodyError("The request contains invalid form data.", 400)));
    stream.on("end", () => {
      if (failure || stream.truncated || fileBytes <= 0) return;
      uploads.push({
        bytes: Buffer.concat(chunks, fileBytes),
        mimeType: mimeType || "application/octet-stream",
        name: filename || "upload",
      });
    });
  });
  const tooMany = () => fail(new RequestBodyError("The upload contains too many parts.", 413));
  parser.on("filesLimit", tooMany);
  parser.on("fieldsLimit", tooMany);
  parser.on("partsLimit", tooMany);
  parser.on("error", () => fail(new RequestBodyError("The request contains invalid form data.", 400)));
  parser.on("finish", settle);

  const reader = request.body.getReader();
  let transportBytes = 0;
  try {
    while (!failure) {
      const { done, value } = await reader.read();
      if (done) break;
      transportBytes += value.byteLength;
      if (transportBytes > options.maximumTransportBytes) {
        fail(new RequestBodyError("The request is too large.", 413));
        break;
      }
      const chunk = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
      if (!parser.write(chunk)) await Promise.race([once(parser, "drain"), complete]);
    }
    if (!failure) parser.end();
    else {
      while (transportBytes <= options.maximumTransportBytes) {
        const next = await reader.read().catch(() => ({ done: true as const, value: undefined }));
        if (next.done) break;
        transportBytes += next.value.byteLength;
      }
      if (transportBytes > options.maximumTransportBytes) {
        await reader.cancel().catch(() => undefined);
      }
    }
    await complete;
  } catch {
    fail(new RequestBodyError("The request contains invalid form data.", 400));
  }
  if (failure) throw failure;
  if (!uploads.length) throw new RequestBodyError("The upload must contain a file.", 400);
  return uploads;
}
