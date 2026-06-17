"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient, getSupabaseConfigurationError, isSupabaseConfigured } from "@/lib/supabase/client";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [configError] = useState(getSupabaseConfigurationError);
  const [isReady, setIsReady] = useState(!configError && !isSupabaseConfigured());

  useEffect(() => {
    if (configError) {
      return;
    }

    let supabase = null;
    try {
      supabase = getSupabaseClient();
    } catch {
      return;
    }

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
  }, [configError, pathname, router]);

  if (configError) {
    return (
      <main className="grid min-h-svh place-items-center bg-[#f7efe3] px-6 text-center text-[#251a12]">
        <section className="max-w-md rounded-[1.5rem] bg-white p-5 shadow-xl shadow-stone-300/50">
          <p className="text-sm font-bold text-rose-700">Supabase setup error</p>
          <h1 className="mt-2 text-xl font-black">Configuration needs attention</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">{configError}</p>
        </section>
      </main>
    );
  }

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
