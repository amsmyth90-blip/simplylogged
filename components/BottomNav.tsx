"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { UiIcon, type IconName } from "@/components/UiIcon";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";

type NavItem = {
  id: string;
  href: string;
  label: string;
  icon: IconName;
  central?: boolean;
  badge?: number;
};

const navItems: NavItem[] = [
  { id: "home", href: "/dashboard", label: "Home", icon: "home" },
  { id: "files", href: "/files", label: "All Files", icon: "folder" },
  { id: "add", href: "/capture", label: "Scan", icon: "plus", central: true },
  { id: "reminders", href: "/reminders", label: "Reminders", icon: "calendar", badge: 2 },
  { id: "family", href: "/family", label: "Family Room", icon: "users" }
];

export function BottomNav() {
  const pathname = usePathname();
  const { household } = useDiaryDockData();
  const visibleNavItems =
    household?.role === "viewer"
      ? navItems.filter((item) => item.id === "home" || item.id === "family")
      : navItems;

  const isActive = (item: NavItem) => {
    if (item.central) return pathname.startsWith("/capture");
    if (item.id === "home") {
      return pathname === "/" || pathname === "/dashboard" || pathname.startsWith("/room") || pathname.startsWith("/wills") || pathname.startsWith("/office") || pathname.startsWith("/garage") || pathname.startsWith("/driveway") || pathname.startsWith("/bedroom") || pathname.startsWith("/garden");
    }
    if (item.id === "files") {
      return pathname.startsWith("/files") || pathname.startsWith("/vault") || pathname.startsWith("/document");
    }
    return pathname.startsWith(item.href);
  };

  return (
    <nav className="fixed bottom-[max(1rem,calc(env(safe-area-inset-bottom)+0.875rem))] left-1/2 z-50 w-[calc(100%-1rem)] max-w-[54rem] -translate-x-1/2 rounded-[25px] border border-white/90 bg-white/[0.96] p-1.5 shadow-[0_22px_48px_-24px_rgba(15,23,42,0.48)] backdrop-blur-2xl">
      <ul
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${visibleNavItems.length}, minmax(0, 1fr))` }}
      >
        {visibleNavItems.map((item) => {
          const active = isActive(item);

          return (
            <li key={item.id}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[54px] flex-col items-center justify-center rounded-[18px] px-1.5 text-center text-[10px] font-semibold leading-tight transition ${
                  item.central
                    ? "text-slate-800"
                    : active
                      ? "bg-[#edf4e9] text-[#4f7046] shadow-[inset_0_0_0_1px_rgba(128,160,110,0.14)]"
                      : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {item.central ? (
                  <span className={`mb-0.5 flex h-11 w-11 items-center justify-center rounded-full text-white ring-4 ring-white shadow-[0_16px_28px_-15px_rgba(44,69,48,0.72)] ${active ? "bg-[#769b67]" : "bg-[linear-gradient(145deg,#263b35,#152823)]"}`}>
                    <UiIcon name={item.icon} className="h-5 w-5" />
                  </span>
                ) : (
                  <span className="relative mb-1">
                    <UiIcon name={item.icon} className="h-[19px] w-[19px]" />
                    {item.badge ? (
                      <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm">
                        {item.badge}
                      </span>
                    ) : null}
                  </span>
                )}
                <span className={item.central ? "-mt-0.5" : ""}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
