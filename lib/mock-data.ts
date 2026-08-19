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

export const readinessScore = {
  score: 94,
  label: "Estate Readiness",
  message: "Everything important in your life, under one roof."
};

/* ------------------------------------------------------------------ */
/* Rooms                                                               */
/* ------------------------------------------------------------------ */

export type RoomTask = {
  id: string;
  label: string;
  due?: string;
  done: boolean;
};

export type RoomDocument = {
  id: string;
  title: string;
  kind: "PDF" | "Scan" | "Note" | "Image";
  size: string;
  updated: string;
};

export type RoomActivity = {
  id: string;
  text: string;
  when: string;
  by: string;
};

export type RoomQuickAction = {
  label: string;
  icon: AreaIcon | "plus" | "share" | "phone" | "calendar";
  href: string;
};

export type RoomDetail = {
  id: string;
  name: string;
  domain: string;
  icon: AreaIcon;
  status: AreaStatus;
  headline: string;
  description: string;
  belongsHere: string[];
  stats: { records: number; documents: number; updated: string };
  tasks: RoomTask[];
  documents: RoomDocument[];
  activity: RoomActivity[];
  quickActions: RoomQuickAction[];
};

export const roomDetails: Record<string, RoomDetail> = {
  attic: {
    id: "attic",
    name: "Attic",
    domain: "Memories & Legacy",
    icon: "archive",
    status: "secure",
    headline: "Family memories, safely archived.",
    description:
      "Photo archives, keepsakes, and the family story live up here — digitised, labelled, and easy to pass on.",
    belongsHere: ["Photo albums", "Family stories", "Keepsakes", "Legacy notes", "Memory scans", "Old letters"],
    stats: { records: 34, documents: 12, updated: "3 days ago" },
    tasks: [
      { id: "attic-1", label: "Digitise the 2000s photo albums", due: "This month", done: false },
      { id: "attic-2", label: "Label Grandad's medal box", done: false },
      { id: "attic-3", label: "Back up wedding video to All Files", done: true }
    ],
    documents: [
      { id: "attic-d1", title: "Photo Archive 1998–2004", kind: "Scan", size: "1.2 GB", updated: "3 days ago" },
      { id: "attic-d2", title: "Family Tree Notes", kind: "Note", size: "14 KB", updated: "2 weeks ago" },
      { id: "attic-d3", title: "Wedding Video (digitised)", kind: "Image", size: "3.4 GB", updated: "January" }
    ],
    activity: [
      { id: "attic-a1", text: "Uploaded 14 scanned photos to the archive", when: "3 days ago", by: "Amy" },
      { id: "attic-a2", text: "Added a note about the loft insulation boxes", when: "2 weeks ago", by: "Michael" }
    ],
    quickActions: [
      { label: "Add memory", icon: "plus", href: "/room/attic" },
      { label: "Open All Files", icon: "lock", href: "/files" },
      { label: "Share album", icon: "share", href: "/family" }
    ]
  },
  bedroom: {
    id: "bedroom",
    name: "Bedroom",
    domain: "Personal & Health",
    icon: "bed",
    status: "ready",
    headline: "Personal records and health plans, up to date.",
    description:
      "GP details, prescriptions, and personal notes for each family member — private by default, shared only when you choose.",
    belongsHere: ["Medical records", "Prescriptions", "Health insurance", "Care notes", "GP details", "Wellbeing plans"],
    stats: { records: 18, documents: 9, updated: "Yesterday" },
    tasks: [
      { id: "bed-1", label: "Book Lily's dental check-up", due: "This week", done: false },
      { id: "bed-2", label: "Renew repeat prescription", done: true },
      { id: "bed-3", label: "Review care preferences note", due: "Next month", done: false }
    ],
    documents: [
      { id: "bed-d1", title: "NHS Numbers & GP Details", kind: "Note", size: "8 KB", updated: "Yesterday" },
      { id: "bed-d2", title: "Prescription List", kind: "PDF", size: "120 KB", updated: "Last week" },
      { id: "bed-d3", title: "Health Insurance Policy", kind: "PDF", size: "2.1 MB", updated: "March" }
    ],
    activity: [
      { id: "bed-a1", text: "Updated GP surgery phone number", when: "Yesterday", by: "Amy" },
      { id: "bed-a2", text: "Marked prescription renewal as done", when: "4 days ago", by: "Amy" }
    ],
    quickActions: [
      { label: "Add record", icon: "plus", href: "/room/bedroom" },
      { label: "Set reminder", icon: "calendar", href: "/reminders" },
      { label: "Call GP", icon: "phone", href: "/emergency" }
    ]
  },
  office: {
    id: "office",
    name: "Office",
    domain: "Household Administration",
    icon: "briefcase",
    status: "secure",
    headline: "Paperwork handled, then securely filed.",
    description:
      "Incoming post becomes action here. Finished documents stay securely in All Files and remain linked to the Office.",
    belongsHere: ["Bills to action", "Household forms", "Legal matters", "Renewals", "Identity admin", "Secure file shortcuts"],
    stats: { records: 26, documents: 15, updated: "This week" },
    tasks: [
      { id: "off-1", label: "Verify account recovery codes", due: "This week", done: false },
      { id: "off-2", label: "Export yearly secure backup", due: "1st of month", done: false },
      { id: "off-3", label: "Confirm executor details with David", done: true }
    ],
    documents: [
      { id: "off-d1", title: "Wills & Letters of Wishes", kind: "PDF", size: "860 KB", updated: "This week" },
      { id: "off-d2", title: "House Deeds — 42 Alder Lane", kind: "Scan", size: "4.3 MB", updated: "February" },
      { id: "off-d3", title: "Power of Attorney", kind: "PDF", size: "540 KB", updated: "February" }
    ],
    activity: [
      { id: "off-a1", text: "Two-factor authentication verified", when: "2 days ago", by: "Michael" },
      { id: "off-a2", text: "Will reviewed and re-filed securely", when: "This week", by: "Amy" }
    ],
    quickActions: [
      { label: "Review incoming post", icon: "mail", href: "/intake" },
      { label: "Office reminders", icon: "calendar", href: "/reminders" },
      { label: "Open All Files", icon: "lock", href: "/files" }
    ]
  },
  "family-room": {
    id: "family-room",
    name: "Family Room",
    domain: "Family & Relationships",
    icon: "users",
    status: "ready",
    headline: "Your household, together.",
    description:
      "Household members, invitations, access, weekly routines and shared items needing attention live here.",
    belongsHere: ["Household members", "Invitations", "Access permissions", "Weekly routines", "Family inbox", "Shared responsibilities"],
    stats: { records: 22, documents: 7, updated: "Today" },
    tasks: [
      { id: "fam-1", label: "Add the summer holiday plan", due: "This week", done: false },
      { id: "fam-2", label: "Confirm pet-sitter for August", done: false },
      { id: "fam-3", label: "Order Lily's birthday cake", due: "Fri 24 Jul", done: false }
    ],
    documents: [
      { id: "fam-d1", title: "School Term Dates 2026–27", kind: "PDF", size: "310 KB", updated: "Today" },
      { id: "fam-d2", title: "Birthday & Gift List", kind: "Note", size: "6 KB", updated: "Last week" },
      { id: "fam-d3", title: "Pet Care Guide — Biscuit", kind: "Note", size: "11 KB", updated: "June" }
    ],
    activity: [
      { id: "fam-a1", text: "Added the new school term dates", when: "Today", by: "Amy" },
      { id: "fam-a2", text: "Lily ticked off her packing list", when: "Yesterday", by: "Lily" }
    ],
    quickActions: [
      { label: "Family & access", icon: "users", href: "/family" },
      { label: "Set reminder", icon: "calendar", href: "/reminders" },
      { label: "Add plan", icon: "plus", href: "/room/family-room" }
    ]
  },
  "safe-room": {
    id: "safe-room",
    name: "Safe Room",
    domain: "Emergency & Legacy",
    icon: "shield",
    status: "attention",
    headline: "Ready when it matters most.",
    description:
      "Emergency instructions, authority records, and sealed plans — restricted access, checked regularly, ready in minutes.",
    belongsHere: ["Emergency plans", "Insurance claim packs", "Authority notes", "Key holder details", "Crisis contacts", "Evacuation info"],
    stats: { records: 11, documents: 8, updated: "Today" },
    tasks: [
      { id: "safe-1", label: "Confirm emergency contact order", due: "Today", done: false },
      { id: "safe-2", label: "Review the safe access list", due: "This week", done: false },
      { id: "safe-3", label: "Test emergency plan with family", done: true }
    ],
    documents: [
      { id: "safe-d1", title: "Emergency Instructions", kind: "PDF", size: "290 KB", updated: "Today" },
      { id: "safe-d2", title: "Insurance Claim Pack", kind: "PDF", size: "1.8 MB", updated: "May" },
      { id: "safe-d3", title: "Authority & Access Notes", kind: "Note", size: "9 KB", updated: "May" }
    ],
    activity: [
      { id: "safe-a1", text: "Emergency instructions reviewed", when: "Today", by: "Amy" },
      { id: "safe-a2", text: "Sarah added as spare key holder", when: "Last month", by: "Michael" }
    ],
    quickActions: [
      { label: "Emergency panel", icon: "phone", href: "/emergency" },
      { label: "Open All Files", icon: "lock", href: "/files" },
      { label: "Manage access", icon: "users", href: "/family" }
    ]
  },
  garage: {
    id: "garage",
    name: "Garage",
    domain: "Vehicles & Transport",
    icon: "car",
    status: "attention",
    headline: "Two updates needed before Friday.",
    description:
      "Vehicle papers, service history, and breakdown cover for everything with wheels — plus the tools that keep them running.",
    belongsHere: ["Car insurance", "MOT records", "Service history", "Breakdown cover", "Vehicle IDs", "Transport renewals"],
    stats: { records: 15, documents: 10, updated: "5 days ago" },
    tasks: [
      { id: "gar-1", label: "Upload car insurance renewal", due: "Fri 18 Jul", done: false },
      { id: "gar-2", label: "Record the new battery pack", done: false },
      { id: "gar-3", label: "Book MOT for Tesla Model Y", due: "In 21 days", done: false }
    ],
    documents: [
      { id: "gar-d1", title: "Tesla Model Y — V5C", kind: "Scan", size: "1.1 MB", updated: "5 days ago" },
      { id: "gar-d2", title: "MOT History", kind: "PDF", size: "240 KB", updated: "March" },
      { id: "gar-d3", title: "Breakdown Cover", kind: "PDF", size: "380 KB", updated: "January" }
    ],
    activity: [
      { id: "gar-a1", text: "Service invoice filed from mailbox", when: "5 days ago", by: "Michael" },
      { id: "gar-a2", text: "MOT reminder scheduled", when: "Last week", by: "DiaryDock" }
    ],
    quickActions: [
      { label: "Set reminder", icon: "calendar", href: "/reminders" },
      { label: "Add document", icon: "plus", href: "/files" },
      { label: "Breakdown line", icon: "phone", href: "/emergency" }
    ]
  },
  mailbox: {
    id: "mailbox",
    name: "Mailbox",
    domain: "Incoming & To File",
    icon: "mail",
    status: "attention",
    headline: "Four items waiting to be filed.",
    description:
      "Everything that arrives lands here first — letters, renewals, and notices — then gets routed to the right room in a tap.",
    belongsHere: ["New letters", "Forms to review", "Bills to file", "Statements", "Post awaiting routing", "Scanned mail"],
    stats: { records: 4, documents: 4, updated: "Today" },
    tasks: [
      { id: "mail-1", label: "Open the council tax renewal", due: "Today", done: false },
      { id: "mail-2", label: "Sign Lily's school trip form", due: "Today", done: false },
      { id: "mail-3", label: "File the bank statement", due: "This week", done: false },
      { id: "mail-4", label: "Check the water bill", due: "This week", done: false }
    ],
    documents: [
      { id: "mail-d1", title: "Council Tax Renewal 2026", kind: "Scan", size: "420 KB", updated: "Today" },
      { id: "mail-d2", title: "School Trip Consent Form", kind: "PDF", size: "180 KB", updated: "Today" },
      { id: "mail-d3", title: "Bank Statement — June", kind: "PDF", size: "310 KB", updated: "Yesterday" },
      { id: "mail-d4", title: "Water Bill — Q2", kind: "Scan", size: "260 KB", updated: "2 days ago" }
    ],
    activity: [
      { id: "mail-a1", text: "Scanned two letters into the mailbox", when: "Today", by: "Amy" },
      { id: "mail-a2", text: "Boiler invoice routed to Home & Property", when: "Last week", by: "Michael" }
    ],
    quickActions: [
      { label: "Scan a letter", icon: "plus", href: "/room/mailbox" },
      { label: "Open All Files", icon: "lock", href: "/files" },
      { label: "Set reminder", icon: "calendar", href: "/reminders" }
    ]
  },
  garden: {
    id: "garden",
    name: "Garden",
    domain: "Pets & Outdoor",
    icon: "leaf",
    status: "ready",
    headline: "Outdoor jobs and Biscuit's care, on track.",
    description:
      "Seasonal jobs, supplier details, and everything Biscuit needs — from vaccination dates to the gardener's number.",
    belongsHere: ["Pet records", "Vaccination cards", "Gardener details", "Planting plans", "Outdoor maintenance", "Seasonal jobs"],
    stats: { records: 12, documents: 5, updated: "Last week" },
    tasks: [
      { id: "gdn-1", label: "Schedule the hedge trim", due: "This month", done: false },
      { id: "gdn-2", label: "Book sprinkler service", done: false },
      { id: "gdn-3", label: "Biscuit's flea treatment", done: true }
    ],
    documents: [
      { id: "gdn-d1", title: "Biscuit's Vaccination Card", kind: "Scan", size: "300 KB", updated: "Last week" },
      { id: "gdn-d2", title: "Gardener — Contact & Rates", kind: "Note", size: "4 KB", updated: "June" },
      { id: "gdn-d3", title: "Planting Plan — Spring 2026", kind: "Image", size: "1.6 MB", updated: "April" }
    ],
    activity: [
      { id: "gdn-a1", text: "Vaccination card updated after vet visit", when: "Last week", by: "Amy" },
      { id: "gdn-a2", text: "Sprinkler reminder set for August", when: "2 weeks ago", by: "DiaryDock" }
    ],
    quickActions: [
      { label: "Set reminder", icon: "calendar", href: "/reminders" },
      { label: "Add record", icon: "plus", href: "/room/garden" },
      { label: "Call the vet", icon: "phone", href: "/emergency" }
    ]
  },
  driveway: {
    id: "driveway",
    name: "Driveway",
    domain: "Travel & Access",
    icon: "map-pin",
    status: "attention",
    headline: "Guest and delivery notes need a refresh.",
    description:
      "Arrival guidance, courier preferences, and travel checklists — so guests, deliveries, and trips all run smoothly.",
    belongsHere: ["Travel checklists", "Courier notes", "Guest arrival guides", "Parking info", "Passport renewal notes", "Trip planning"],
    stats: { records: 9, documents: 6, updated: "2 weeks ago" },
    tasks: [
      { id: "drv-1", label: "Update courier instructions", due: "This week", done: false },
      { id: "drv-2", label: "Share guest parking notes with Rose", done: false },
      { id: "drv-3", label: "Check passport renewal dates", due: "September", done: false }
    ],
    documents: [
      { id: "drv-d1", title: "Travel Checklist", kind: "Note", size: "7 KB", updated: "2 weeks ago" },
      { id: "drv-d2", title: "Guest Arrival Guide", kind: "Note", size: "5 KB", updated: "May" },
      { id: "drv-d3", title: "Passport Renewal Dates", kind: "Note", size: "3 KB", updated: "May" }
    ],
    activity: [
      { id: "drv-a1", text: "Courier left-with-neighbour note added", when: "2 weeks ago", by: "Michael" },
      { id: "drv-a2", text: "Summer trip checklist started", when: "Last month", by: "Amy" }
    ],
    quickActions: [
      { label: "Set reminder", icon: "calendar", href: "/reminders" },
      { label: "Share guide", icon: "share", href: "/family" },
      { label: "Add note", icon: "plus", href: "/room/driveway" }
    ]
  },
  kitchen: {
    id: "kitchen",
    name: "Kitchen",
    domain: "Meals & Household",
    icon: "home",
    status: "ready",
    headline: "Household planning starts on the Kitchen wall.",
    description: "The family calendar, noticeboard, meal plans, pantry lists, recipes and kitchen records all have one clear home here.",
    belongsHere: ["Family calendar", "Noticeboard", "Meal plans", "Shopping lists", "Recipes", "Kitchen documents"],
    stats: { records: 16, documents: 5, updated: "Today" },
    tasks: [
      { id: "kit-1", label: "Plan next week's dinners", due: "Friday", done: false },
      { id: "kit-2", label: "Check pantry staples", due: "This week", done: false },
      { id: "kit-3", label: "File dishwasher warranty", done: true }
    ],
    documents: [
      { id: "kit-d1", title: "Dishwasher Warranty", kind: "PDF", size: "1.1 MB", updated: "Today" },
      { id: "kit-d2", title: "Oven User Manual", kind: "PDF", size: "3.4 MB", updated: "Last month" },
      { id: "kit-d3", title: "Kitchen Appliance Inventory", kind: "Note", size: "18 KB", updated: "May" }
    ],
    activity: [
      { id: "kit-a1", text: "Updated the weekly meal plan", when: "Today", by: "Amy" },
      { id: "kit-a2", text: "Added dishwasher warranty", when: "Yesterday", by: "Michael" }
    ],
    quickActions: [
      { label: "Wall calendar", icon: "calendar", href: "/kitchen/calendar" },
      { label: "Meal planner", icon: "plus", href: "/kitchen/meal-planner" },
      { label: "Add document", icon: "share", href: "/capture?room=kitchen" }
    ]
  }
};

/* ------------------------------------------------------------------ */
/* Vault                                                               */
/* ------------------------------------------------------------------ */

export type VaultCategory = {
  id: string;
  name: string;
  icon: AreaIcon | "heart" | "star" | "file";
  count: number;
  note: string;
};

export const vaultCategories: VaultCategory[] = [
  { id: "identity", name: "Identity", icon: "users", count: 8, note: "Passports, IDs, certificates" },
  { id: "home", name: "Home & Property", icon: "home", count: 14, note: "Deeds, insurance, warranties" },
  { id: "vehicles", name: "Vehicles & Transport", icon: "car", count: 0, note: "Insurance, MOT and service records" },
  { id: "pets", name: "Pets & Outdoor", icon: "leaf", count: 0, note: "Pet care and outdoor records" },
  { id: "travel", name: "Travel & Access", icon: "map-pin", count: 0, note: "Trips, arrivals and travel documents" },
  { id: "finance", name: "Finance", icon: "chart", count: 11, note: "Accounts, statements, pensions" },
  { id: "legal", name: "Legal & Estate", icon: "briefcase", count: 7, note: "Wills, POA, executor notes" },
  { id: "health", name: "Health & Medical", icon: "heart", count: 9, note: "Records, prescriptions, cover" },
  { id: "memories", name: "Memories", icon: "star", count: 23, note: "Photos, letters, keepsakes" }
];

export type VaultDocument = {
  id: string;
  title: string;
  category: string;
  kind: "PDF" | "Scan" | "Note" | "Image";
  size: string;
  updated: string;
  sharedWith?: string[];
  starred?: boolean;
  storageBucket?: string;
  storagePath?: string;
  originalFileName?: string;
  mimeType?: string;
  roomId?: string;
  roomName?: string;
  issuer?: string;
  dueDate?: string;
  extractionSummary?: string;
  extractedText?: string;
  actionItems?: string[];
  confidence?: number;
  reviewStatus?: "needs-review" | "reviewed";
  reviewReasons?: string[];
  reviewedAt?: string;
  emergencyVisible?: boolean;
};

export const vaultDocuments: VaultDocument[] = [
  {
    id: "v1",
    title: "Family Passport Folder",
    category: "Identity",
    kind: "Scan",
    size: "8.2 MB",
    updated: "2 days ago",
    sharedWith: ["Michael"],
    starred: true,
    roomId: "office",
    roomName: "Office"
  },
  {
    id: "v2",
    title: "Wills & Letters of Wishes",
    category: "Legal & Estate",
    kind: "PDF",
    size: "860 KB",
    updated: "This week",
    sharedWith: ["Michael", "David"],
    starred: true,
    emergencyVisible: true,
    roomId: "office",
    roomName: "Office"
  },
  {
    id: "v3",
    title: "House Deeds — 42 Alder Lane",
    category: "Home & Property",
    kind: "Scan",
    size: "4.3 MB",
    updated: "February",
    roomId: "office",
    roomName: "Office"
  },
  {
    id: "v4",
    title: "Home Insurance Policy 2026",
    category: "Home & Property",
    kind: "PDF",
    size: "1.4 MB",
    updated: "1 week ago",
    sharedWith: ["Michael"],
    emergencyVisible: true,
    roomId: "office",
    roomName: "Office"
  },
  {
    id: "v5",
    title: "Lily's Vaccination Record",
    category: "Health & Medical",
    kind: "Scan",
    size: "520 KB",
    updated: "Last month",
    emergencyVisible: true,
    roomId: "bedroom",
    roomName: "Bedroom"
  },
  {
    id: "v6",
    title: "Mortgage Statement — Q2",
    category: "Finance",
    kind: "PDF",
    size: "290 KB",
    updated: "Yesterday",
    roomId: "office",
    roomName: "Office"
  },
  {
    id: "v7",
    title: "Wedding Certificate",
    category: "Identity",
    kind: "Scan",
    size: "610 KB",
    updated: "January",
    starred: true,
    roomId: "office",
    roomName: "Office"
  },
  {
    id: "v8",
    title: "Emergency Instructions",
    category: "Legal & Estate",
    kind: "PDF",
    size: "290 KB",
    updated: "Today",
    sharedWith: ["Everyone"],
    emergencyVisible: true,
    roomId: "safe-room",
    roomName: "Safe Room"
  },
  {
    id: "v9",
    title: "NHS Numbers & GP Details",
    category: "Health & Medical",
    kind: "Note",
    size: "8 KB",
    updated: "Yesterday",
    roomId: "bedroom",
    roomName: "Bedroom",
    reviewStatus: "reviewed"
  },
  {
    id: "v10",
    title: "Prescription List",
    category: "Health & Medical",
    kind: "PDF",
    size: "120 KB",
    updated: "Last week",
    roomId: "bedroom",
    roomName: "Bedroom",
    reviewStatus: "reviewed"
  },
  {
    id: "v11",
    title: "Health Insurance Policy",
    category: "Health & Medical",
    kind: "PDF",
    size: "2.1 MB",
    updated: "March",
    roomId: "bedroom",
    roomName: "Bedroom",
    reviewStatus: "reviewed"
  },
  {
    id: "v12",
    title: "Tesla Model Y â€” V5C",
    category: "Vehicles & Transport",
    kind: "Scan",
    size: "1.1 MB",
    updated: "5 days ago",
    roomId: "garage",
    roomName: "Garage",
    reviewStatus: "reviewed"
  },
  {
    id: "v13",
    title: "MOT History",
    category: "Vehicles & Transport",
    kind: "PDF",
    size: "240 KB",
    updated: "March",
    roomId: "garage",
    roomName: "Garage",
    reviewStatus: "reviewed"
  },
  {
    id: "v14",
    title: "Breakdown Cover",
    category: "Vehicles & Transport",
    kind: "PDF",
    size: "380 KB",
    updated: "January",
    roomId: "garage",
    roomName: "Garage",
    reviewStatus: "reviewed"
  },
  {
    id: "v15",
    title: "Biscuit's Vaccination Card",
    category: "Pets & Outdoor",
    kind: "Scan",
    size: "300 KB",
    updated: "Last week",
    roomId: "garden",
    roomName: "Garden",
    reviewStatus: "reviewed"
  },
  {
    id: "v16",
    title: "Gardener â€” Contact & Rates",
    category: "Pets & Outdoor",
    kind: "Note",
    size: "4 KB",
    updated: "June",
    roomId: "garden",
    roomName: "Garden",
    reviewStatus: "reviewed"
  },
  {
    id: "v17",
    title: "Planting Plan â€” Spring 2026",
    category: "Pets & Outdoor",
    kind: "Image",
    size: "1.6 MB",
    updated: "April",
    roomId: "garden",
    roomName: "Garden",
    reviewStatus: "reviewed"
  },
  {
    id: "v18",
    title: "Travel Checklist",
    category: "Travel & Access",
    kind: "Note",
    size: "7 KB",
    updated: "2 weeks ago",
    roomId: "driveway",
    roomName: "Driveway",
    reviewStatus: "reviewed"
  },
  {
    id: "v19",
    title: "Guest Arrival Guide",
    category: "Travel & Access",
    kind: "Note",
    size: "5 KB",
    updated: "May",
    roomId: "driveway",
    roomName: "Driveway",
    reviewStatus: "reviewed"
  },
  {
    id: "v20",
    title: "Passport Renewal Dates",
    category: "Travel & Access",
    kind: "Note",
    size: "3 KB",
    updated: "May",
    roomId: "driveway",
    roomName: "Driveway",
    reviewStatus: "reviewed"
  },
  {
    id: "v21",
    title: "Council Tax Bill 2026â€“27",
    category: "Finance",
    kind: "PDF",
    size: "420 KB",
    updated: "Today",
    roomId: "office",
    roomName: "Office",
    issuer: "Local Council",
    dueDate: "2026-08-15",
    extractionSummary: "Annual household council tax bill and payment schedule.",
    reviewStatus: "reviewed"
  },
  {
    id: "v22",
    title: "Electricity Bill â€” July 2026",
    category: "Finance",
    kind: "PDF",
    size: "310 KB",
    updated: "Yesterday",
    roomId: "office",
    roomName: "Office",
    issuer: "Electricity supplier",
    dueDate: "2026-08-08",
    extractionSummary: "Monthly household electricity bill.",
    reviewStatus: "reviewed"
  },
  {
    id: "v23",
    title: "Bank Statement â€” June 2026",
    category: "Finance",
    kind: "PDF",
    size: "290 KB",
    updated: "Last week",
    roomId: "office",
    roomName: "Office",
    issuer: "Household bank account",
    extractionSummary: "Monthly household bank statement.",
    reviewStatus: "reviewed"
  },
  {
    id: "v24",
    title: "Funeral Wishes",
    category: "Legal & Estate",
    kind: "Note",
    size: "12 KB",
    updated: "This week",
    roomId: "office",
    roomName: "Office",
    extractionSummary: "Personal funeral preferences and wishes for trusted family members.",
    reviewStatus: "reviewed",
    emergencyVisible: true
  },
  {
    id: "v25",
    title: "Lasting Power of Attorney",
    category: "Legal & Estate",
    kind: "PDF",
    size: "740 KB",
    updated: "February",
    roomId: "office",
    roomName: "Office",
    extractionSummary: "Authority and attorney details for future decision-making.",
    reviewStatus: "reviewed",
    emergencyVisible: true
  }
];

export const vaultSecurity = {
  encryption: "End-to-end encrypted",
  lastBackup: "Last night, 02:00",
  devices: 3,
  storageUsed: "2.1 GB",
  storageTotal: "10 GB",
  storagePercent: 21
};

/* ------------------------------------------------------------------ */
/* Reminders                                                           */
/* ------------------------------------------------------------------ */

export type ReminderGroup = "today" | "week" | "later" | "done";

export type Reminder = {
  id: string;
  title: string;
  note?: string;
  roomId?: string;
  roomName?: string;
  group: ReminderGroup;
  timeLabel: string;
  priority: "high" | "normal" | "low";
  repeat?: string;
  documentId?: string;
  documentTitle?: string;
  assignedTo?: string;
  dueDate?: string;
  sourceNoticeId?: string;
};

export const remindersList: Reminder[] = [
  {
    id: "r1",
    title: "Confirm emergency contact order",
    note: "Safe Room review is due — takes about two minutes.",
    roomId: "safe-room",
    roomName: "Safe Room",
    group: "today",
    timeLabel: "Today",
    priority: "high"
  },
  {
    id: "r2",
    title: "Sign Lily's school trip form",
    note: "Waiting in the mailbox since this morning.",
    roomId: "mailbox",
    roomName: "Mailbox",
    group: "today",
    timeLabel: "Today, 6:00 PM",
    priority: "high"
  },
  {
    id: "r3",
    title: "Medication refill check",
    roomId: "bedroom",
    roomName: "Bedroom",
    group: "today",
    timeLabel: "Every Monday",
    priority: "normal",
    repeat: "Weekly"
  },
  {
    id: "r4",
    title: "Upload car insurance renewal",
    note: "Policy documents arrived by email — drop them in the Garage.",
    roomId: "garage",
    roomName: "Garage",
    group: "week",
    timeLabel: "Fri 18 Jul",
    priority: "high"
  },
  {
    id: "r5",
    title: "Book the hedge trim",
    roomId: "garden",
    roomName: "Garden",
    group: "week",
    timeLabel: "This week",
    priority: "low"
  },
  {
    id: "r6",
    title: "Order Lily's birthday cake",
    roomId: "family-room",
    roomName: "Family Room",
    group: "week",
    timeLabel: "Fri 24 Jul",
    priority: "normal"
  },
  {
    id: "r7",
    title: "MOT — Tesla Model Y",
    roomId: "garage",
    roomName: "Garage",
    group: "later",
    timeLabel: "4 Aug",
    priority: "normal"
  },
  {
    id: "r8",
    title: "Export secure Vault backup",
    roomId: "office",
    roomName: "Office",
    group: "later",
    timeLabel: "1st of each month",
    priority: "normal",
    repeat: "Monthly"
  },
  {
    id: "r9",
    title: "Check passport renewal dates",
    roomId: "driveway",
    roomName: "Driveway",
    group: "later",
    timeLabel: "September",
    priority: "low"
  },
  {
    id: "r10",
    title: "Boiler service booked",
    roomId: "office",
    roomName: "Office",
    group: "done",
    timeLabel: "Yesterday",
    priority: "normal"
  },
  {
    id: "r11",
    title: "File the water bill",
    roomId: "mailbox",
    roomName: "Mailbox",
    group: "done",
    timeLabel: "Monday",
    priority: "low"
  }
];

/* ------------------------------------------------------------------ */
/* Family                                                              */
/* ------------------------------------------------------------------ */

export type FamilyMember = {
  id: string;
  name: string;
  role: string;
  access: string;
  accessTone: "full" | "shared" | "limited";
  note: string;
  initials: string;
  manages: string[];
  lastActive: string;
};

export const familyMembers: FamilyMember[] = [
  {
    id: "amy",
    name: "Amy",
    role: "Primary Organizer",
    access: "Full access",
    accessTone: "full",
    note: "Owns the estate overview, sharing, and All Files.",
    initials: "A",
    manages: ["Everything"],
    lastActive: "Now"
  },
  {
    id: "michael",
    name: "Michael",
    role: "Partner",
    access: "Full access",
    accessTone: "full",
    note: "Looks after vehicles, finance, and arrival plans.",
    initials: "M",
    manages: ["Garage", "Office", "Driveway"],
    lastActive: "2 hours ago"
  },
  {
    id: "lily",
    name: "Lily",
    role: "Family Member",
    access: "Limited access",
    accessTone: "limited",
    note: "Sees reminders, school notices, and the memories album.",
    initials: "L",
    manages: ["Family Room"],
    lastActive: "Yesterday"
  }
];

export const pendingInvite = {
  name: "Rose",
  relation: "Grandma",
  access: "Viewer — Memories only",
  sentAgo: "2 days ago",
  initials: "R"
};

export type TrustedContact = {
  id: string;
  name: string;
  relation: string;
  detail: string;
  phone: string;
  initials: string;
};

export const trustedContacts: TrustedContact[] = [
  {
    id: "sarah",
    name: "Sarah Bennett",
    relation: "Neighbour",
    detail: "Holds a spare key · included in the emergency plan",
    phone: "07900 123456",
    initials: "S"
  },
  {
    id: "david",
    name: "David Smyth",
    relation: "Brother",
    detail: "Executor · can unseal Legal & Estate if needed",
    phone: "07700 900233",
    initials: "D"
  },
  {
    id: "dr-patel",
    name: "Dr. Anjali Patel",
    relation: "Family GP",
    detail: "Richmond Green Surgery",
    phone: "020 5550 1122",
    initials: "P"
  }
];

export type SharedAccessRow = {
  area: string;
  icon: AreaIcon | "heart" | "star" | "file";
  who: string;
};

export const sharedAccess: SharedAccessRow[] = [
  { area: "Vault — Legal & Estate", icon: "briefcase", who: "Amy, Michael, David (executor)" },
  { area: "Emergency plan", icon: "shield", who: "Everyone, plus Sarah" },
  { area: "Reminders & calendar", icon: "chart", who: "Everyone" },
  { area: "Memories album", icon: "star", who: "Everyone, Rose pending" }
];

/* ------------------------------------------------------------------ */
/* Emergency                                                           */
/* ------------------------------------------------------------------ */

export type QuickDial = {
  id: string;
  label: string;
  sub: string;
  number: string;
  tone: "danger" | "calm";
};

export const quickDials: QuickDial[] = [
  { id: "999", label: "Emergency services", sub: "Police · Fire · Ambulance", number: "999", tone: "danger" },
  { id: "michael", label: "Call Michael", sub: "Partner · usually reachable", number: "07700 900412", tone: "calm" },
  { id: "gp", label: "GP surgery", sub: "Richmond Green Surgery", number: "020 5550 1122", tone: "calm" },
  { id: "nhs", label: "NHS 111", sub: "Urgent medical advice", number: "111", tone: "calm" }
];

export type EmergencyContact = {
  id: string;
  name: string;
  relation: string;
  phone: string;
  note?: string;
};

export const emergencyContacts: EmergencyContact[] = [
  { id: "ec1", name: "Michael", relation: "Partner", phone: "07700 900412" },
  { id: "ec2", name: "Sarah Bennett", relation: "Neighbour", phone: "07900 123456", note: "Holds a spare key" },
  { id: "ec3", name: "David Smyth", relation: "Brother", phone: "07700 900233" },
  { id: "ec4", name: "Gas emergency", relation: "National Gas", phone: "0800 111 999", note: "24 hours" },
  { id: "ec5", name: "Home insurance helpline", relation: "Hastings Home", phone: "0800 440 889", note: "Policy HD-2841-96" }
];

export type EmergencyPlan = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
};

export const emergencyPlans: EmergencyPlan[] = [
  {
    id: "medical",
    title: "Medical emergency",
    summary: "Who to call and what responders need to know",
    steps: [
      "Call 999 and ask for an ambulance.",
      "Medical cards for each family member are in All Files under Health & Medical.",
      "Lily has a penicillin allergy — this is flagged on her medical card.",
      "First-aid kit: hall cupboard, top shelf. Nearest defibrillator: village hall, St Mary's Lane (400m)."
    ]
  },
  {
    id: "fire",
    title: "House fire",
    summary: "Escape routes and the meeting point",
    steps: [
      "Get everyone out — don't stop for belongings.",
      "Downstairs: front door or kitchen patio doors. Upstairs: main stairs, or the landing window onto the garage roof.",
      "Meeting point: the oak tree across the road at number 39.",
      "Call 999 from outside. Biscuit's lead hangs by the back door."
    ]
  },
  {
    id: "gas",
    title: "Gas leak",
    summary: "Shut-off location and who to call",
    steps: [
      "Open windows and doors; don't touch light switches.",
      "Gas shut-off: meter box, front-right of the house (key on the garage hook).",
      "Call National Gas on 0800 111 999 from outside.",
      "Let Sarah next door know if venting the house overnight."
    ]
  },
  {
    id: "power",
    title: "Power cut",
    summary: "Fuse box, torches, and supplier line",
    steps: [
      "Fuse box: garage, left wall, above the workbench.",
      "Torches: kitchen drawer nearest the fridge, and one in each bedside table.",
      "Check the outage map or call 105 (free, any network).",
      "The freezer holds safe for about 24 hours unopened."
    ]
  }
];

export const homeInfo = [
  { label: "Home address", value: "42 Alder Lane, Richmond TW10 6HJ" },
  { label: "Water stopcock", value: "Under the kitchen sink" },
  { label: "Fuse box", value: "Garage, left wall" },
  { label: "Gas shut-off", value: "Meter box, front-right of house" },
  { label: "First-aid kit", value: "Hall cupboard, top shelf" },
  { label: "Nearest defibrillator", value: "Village hall, St Mary's Lane (400m)" }
];

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export const profile = {
  name: "Amy Smyth",
  email: "amsmyth90@hotmail.com",
  plan: "Family plan · 3 members",
  memberSince: "March 2026",
  initials: "A"
};
