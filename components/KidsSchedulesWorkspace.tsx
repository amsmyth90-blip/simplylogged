"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BottomNav } from "@/components/BottomNav";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import type { KidScheduleRoutine } from "@/lib/diarydock-data";

type PlannerMode = "week" | "editor";
type HouseholdStyle = "children" | "adults" | "shared" | "solo";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const timeLabels = ["8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM"];
const colours: KidScheduleRoutine["colour"][] = ["sage", "blue", "clay", "gold"];

const colourStyles: Record<
  KidScheduleRoutine["colour"],
  { card: string; dot: string; solid: string }
> = {
  sage: {
    card: "border-[#b9cba8] bg-[#dfe9d6] text-[#3f5637]",
    dot: "bg-[#729164]",
    solid: "bg-[#729164]"
  },
  blue: {
    card: "border-[#b9cee0] bg-[#dceaf4] text-[#405d72]",
    dot: "bg-[#7198b5]",
    solid: "bg-[#7198b5]"
  },
  clay: {
    card: "border-[#e4c5b1] bg-[#f2dfd2] text-[#7c513a]",
    dot: "bg-[#bd7c58]",
    solid: "bg-[#bd7c58]"
  },
  gold: {
    card: "border-[#e2d1a9] bg-[#f3e8cb] text-[#765e2f]",
    dot: "bg-[#b5964e]",
    solid: "bg-[#b5964e]"
  }
};

const emptyDraft: Omit<KidScheduleRoutine, "id"> = {
  title: "",
  childName: "",
  day: 2,
  startTime: "16:00",
  endTime: "17:00",
  repeat: "weekly",
  location: "",
  responsibleAdult: "",
  transport: "Car",
  colour: "blue",
  paused: false
};

function minutesFromTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return new Date(2026, 0, 1, hours, minutes).toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function activityPosition(routine: KidScheduleRoutine) {
  const dayStart = 8 * 60;
  const dayEnd = 19 * 60;
  const total = dayEnd - dayStart;
  const start = Math.min(dayEnd, Math.max(dayStart, minutesFromTime(routine.startTime)));
  const end = Math.min(dayEnd, Math.max(start + 30, minutesFromTime(routine.endTime)));

  return {
    top: `${((start - dayStart) / total) * 100}%`,
    height: `${Math.max(10, ((end - start) / total) * 100)}%`
  };
}

function groupRoutinesBySlot(routines: KidScheduleRoutine[]) {
  const groups = new Map<string, KidScheduleRoutine[]>();

  routines
    .sort((first, second) =>
      `${first.startTime}-${first.endTime}-${first.childName}`.localeCompare(
        `${second.startTime}-${second.endTime}-${second.childName}`
      )
    )
    .forEach((routine) => {
      const key = `${routine.startTime}-${routine.endTime}`;
      groups.set(key, [...(groups.get(key) ?? []), routine]);
    });

  return Array.from(groups.entries()).map(([key, slotRoutines]) => ({
    key,
    routines: slotRoutines
  }));
}

export function KidsSchedulesWorkspace({ previewEditable = false }: { previewEditable?: boolean }) {
  const { state, canEditShared, updateState } = useDiaryDockData();
  const editable = canEditShared || previewEditable;
  const routines = state.kidSchedules;
  const [mode, setMode] = useState<PlannerMode>("week");
  const [selectedPerson, setSelectedPerson] = useState("All");
  const [householdStyle, setHouseholdStyle] = useState<HouseholdStyle>("children");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [message, setMessage] = useState("");
  const [openSlot, setOpenSlot] = useState<KidScheduleRoutine[] | null>(null);

  useEffect(() => {
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.classList.add("kids-schedules-immersive");

    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
      document.body.classList.remove("kids-schedules-immersive");
    };
  }, []);

  useEffect(() => {
    const storedStyle = window.localStorage.getItem("diarydock-household-style");
    if (["children", "adults", "shared", "solo"].includes(storedStyle ?? "")) {
      setHouseholdStyle(storedStyle as HouseholdStyle);
    }
  }, []);

  const people = useMemo(
    () =>
      Array.from(
        new Set([
          ...routines.map((routine) => routine.childName.trim()),
          ...state.householdProfiles
            .filter((profile) => profile.showInSchedules)
            .map((profile) => profile.name.trim()),
          ...state.householdMembers.map((member) => member.name.trim())
        ].filter(Boolean))
      ),
    [routines, state.householdMembers, state.householdProfiles]
  );

  useEffect(() => {
    const person = new URLSearchParams(window.location.search).get("person");
    if (person && people.includes(person)) {
      setSelectedPerson(person);
    }
  }, [people]);

  const visibleRoutines = routines.filter(
    (routine) => selectedPerson === "All" || routine.childName === selectedPerson
  );
  const scheduleTitle = {
    children: "Family Schedules",
    adults: "Adult Schedules",
    shared: "Home Rota",
    solo: "My Schedule"
  }[householdStyle];
  const householdLabel = {
    children: "Family with children",
    adults: "Adults only",
    shared: "Shared home",
    solo: "Just me"
  }[householdStyle];

  const openNewRoutine = () => {
    if (!editable) return;
    setEditingId(null);
    setDraft({
      ...emptyDraft,
      childName: selectedPerson === "All" ? people[0] ?? "" : selectedPerson,
      colour: colours[routines.length % colours.length]
    });
    setMessage("");
    setMode("editor");
  };

  const editRoutine = (routine: KidScheduleRoutine) => {
    if (!editable) return;
    const { id, ...nextDraft } = routine;
    setEditingId(id);
    setDraft(nextDraft);
    setMessage("");
    setMode("editor");
  };

  const saveRoutine = () => {
    const title = draft.title.trim();
    const childName = draft.childName.trim();

    if (!title || !childName) {
      setMessage("Add the activity and who it belongs to.");
      return;
    }
    if (minutesFromTime(draft.endTime) <= minutesFromTime(draft.startTime)) {
      setMessage("The finish time needs to be after the start time.");
      return;
    }

    const id = editingId ?? crypto.randomUUID();
    const routine: KidScheduleRoutine = {
      ...draft,
      id,
      title,
      childName,
      location: draft.location.trim(),
      responsibleAdult: draft.responsibleAdult.trim()
    };

    updateState((current) => ({
      ...current,
      kidSchedules: editingId
        ? current.kidSchedules.map((item) => (item.id === editingId ? routine : item))
        : [...current.kidSchedules, routine]
    }));
    setSelectedPerson(childName);
    setEditingId(null);
    setDraft(emptyDraft);
    setMessage("");
    setMode("week");
  };

  const togglePause = (id: string) => {
    const paused = !draft.paused;
    setDraft((current) => ({ ...current, paused }));
    updateState((current) => ({
      ...current,
      kidSchedules: current.kidSchedules.map((routine) =>
        routine.id === id ? { ...routine, paused } : routine
      )
    }));
  };

  const deleteRoutine = (id: string) => {
    updateState((current) => ({
      ...current,
      kidSchedules: current.kidSchedules.filter((routine) => routine.id !== id)
    }));
    setEditingId(null);
    setDraft(emptyDraft);
    setMode("week");
  };

  return (
    <div className="fixed inset-0 z-30 overflow-hidden bg-[radial-gradient(circle_at_15%_0%,rgba(255,255,255,0.98),transparent_34%),linear-gradient(180deg,#edf3e9_0%,#fbfaf6_46%,#eef3ea_100%)] text-slate-900">
      <div className="mx-auto flex h-full w-full max-w-lg flex-col px-4 pb-[82px] pt-[max(12px,env(safe-area-inset-top))]">
        <header className="flex shrink-0 items-center gap-3">
          <Link
            href="/family"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/90 bg-white/75 text-slate-700 shadow-sm backdrop-blur-xl"
            aria-label="Back to Family"
          >
            <UiIcon name="arrow-left" className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href="/family?setup=schedules"
              className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#66805c]"
            >
              {householdLabel} · Change setup
            </Link>
            <h1 className="text-xl font-semibold tracking-tight">{scheduleTitle}</h1>
            <p className="truncate text-[9px] text-slate-500">Repeating routines · dated events are in the Kitchen</p>
          </div>
          <button
            type="button"
            onClick={openNewRoutine}
            disabled={!editable}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#273d34] text-white shadow-[0_12px_24px_-14px_rgba(30,55,43,0.8)] disabled:opacity-40"
            aria-label="Add weekly activity"
          >
            <UiIcon name="plus" className="h-4 w-4" />
          </button>
        </header>

        <div className="mt-3 flex shrink-0 items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Show schedules for</span>
            <select
              value={selectedPerson}
              onChange={(event) => setSelectedPerson(event.target.value)}
              className="h-8 w-full appearance-none rounded-full border border-white/90 bg-white/75 px-3 pr-8 text-[11px] font-semibold text-slate-600 shadow-sm outline-none"
            >
              <option value="All">Everyone</option>
              {people.map((person) => (
                <option key={person} value={person}>{person}</option>
              ))}
            </select>
            <UiIcon name="chevron-down" className="pointer-events-none absolute right-3 top-2 h-3.5 w-3.5 text-slate-400" />
          </label>
          <div className="flex rounded-full border border-white/90 bg-white/70 p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setMode("week")}
              className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                mode === "week" ? "bg-[#e2eadc] text-[#536b49]" : "text-slate-400"
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={openNewRoutine}
              disabled={!editable}
              className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                mode === "editor" ? "bg-[#e2eadc] text-[#536b49]" : "text-slate-400"
              }`}
            >
              Add/Edit
            </button>
          </div>
        </div>

        {mode === "week" ? (
          <main className="mt-3 flex min-h-0 flex-1 flex-col">
            <section className="relative min-h-0 flex-1 overflow-hidden rounded-[27px] border border-white/90 bg-white/78 p-3 shadow-[0_24px_60px_-34px_rgba(41,59,45,0.48)] backdrop-blur-xl">
              <div className="grid grid-cols-[30px_repeat(7,minmax(0,1fr))] gap-1">
                <span />
                {dayNames.map((day, index) => (
                  <div key={day} className="text-center">
                    <p className="text-[8px] font-bold uppercase text-slate-400">{day}</p>
                    <span
                      className={`mx-auto mt-1 block h-1.5 w-1.5 rounded-full ${
                        index === (new Date().getDay() + 6) % 7 ? "bg-[#789469]" : "bg-slate-200"
                      }`}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-2 grid h-[calc(100%-38px)] grid-cols-[30px_repeat(7,minmax(0,1fr))] gap-1">
                <div className="relative">
                  {timeLabels.map((time, index) => (
                    <span
                      key={time}
                      className="absolute right-1 -translate-y-1/2 text-[7px] font-medium text-slate-400"
                      style={{ top: `${(index / (timeLabels.length - 1)) * 91 + 3}%` }}
                    >
                      {time}
                    </span>
                  ))}
                </div>

                {dayNames.map((day, dayIndex) => (
                  <div
                    key={day}
                    className="relative rounded-xl border border-slate-100 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_calc(18.18%-1px),rgba(148,163,184,0.16)_18.18%)]"
                  >
                    {groupRoutinesBySlot(
                      visibleRoutines.filter((routine) => routine.day === dayIndex)
                    ).map((slot) => {
                      const slotPosition = activityPosition(slot.routines[0]);
                      const split = slot.routines.length > 1;

                      return (
                        <div
                          key={slot.key}
                          className="group/slot absolute inset-x-0 z-10"
                          style={slotPosition}
                        >
                          {slot.routines.slice(0, 2).map((routine, index) => (
                            <button
                              key={routine.id}
                              type="button"
                              onClick={() => editRoutine(routine)}
                              title={`${routine.childName}: ${routine.title}, ${formatTime(routine.startTime)}`}
                              className={`absolute inset-y-0 overflow-hidden rounded-[8px] border px-0.5 py-1 text-center shadow-sm transition hover:z-20 hover:scale-[1.03] ${
                                colourStyles[routine.colour].card
                              } ${routine.paused ? "opacity-45 grayscale" : ""}`}
                              style={
                                split
                                  ? index === 0
                                    ? { left: "1px", width: "calc(50% - 2px)" }
                                    : { right: "1px", width: "calc(50% - 2px)" }
                                  : { left: "2px", right: "2px" }
                              }
                              aria-label={`Edit ${routine.title} for ${routine.childName}`}
                            >
                              {split ? (
                                <>
                                  <span className="mx-auto flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/70 text-[6px] font-bold">
                                    {routine.childName.slice(0, 1).toUpperCase()}
                                  </span>
                                  <span className="mt-0.5 block overflow-hidden text-[5px] font-bold leading-none">
                                    {routine.title}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="block overflow-hidden text-[6px] font-bold leading-[1.05]">
                                    {routine.title}
                                  </span>
                                  <span className="mt-0.5 block overflow-hidden text-[6px] leading-tight opacity-70">
                                    {formatTime(routine.startTime)}
                                  </span>
                                </>
                              )}
                            </button>
                          ))}

                          {slot.routines.length > 2 ? (
                            <button
                              type="button"
                              onClick={() => setOpenSlot(slot.routines)}
                              className="absolute -right-1 -top-1 z-30 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#2f4339] px-1 text-[7px] font-bold text-white shadow-md"
                              aria-label={`Show ${slot.routines.length} activities at ${formatTime(slot.routines[0].startTime)}`}
                            >
                              +{slot.routines.length - 2}
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {!visibleRoutines.length ? (
                <div className="pointer-events-none absolute inset-x-10 top-1/2 z-20 -translate-y-1/2 rounded-3xl border border-dashed border-[#b9c8b0] bg-[#f4f7f1]/92 px-5 py-5 text-center shadow-sm backdrop-blur-xl">
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-[#dfe9d8] text-[#647b59]">
                    <UiIcon name="calendar" className="h-5 w-5" />
                  </span>
                  <p className="mt-2 text-sm font-semibold text-slate-700">Build your household week</p>
                  <p className="mt-1 text-[11px] leading-4 text-slate-500">
                    Add work, appointments, exercise, clubs, pickups and more.
                  </p>
                </div>
              ) : null}
            </section>

            <div className="mt-3 flex shrink-0 gap-2">
              <button
                type="button"
                onClick={openNewRoutine}
                disabled={!editable}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#769267] text-sm font-semibold text-white shadow-[0_14px_26px_-16px_rgba(65,92,56,0.75)] disabled:opacity-45"
              >
                <UiIcon name="plus" className="h-4 w-4" />
                Add weekly activity
              </button>
              <Link
                href="/kitchen/calendar"
                className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/90 bg-white/75 px-3 text-[10px] font-semibold text-slate-600 shadow-sm"
                aria-label="Open the Kitchen wall calendar"
              >
                <UiIcon name="calendar" className="h-4 w-4" />
                Kitchen calendar
              </Link>
            </div>
          </main>
        ) : (
          <main className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
            <section className="shrink-0 rounded-[27px] border border-white/90 bg-white/80 p-4 shadow-[0_22px_55px_-34px_rgba(41,59,45,0.48)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#718a65]">
                    {editingId ? "Edit routine" : "Create activity"}
                  </p>
                  <h2 className="mt-0.5 text-base font-semibold">
                    {editingId ? draft.title || "Weekly activity" : "New weekly activity"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMode("week")}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                  aria-label="Close editor"
                >
                  <UiIcon name="plus" className="h-3.5 w-3.5 rotate-45" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[9px] font-bold uppercase text-slate-400">Activity</span>
                  <input
                    value={draft.title}
                    onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Swimming"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#789469]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[9px] font-bold uppercase text-slate-400">Person</span>
                  <input
                    list="household-schedule-people"
                    value={draft.childName}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, childName: event.target.value }))
                    }
                    placeholder="Name"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#789469]"
                  />
                  <datalist id="household-schedule-people">
                    {people.map((person) => <option key={person} value={person} />)}
                  </datalist>
                </label>
                <label className="space-y-1">
                  <span className="text-[9px] font-bold uppercase text-slate-400">Day</span>
                  <select
                    value={draft.day}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, day: Number(event.target.value) }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none"
                  >
                    {dayNames.map((day, index) => (
                      <option key={day} value={index}>
                        {day}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <label className="space-y-1">
                    <span className="text-[9px] font-bold uppercase text-slate-400">Start</span>
                    <input
                      type="time"
                      value={draft.startTime}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, startTime: event.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-[10px] outline-none"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[9px] font-bold uppercase text-slate-400">Finish</span>
                    <input
                      type="time"
                      value={draft.endTime}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, endTime: event.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-[10px] outline-none"
                    />
                  </label>
                </div>
                <label className="space-y-1">
                  <span className="text-[9px] font-bold uppercase text-slate-400">Repeat</span>
                  <select
                    value={draft.repeat}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        repeat: event.target.value as KidScheduleRoutine["repeat"]
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none"
                  >
                    <option value="weekly">Every week</option>
                    <option value="term-time">Term time</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[9px] font-bold uppercase text-slate-400">Location</span>
                  <input
                    value={draft.location}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, location: event.target.value }))
                    }
                    placeholder="Oakfield Pool"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#789469]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[9px] font-bold uppercase text-slate-400">Who handles it?</span>
                  <input
                    value={draft.responsibleAdult}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        responsibleAdult: event.target.value
                      }))
                    }
                    placeholder="Self, parent, carer..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#789469]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[9px] font-bold uppercase text-slate-400">Transport</span>
                  <select
                    value={draft.transport}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, transport: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none"
                  >
                    {["Car", "Walk", "Bus", "Bike", "Other"].map((transport) => (
                      <option key={transport}>{transport}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <div className="flex gap-1">
                  {colours.map((colour) => (
                    <button
                      key={colour}
                      type="button"
                      onClick={() => setDraft((current) => ({ ...current, colour }))}
                      aria-label={`Use ${colour}`}
                      className={`h-7 w-7 rounded-full border-2 border-white shadow-sm ${
                        colourStyles[colour].solid
                      } ${draft.colour === colour ? "ring-2 ring-[#4d6246]" : ""}`}
                    />
                  ))}
                </div>
                {editingId ? (
                  <button
                    type="button"
                    onClick={() => togglePause(editingId)}
                    className="ml-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600"
                  >
                    {draft.paused ? "Resume" : "Pause"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={saveRoutine}
                  className="ml-auto rounded-xl bg-[#769267] px-5 py-2 text-xs font-semibold text-white"
                >
                  Save
                </button>
              </div>
              {message ? <p className="mt-2 text-[10px] font-semibold text-red-600">{message}</p> : null}
            </section>

            <section className="min-h-0 flex-1 overflow-hidden rounded-[24px] border border-white/90 bg-white/70 p-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-slate-700">Saved routines</h2>
                <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {routines.length} total
                </span>
              </div>
              <div className="mt-2 space-y-1.5">
                {routines.slice(0, 3).map((routine) => (
                  <button
                    key={routine.id}
                    type="button"
                    onClick={() => editRoutine(routine)}
                    className="flex w-full items-center gap-2 rounded-xl bg-white/85 px-2.5 py-2 text-left"
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${colourStyles[routine.colour].dot}`} />
                    <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-700">
                      {routine.title}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {dayNames[routine.day]} · {formatTime(routine.startTime)}
                    </span>
                    {routine.paused ? (
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold text-slate-400">
                        Paused
                      </span>
                    ) : null}
                  </button>
                ))}
                {!routines.length ? (
                  <p className="py-4 text-center text-[11px] text-slate-400">
                    Your saved weekly activities will appear here.
                  </p>
                ) : null}
              </div>
              {editingId ? (
                <button
                  type="button"
                  onClick={() => deleteRoutine(editingId)}
                  className="mt-2 text-[10px] font-semibold text-red-500"
                >
                  Delete this routine
                </button>
              ) : null}
            </section>
          </main>
        )}
      </div>

      {openSlot ? (
        <div
          className="fixed inset-0 z-[80] flex items-end bg-slate-950/25 p-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-[2px]"
          role="presentation"
          onClick={() => setOpenSlot(null)}
        >
          <section
            className="mx-auto w-full max-w-lg rounded-[28px] border border-white/90 bg-[#fbfcf9]/96 p-4 shadow-2xl backdrop-blur-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Activities at this time"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#718c65]">
                  {dayNames[openSlot[0].day]} at {formatTime(openSlot[0].startTime)}
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  {openSlot.length} activities
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpenSlot(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                aria-label="Close activity list"
              >
                <UiIcon name="plus" className="h-4 w-4 rotate-45" />
              </button>
            </div>
            <div className="mt-3 grid gap-2">
              {openSlot.map((routine) => (
                <button
                  key={routine.id}
                  type="button"
                  onClick={() => {
                    setOpenSlot(null);
                    editRoutine(routine);
                  }}
                  className="flex items-center gap-3 rounded-2xl border border-white/90 bg-white/80 px-3 py-3 text-left shadow-sm"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                      colourStyles[routine.colour].solid
                    }`}
                  >
                    {routine.childName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">
                      {routine.childName} · {routine.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                      {formatTime(routine.startTime)}–{formatTime(routine.endTime)}
                      {routine.location ? ` · ${routine.location}` : ""}
                    </span>
                  </span>
                  <UiIcon name="chevron-right" className="h-4 w-4 text-slate-300" />
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      <BottomNav />
    </div>
  );
}
