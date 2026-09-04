"use client";

import Link from "next/link";
import { useState } from "react";

import { BottomNav } from "@/components/BottomNav";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import {
  calendarCategories,
  useFullscreenScrollLock,
  type CalendarCategory,
  type HouseholdEvent,
} from "@/components/kitchen-feature/kitchen-feature-model";
import { FamilyCalendarDialog } from "@/components/kitchen-feature/FamilyCalendarDialog";

export function FamilyCalendar() {
  const { state, updateState } = useDiaryDockData();
  const now = new Date();
  const [cursor, setCursor] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const [selected, setSelected] = useState(now.getDate());
  const [activeCategory, setActiveCategory] = useState<CalendarCategory | null>(
    null,
  );
  const [newEvent, setNewEvent] = useState("");
  const [newEventTime, setNewEventTime] = useState("09:00");
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const dayCount = new Date(year, month + 1, 0).getDate();
  const dateKey = (day: number) =>
    [
      year,
      String(month + 1).padStart(2, "0"),
      String(day).padStart(2, "0"),
    ].join("-");
  const key = dateKey(selected);
  const events = state.familyCalendarEvents.reduce<
    Record<string, HouseholdEvent[]>
  >((grouped, event) => {
    grouped[event.date] = [...(grouped[event.date] ?? []), event];
    return grouped;
  }, {});
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstDay + 1;
    return day > 0 && day <= dayCount ? day : null;
  });
  const selectedDate = new Date(year, month, selected);
  const selectedEvents = events[key] ?? [];
  const activeEvents = activeCategory
    ? selectedEvents.filter((event) => event.category === activeCategory)
    : [];
  useFullscreenScrollLock();

  const addEvent = () => {
    if (!activeCategory || !newEvent.trim()) return;
    const entry: HouseholdEvent = {
      id: crypto.randomUUID(),
      title: newEvent.trim(),
      time: newEventTime,
      category: activeCategory,
    };
    updateState((current) => ({
      ...current,
      familyCalendarEvents: [
        ...current.familyCalendarEvents,
        { ...entry, date: key },
      ],
    }));
    setNewEvent("");
  };

  return (
    <div className="fixed inset-0 z-30 overflow-hidden bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.95),transparent_34%),linear-gradient(180deg,#e8f0e4_0%,#f8faf6_45%,#edf4ea_100%)] text-slate-900">
      <div className="mx-auto flex h-full w-full max-w-lg flex-col px-4 pb-[82px] pt-[max(12px,env(safe-area-inset-top))]">
        <header className="flex shrink-0 items-center gap-3">
          <Link
            href="/room/kitchen"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/90 bg-white/72 text-slate-700 shadow-sm backdrop-blur-xl"
            aria-label="Back to Kitchen"
          >
            <UiIcon name="arrow-left" className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#66805c]">
              Kitchen · Wall calendar
            </p>
            <h1 className="text-xl font-semibold tracking-tight">
              Family calendar
            </h1>
            <p className="mt-0.5 truncate text-[10px] text-slate-500">
              Appointments, school dates, meals and family plans.
            </p>
          </div>
        </header>

        <main className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
          <section className="shrink-0 rounded-[24px] border border-white/90 bg-white/78 px-3 py-2.5 shadow-[0_18px_45px_-26px_rgba(35,54,43,0.45)] backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setCursor(new Date(year, month - 1, 1));
                  setSelected(1);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf3e9] text-slate-700"
                aria-label="Previous month"
              >
                <UiIcon name="arrow-left" className="h-3.5 w-3.5" />
              </button>
              <h2 className="text-sm font-semibold">
                {cursor.toLocaleDateString("en-GB", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <button
                onClick={() => {
                  setCursor(new Date(year, month + 1, 1));
                  setSelected(1);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf3e9] text-slate-700"
                aria-label="Next month"
              >
                <UiIcon name="chevron-right" className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-1.5 grid grid-cols-7 text-center text-[9px] font-bold uppercase text-slate-400">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                <span key={day + index}>{day}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 grid-rows-6 gap-1">
              {cells.map((day, index) =>
                day ? (
                  <button
                    key={index}
                    onClick={() => setSelected(day)}
                    className={`relative flex h-[clamp(28px,4.3svh,36px)] items-center justify-center rounded-[11px] text-[11px] font-semibold transition ${selected === day ? "bg-[#718c65] text-white shadow-sm" : "bg-white/65 text-slate-700 hover:bg-white"}`}
                  >
                    {day}
                    {events[dateKey(day)]?.length ? (
                      <span
                        className={`absolute bottom-1 h-1 w-1 rounded-full ${selected === day ? "bg-amber-200" : "bg-amber-500"}`}
                      />
                    ) : null}
                  </button>
                ) : (
                  <span key={index} />
                ),
              )}
            </div>
          </section>

          <section className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2.5">
            {calendarCategories.map((category) => {
              const categoryEvents = selectedEvents.filter(
                (event) => event.category === category.id,
              );
              const previewEvents = categoryEvents.length
                ? categoryEvents
                : category.examples;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex min-h-0 flex-col overflow-hidden rounded-[20px] border bg-white/80 text-left shadow-[0_12px_30px_-24px_rgba(15,23,42,0.5)] backdrop-blur-xl transition active:scale-[0.98] ${category.surface}`}
                >
                  <span
                    className={`flex items-center gap-2 px-2.5 py-2 ${category.iconSurface}`}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-white/60">
                      <UiIcon name={category.icon} className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-semibold">
                      {category.label}
                    </span>
                    <UiIcon
                      name="chevron-right"
                      className="ml-auto h-3.5 w-3.5 opacity-55"
                    />
                  </span>
                  <span className="flex flex-1 flex-col px-2.5 py-1.5">
                    {previewEvents.slice(0, 2).map((event, index) => (
                      <span
                        key={`${event.title}-${index}`}
                        className="flex items-center gap-1.5 border-b border-slate-100 py-1 text-[9px] last:border-0"
                      >
                        <span className="min-w-0 flex-1 truncate font-medium text-slate-700">
                          {event.title}
                        </span>
                        <span className="shrink-0 text-slate-400">
                          {event.time}
                        </span>
                      </span>
                    ))}
                    <span className="mt-auto pt-1 text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">
                      {categoryEvents.length
                        ? `${categoryEvents.length} planned`
                        : `View all for ${selected}`}
                    </span>
                  </span>
                </button>
              );
            })}
          </section>
        </main>
      </div>

      {activeCategory ? (
        <FamilyCalendarDialog
          category={activeCategory}
          selectedDate={selectedDate}
          events={activeEvents}
          newEvent={newEvent}
          newEventTime={newEventTime}
          onClose={() => setActiveCategory(null)}
          onNewEventChange={setNewEvent}
          onNewEventTimeChange={setNewEventTime}
          onAdd={addEvent}
          onRemove={(eventId) =>
            updateState((current) => ({
              ...current,
              familyCalendarEvents: current.familyCalendarEvents.filter(
                (entry) => entry.id !== eventId,
              ),
            }))
          }
        />
      ) : null}
      <BottomNav />
    </div>
  );
}
