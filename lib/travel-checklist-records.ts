export const travelChecklistCategories = [
  "Essentials",
  "Documents",
  "Clothes",
  "Toiletries",
  "Medications",
  "Tech",
  "Home before you go",
  "Travel day",
] as const;

export type TravelChecklistCategory =
  (typeof travelChecklistCategories)[number];

export type TravelChecklistItem = {
  id: string;
  tripId: string;
  label: string;
  category: TravelChecklistCategory;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
};

export type TravelChecklistRecord = {
  items: TravelChecklistItem[];
};

export function createInitialTravelChecklistRecord(): TravelChecklistRecord {
  return { items: [] };
}

export function hydrateTravelChecklistRecord(
  value?: Partial<TravelChecklistRecord>,
): TravelChecklistRecord {
  const legacyCategoryMap: Record<string, TravelChecklistCategory> = {
    "Documents to take": "Documents",
    Packing: "Essentials",
    "Home checks": "Home before you go",
    Journey: "Travel day",
  };
  return {
    items: Array.isArray(value?.items)
      ? value.items
          .filter((item) => Boolean(item?.id && item.tripId && item.label))
          .map((item) => ({
            ...item,
            category:
              legacyCategoryMap[item.category] ??
              (travelChecklistCategories.includes(
                item.category as TravelChecklistCategory,
              )
                ? (item.category as TravelChecklistCategory)
                : "Essentials"),
          })) as TravelChecklistItem[]
      : [],
  };
}
