export type IconName =
  | "mail"
  | "leaf"
  | "home"
  | "shield"
  | "briefcase"
  | "car"
  | "users"
  | "bed"
  | "chart"
  | "lock"
  | "search"
  | "bell"
  | "sun"
  | "chevron-right"
  | "chevron-down"
  | "arrow-left"
  | "plus"
  | "folder"
  | "check"
  | "calendar"
  | "archive"
  | "map-pin"
  | "phone"
  | "heart"
  | "star"
  | "file"
  | "clock"
  | "gear"
  | "alert"
  | "share";

type UiIconProps = {
  name: IconName;
  className?: string;
};

export function UiIcon({ name, className = "h-5 w-5" }: UiIconProps) {
  const shared = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  switch (name) {
    case "mail":
      return (
        <svg {...shared}>
          <path d="M4 7h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
          <path d="m4 8 8 6 8-6" />
        </svg>
      );
    case "leaf":
      return (
        <svg {...shared}>
          <path d="M5 12c0-4.5 4.5-7 12-7 0 7.5-2.5 12-7 12-3 0-5-2-5-5Z" />
          <path d="M8 20c0-4 2.5-7.5 8-10.5" />
        </svg>
      );
    case "home":
      return (
        <svg {...shared}>
          <path d="m4 11 8-6 8 6" />
          <path d="M6 10v9h12v-9" />
          <path d="M10 19v-5h4v5" />
        </svg>
      );
    case "shield":
      return (
        <svg {...shared}>
          <path d="M12 4c3 2 5 2.5 7 3v5c0 4-2.5 6.5-7 8-4.5-1.5-7-4-7-8V7c2-.5 4-1 7-3Z" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...shared}>
          <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
          <path d="M4 8h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
          <path d="M4 12h16" />
        </svg>
      );
    case "car":
      return (
        <svg {...shared}>
          <path d="M5 16V9l2-3h10l2 3v7" />
          <path d="M3 12h18" />
          <circle cx="7.5" cy="16.5" r="1.5" />
          <circle cx="16.5" cy="16.5" r="1.5" />
        </svg>
      );
    case "users":
      return (
        <svg {...shared}>
          <circle cx="8" cy="9" r="3" />
          <circle cx="16" cy="9" r="3" />
          <path d="M3.5 19a4.5 4.5 0 0 1 9 0" />
          <path d="M11.5 19a4.5 4.5 0 0 1 9 0" />
        </svg>
      );
    case "bed":
      return (
        <svg {...shared}>
          <path d="M4 12h16v5H4z" />
          <path d="M6 12V9h4a2 2 0 0 1 2 2v1" />
          <path d="M4 17v2M20 17v2" />
        </svg>
      );
    case "chart":
      return (
        <svg {...shared}>
          <path d="M5 18V12" />
          <path d="M10 18V8" />
          <path d="M15 18V10" />
          <path d="M20 18V6" />
          <path d="M4 18h17" />
        </svg>
      );
    case "lock":
      return (
        <svg {...shared}>
          <rect x="6" y="11" width="12" height="9" rx="2" />
          <path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11" />
        </svg>
      );
    case "search":
      return (
        <svg {...shared}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
      );
    case "bell":
      return (
        <svg {...shared}>
          <path d="M8 18h8" />
          <path d="M6 18h12l-1.2-1.8a4 4 0 0 1-.8-2.2v-2a4 4 0 1 0-8 0v2a4 4 0 0 1-.8 2.2Z" />
        </svg>
      );
    case "sun":
      return (
        <svg {...shared}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3.5V5" />
          <path d="M12 19v1.5" />
          <path d="M3.5 12H5" />
          <path d="M19 12h1.5" />
          <path d="m5.8 5.8 1.1 1.1" />
          <path d="m17.1 17.1 1.1 1.1" />
          <path d="m18.2 5.8-1.1 1.1" />
          <path d="m6.9 17.1-1.1 1.1" />
        </svg>
      );
    case "chevron-right":
      return (
        <svg {...shared}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg {...shared}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "arrow-left":
      return (
        <svg {...shared}>
          <path d="M19 12H5" />
          <path d="m11 6-6 6 6 6" />
        </svg>
      );
    case "plus":
      return (
        <svg {...shared}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case "folder":
      return (
        <svg {...shared}>
          <path d="M3.5 8.5h5l1.5 2h9v7a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z" />
          <path d="M3.5 8.5v-1a2 2 0 0 1 2-2h3l1.5 2" />
        </svg>
      );
    case "check":
      return (
        <svg {...shared}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12.5 2.3 2.3 4.7-5.1" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...shared}>
          <rect x="4" y="6" width="16" height="14" rx="2" />
          <path d="M8 4v4M16 4v4M4 10h16" />
        </svg>
      );
    case "archive":
      return (
        <svg {...shared}>
          <rect x="3.5" y="5" width="17" height="4" rx="1" />
          <path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
          <path d="M10 13h4" />
        </svg>
      );
    case "map-pin":
      return (
        <svg {...shared}>
          <path d="M12 21c4-4.2 6.5-7.5 6.5-10.7a6.5 6.5 0 1 0-13 0C5.5 13.5 8 16.8 12 21Z" />
          <circle cx="12" cy="10" r="2.4" />
        </svg>
      );
    case "phone":
      return (
        <svg {...shared}>
          <path d="M6 4h3.5l1.5 4-2.2 1.7a12.5 12.5 0 0 0 5.5 5.5L16 13l4 1.5V18a2 2 0 0 1-2 2A14 14 0 0 1 4 6a2 2 0 0 1 2-2Z" />
        </svg>
      );
    case "heart":
      return (
        <svg {...shared}>
          <path d="M12 20c-5-3.4-8-6.4-8-9.9A4.3 4.3 0 0 1 8.3 5.7c1.5 0 2.9.8 3.7 2a4.4 4.4 0 0 1 3.7-2A4.3 4.3 0 0 1 20 10.1c0 3.5-3 6.5-8 9.9Z" />
        </svg>
      );
    case "star":
      return (
        <svg {...shared}>
          <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.3 7.2 18.9l.9-5.4-3.9-3.8 5.4-.8Z" />
        </svg>
      );
    case "file":
      return (
        <svg {...shared}>
          <path d="M7 3.5h7L19 8.5v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" />
          <path d="M13.5 3.5V9H19" />
        </svg>
      );
    case "clock":
      return (
        <svg {...shared}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case "gear":
      return (
        <svg {...shared}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
        </svg>
      );
    case "alert":
      return (
        <svg {...shared}>
          <path d="M12 4 3.5 19h17Z" />
          <path d="M12 10v4" />
          <path d="M12 16.5v.1" />
        </svg>
      );
    case "share":
      return (
        <svg {...shared}>
          <circle cx="6.5" cy="12" r="2.3" />
          <circle cx="17" cy="6" r="2.3" />
          <circle cx="17" cy="18" r="2.3" />
          <path d="m8.6 10.9 6.3-3.7M8.6 13.1l6.3 3.7" />
        </svg>
      );
    default:
      return null;
  }
}
