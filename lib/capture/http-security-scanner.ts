import type { CaptureSecurityScanner, CaptureSecurityScanResult } from "./file-security";

type ScannerTransport = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type HttpScannerConfig = {
  endpoint: string;
  token: string;
  timeoutMs?: number;
};

const scannerResponseLimit = 16 * 1024;

function scannerEndpoint(value: string) {
  const url = new URL(value);
  const local = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && local)) {
    throw new Error("The malware scanner endpoint must use HTTPS.");
  }
  if (url.username || url.password || url.hash) throw new Error("The malware scanner endpoint is invalid.");
  return url.toString();
}

async function boundedResponseText(response: Response) {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > scannerResponseLimit) throw new Error("The scanner response is too large.");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > scannerResponseLimit) throw new Error("The scanner response is too large.");
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function scannerResult(value: unknown): CaptureSecurityScanResult {
  if (!value || typeof value !== "object") throw new Error("The scanner response is invalid.");
  const payload = value as Record<string, unknown>;
  if (payload.status !== "PASSED" && payload.status !== "BLOCKED") {
    throw new Error("The scanner response is invalid.");
  }
  const engine = typeof payload.engine === "string" ? payload.engine.trim() : "";
  if (!engine || engine.length > 80) throw new Error("The scanner response is invalid.");
  return { status: payload.status, scanner: engine };
}

export class HttpCaptureSecurityScanner implements CaptureSecurityScanner {
  private readonly config: HttpScannerConfig;
  private readonly endpoint: string;
  private readonly timeoutMs: number;
  private readonly transport: ScannerTransport;

  constructor(
    config: HttpScannerConfig,
    transport: ScannerTransport = fetch,
  ) {
    this.config = config;
    this.transport = transport;
    this.endpoint = scannerEndpoint(config.endpoint);
    if (config.token.length < 32 || config.token.length > 512) {
      throw new Error("The malware scanner credential is invalid.");
    }
    this.timeoutMs = Math.min(60_000, Math.max(1_000, config.timeoutMs ?? 20_000));
  }

  async scan(files: Array<{ bytes: Uint8Array; mimeType: string }>): Promise<CaptureSecurityScanResult> {
    if (!files.length || files.length > 12) return { status: "UNAVAILABLE", scanner: "configured-scanner" };
    const form = new FormData();
    files.forEach((file, index) => {
      const data = file.bytes.buffer.slice(
        file.bytes.byteOffset,
        file.bytes.byteOffset + file.bytes.byteLength,
      ) as ArrayBuffer;
      form.append("files", new Blob([data], { type: file.mimeType }), `document-${index + 1}`);
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.transport(this.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          "X-DiaryDock-Scanner-Contract": "2026-09-01",
        },
        body: form,
        cache: "no-store",
        redirect: "error",
        signal: controller.signal,
      });
      if (!response.ok) return { status: "UNAVAILABLE", scanner: "configured-scanner" };
      return scannerResult(JSON.parse(await boundedResponseText(response)));
    } catch {
      return { status: "UNAVAILABLE", scanner: "configured-scanner" };
    } finally {
      clearTimeout(timer);
    }
  }
}
