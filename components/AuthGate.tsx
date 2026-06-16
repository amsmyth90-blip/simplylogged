"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(!isSupabaseConfigured());

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }

    const client = supabase;
    let mounted = true;

    async function checkSession() {
      const { data } = await client.auth.getUser();
      if (!mounted) return;

      if (!data.user) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      setIsReady(true);
    }

    checkSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      setIsReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (!isReady) {
    return (
      <main className="grid min-h-svh place-items-center bg-[#f7efe3] px-6 text-center text-[#251a12]">
        <div>
          <p className="text-sm font-bold text-stone-500">Simply Logged</p>
          <h1 className="mt-2 text-xl font-black">Opening your estate...</h1>
        </div>
      </main>
    );
  }

  return children;
}
