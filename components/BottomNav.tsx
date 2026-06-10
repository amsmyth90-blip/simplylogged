"use client";

import Link from "next/link";
import { Archive, Bell, Home, Plus, Users } from "lucide-react";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Vault", href: "/vault", icon: Archive },
  { label: "Reminders", href: "/reminders", icon: Bell },
  { label: "Family", href: "/family", icon: Users },
];

export function BottomNav() {
  const pathname = usePathname();
  const [home, vault, reminders, family] = navItems;

  return (
    <nav className="safe-area-bottom pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4">
      <div className="glass pointer-events-auto mx-auto grid max-w-md grid-cols-5 items-center rounded-[1.75rem] px-3 py-1.5 text-zinc-800">
        {[home, vault].map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[10px] font-semibold ${
                active ? "text-violet-700" : "text-zinc-700"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/add"
          className="mx-auto -mt-7 grid h-14 w-14 place-items-center rounded-full bg-violet-600 text-white shadow-[0_18px_40px_rgba(109,40,217,0.45)] ring-4 ring-white/55"
          aria-label="Add"
        >
          <Plus className="h-6 w-6" strokeWidth={2.6} />
        </Link>
        {[reminders, family].map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[10px] font-semibold ${
                active ? "text-violet-700" : "text-zinc-700"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
