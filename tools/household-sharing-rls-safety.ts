export type RlsTargetSafetyInput = {
  testUrl: string;
  confirmation: string | undefined;
  linkedUrl?: string;
  linkedProjectRef?: string;
  allowLinkedProject?: boolean;
};

export type RlsTargetSafetyResult = {
  host: string;
  isLocal: boolean;
  projectRef: string | null;
};

function normalizedUrl(value: string) {
  return value.trim().replace(/\/+$/, "").toLowerCase();
}

export function assertDisposableRlsTarget({
  testUrl,
  confirmation,
  linkedUrl,
  linkedProjectRef,
  allowLinkedProject = false,
}: RlsTargetSafetyInput): RlsTargetSafetyResult {
  if (confirmation !== "disposable") {
    throw new Error(
      "Set DIARYDOCK_RLS_TEST_CONFIRM=disposable to confirm this project contains no production data.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(testUrl);
  } catch {
    throw new Error("DIARYDOCK_RLS_SUPABASE_URL must be a valid URL.");
  }

  const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  const projectRef = parsed.hostname.endsWith(".supabase.co")
    ? parsed.hostname.slice(0, -".supabase.co".length)
    : null;

  if (!isLocal && !projectRef) {
    throw new Error("The RLS test target must be local Supabase or a *.supabase.co project.");
  }

  const matchesLinkedUrl = Boolean(
    linkedUrl && normalizedUrl(linkedUrl) === normalizedUrl(testUrl),
  );
  const matchesLinkedRef = Boolean(
    projectRef && linkedProjectRef && projectRef === linkedProjectRef.trim().toLowerCase(),
  );

  if ((matchesLinkedUrl || matchesLinkedRef) && !allowLinkedProject) {
    throw new Error(
      "Refusing to run against the currently linked Supabase project. Use a disposable project, or set DIARYDOCK_RLS_ALLOW_LINKED_PROJECT=true only when the linked project is disposable.",
    );
  }

  return { host: parsed.host, isLocal, projectRef };
}
