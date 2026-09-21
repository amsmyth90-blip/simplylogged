import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

type DistributedConfiguration =
  | { state: "missing" }
  | { state: "invalid" }
  | { state: "configured"; namespace: string; token: string; url: string };

type LimitResponse = {
  limit: number;
  reason?: "timeout" | "cacheBlock" | "denyList";
  remaining: number;
  reset: number;
  success: boolean;
};

export type ServerRateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  unavailable?: boolean;
};

const limiters = new Map<string, Ratelimit>();
const redisClients = new Map<string, Redis>();

function rateLimitNamespace(environment: EnvironmentSource) {
  const configured = environment.DIARYDOCK_RATE_LIMIT_NAMESPACE?.trim();
  if (configured) return configured;
  if (environment.VERCEL_ENV === "production") return "production";
  if (environment.VERCEL_ENV === "preview") return "preview";
  if (environment.NODE_ENV === "test") return "test";
  return "development";
}

function namespaceIsValid(namespace: string) {
  return /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/.test(namespace);
}

function redisCredentials(environment: EnvironmentSource) {
  const upstashUrl = environment.UPSTASH_REDIS_REST_URL?.trim() ?? "";
  const upstashToken = environment.UPSTASH_REDIS_REST_TOKEN?.trim() ?? "";
  if (upstashUrl || upstashToken) return { token: upstashToken, url: upstashUrl };
  return {
    token: environment.KV_REST_API_TOKEN?.trim() ?? "",
    url: environment.KV_REST_API_URL?.trim() ?? "",
  };
}

function validUrl(input: string) {
  try {
    const url = new URL(input);
    return url.protocol === "https:" && !url.username && !url.password
      && url.pathname === "/" && !url.search && !url.hash;
  } catch {
    return false;
  }
}

export function inspectDistributedRateLimitConfiguration(
  environment: EnvironmentSource = process.env,
): DistributedConfiguration {
  const { token, url } = redisCredentials(environment);
  if (!url && !token) return { state: "missing" };
  const namespace = rateLimitNamespace(environment);
  if (!validUrl(url) || token.length < 20 || token.length > 2_048
    || !namespaceIsValid(namespace)) return { state: "invalid" };
  return { state: "configured", namespace, token, url };
}

export function selectServerRateLimitBackend(environment: EnvironmentSource = process.env) {
  const configuration = inspectDistributedRateLimitConfiguration(environment);
  if (configuration.state === "configured") return "distributed" as const;
  if (configuration.state === "invalid"
    || environment.DIARYDOCK_DISTRIBUTED_RATE_LIMIT_REQUIRED === "true") {
    return "unavailable" as const;
  }
  return "database" as const;
}

export function toDistributedRateLimitResult(
  response: LimitResponse,
  now: number = Date.now(),
): ServerRateLimitResult {
  if (response.reason === "timeout") {
    return { allowed: false, remaining: 0, retryAfterSeconds: 60, unavailable: true };
  }
  return {
    allowed: response.success,
    remaining: Math.max(0, response.remaining),
    retryAfterSeconds: response.success
      ? 0
      : Math.max(1, Math.ceil((response.reset - now) / 1_000)),
  };
}

function limiterFor(configuration: Extract<DistributedConfiguration, { state: "configured" }>, options: {
  limit: number;
  windowMs: number;
}) {
  const cacheKey = `${configuration.url}\u001f${configuration.token}\u001f${configuration.namespace}`
    + `\u001f${options.limit}\u001f${options.windowMs}`;
  const existing = limiters.get(cacheKey);
  if (existing) return existing;
  const redis = redisFor(configuration);
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(options.limit, `${options.windowMs} ms` as Duration),
    prefix: `diarydock:${configuration.namespace}:rate-limit:v1:${options.limit}:${options.windowMs}`,
    analytics: false,
    enableTelemetry: false,
    timeout: 1_000,
  });
  limiters.set(cacheKey, limiter);
  return limiter;
}

function redisFor(configuration: Extract<DistributedConfiguration, { state: "configured" }>) {
  const cacheKey = `${configuration.url}\u001f${configuration.token}`;
  const existing = redisClients.get(cacheKey);
  if (existing) return existing;
  const redis = new Redis({
    url: configuration.url,
    token: configuration.token,
    responseEncoding: false,
    retry: false,
  });
  redisClients.set(cacheKey, redis);
  return redis;
}

export async function checkDistributedRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
  environment: EnvironmentSource = process.env,
): Promise<ServerRateLimitResult | null> {
  const configuration = inspectDistributedRateLimitConfiguration(environment);
  if (configuration.state !== "configured") return null;
  try {
    const response = await limiterFor(configuration, options).limit(key);
    return toDistributedRateLimitResult(response);
  } catch {
    return { allowed: false, remaining: 0, retryAfterSeconds: 60, unavailable: true };
  }
}

export async function distributedRateLimitReady(
  environment: EnvironmentSource = process.env,
  timeoutMs: number = 1_000,
) {
  const configuration = inspectDistributedRateLimitConfiguration(environment);
  if (configuration.state === "missing") {
    return environment.DIARYDOCK_DISTRIBUTED_RATE_LIMIT_REQUIRED !== "true";
  }
  if (configuration.state === "invalid") return false;

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      redisFor(configuration).ping().then((result) => result === "PONG").catch(() => false),
      new Promise<false>((resolve) => {
        timeout = setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
