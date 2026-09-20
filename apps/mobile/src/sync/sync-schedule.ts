const minimumDelayMs = 4 * 60_000;
const maximumDelayMs = 6 * 60_000;
const maximumWakeDelayMs = 30_000;

function boundedRandom(random: () => number) {
  const value = random();
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5;
}

export function nextBackgroundSyncDelay(random: () => number = Math.random) {
  return Math.round(minimumDelayMs + ((maximumDelayMs - minimumDelayMs) * boundedRandom(random)));
}

export function nextWakeSyncDelay(random: () => number = Math.random) {
  return Math.round(maximumWakeDelayMs * boundedRandom(random));
}
