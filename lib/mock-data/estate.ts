export type AreaStatus = "ready" | "attention" | "secure";

export type AreaIcon =
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
  | "archive"
  | "map-pin";

export type EstateArea = {
  id: string;
  name: string;
  dashboardLabel?: string;
  domain: string;
  icon: AreaIcon;
  href: string;
  left: string;
  top: string;
  status: AreaStatus;
  badge?: number;
};

/** Single source of truth for the estate map hotspots. */
export const estateAreas: EstateArea[] = [
  { id: "attic", name: "Attic", dashboardLabel: "Memories", domain: "Memories & Legacy", icon: "archive", href: "/room/attic", left: "50%", top: "32%", status: "secure" },
  { id: "bedroom", name: "Bedroom", dashboardLabel: "Health", domain: "Personal & Health", icon: "bed", href: "/room/bedroom", left: "25%", top: "43%", status: "ready" },
  { id: "office", name: "Office", dashboardLabel: "Documents", domain: "Legal & Documents", icon: "briefcase", href: "/room/office", left: "54%", top: "43%", status: "secure" },
  { id: "family-room", name: "Family Room", dashboardLabel: "Family", domain: "Family & Relationships", icon: "users", href: "/family", left: "25%", top: "55%", status: "ready" },
  { id: "kitchen", name: "Kitchen", dashboardLabel: "Home", domain: "Household Planning", icon: "home", href: "/room/kitchen", left: "55%", top: "55%", status: "secure" },
  { id: "garage", name: "Garage", dashboardLabel: "Vehicles", domain: "Vehicles & Transport", icon: "car", href: "/room/garage", left: "82%", top: "55%", status: "attention" },
  { id: "mailbox", name: "Mailbox", dashboardLabel: "Inbox", domain: "Incoming & To File", icon: "mail", href: "/intake", left: "20%", top: "76%", status: "attention", badge: 4 },
  { id: "garden", name: "Garden", dashboardLabel: "Pets", domain: "Pets & Outdoor", icon: "leaf", href: "/room/garden", left: "21%", top: "67%", status: "ready" },
  { id: "driveway", name: "Driveway", dashboardLabel: "Travel", domain: "Travel & Access", icon: "map-pin", href: "/room/driveway", left: "82%", top: "65%", status: "attention" },
  { id: "front-gate", name: "Front Gate", dashboardLabel: "Settings", domain: "Access & Security", icon: "lock", href: "/settings", left: "50%", top: "83%", status: "secure" }
];

/* ------------------------------------------------------------------ */
/* Rooms                                                               */
/* ------------------------------------------------------------------ */
