import type { ReactNode } from "react";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-svh bg-[#f5efe6] pb-[calc(8rem+env(safe-area-inset-bottom))] text-[#261c14]">
      {children}
    </main>
  );
}
