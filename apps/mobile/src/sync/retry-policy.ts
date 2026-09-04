import { SyncTransportError } from "./transport-error.ts";

const minimumDelaySeconds = 5;
const maximumDelaySeconds = 15 * 60;

function boundedRandom(random: () => number) {
  const value = random();
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5;
}

export function syncRetryDelaySeconds(
  error: unknown,
  attemptCount: number,
  random: () => number = Math.random,
) {
  if (error instanceof SyncTransportError && error.retryAfterSeconds !== null) {
    return Math.min(3_600, Math.max(minimumDelaySeconds, error.retryAfterSeconds));
  }
  const attempt = Math.min(8, Math.max(1, Math.floor(attemptCount)));
  const ceiling = Math.min(maximumDelaySeconds, minimumDelaySeconds * (2 ** attempt));
  const floor = Math.max(minimumDelaySeconds, Math.floor(ceiling / 2));
  return Math.round(floor + ((ceiling - floor) * boundedRandom(random)));
}
