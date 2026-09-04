import { requestSignal } from "./request-deadline.ts";

export const SUPABASE_REQUEST_TIMEOUT_MS = 60_000;

function requestCancellation(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.signal) return init.signal;
  return input instanceof Request ? input.signal : undefined;
}

export function boundedSupabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  return fetch(input, {
    ...init,
    signal: requestSignal(
      requestCancellation(input, init),
      SUPABASE_REQUEST_TIMEOUT_MS,
    ),
  });
}
