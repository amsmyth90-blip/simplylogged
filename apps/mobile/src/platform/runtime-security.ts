export type SecureRuntime = {
  apiOrigin: URL;
};

type RuntimeInput = {
  apiOrigin: string;
  isProduction: boolean;
};

const allowedProductionHosts = new Set([
  "diarydock.com",
  "www.diarydock.com",
]);

let cachedRuntime: SecureRuntime | null = null;

export function assertSecureRuntime(input: RuntimeInput): SecureRuntime {
  const apiOrigin = new URL(input.apiOrigin);

  if (input.isProduction && apiOrigin.protocol !== "https:") {
    throw new Error("Production API traffic requires HTTPS.");
  }

  if (input.isProduction && !allowedProductionHosts.has(apiOrigin.hostname)) {
    throw new Error("The production API host is not approved.");
  }

  if (apiOrigin.username || apiOrigin.password || apiOrigin.pathname !== "/") {
    throw new Error("The API origin must not include credentials or a path.");
  }

  return { apiOrigin };
}

export function getSecureRuntime() {
  cachedRuntime ??= assertSecureRuntime({
    apiOrigin: import.meta.env.VITE_API_ORIGIN ?? "https://diarydock.com",
    isProduction: import.meta.env.PROD,
  });
  return cachedRuntime;
}
