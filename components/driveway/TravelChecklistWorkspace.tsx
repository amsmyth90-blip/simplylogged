"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { BottomNav } from "@/components/BottomNav";
import { useLifeDockData } from "@/components/LifeDockDataProvider";
import { ModalShell } from "@/components/ModalShell";
import { UiIcon, type IconName } from "@/components/UiIcon";
import {
  travelChecklistCategories,
  type TravelChecklistCategory,
  type TravelChecklistItem,
} from "@/lib/travel-checklist-records";

type ChecklistStage = "overview" | "checklist" | "suggestions" | "review";

const stages: Array<{ id: ChecklistStage; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "checklist", label: "Checklist" },
  { id: "suggestions", label: "Suggestions" },
  { id: "review", label: "Final review" },
];

const categoryDetails: Record<
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

const smartSuggestions: Array<{
  label: string;
  detail: string;
  category: TravelChecklistCategory;
  icon: IconName;
}> = [
  {
    label: "Travel insurance",
    detail: "Confirm suitable cover before travelling",
    category: "Documents",
    icon: "shield",
  },
  {
    label: "Essential medications",
    detail: "Pack enough for the full trip",
    category: "Medications",
    icon: "heart",
  },
  {
    label: "Download offline maps",
    detail: "Keep directions available without signal",
    category: "Tech",
    icon: "map-pin",
  },
  {
    label: "Check passport expiry",
    detail: "Review destination validity requirements",
    category: "Documents",
    icon: "file",
  },
  {
    label: "House keys",
    detail: "Take a set or arrange a trusted keyholder",
    category: "Essentials",
    icon: "lock",
  },
  {
    label: "Turn off heating",
    detail: "Set the home safely while away",
    category: "Home before you go",
    icon: "home",
  },
  {
    label: "Notify your bank",
    detail: "Check whether travel notice is needed",
    category: "Travel day",
    icon: "bell",
  },
  {
    label: "Travel adapter",
    detail: "Check the plug type for the destination",
    category: "Tech",
    icon: "gear",
  },
];

const checklistTemplates: Array<{
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

function ChecklistItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: TravelChecklistItem;
  onToggle: (item: TravelChecklistItem) => void;
  onDelete: (itemId: string) => void;
}) {
  return (
    <li className="flex min-h-[58px] items-center gap-3 border-b border-[#20352a]/[0.06] py-2 last:border-0">
      <button
        type="button"
        onClick={() => onToggle(item)}
        aria-label={`${item.completed ? "Mark not packed" : "Mark packed"}: ${item.label}`}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] ${
          item.completed
            ? "border-[#6f8e72]/30 bg-[#6f8e72] text-white"
            : "border-[#20352a]/15 bg-white text-transparent"
        }`}
      >
        <UiIcon name="check" className="h-4 w-4" />
      </button>
      <span
        className={`min-w-0 flex-1 text-sm ${item.completed ? "text-[#667068] line-through" : "font-medium text-[#20352a]"}`}
      >
        {item.label}
      </span>
      <span
        className={`hidden text-[10px] font-semibold sm:block ${item.completed ? "text-[#52705a]" : "text-[#b07938]"}`}
      >
        {item.completed ? "Packed" : "Still to pack"}
      </span>
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        aria-label={`Delete ${item.label}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#667068] hover:bg-[#f4ebe6] hover:text-[#8a5145] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
      >
        <UiIcon name="plus" className="h-4 w-4 rotate-45" />
      </button>
    </li>
  );
}

export function TravelChecklistWorkspace({
  initialTripId,
  backHref = "/room/driveway",
}: {
  initialTripId?: string;
  backHref?: string;
} = {}) {
  const { state, updateState } = useLifeDockData();
  const availableTrips = useMemo(
    () =>
      state.trips.trips
        .filter(
          (trip) =>
            trip.status !== "completed" &&
            trip.status !== "cancelled" &&
            trip.status !== "archived",
        )
        .sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [state.trips.trips],
  );
  const [tripId, setTripId] = useState(
    initialTripId && availableTrips.some((trip) => trip.id === initialTripId)
      ? initialTripId
      : (availableTrips[0]?.id ?? "general"),
  );
  const [stage, setStage] = useState<ChecklistStage>("overview");
  const [category, setCategory] =
    useState<TravelChecklistCategory>("Essentials");
  const [addOpen, setAddOpen] = useState(false);
  const [itemLabel, setItemLabel] = useState("");
  const [itemCategory, setItemCategory] =
    useState<TravelChecklistCategory>("Essentials");
  const [formError, setFormError] = useState("");

  const selectedTrip =
    availableTrips.find((trip) => trip.id === tripId) ?? null;
  const selectedItems = state.travelChecklist.items.filter(
    (item) => item.tripId === tripId,
  );
  const completedCount = selectedItems.filter((item) => item.completed).length;
  const totalCount = selectedItems.length;
  const remainingCount = totalCount - completedCount;
  const progress = totalCount
    ? Math.round((completedCount / totalCount) * 100)
    : 0;
  const missingItems = selectedItems.filter((item) => !item.completed);
  const availableSuggestions = smartSuggestions.filter(
    (suggestion) =>
      !selectedItems.some(
        (item) => item.label.toLowerCase() === suggestion.label.toLowerCase(),
      ),
  );

  const saveItems = (
    items: Array<{ label: string; category: TravelChecklistCategory }>,
  ) => {
    const existing = new Set(
      state.travelChecklist.items
        .filter((item) => item.tripId === tripId)
        .map((item) => item.label.toLowerCase()),
    );
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
      travelChecklist: {
        items: [...current.travelChecklist.items, ...newItems],
      },
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
        items: current.travelChecklist.items.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                completed: !entry.completed,
                completedAt: !entry.completed
                  ? new Date().toISOString()
                  : undefined,
              }
            : entry,
        ),
      },
    }));
  };

  const deleteItem = (itemId: string) => {
    updateState((current) => ({
      ...current,
      travelChecklist: {
        items: current.travelChecklist.items.filter(
          (item) => item.id !== itemId,
        ),
      },
    }));
  };

  const openCategory = (nextCategory: TravelChecklistCategory) => {
    setCategory(nextCategory);
    setItemCategory(nextCategory);
    setStage("checklist");
  };

  return (
    <main className="min-h-screen bg-[#f8f3e8] pb-32 text-[#173c2b]">
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <span className="absolute -right-16 top-12 h-64 w-64 rounded-full bg-[#dfe7d8]/55 blur-3xl" />
        <span className="absolute -left-20 bottom-24 h-72 w-72 rounded-full bg-[#ead9c0]/45 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-[760px] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <header className="flex items-center gap-3">
          <Link
            href={backHref}
            aria-label="Back"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#173c2b]/10 bg-white/80 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
          >
            <UiIcon name="arrow-left" className="h-5 w-5" />
          </Link>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-[#b8a071]/45 bg-[#fffaf0] text-[#315b42] shadow-sm">
            <UiIcon name="check" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-[clamp(1.55rem,7vw,2rem)] leading-tight tracking-tight">
              Travel Checklist
            </h1>
            <p className="mt-0.5 text-[11px] text-[#7a5c35]">
              Pack smarter. Travel lighter. Worry less.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#205238] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#19462f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"
          >
            <UiIcon name="plus" className="h-4 w-4" /> Add
          </button>
        </header>

        <section className="mt-5 rounded-[22px] border border-[#b8a071]/25 bg-white/78 p-3 shadow-sm">
          <label
            htmlFor="checklist-trip"
            className="block text-[9px] font-bold uppercase tracking-[0.18em] text-[#667068]"
          >
            Checklist for
          </label>
          <select
            id="checklist-trip"
            value={tripId}
            onChange={(event) => {
              setTripId(event.target.value);
              setStage("overview");
            }}
            className="mt-2 min-h-12 w-full rounded-[14px] border border-[#173c2b]/10 bg-[#fffdf8] px-3 text-sm font-semibold text-[#173c2b] outline-none focus:border-[#6f8e72]"
          >
            <option value="general">General travel checklist</option>
            {availableTrips.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.title} · {trip.destination}
              </option>
            ))}
          </select>
          {!availableTrips.length ? (
            <p className="mt-2 text-[11px] text-[#667068]">
              Create a trip in{" "}
              <Link
                href="/driveway/trips"
                className="font-semibold text-[#315b42] underline underline-offset-2"
              >
                My Trips
              </Link>{" "}
              to link its own checklist.
            </p>
          ) : null}
        </section>

        <nav
          aria-label="Checklist stages"
          className="mt-4 grid grid-cols-4 gap-1 rounded-[18px] border border-[#b8a071]/25 bg-white/72 p-1 shadow-sm"
        >
          {stages.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStage(item.id)}
              aria-current={stage === item.id ? "step" : undefined}
              className={`min-h-[52px] rounded-[14px] px-1 text-[9px] font-bold leading-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] sm:text-[11px] ${stage === item.id ? "bg-[#205238] text-white shadow-sm" : "text-[#315b42] hover:bg-white"}`}
            >
              <span
                className={`mx-auto mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[9px] ${stage === item.id ? "bg-white/18" : "bg-[#e6ecdf]"}`}
              >
                {index + 1}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        {stage === "overview" ? (
          <div className="mt-5 space-y-4">
            <section className="rounded-[24px] border border-[#b8a071]/25 bg-white/88 p-4 shadow-[0_18px_45px_-38px_rgba(32,53,42,0.45)]">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#edf2e8] text-[#205238]">
                  <UiIcon name="map-pin" className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-serif text-xl">
                    {selectedTrip
                      ? selectedTrip.title
                      : "Your travel checklist"}
                  </h2>
                  <p className="mt-1 truncate text-xs text-[#667068]">
                    {selectedTrip
                      ? selectedTrip.destination
                      : "Build a checklist for any journey"}
                  </p>
                </div>
                <div
                  className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(#3f704e ${progress * 3.6}deg, #e5e7df 0deg)`,
                  }}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-bold text-[#205238]">
                    {progress}%
                  </span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 divide-x divide-[#173c2b]/10 rounded-[16px] bg-[#f6f3eb] py-3 text-center">
                <div>
                  <p className="text-lg font-bold">{totalCount}</p>
                  <p className="text-[9px] uppercase tracking-wide text-[#667068]">
                    Items
                  </p>
                </div>
                <div>
                  <p className="text-lg font-bold text-[#3f704e]">
                    {completedCount}
                  </p>
                  <p className="text-[9px] uppercase tracking-wide text-[#667068]">
                    Packed
                  </p>
                </div>
                <div>
                  <p className="text-lg font-bold text-[#b07938]">
                    {remainingCount}
                  </p>
                  <p className="text-[9px] uppercase tracking-wide text-[#667068]">
                    Still to pack
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-[#b8a071]/25 bg-white/88 p-4 shadow-[0_18px_45px_-38px_rgba(32,53,42,0.45)]">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold">Checklist groups</h2>
                  <p className="mt-1 text-[10px] text-[#667068]">
                    Open a group to pack its items.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStage("suggestions")}
                  className="min-h-11 text-xs font-semibold text-[#315b42]"
                >
                  Get suggestions
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {travelChecklistCategories.map((itemCategory) => {
                  const categoryItems = selectedItems.filter(
                    (item) => item.category === itemCategory,
                  );
                  const packed = categoryItems.filter(
                    (item) => item.completed,
                  ).length;
                  const categoryProgress = categoryItems.length
                    ? Math.round((packed / categoryItems.length) * 100)
                    : 0;
                  const details = categoryDetails[itemCategory];
                  return (
                    <button
                      key={itemCategory}
                      type="button"
                      onClick={() => openCategory(itemCategory)}
                      className="flex min-h-[64px] w-full items-center gap-3 rounded-[16px] border border-[#173c2b]/[0.07] bg-[#fffdf9] p-3 text-left transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#eef2e9] text-[#315b42]">
                        <UiIcon name={details.icon} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-semibold">
                            {itemCategory}
                          </span>
                          <span className="text-[9px] font-semibold text-[#667068]">
                            {packed}/{categoryItems.length}
                          </span>
                        </span>
                        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[#e7e6df]">
                          <span
                            className="block h-full rounded-full bg-[#4f7655]"
                            style={{ width: `${categoryProgress}%` }}
                          />
                        </span>
                      </span>
                      <UiIcon
                        name="chevron-right"
                        className="h-4 w-4 shrink-0 text-[#667068]"
                      />
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        ) : null}

        {stage === "checklist" ? (
          <section className="mt-5 rounded-[24px] border border-[#b8a071]/25 bg-white/88 p-4 shadow-[0_18px_45px_-38px_rgba(32,53,42,0.45)]">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#eef2e9] text-[#315b42]">
                <UiIcon
                  name={categoryDetails[category].icon}
                  className="h-[18px] w-[18px]"
                />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-xl">{category}</h2>
                <p className="mt-0.5 text-[10px] text-[#667068]">
                  {categoryDetails[category].hint}
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
              {travelChecklistCategories.map((itemCategory) => (
                <button
                  key={itemCategory}
                  type="button"
                  onClick={() => {
                    setCategory(itemCategory);
                    setItemCategory(itemCategory);
                  }}
                  className={`min-h-11 shrink-0 rounded-full px-3 text-[10px] font-semibold ${category === itemCategory ? "bg-[#205238] text-white" : "border border-[#173c2b]/10 bg-[#fffdf8] text-[#315b42]"}`}
                >
                  {itemCategory}
                </button>
              ))}
            </div>
            <ul className="mt-2">
              {selectedItems.filter((item) => item.category === category)
                .length ? (
                selectedItems
                  .filter((item) => item.category === category)
                  .map((item) => (
                    <ChecklistItemRow
                      key={item.id}
                      item={item}
                      onToggle={toggleItem}
                      onDelete={deleteItem}
                    />
                  ))
              ) : (
                <li className="rounded-[18px] border border-dashed border-[#6f8e72]/30 bg-[#eef2e9]/65 px-4 py-8 text-center text-xs leading-5 text-[#667068]">
                  No items in {category.toLowerCase()} yet.
                </li>
              )}
            </ul>
            <button
              type="button"
              onClick={() => {
                setItemCategory(category);
                setAddOpen(true);
              }}
              className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] border border-dashed border-[#9b8254]/45 bg-[#fffaf0] text-xs font-semibold text-[#315b42]"
            >
              <UiIcon name="plus" className="h-4 w-4" />
              Add custom item
            </button>
            <div className="mt-4 rounded-[16px] bg-[#eef2e9] p-3">
              <div className="flex items-center justify-between text-[10px] font-semibold text-[#315b42]">
                <span>
                  {completedCount} / {totalCount} packed
                </span>
                <span>{progress}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-[#3f704e]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </section>
        ) : null}

        {stage === "suggestions" ? (
          <div className="mt-5 space-y-4">
            <section className="rounded-[20px] border border-[#9fb58f]/45 bg-[#eef4e9] p-4">
              <div className="flex gap-3">
                <UiIcon
                  name="star"
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#315b42]"
                />
                <div>
                  <h2 className="text-sm font-bold">
                    Suggestions for your checklist
                  </h2>
                  <p className="mt-1 text-[11px] leading-5 text-[#667068]">
                    Based on common travel preparation. Add only what suits your
                    trip.
                  </p>
                </div>
              </div>
            </section>
            <section className="overflow-hidden rounded-[24px] border border-[#b8a071]/25 bg-white/88 shadow-[0_18px_45px_-38px_rgba(32,53,42,0.45)]">
              {availableSuggestions.length ? (
                availableSuggestions.map((suggestion) => (
                  <article
                    key={suggestion.label}
                    className="flex min-h-[76px] items-center gap-3 border-b border-[#173c2b]/[0.06] p-3 last:border-0"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#eef2e9] text-[#315b42]">
                      <UiIcon name={suggestion.icon} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-semibold">
                        {suggestion.label}
                      </h3>
                      <p className="mt-0.5 text-[10px] leading-4 text-[#667068]">
                        {suggestion.detail}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        saveItems([
                          {
                            label: suggestion.label,
                            category: suggestion.category,
                          },
                        ])
                      }
                      className="min-h-11 rounded-full border border-[#638064]/30 bg-[#f8fbf5] px-3 text-[10px] font-semibold text-[#315b42]"
                    >
                      + Add
                    </button>
                  </article>
                ))
              ) : (
                <div className="px-5 py-10 text-center text-sm text-[#667068]">
                  All current suggestions have been added.
                </div>
              )}
            </section>
            <section className="rounded-[24px] border border-[#b8a071]/25 bg-white/88 p-4">
              <h2 className="text-sm font-bold">Quick-add templates</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {checklistTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => saveItems(template.items)}
                    className="min-h-[84px] rounded-[16px] border border-[#173c2b]/10 bg-[#fffdf8] p-3 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
                  >
                    <UiIcon
                      name={template.icon}
                      className="mx-auto h-5 w-5 text-[#315b42]"
                    />
                    <span className="mt-2 block text-[10px] font-semibold">
                      {template.label}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {stage === "review" ? (
          <div className="mt-5 space-y-4">
            <section
              className={`rounded-[22px] border p-4 ${totalCount > 0 && remainingCount === 0 ? "border-[#80a477]/45 bg-[#e9f1e5]" : "border-[#d9bc82]/45 bg-[#fff5df]"}`}
            >
              <div className="flex gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white/75 text-[#315b42]">
                  <UiIcon
                    name={
                      remainingCount === 0 && totalCount > 0
                        ? "check"
                        : "briefcase"
                    }
                    className="h-5 w-5"
                  />
                </span>
                <div>
                  <h2 className="text-sm font-bold">
                    {totalCount === 0
                      ? "Build your checklist first"
                      : remainingCount === 0
                        ? "You're ready to travel"
                        : "You're almost ready"}
                  </h2>
                  <p className="mt-1 text-[11px] text-[#667068]">
                    {totalCount === 0
                      ? "Add items or choose a template before final review."
                      : remainingCount === 0
                        ? "Every checklist item is complete."
                        : `Review ${remainingCount} remaining item${remainingCount === 1 ? "" : "s"} before you go.`}
                  </p>
                </div>
              </div>
            </section>
            <section className="rounded-[24px] border border-[#b8a071]/25 bg-white/88 p-4 shadow-[0_18px_45px_-38px_rgba(32,53,42,0.45)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-[#a55443]">
                    Still to pack ({remainingCount})
                  </h2>
                  <p className="mt-1 text-[10px] text-[#667068]">
                    Everything not yet confirmed.
                  </p>
                </div>
                <div
                  className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(#3f704e ${progress * 3.6}deg, #e5e7df 0deg)`,
                  }}
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-base font-bold">
                    {progress}%
                  </span>
                </div>
              </div>
              <ul className="mt-4 space-y-2">
                {missingItems.length ? (
                  missingItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 rounded-[13px] bg-[#fff8ef] px-3 py-2 text-xs"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#b45a47]" />
                      <span className="min-w-0 flex-1">{item.label}</span>
                      <span className="text-[9px] text-[#667068]">
                        {item.category}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="rounded-[14px] bg-[#eef4e9] px-3 py-4 text-center text-xs text-[#315b42]">
                    No outstanding items.
                  </li>
                )}
              </ul>
              <div className="mt-4 grid grid-cols-3 divide-x divide-[#173c2b]/10 rounded-[16px] bg-[#f6f3eb] py-3 text-center">
                <div>
                  <p className="text-lg font-bold">{totalCount}</p>
                  <p className="text-[9px] uppercase tracking-wide text-[#667068]">
                    Total
                  </p>
                </div>
                <div>
                  <p className="text-lg font-bold text-[#3f704e]">
                    {completedCount}
                  </p>
                  <p className="text-[9px] uppercase tracking-wide text-[#667068]">
                    Packed
                  </p>
                </div>
                <div>
                  <p className="text-lg font-bold text-[#b07938]">
                    {remainingCount}
                  </p>
                  <p className="text-[9px] uppercase tracking-wide text-[#667068]">
                    Remaining
                  </p>
                </div>
              </div>
            </section>
            <button
              type="button"
              disabled={totalCount === 0 || remainingCount > 0}
              className="min-h-12 w-full rounded-[15px] bg-[#205238] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              Ready to travel
            </button>
          </div>
        ) : null}

        <div className="mt-5 rounded-[20px] border border-[#d8dfd2] bg-[#eef2e9]/78 px-4 py-3 text-[11px] leading-5 text-[#4f6256]">
          <span className="font-semibold">Privacy note:</span> use the checklist
          to confirm that documents are packed. Passport numbers and original
          identity records remain in the Office or secure All Files storage.
        </div>
      </div>

      <ModalShell
        open={addOpen}
        title="Add a checklist item"
        subtitle={
          selectedTrip
            ? `For ${selectedTrip.title}`
            : "For your general travel checklist"
        }
        onClose={() => {
          setAddOpen(false);
          setFormError("");
        }}
        footer={
          <button
            type="button"
            onClick={addItem}
            className="min-h-12 w-full rounded-2xl bg-[#205238] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"
          >
            Save item
          </button>
        }
      >
        <div className="space-y-4">
          <label className="block text-xs font-semibold text-[#3c5145]">
            Checklist item *
            <input
              value={itemLabel}
              onChange={(event) => {
                setFormError("");
                setItemLabel(event.target.value);
              }}
              placeholder="What needs to be done or packed?"
              className="mt-2 min-h-12 w-full rounded-[15px] border border-[#173c2b]/10 bg-white px-3 text-sm font-normal outline-none focus:border-[#6f8e72]"
            />
          </label>
          <label className="block text-xs font-semibold text-[#3c5145]">
            Category
            <select
              value={itemCategory}
              onChange={(event) =>
                setItemCategory(event.target.value as TravelChecklistCategory)
              }
              className="mt-2 min-h-12 w-full rounded-[15px] border border-[#173c2b]/10 bg-white px-3 text-sm font-normal outline-none focus:border-[#6f8e72]"
            >
              {travelChecklistCategories.map((itemCategory) => (
                <option key={itemCategory} value={itemCategory}>
                  {itemCategory}
                </option>
              ))}
            </select>
          </label>
          {formError ? (
            <p
              role="alert"
              className="rounded-xl bg-[#f8e7e2] px-3 py-2 text-xs font-medium text-[#8a5145]"
            >
              {formError}
            </p>
          ) : null}
        </div>
      </ModalShell>

      <BottomNav />
    </main>
  );
}
