import { Buffer } from "node:buffer";
import { once } from "node:events";
import Busboy from "@fastify/busboy";

import { RequestBodyError } from "../http/bounded-body.ts";
import type { InboundAttachment } from "./payload.ts";

type MultipartOptions = {
  beforeAttachments(fields: Readonly<Record<string, string>>): Promise<void>;
  maximumAttachmentBytes: number;
  maximumAttachments: number;
  maximumTotalAttachmentBytes: number;
  maximumTransportBytes: number;
};

const recipientFields = new Set(["to", "recipient", "recipients", "envelope"]);

export async function parseBoundedInboundMultipart(request: Request, options: MultipartOptions) {
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
        fieldSize: 16 * 1024,
        fields: 16,
        fileSize: options.maximumAttachmentBytes,
        files: options.maximumAttachments,
        parts: options.maximumAttachments + 16,
        headerPairs: 50,
        headerSize: 16 * 1024,
      },
    });
  } catch {
    throw new RequestBodyError("The request contains invalid form data.", 400);
  }

  const fields: Record<string, string> = {};
  const attachments: InboundAttachment[] = [];
  let authorization: Promise<void> | null = null;
  let failure: unknown = null;
  let filesStarted = false;
  let totalAttachmentBytes = 0;
  let finish: () => void = () => undefined;
  const completed = new Promise<void>((resolve) => { finish = resolve; });
  const fail = (error: unknown) => {
    if (failure) return;
    failure = error;
    parser.destroy();
    finish();
  };
  const authorize = () => {
    authorization ??= options.beforeAttachments(fields);
    return authorization;
  };

  parser.on("field", (name, value, nameTruncated, valueTruncated) => {
    if (nameTruncated || valueTruncated) return fail(new RequestBodyError("The email fields are too large.", 413));
    if (filesStarted && recipientFields.has(name)) {
      return fail(new RequestBodyError("Recipient fields must precede attachments.", 400));
    }
    fields[name] = fields[name] ? `${fields[name]},${value}` : value;
  });
  parser.on("file", (_name, stream, filename, _encoding, mimeType) => {
    filesStarted = true;
    stream.pause();
    void authorize().then(() => {
      if (failure) return stream.resume();
      const chunks: Buffer[] = [];
      let fileBytes = 0;
      stream.on("limit", () => fail(new RequestBodyError("An email attachment is too large.", 413)));
      stream.on("data", (chunk: Buffer) => {
        fileBytes += chunk.byteLength;
        totalAttachmentBytes += chunk.byteLength;
        if (totalAttachmentBytes > options.maximumTotalAttachmentBytes) {
          return fail(new RequestBodyError("The email attachments are too large.", 413));
        }
        chunks.push(chunk);
      });
      stream.on("error", () => fail(new RequestBodyError("The request contains invalid form data.", 400)));
      stream.on("end", () => {
        if (failure || stream.truncated || fileBytes <= 0) return;
        attachments.push({
          name: filename || "forwarded-attachment",
          mimeType: mimeType || "application/octet-stream",
          bytes: Buffer.concat(chunks, fileBytes),
          size: fileBytes,
        });
      });
      stream.resume();
    }).catch(fail);
  });
  const limitFailure = () => fail(new RequestBodyError("The email contains too many parts.", 413));
  parser.on("filesLimit", limitFailure);
  parser.on("fieldsLimit", limitFailure);
  parser.on("partsLimit", limitFailure);
  parser.on("error", () => fail(new RequestBodyError("The request contains invalid form data.", 400)));
  parser.on("finish", () => { void authorize().then(finish).catch(fail); });

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
      if (!parser.write(chunk)) await Promise.race([once(parser, "drain"), completed]);
    }
    if (!failure) {
      parser.end();
    } else {
      while (transportBytes <= options.maximumTransportBytes) {
        const next = await reader.read().catch(() => ({ done: true as const, value: undefined }));
        if (next.done) break;
        transportBytes += next.value.byteLength;
      }
      if (transportBytes > options.maximumTransportBytes) {
        await reader.cancel().catch(() => undefined);
      }
    }
    await completed;
  } catch {
    fail(new RequestBodyError("The request contains invalid form data.", 400));
  }
  if (failure) throw failure;
  return { attachments, fields };
}
