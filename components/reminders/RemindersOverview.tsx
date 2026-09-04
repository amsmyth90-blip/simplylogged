import { SectionHeader } from "@/components/SectionHeader";
import { UiIcon } from "@/components/UiIcon";
import type { Reminder } from "@/lib/mock-data";

type RemindersOverviewProps = {
  documentFollowUps: Reminder[];
  focusItems: Reminder[];
  groupedCounts: { today: number; week: number; later: number };
  onOpen?: (reminder: Reminder) => void;
  repeatingItems: Reminder[];
};

export function RemindersOverview({
  documentFollowUps,
  focusItems,
  groupedCounts,
  onOpen,
  repeatingItems,
}: RemindersOverviewProps) {
  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <ReminderList
          title="Today's focus"
          hint="The next things to move forward"
          items={focusItems}
          onOpen={onOpen}
        />
        <ReminderList
          title="Steady rhythms"
          hint="Repeating jobs that keep DiaryDock current"
          items={repeatingItems}
          onOpen={onOpen}
          repeating
        />
      </section>
      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="estate-sheet p-5">
          <SectionHeader
            title="Document follow-ups"
            hint="Renewals and dates linked to saved files"
          />
          <div className="mt-4 space-y-3">
            {documentFollowUps.length ? (
              documentFollowUps.map((reminder) => (
                <button
                  key={reminder.id}
                  type="button"
                  disabled={!onOpen}
                  onClick={() => onOpen?.(reminder)}
                  className="flex w-full items-center gap-3.5 rounded-[24px] border border-white/70 bg-white/62 p-3.5 text-left transition enabled:hover:bg-white disabled:cursor-default"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sage/60 text-moss">
                    <UiIcon name="file" className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {reminder.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-ink/50">
                      {reminder.documentTitle ?? "Linked document"} -{" "}
                      {reminder.timeLabel}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="rounded-[24px] border border-dashed border-white/80 bg-white/45 px-4 py-5 text-sm leading-6 text-ink/55">
                Scan a document with a renewal or appointment date and DiaryDock
                will suggest a linked reminder here.
              </p>
            )}
          </div>
        </div>
        <div className="estate-sheet p-5">
          <SectionHeader
            title="Email into DiaryDock"
            hint="Planned intake path for bills and appointments"
          />
          <div className="mt-4 rounded-[26px] bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(237,244,239,0.76))] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-mist text-sky-700">
                <UiIcon name="mail" className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">
                  Yes, email sharing is possible.
                </p>
                <p className="mt-1 text-xs leading-5 text-ink/55">
                  The production version can support forwarding bills or
                  appointments to a private DiaryDock email address, then using
                  the same AI confirm-and-file flow as scanning.
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[
                "Forward email",
                "AI reads attachment",
                "Confirm room + reminder",
              ].map((step, index) => (
                <div key={step} className="rounded-2xl bg-white/70 px-3 py-3">
                  <p className="text-[11px] font-semibold text-ink/40">
                    Step {index + 1}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-ink/68">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Today",
            value: groupedCounts.today,
            tone: "text-orange-600",
          },
          {
            label: "This week",
            value: groupedCounts.week,
            tone: "text-sky-700",
          },
          { label: "Later", value: groupedCounts.later, tone: "text-moss" },
        ].map((stat) => (
          <article
            key={stat.label}
            className="estate-sheet px-4 py-3.5 text-center"
          >
            <p className={`text-2xl font-semibold tracking-tight ${stat.tone}`}>
              {stat.value}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink/45">
              {stat.label}
            </p>
          </article>
        ))}
      </section>
    </>
  );
}

function ReminderList({
  hint,
  items,
  onOpen,
  repeating,
  title,
}: {
  hint: string;
  items: Reminder[];
  onOpen?: (reminder: Reminder) => void;
  repeating?: boolean;
  title: string;
}) {
  return (
    <div className="estate-sheet p-5">
      <SectionHeader title={title} hint={hint} />
      <div className="mt-4 space-y-3">
        {items.map((reminder) => (
          <button
            key={reminder.id}
            type="button"
            disabled={!onOpen}
            onClick={() => onOpen?.(reminder)}
            className="estate-sheet flex w-full items-start gap-3.5 p-4 text-left transition enabled:hover:-translate-y-0.5 disabled:cursor-default"
          >
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${repeating ? "bg-sky-400" : "bg-orange-500"}`}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">
                {reminder.title}
              </span>
              {!repeating && reminder.note ? (
                <span className="mt-1 block text-[13px] leading-5 text-ink/55">
                  {reminder.note}
                </span>
              ) : null}
              <span className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-ink/50">
                  {reminder.timeLabel}
                </span>
                {repeating && reminder.repeat ? (
                  <span className="rounded-full bg-mist px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                    {reminder.repeat}
                  </span>
                ) : null}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
