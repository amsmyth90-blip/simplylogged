import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";
import type { Reminder } from "@/lib/mock-data";

const priorityDot: Record<Reminder["priority"], string> = {
  high: "bg-orange-500",
  normal: "bg-sky-400",
  low: "bg-slate-300"
};

type ReminderCardProps = {
  reminder: Reminder;
  href?: string;
  showRoom?: boolean;
  compact?: boolean;
};

export function ReminderCard({ reminder, href = "/reminders", showRoom = true, compact = false }: ReminderCardProps) {
  return (
    <Link
      href={href}
      className={`estate-sheet flex items-start gap-3.5 ${compact ? "p-3.5" : "p-4"} transition hover:-translate-y-0.5`}
    >
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${priorityDot[reminder.priority]}`} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{reminder.title}</span>
        {reminder.note ? <span className="mt-1 block text-[13px] leading-5 text-ink/55">{reminder.note}</span> : null}
        <span className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-ink/50">
            <UiIcon name="clock" className="h-3.5 w-3.5" />
            {reminder.timeLabel}
          </span>
          {reminder.repeat ? (
            <span className="rounded-full bg-mist px-2 py-0.5 text-[11px] font-semibold text-sky-700">
              {reminder.repeat}
            </span>
          ) : null}
          {showRoom && reminder.roomName ? (
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-ink/55">
              {reminder.roomName}
            </span>
          ) : null}
          {reminder.documentTitle ? (
            <span className="rounded-full bg-sage/60 px-2 py-0.5 text-[11px] font-semibold text-moss">
              Linked document
            </span>
          ) : null}
        </span>
      </span>
      <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-ink/25" />
    </Link>
  );
}
