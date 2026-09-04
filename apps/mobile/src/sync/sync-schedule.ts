const minimumDelayMs = 4 * 60_000;
const maximumDelayMs = 6 * 60_000;

export function nextBackgroundSyncDelay(random: () => number = Math.random) {
  const value = random();
  const bounded = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5;
  return Math.round(minimumDelayMs + ((maximumDelayMs - minimumDelayMs) * bounded));
}
