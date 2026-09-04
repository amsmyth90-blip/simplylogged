import Link from "next/link";

import { SectionHeader } from "@/components/SectionHeader";
import { UiIcon, type IconName } from "@/components/UiIcon";
import type { RoomActivity, RoomDetail } from "@/lib/mock-data";

export function RoomActivitySections({
  activity,
  onAdd,
  room,
}: {
  activity: RoomActivity[];
  onAdd: () => void;
  room: RoomDetail;
}) {
  return (
    <>
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <SectionHeader title="Recent activity" />
          <button
            type="button"
            onClick={onAdd}
            className="rounded-full border border-white/70 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-ink/70 shadow-soft transition hover:bg-white"
          >
            Log update
          </button>
        </div>
        <div className="estate-sheet p-5">
          <ol className="space-y-4">
            {activity.map((entry, index) => (
              <li key={entry.id} className="relative flex gap-3.5">
                <span className="flex flex-col items-center">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-moss" />
                  {index < activity.length - 1 ? (
                    <span className="mt-1 w-px flex-1 bg-ink/10" />
                  ) : null}
                </span>
                <span className="min-w-0 pb-1">
                  <span className="block text-sm font-medium text-ink">
                    {entry.text}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink/50">
                    {entry.when} - {entry.by}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="space-y-3">
        <SectionHeader title="Quick actions" />
        <div className="grid grid-cols-3 gap-3">
          {room.quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="estate-sheet flex flex-col items-center gap-2 px-3 py-4 text-center transition hover:-translate-y-0.5"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(180deg,#6c5735,#4d3d24)] text-white shadow-[0_18px_30px_-22px_rgba(54,44,24,0.45)]">
                <UiIcon
                  name={action.icon as IconName}
                  className="h-[18px] w-[18px]"
                />
              </span>
              <span className="text-xs font-semibold leading-tight text-ink/75">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
