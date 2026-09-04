export type GardenSectionId =
  | "pets"
  | "outdoor-spaces"
  | "jobs"
  | "tools-shed"
  | "bins";

export type GardenIcon = "archive" | "calendar" | "heart" | "home" | "sun";

export type GardenSection = {
  id: GardenSectionId;
  title: string;
  description: string;
  icon: GardenIcon;
  scope: string[];
  documentTerms: string[];
  reminderTerms: string[];
};

export type GardenDocumentCandidate = {
  title: string;
  category?: string;
  kind?: string;
  issuer?: string;
  roomId?: string;
};

export type GardenReminderCandidate = {
  title: string;
  note?: string;
  roomId?: string;
  roomName?: string;
  group?: string;
};
