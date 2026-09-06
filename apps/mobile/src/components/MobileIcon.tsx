import type { ReactNode } from "react";

export type MobileIconName =
  | "arrow-left"
  | "briefcase"
  | "camera"
  | "calendar"
  | "check"
  | "folder"
  | "home"
  | "leaf"
  | "phone"
  | "plus"
  | "search"
  | "shield"
  | "users";

type Props = {
  className?: string;
  name: MobileIconName;
};

export function MobileIcon({ className, name }: Props) {
  const paths: Record<MobileIconName, ReactNode> = {
    "arrow-left": <><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M9 7V5h6v2M3 12h18M10 12v2h4v-2" /></>,
    camera: <><path d="M5 8h3l1.5-2h5L16 8h3a2 2 0 0 1 2 2v8H3v-8a2 2 0 0 1 2-2Z" /><circle cx="12" cy="13" r="3" /></>,
    calendar: <><rect x="4" y="6" width="16" height="14" rx="2" /><path d="M8 4v4M16 4v4M4 10h16" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    folder: <><path d="M3.5 8.5h5l1.5 2h9v7a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z" /><path d="M3.5 8.5v-1a2 2 0 0 1 2-2h3l1.5 2" /></>,
    home: <><path d="m4 11 8-6 8 6" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></>,
    leaf: <><path d="M19 4C11 4 5 8 5 15c0 3 2 5 5 5 7 0 10-8 9-16Z" /><path d="M5 20c3-5 7-8 12-11" /></>,
    phone: <path d="M6 4h3.5l1.5 4-2.2 1.7a12.5 12.5 0 0 0 5.5 5.5L16 13l4 1.5V18a2 2 0 0 1-2 2A14 14 0 0 1 4 6a2 2 0 0 1 2-2Z" />,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
    shield: <path d="M12 4c3 2 5 2.5 7 3v5c0 4-2.5 6.5-7 8-4.5-1.5-7-4-7-8V7c2-.5 4-1 7-3Z" />,
    users: <><circle cx="8" cy="9" r="3" /><circle cx="16" cy="9" r="3" /><path d="M3.5 19a4.5 4.5 0 0 1 9 0" /><path d="M11.5 19a4.5 4.5 0 0 1 9 0" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      {paths[name]}
    </svg>
  );
}
