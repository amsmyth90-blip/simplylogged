"use client";

import { useEffect, useMemo, useState } from "react";

import { BottomNav } from "@/components/BottomNav";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { KidsScheduleChrome } from "@/components/schedules/KidsScheduleChrome";
import { KidsScheduleEditor } from "@/components/schedules/KidsScheduleEditor";
import { KidsScheduleWeek } from "@/components/schedules/KidsScheduleWeek";
import { ScheduleSlotDialog } from "@/components/schedules/ScheduleSlotDialog";
import {
  emptyRoutineDraft,
  householdLabelFor,
  minutesFromScheduleTime,
  scheduleColours,
  scheduleTitleFor,
  type HouseholdStyle,
  type PlannerMode
} from "@/components/schedules/kids-schedule-model";
import type { KidScheduleRoutine } from "@/lib/diarydock-data";

export function KidsSchedulesWorkspace({ previewEditable = false }: { previewEditable?: boolean }) {
  const { state, canEditShared, updateState } = useDiaryDockData();
  const editable = canEditShared || previewEditable;
  const routines = state.kidSchedules;
  const [mode, setMode] = useState<PlannerMode>("week");
  const [selectedPerson, setSelectedPerson] = useState("All");
  const [householdStyle, setHouseholdStyle] = useState<HouseholdStyle>("children");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyRoutineDraft);
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
    if (["children", "adults", "shared", "solo"].includes(storedStyle ?? "")) setHouseholdStyle(storedStyle as HouseholdStyle);
  }, []);

  const people = useMemo(() => Array.from(new Set([
    ...routines.map((routine) => routine.childName.trim()),
    ...state.householdProfiles.filter((profile) => profile.showInSchedules).map((profile) => profile.name.trim()),
    ...state.householdMembers.map((member) => member.name.trim())
  ].filter(Boolean))), [routines, state.householdMembers, state.householdProfiles]);

  useEffect(() => {
    const person = new URLSearchParams(window.location.search).get("person");
    if (person && people.includes(person)) setSelectedPerson(person);
  }, [people]);

  const visibleRoutines = routines.filter((routine) => selectedPerson === "All" || routine.childName === selectedPerson);

  const openNewRoutine = () => {
    if (!editable) return;
    setEditingId(null);
    setDraft({
      ...emptyRoutineDraft,
      childName: selectedPerson === "All" ? people[0] ?? "" : selectedPerson,
      colour: scheduleColours[routines.length % scheduleColours.length]
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
    if (minutesFromScheduleTime(draft.endTime) <= minutesFromScheduleTime(draft.startTime)) {
      setMessage("The finish time needs to be after the start time.");
      return;
    }
    const id = editingId ?? crypto.randomUUID();
    const routine: KidScheduleRoutine = { ...draft, id, title, childName, location: draft.location.trim(), responsibleAdult: draft.responsibleAdult.trim() };
    updateState((current) => ({
      ...current,
      kidSchedules: editingId ? current.kidSchedules.map((item) => item.id === editingId ? routine : item) : [...current.kidSchedules, routine]
    }));
    setSelectedPerson(childName);
    setEditingId(null);
    setDraft(emptyRoutineDraft);
    setMessage("");
    setMode("week");
  };

  const togglePause = (id: string) => {
    const paused = !draft.paused;
    setDraft((current) => ({ ...current, paused }));
    updateState((current) => ({ ...current, kidSchedules: current.kidSchedules.map((routine) => routine.id === id ? { ...routine, paused } : routine) }));
  };

  const deleteRoutine = (id: string) => {
    updateState((current) => ({ ...current, kidSchedules: current.kidSchedules.filter((routine) => routine.id !== id) }));
    setEditingId(null);
    setDraft(emptyRoutineDraft);
    setMode("week");
  };

  return (
    <div className="fixed inset-0 z-30 overflow-hidden bg-[radial-gradient(circle_at_15%_0%,rgba(255,255,255,0.98),transparent_34%),linear-gradient(180deg,#edf3e9_0%,#fbfaf6_46%,#eef3ea_100%)] text-slate-900">
      <div className="mx-auto flex h-full w-full max-w-lg flex-col px-4 pb-[82px] pt-[max(12px,env(safe-area-inset-top))]">
        <KidsScheduleChrome
          editable={editable}
          householdLabel={householdLabelFor(householdStyle)}
          mode={mode}
          onAdd={openNewRoutine}
          onModeChange={setMode}
          onPersonChange={setSelectedPerson}
          people={people}
          scheduleTitle={scheduleTitleFor(householdStyle)}
          selectedPerson={selectedPerson}
        />
        {mode === "week" ? (
          <KidsScheduleWeek
            editable={editable}
            onAdd={openNewRoutine}
            onEdit={editRoutine}
            onOpenSlot={setOpenSlot}
            routines={visibleRoutines}
          />
        ) : (
          <KidsScheduleEditor
            draft={draft}
            editingId={editingId}
            message={message}
            onClose={() => setMode("week")}
            onDelete={deleteRoutine}
            onEdit={editRoutine}
            onSave={saveRoutine}
            onTogglePause={togglePause}
            people={people}
            routines={routines}
            setDraft={setDraft}
          />
        )}
      </div>
      <ScheduleSlotDialog onClose={() => setOpenSlot(null)} onEdit={(routine) => { setOpenSlot(null); editRoutine(routine); }} routines={openSlot} />
      <BottomNav />
    </div>
  );
}
