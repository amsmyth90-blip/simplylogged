import type { AreaIcon, AreaStatus } from "./estate-areas.ts";

export type RoomQuickAction = {
  label: string;
  icon: AreaIcon | "plus" | "share" | "phone" | "calendar";
  href: string;
};

export type RoomProfile = {
  id: string;
  name: string;
  domain: string;
  icon: AreaIcon;
  status: AreaStatus;
  headline: string;
  description: string;
  belongsHere: string[];
  quickActions: RoomQuickAction[];
};

export const roomProfiles: Record<string, RoomProfile> = {
  attic: {
    id: "attic", name: "Attic", domain: "Memories & Legacy", icon: "archive", status: "ready",
    headline: "Family memories, safely archived.",
    description: "Photo archives, keepsakes, and the family story live here — digitised, labelled, and easy to pass on.",
    belongsHere: ["Photo albums", "Family stories", "Keepsakes", "Legacy notes", "Memory scans", "Old letters"],
    quickActions: [
      { label: "Add memory", icon: "plus", href: "/room/attic" },
      { label: "Open All Files", icon: "lock", href: "/files" },
      { label: "Share album", icon: "share", href: "/family" },
    ],
  },
  bedroom: {
    id: "bedroom", name: "Bedroom", domain: "Personal & Health", icon: "bed", status: "ready",
    headline: "Personal records and health plans, in one private place.",
    description: "GP details, prescriptions, and personal notes for each family member — private by default and shared only when you choose.",
    belongsHere: ["Medical records", "Prescriptions", "Health insurance", "Care notes", "GP details", "Wellbeing plans"],
    quickActions: [
      { label: "Add record", icon: "plus", href: "/room/bedroom" },
      { label: "Set reminder", icon: "calendar", href: "/reminders" },
      { label: "Emergency panel", icon: "phone", href: "/emergency" },
    ],
  },
  office: {
    id: "office", name: "Office", domain: "Household Administration", icon: "briefcase", status: "ready",
    headline: "Paperwork handled, then securely filed.",
    description: "Incoming post becomes action here. Finished documents stay securely in All Files and remain linked to the Office.",
    belongsHere: ["Bills to action", "Household forms", "Legal matters", "Renewals", "Identity admin", "Secure file shortcuts"],
    quickActions: [
      { label: "Review incoming post", icon: "mail", href: "/intake" },
      { label: "Office reminders", icon: "calendar", href: "/reminders" },
      { label: "Open All Files", icon: "lock", href: "/files" },
    ],
  },
  "family-room": {
    id: "family-room", name: "Family Room", domain: "Family & Relationships", icon: "users", status: "ready",
    headline: "Your household, together.",
    description: "Household members, invitations, access, weekly routines and shared items needing attention live here.",
    belongsHere: ["Household members", "Invitations", "Access permissions", "Weekly routines", "Family inbox", "Shared responsibilities"],
    quickActions: [
      { label: "Family & access", icon: "users", href: "/family" },
      { label: "Set reminder", icon: "calendar", href: "/reminders" },
      { label: "Add plan", icon: "plus", href: "/room/family-room" },
    ],
  },
  "safe-room": {
    id: "safe-room", name: "Safe Room", domain: "Emergency & Legacy", icon: "shield", status: "ready",
    headline: "Ready when it matters most.",
    description: "Emergency instructions, authority records, and sealed plans — restricted access and ready when needed.",
    belongsHere: ["Emergency plans", "Insurance claim packs", "Authority notes", "Key holder details", "Crisis contacts", "Evacuation info"],
    quickActions: [
      { label: "Emergency panel", icon: "phone", href: "/emergency" },
      { label: "Open All Files", icon: "lock", href: "/files" },
      { label: "Manage access", icon: "users", href: "/family" },
    ],
  },
  garage: {
    id: "garage", name: "Garage", domain: "Vehicles & Transport", icon: "car", status: "ready",
    headline: "Vehicle records, dates and costs in one place.",
    description: "Vehicle papers, service history, insurance and breakdown cover for everything with wheels.",
    belongsHere: ["Car insurance", "MOT records", "Service history", "Breakdown cover", "Vehicle IDs", "Transport renewals"],
    quickActions: [
      { label: "Set reminder", icon: "calendar", href: "/reminders" },
      { label: "Add document", icon: "plus", href: "/files" },
      { label: "Emergency panel", icon: "phone", href: "/emergency" },
    ],
  },
  mailbox: {
    id: "mailbox", name: "Mailbox", domain: "Incoming & To File", icon: "mail", status: "ready",
    headline: "New paperwork starts here.",
    description: "Letters, renewals and notices arrive here first, then get routed to the right room.",
    belongsHere: ["New letters", "Forms to review", "Bills to file", "Statements", "Post awaiting routing", "Scanned mail"],
    quickActions: [
      { label: "Scan a letter", icon: "plus", href: "/room/mailbox" },
      { label: "Open All Files", icon: "lock", href: "/files" },
      { label: "Set reminder", icon: "calendar", href: "/reminders" },
    ],
  },
  garden: {
    id: "garden", name: "Garden", domain: "Pets & Outdoor", icon: "leaf", status: "ready",
    headline: "Pets and outdoor life, organised.",
    description: "Pet records, seasonal jobs, suppliers and outdoor maintenance all have one clear home.",
    belongsHere: ["Pet records", "Vaccination cards", "Outdoor contacts", "Planting plans", "Outdoor maintenance", "Seasonal jobs"],
    quickActions: [
      { label: "Set reminder", icon: "calendar", href: "/reminders" },
      { label: "Add record", icon: "plus", href: "/room/garden" },
      { label: "Emergency panel", icon: "phone", href: "/emergency" },
    ],
  },
  driveway: {
    id: "driveway", name: "Driveway", domain: "Travel & Access", icon: "map-pin", status: "ready",
    headline: "Trips and travel preparation, kept simple.",
    description: "Plan trips, organise travel documents and prepare checklists without mixing them into other rooms.",
    belongsHere: ["Trips", "Travel checklists", "Travel documents", "Bookings", "Packing plans", "Travel reminders"],
    quickActions: [
      { label: "Set reminder", icon: "calendar", href: "/reminders" },
      { label: "My trips", icon: "map-pin", href: "/driveway/trips" },
      { label: "Add note", icon: "plus", href: "/room/driveway" },
    ],
  },
  kitchen: {
    id: "kitchen", name: "Kitchen", domain: "Meals & Household", icon: "home", status: "ready",
    headline: "Household planning starts on the Kitchen wall.",
    description: "The family calendar, noticeboard, meal plans, pantry lists, recipes and kitchen records all have one clear home here.",
    belongsHere: ["Family calendar", "Noticeboard", "Meal plans", "Shopping lists", "Recipes", "Kitchen documents"],
    quickActions: [
      { label: "Wall calendar", icon: "calendar", href: "/kitchen/calendar" },
      { label: "Meal planner", icon: "plus", href: "/kitchen/meal-planner" },
      { label: "Add document", icon: "share", href: "/capture?room=kitchen" },
    ],
  },
};
