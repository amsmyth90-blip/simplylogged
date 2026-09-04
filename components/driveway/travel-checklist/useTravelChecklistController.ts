"use client";

import { useMemo, useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import {
  smartSuggestions,
  type ChecklistStage,
} from "@/components/driveway/travel-checklist/travel-checklist-model";
import type {
  TravelChecklistCategory,
  TravelChecklistItem,
} from "@/lib/travel-checklist-records";

export function useTravelChecklistController(initialTripId?: string) {
  const { state, updateState } = useDiaryDockData();
  const availableTrips = useMemo(() => state.trips.trips
    .filter((trip) => !["completed", "cancelled", "archived"].includes(trip.status))
    .sort((a, b) => a.startDate.localeCompare(b.startDate)), [state.trips.trips]);
  const [tripId, setTripId] = useState(
    initialTripId && availableTrips.some((trip) => trip.id === initialTripId)
      ? initialTripId
      : (availableTrips[0]?.id ?? "general"),
  );
  const [stage, setStage] = useState<ChecklistStage>("overview");
  const [category, setCategory] = useState<TravelChecklistCategory>("Essentials");
  const [addOpen, setAddOpen] = useState(false);
  const [itemLabel, setItemLabel] = useState("");
  const [itemCategory, setItemCategory] = useState<TravelChecklistCategory>("Essentials");
  const [formError, setFormError] = useState("");
  const selectedTrip = availableTrips.find((trip) => trip.id === tripId) ?? null;
  const selectedItems = state.travelChecklist.items.filter((item) => item.tripId === tripId);
  const completedCount = selectedItems.filter((item) => item.completed).length;
  const totalCount = selectedItems.length;
  const remainingCount = totalCount - completedCount;
  const progress = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const missingItems = selectedItems.filter((item) => !item.completed);
  const availableSuggestions = smartSuggestions.filter((suggestion) =>
    !selectedItems.some((item) => item.label.toLowerCase() === suggestion.label.toLowerCase()),
  );

  const saveItems = (items: Array<{ label: string; category: TravelChecklistCategory }>) => {
    const existing = new Set(state.travelChecklist.items
      .filter((item) => item.tripId === tripId)
      .map((item) => item.label.toLowerCase()));
    const now = Date.now();
    const newItems: TravelChecklistItem[] = items
      .filter((item) => !existing.has(item.label.toLowerCase()))
      .map((item, index) => ({
        id: `travel-check-${now}-${index}`,
        tripId,
        label: item.label,
        category: item.category,
        completed: false,
        createdAt: new Date().toISOString(),
      }));
    if (!newItems.length) return;
    updateState((current) => ({
      ...current,
      travelChecklist: { items: [...current.travelChecklist.items, ...newItems] },
    }));
  };
  const addItem = () => {
    const label = itemLabel.trim();
    if (!label) {
      setFormError("Add a checklist item before saving.");
      return;
    }
    saveItems([{ label, category: itemCategory }]);
    setItemLabel("");
    setItemCategory("Essentials");
    setFormError("");
    setAddOpen(false);
    setCategory(itemCategory);
    setStage("checklist");
  };
  const toggleItem = (item: TravelChecklistItem) => {
    updateState((current) => ({
      ...current,
      travelChecklist: {
        items: current.travelChecklist.items.map((entry) => entry.id === item.id
          ? {
              ...entry,
              completed: !entry.completed,
              completedAt: !entry.completed ? new Date().toISOString() : undefined,
            }
          : entry),
      },
    }));
  };
  const deleteItem = (itemId: string) => {
    updateState((current) => ({
      ...current,
      travelChecklist: {
        items: current.travelChecklist.items.filter((item) => item.id !== itemId),
      },
    }));
  };
  const openCategory = (nextCategory: TravelChecklistCategory) => {
    setCategory(nextCategory);
    setItemCategory(nextCategory);
    setStage("checklist");
  };
  const closeAdd = () => {
    setAddOpen(false);
    setFormError("");
  };
  const selectTrip = (nextTripId: string) => {
    setTripId(nextTripId);
    setStage("overview");
  };

  return {
    availableTrips, tripId, selectTrip, stage, setStage, category, setCategory,
    addOpen, setAddOpen, itemLabel, setItemLabel, itemCategory, setItemCategory,
    formError, setFormError, selectedTrip, selectedItems, completedCount,
    totalCount, remainingCount, progress, missingItems, availableSuggestions,
    saveItems, addItem, toggleItem, deleteItem, openCategory, closeAdd,
  };
}

export type TravelChecklistController = ReturnType<typeof useTravelChecklistController>;
