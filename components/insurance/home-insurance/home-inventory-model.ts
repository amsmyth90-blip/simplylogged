import type { HomeInventoryRoom } from "@/lib/insurance-records";

export type HomeInventoryDraft = {
  name: string;
  room: HomeInventoryRoom;
  category: string;
  quantity: number;
  estimatedValue: number;
  purchaseDate: string;
  serialNumberMasked: string;
  highValue: boolean;
  notes: string;
};

export function createHomeInventoryDraft(): HomeInventoryDraft {
  return {
    name: "",
    room: "Living room",
    category: "Furniture",
    quantity: 1,
    estimatedValue: 0,
    purchaseDate: "",
    serialNumberMasked: "",
    highValue: false,
    notes: ""
  };
}
