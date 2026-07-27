"use client";

import type { RoomTask } from "@/lib/mock-data";

type TaskChecklistProps = {
  tasks: RoomTask[];
  onToggle?: (id: string) => void;
};

export function TaskChecklist({ tasks, onToggle }: TaskChecklistProps) {
  const openCount = tasks.filter((task) => !task.done).length;

  return (
    <div>
      <div className="space-y-2.5">
        {tasks.map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => onToggle?.(task.id)}
            className={`flex w-full items-center gap-3.5 rounded-[24px] border px-4 py-4 text-left shadow-[0_18px_36px_-28px_rgba(54,44,24,0.2)] transition ${
              task.done
                ? "border-white/55 bg-white/44"
                : "border-white/80 bg-white/72 hover:bg-white/84"
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                task.done ? "border-moss bg-moss text-white" : "border-slate-300 bg-white text-transparent"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <path d="m5.5 12.5 4 4 9-9.5" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-sm font-medium ${task.done ? "text-ink/40 line-through" : "text-ink"}`}>
                {task.label}
              </span>
            </span>
            {task.due && !task.done ? (
              <span className="shrink-0 rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-semibold text-orange-600">
                {task.due}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <p className="mt-3 px-1 text-[13px] text-ink/50">
        {openCount === 0 ? "All done here - lovely." : `${openCount} open ${openCount === 1 ? "task" : "tasks"}`}
      </p>
    </div>
  );
}
