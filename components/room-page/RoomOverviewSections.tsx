import Link from "next/link";

import { SectionHeader } from "@/components/SectionHeader";
import { TaskChecklist } from "@/components/TaskChecklist";
import { UiIcon } from "@/components/UiIcon";
import type { RoomActivity, RoomDetail, RoomTask } from "@/lib/mock-data";

type RoomOverviewSectionsProps = {
  activity: RoomActivity[];
  documentCount: number;
  linkedCount: number;
  onAddTask: () => void;
  onToggleTask: (id: string) => void;
  openTaskCount: number;
  room: RoomDetail;
  scanHref: string;
  starterSuggestions: string[];
  tasks: RoomTask[];
};

export function RoomOverviewSections({
  activity,
  documentCount,
  linkedCount,
  onAddTask,
  onToggleTask,
  openTaskCount,
  room,
  scanHref,
  starterSuggestions,
  tasks,
}: RoomOverviewSectionsProps) {
  return (
    <>
      <section className="relative z-20 estate-sheet p-5 sm:-mt-20 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="max-w-2xl text-sm leading-6 text-ink/62">
              {room.description}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Open tasks", value: openTaskCount },
                { label: "Documents", value: documentCount },
                { label: "Recent activity", value: activity.length },
                {
                  label:
                    room.id === "mailbox" ? "Routed items" : "Linked reminders",
                  value: linkedCount,
                },
              ].map((item) => (
                <article
                  key={item.label}
                  className="rounded-[24px] border border-white/70 bg-white/54 px-4 py-4 shadow-[0_20px_40px_-32px_rgba(54,44,24,0.22)]"
                >
                  <p className="text-[28px] font-semibold tracking-tight text-ink">
                    {item.value}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/42">
                    {item.label}
                  </p>
                </article>
              ))}
            </div>
          </div>
          <div className="rounded-[28px] border border-white/70 bg-white/52 p-4 shadow-[0_20px_40px_-32px_rgba(54,44,24,0.22)]">
            <SectionHeader
              title="What belongs here"
              hint="The kinds of things this room holds"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {room.belongsHere.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/80 bg-white/70 px-3.5 py-2 text-[13px] font-medium text-ink/72"
                >
                  {item}
                </span>
              ))}
            </div>
            <Link
              href={scanHref}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-ink/90"
            >
              <UiIcon name="plus" className="h-4 w-4" />
              Scan into {room.name}
            </Link>
          </div>
        </div>
      </section>
      <section className="space-y-3">
        <SectionHeader
          title="Start with these"
          hint={`Good first records for ${room.name}`}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {starterSuggestions.map((suggestion, index) => (
            <Link
              key={suggestion}
              href={scanHref}
              className="estate-sheet group flex items-start gap-3 p-4 transition hover:-translate-y-0.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-sage/55 text-moss">
                <span className="text-xs font-bold">{index + 1}</span>
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">
                  {suggestion}
                </span>
                <span className="mt-1 block text-xs leading-5 text-ink/48">
                  Tap to scan and file this directly toward {room.name}.
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <SectionHeader
            title="To do in this room"
            hint="Tap to mark complete"
          />
          <button
            type="button"
            onClick={onAddTask}
            className="rounded-full border border-white/70 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-ink/70 shadow-soft transition hover:bg-white"
          >
            Add task
          </button>
        </div>
        <div className="estate-sheet p-4">
          <TaskChecklist tasks={tasks} onToggle={onToggleTask} />
        </div>
      </section>
    </>
  );
}
