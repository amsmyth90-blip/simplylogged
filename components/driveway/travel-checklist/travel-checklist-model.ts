import type { IconName } from "@/components/UiIcon";
import type { TravelChecklistCategory } from "@/lib/travel-checklist-records";

export type ChecklistStage = "overview" | "checklist" | "suggestions" | "review";

export const stages: Array<{ id: ChecklistStage; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "checklist", label: "Checklist" },
  { id: "suggestions", label: "Suggestions" },
  { id: "review", label: "Final review" },
];

export const categoryDetails: Record<
  TravelChecklistCategory,
  { icon: IconName; hint: string }
> = {
  Essentials: { icon: "briefcase", hint: "Everyday must-haves" },
  Documents: { icon: "file", hint: "Tickets and documents to carry" },
  Clothes: { icon: "users", hint: "Clothing and footwear" },
  Toiletries: { icon: "sun", hint: "Personal care items" },
  Medications: { icon: "heart", hint: "Medicines and health essentials" },
  Tech: { icon: "phone", hint: "Devices, chargers and adapters" },
  "Home before you go": { icon: "home", hint: "Secure and prepare the home" },
  "Travel day": { icon: "map-pin", hint: "Tasks for departure day" },
};

export const smartSuggestions: Array<{
  label: string;
  detail: string;
  category: TravelChecklistCategory;
  icon: IconName;
}> = [
  { label: "Travel insurance", detail: "Confirm suitable cover before travelling", category: "Documents", icon: "shield" },
  { label: "Essential medications", detail: "Pack enough for the full trip", category: "Medications", icon: "heart" },
  { label: "Download offline maps", detail: "Keep directions available without signal", category: "Tech", icon: "map-pin" },
  { label: "Check passport expiry", detail: "Review destination validity requirements", category: "Documents", icon: "file" },
  { label: "House keys", detail: "Take a set or arrange a trusted keyholder", category: "Essentials", icon: "lock" },
  { label: "Turn off heating", detail: "Set the home safely while away", category: "Home before you go", icon: "home" },
  { label: "Notify your bank", detail: "Check whether travel notice is needed", category: "Travel day", icon: "bell" },
  { label: "Travel adapter", detail: "Check the plug type for the destination", category: "Tech", icon: "gear" },
];

export const checklistTemplates: Array<{
  id: string;
  label: string;
  icon: IconName;
  items: Array<{ label: string; category: TravelChecklistCategory }>;
}> = [
  {
    id: "city",
    label: "City break",
    icon: "map-pin",
    items: [
      { label: "Comfortable walking shoes", category: "Clothes" },
      { label: "Offline city map", category: "Tech" },
      { label: "Accommodation confirmation", category: "Documents" },
    ],
  },
  {
    id: "beach",
    label: "Beach holiday",
    icon: "sun",
    items: [
      { label: "Swimwear", category: "Clothes" },
      { label: "Sun cream", category: "Toiletries" },
      { label: "Sun hat", category: "Essentials" },
    ],
  },
  {
    id: "business",
    label: "Business trip",
    icon: "briefcase",
    items: [
      { label: "Laptop charger", category: "Tech" },
      { label: "Meeting documents", category: "Documents" },
      { label: "Work clothes", category: "Clothes" },
    ],
  },
  {
    id: "family",
    label: "Family trip",
    icon: "users",
    items: [
      { label: "Family travel documents", category: "Documents" },
      { label: "Journey snacks", category: "Travel day" },
      { label: "Children's entertainment", category: "Essentials" },
    ],
  },
];
