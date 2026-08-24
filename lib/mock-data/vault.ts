import type { AreaIcon } from "@/lib/mock-data/estate";

export type VaultCategory = {
  id: string;
  name: string;
  icon: AreaIcon | "heart" | "star" | "file";
  count: number;
  note: string;
};

export const vaultCategories: VaultCategory[] = [
  { id: "identity", name: "Identity", icon: "users", count: 0, note: "Passports, IDs, certificates" },
  { id: "home", name: "Home & Property", icon: "home", count: 0, note: "Deeds, insurance, warranties" },
  { id: "vehicles", name: "Vehicles & Transport", icon: "car", count: 0, note: "Insurance, MOT and service records" },
  { id: "pets", name: "Pets & Outdoor", icon: "leaf", count: 0, note: "Pet care and outdoor records" },
  { id: "travel", name: "Travel & Access", icon: "map-pin", count: 0, note: "Trips, arrivals and travel documents" },
  { id: "finance", name: "Finance", icon: "chart", count: 0, note: "Accounts, statements, pensions" },
  { id: "legal", name: "Legal & Estate", icon: "briefcase", count: 0, note: "Wills, POA, executor notes" },
  { id: "health", name: "Health & Medical", icon: "heart", count: 0, note: "Records, prescriptions, cover" },
  { id: "memories", name: "Memories", icon: "star", count: 0, note: "Photos, letters, keepsakes" },
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

export const vaultDocuments: VaultDocument[] = [];

export const vaultSecurity = {
  encryption: "Encrypted private storage",
  lastBackup: "Not configured",
  devices: 0,
  storageUsed: "0 GB",
  storageTotal: "10 GB",
  storagePercent: 0,
};
