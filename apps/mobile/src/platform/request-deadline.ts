const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;

export function requestDeadline(timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300_000) {
    throw new Error("The request deadline is invalid.");
  }
  if (typeof AbortSignal.timeout === "function") return AbortSignal.timeout(timeoutMs);
  const controller = new AbortController();
  setTimeout(() => controller.abort(new DOMException(
    "The request timed out.",
    "TimeoutError",
  )), timeoutMs);
  return controller.signal;
}

export function requestSignal(
  signal?: AbortSignal | null,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
) {
  const deadline = requestDeadline(timeoutMs);
  if (!signal) return deadline;
  const controller = new AbortController();
  const sources = [signal, deadline];
  const stop = () => sources.forEach((source) => source.removeEventListener("abort", abort));
  const abort = (event: Event) => {
    stop();
    controller.abort((event.target as AbortSignal).reason);
  };
  const aborted = sources.find((source) => source.aborted);
  if (aborted) controller.abort(aborted.reason);
  else sources.forEach((source) => source.addEventListener("abort", abort, { once: true }));
  return controller.signal;
}
