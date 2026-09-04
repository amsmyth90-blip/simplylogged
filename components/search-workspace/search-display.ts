import type { IconName } from "@/components/UiIcon";
import type { SearchCategory, SearchDateFilter } from "@/lib/search/results";

export const commonSearches = [
  "passport",
  "insurance",
  "MOT",
  "will",
  "GP",
  "emergency",
  "school",
  "pet",
];

export const categoryLabels: Record<SearchCategory, string> = {
  all: "Everything",
  assets: "Smart items",
  contacts: "Contacts",
  documents: "Documents",
  home: "Home",
  insurance: "Insurance",
  pets: "Pets",
  reminders: "Reminders",
  travel: "Travel",
  vehicles: "Vehicles",
};

export const dateLabels: Record<SearchDateFilter, string> = {
  "30": "Next 30 days",
  "90": "Next 90 days",
  all: "Any date",
  expired: "Date passed",
};

export const categoryIcons: Record<Exclude<SearchCategory, "all">, IconName> = {
  assets: "gear",
  contacts: "users",
  documents: "file",
  home: "home",
  insurance: "shield",
  pets: "leaf",
  reminders: "calendar",
  travel: "map-pin",
  vehicles: "car",
};

export const categoryTones: Record<Exclude<SearchCategory, "all">, string> = {
  assets: "bg-[#e8efe5] text-[#52705a]",
  contacts: "bg-[#eee9f3] text-[#665674]",
  documents: "bg-mist text-sky-700",
  home: "bg-sage/60 text-moss",
  insurance: "bg-[#f1e9d6] text-[#80652c]",
  pets: "bg-[#e8efe5] text-[#52705a]",
  reminders: "bg-[#f5ecd8] text-[#80652c]",
  travel: "bg-[#e8edf3] text-[#526d80]",
  vehicles: "bg-slate-100 text-slate-600",
};
