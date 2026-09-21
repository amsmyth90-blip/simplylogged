export type EnvironmentSource = Readonly<Record<string, string | undefined>>;

export type EnvironmentIssue = {
  key: string;
  reason: string;
};

const publicKeyName = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY";

function value(environment: EnvironmentSource, key: string) {
  return environment[key]?.trim() ?? "";
}

function issue(key: string, reason: string): EnvironmentIssue {
  return { key, reason };
}

function jwtRole(token: string) {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as { role?: unknown };
    return typeof parsed.role === "string" ? parsed.role : null;
  } catch {
    return null;
  }
}

function publicSupabaseKeyIsValid(key: string) {
  if (key.length < 20 || key.length > 2_048) return false;
  if (key.startsWith("sb_publishable_")) return /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
  return jwtRole(key) === "anon";
}

function serviceSupabaseKeyIsValid(key: string) {
  if (key.length < 20 || key.length > 2_048) return false;
  if (key.startsWith("sb_secret_")) return /^sb_secret_[A-Za-z0-9_-]+$/.test(key);
  return jwtRole(key) === "service_role";
}

function httpsOriginIsValid(input: string) {
  try {
    const url = new URL(input);
    return url.protocol === "https:"
      && !url.username
      && !url.password
      && url.pathname === "/"
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}

function httpsEndpointIsValid(input: string) {
  try {
    const url = new URL(input);
    return url.protocol === "https:"
      && !url.username
      && !url.password
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}

function secretIsValid(secret: string) {
  return secret.length >= 32 && secret.length <= 512;
}

function adminEmailsAreValid(input: string) {
  const emails = input.split(",").map((email) => email.trim()).filter(Boolean);
  return emails.length > 0 && emails.length <= 20
    && emails.every((email) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

export function inspectProductionRuntimeEnvironment(environment: EnvironmentSource) {
  const issues: EnvironmentIssue[] = [];
  const supabaseUrl = value(environment, "NEXT_PUBLIC_SUPABASE_URL");
  const publicKey = value(environment, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
    || value(environment, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceKey = value(environment, "SUPABASE_SERVICE_ROLE_KEY");
  const cursorSecret = value(environment, "DIARYDOCK_SYNC_CURSOR_SECRET");
  const scannerRequired = value(environment, "DIARYDOCK_CAPTURE_SCANNER_REQUIRED");
  const scannerUrl = value(environment, "DIARYDOCK_MALWARE_SCANNER_URL");
  const scannerToken = value(environment, "DIARYDOCK_MALWARE_SCANNER_TOKEN");
  const distributedRateLimitRequired = value(environment, "DIARYDOCK_DISTRIBUTED_RATE_LIMIT_REQUIRED");
  const upstashCredentialsPresent = Boolean(value(environment, "UPSTASH_REDIS_REST_URL")
    || value(environment, "UPSTASH_REDIS_REST_TOKEN"));
  const redisUrlKey = upstashCredentialsPresent ? "UPSTASH_REDIS_REST_URL" : "KV_REST_API_URL";
  const redisTokenKey = upstashCredentialsPresent ? "UPSTASH_REDIS_REST_TOKEN" : "KV_REST_API_TOKEN";
  const redisUrl = value(environment, redisUrlKey);
  const redisToken = value(environment, redisTokenKey);
  const rateLimitNamespace = value(environment, "DIARYDOCK_RATE_LIMIT_NAMESPACE");

  if (!httpsOriginIsValid(supabaseUrl)) {
    issues.push(issue("NEXT_PUBLIC_SUPABASE_URL", "must be a credential-free HTTPS origin"));
  }
  if (!publicSupabaseKeyIsValid(publicKey)) {
    issues.push(issue(publicKeyName, "must be a Supabase publishable or anon credential"));
  }
  if (!serviceSupabaseKeyIsValid(serviceKey) || serviceKey === publicKey) {
    issues.push(issue("SUPABASE_SERVICE_ROLE_KEY", "must be a distinct Supabase server credential"));
  }
  if (!secretIsValid(cursorSecret)) {
    issues.push(issue("DIARYDOCK_SYNC_CURSOR_SECRET", "must contain 32 to 512 characters"));
  }
  if (scannerRequired !== "true" && scannerRequired !== "false") {
    issues.push(issue("DIARYDOCK_CAPTURE_SCANNER_REQUIRED", "must be explicitly true or false"));
  }
  if (scannerRequired === "true") {
    if (!httpsEndpointIsValid(scannerUrl)) {
      issues.push(issue("DIARYDOCK_MALWARE_SCANNER_URL", "must be a credential-free HTTPS endpoint"));
    }
    if (!secretIsValid(scannerToken)) {
      issues.push(issue("DIARYDOCK_MALWARE_SCANNER_TOKEN", "must contain 32 to 512 characters"));
    }
  }
  if (distributedRateLimitRequired !== "true" && distributedRateLimitRequired !== "false") {
    issues.push(issue(
      "DIARYDOCK_DISTRIBUTED_RATE_LIMIT_REQUIRED",
      "must be explicitly true or false",
    ));
  }
  if (distributedRateLimitRequired === "true" || redisUrl || redisToken) {
    if (!httpsOriginIsValid(redisUrl)) {
      issues.push(issue(redisUrlKey, "must be a credential-free HTTPS origin"));
    }
    if (redisToken.length < 20 || redisToken.length > 2_048) {
      issues.push(issue(redisTokenKey, "must contain 20 to 2,048 characters"));
    }
    if (!/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/.test(rateLimitNamespace)) {
      issues.push(issue(
        "DIARYDOCK_RATE_LIMIT_NAMESPACE",
        "must contain 1 to 32 lowercase letters, numbers or interior hyphens",
      ));
    }
  }
  if ([serviceKey, cursorSecret, scannerToken, redisToken].filter(Boolean).length
    !== new Set([serviceKey, cursorSecret, scannerToken, redisToken].filter(Boolean)).size) {
    issues.push(issue("server secrets", "must use separate credentials for separate trust boundaries"));
  }
  return issues;
}

export function inspectProductionReleaseEnvironment(environment: EnvironmentSource) {
  const issues = inspectProductionRuntimeEnvironment(environment);
  const deletionToken = value(environment, "ACCOUNT_DELETION_ADMIN_TOKEN");
  const cronSecret = value(environment, "CRON_SECRET");
  const inboundReady = value(environment, "DIARYDOCK_INBOUND_EMAIL_PROVIDER_READY");
  const scannerRequired = value(environment, "DIARYDOCK_CAPTURE_SCANNER_REQUIRED");
  const distributedRateLimitRequired = value(environment, "DIARYDOCK_DISTRIBUTED_RATE_LIMIT_REQUIRED");
  const rateLimitNamespace = value(environment, "DIARYDOCK_RATE_LIMIT_NAMESPACE");

  if (!secretIsValid(deletionToken)) {
    issues.push(issue("ACCOUNT_DELETION_ADMIN_TOKEN", "must contain 32 to 512 characters"));
  }
  if (!secretIsValid(cronSecret)) {
    issues.push(issue("CRON_SECRET", "must contain 32 to 512 characters"));
  }
  if (!adminEmailsAreValid(value(environment, "ACCOUNT_DELETION_ADMIN_EMAILS"))) {
    issues.push(issue("ACCOUNT_DELETION_ADMIN_EMAILS", "must contain at least one valid administrator email"));
  }
  if (value(environment, "OPENAI_API_KEY").length < 20) {
    issues.push(issue("OPENAI_API_KEY", "must be configured for the shipped AI features"));
  }
  if (inboundReady !== "true" && inboundReady !== "false") {
    issues.push(issue("DIARYDOCK_INBOUND_EMAIL_PROVIDER_READY", "must be explicitly true or false"));
  }
  if (scannerRequired === "false") {
    issues.push(issue(
      "DIARYDOCK_CAPTURE_SCANNER_REQUIRED",
      "must be true for production releases",
    ));
  }
  if (distributedRateLimitRequired === "false") {
    issues.push(issue(
      "DIARYDOCK_DISTRIBUTED_RATE_LIMIT_REQUIRED",
      "must be true for production releases",
    ));
  }
  if (rateLimitNamespace !== "production") {
    issues.push(issue(
      "DIARYDOCK_RATE_LIMIT_NAMESPACE",
      "must be production for production releases",
    ));
  }
  if (inboundReady === "true") {
    for (const key of ["RESEND_API_KEY", "RESEND_WEBHOOK_SECRET", "DIARYDOCK_INBOUND_EMAIL_SECRET"]) {
      if (!secretIsValid(value(environment, key))) {
        issues.push(issue(key, "must contain 32 to 512 characters when inbound email is enabled"));
      }
    }
    const domain = value(environment, "DIARYDOCK_INBOUND_EMAIL_DOMAIN");
    if (!domain || domain.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain)) {
      issues.push(issue("DIARYDOCK_INBOUND_EMAIL_DOMAIN", "must be a valid domain when inbound email is enabled"));
    }
  }
  if ([deletionToken, cronSecret, value(environment, "DIARYDOCK_MALWARE_SCANNER_TOKEN"),
    value(environment, "DIARYDOCK_SYNC_CURSOR_SECRET")].filter(Boolean).length
    !== new Set([deletionToken, cronSecret, value(environment, "DIARYDOCK_MALWARE_SCANNER_TOKEN"),
      value(environment, "DIARYDOCK_SYNC_CURSOR_SECRET")].filter(Boolean)).size) {
    issues.push(issue("privileged operation secrets", "must use separate credentials"));
  }
  return issues;
}
