import type { ReactNode } from "react";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-svh bg-[#f5efe6] pb-28 text-[#261c14]">
      {children}
    </main>
  );
}
