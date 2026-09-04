export class UploadTransportError extends Error {
  readonly status: number | null;
  readonly retryAfterSeconds: number | null;
  readonly permanent: boolean;

  constructor(
    message: string,
    status: number | null,
    retryAfterSeconds: number | null,
    permanent: boolean,
  ) {
    super(message);
    this.name = "UploadTransportError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
    this.permanent = permanent;
  }
}
