"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DiaryDockDataProvider } from "@/components/DiaryDockDataProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// A new account gets a new provider, including fresh state and revision tokens.
export function AccountDataBoundary({ children, initialAccountId }: { children: ReactNode; initialAccountId: string | null }) {
  const router = useRouter();
  const [accountId, setAccountId] = useState<string | null>(initialAccountId);
  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    let previousId: string | null = initialAccountId;
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      const nextId = session?.user.id ?? null;
      setAccountId(nextId);
      if (nextId !== previousId) router.refresh();
      previousId = nextId;
    });
    return () => data.subscription.unsubscribe();
  }, [router, initialAccountId]);
  // Server-rendered children must also be replaced before showing another account.
  if (accountId !== initialAccountId) return <p role="status" className="p-8 text-center">Updating your account session…</p>;
  return <DiaryDockDataProvider key={accountId ?? "signed-out"} accountId={accountId}>
    {children}
  </DiaryDockDataProvider>;
}
