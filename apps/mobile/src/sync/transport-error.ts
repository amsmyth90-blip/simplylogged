export class SyncTransportError extends Error {
  readonly retryAfterSeconds: number | null;
  readonly status: number | null;

  constructor(message: string, status: number | null, retryAfterSeconds: number | null) {
    super(message);
    this.name = "SyncTransportError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
