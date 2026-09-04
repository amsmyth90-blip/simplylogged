import Link from "next/link";

import { ModalShell } from "@/components/ModalShell";
import { UiIcon } from "@/components/UiIcon";
import type { OfficeController } from "@/components/office-workspace/useOfficeController";

export function OfficeAdminModal({ controller }: { controller: OfficeController }) {
  return (
    <ModalShell
      open={controller.panel === "admin"}
      title="Today's admin"
      subtitle="Office actions and reminders—not calendar events."
      onClose={() => controller.setPanel(null)}
      footer={<Link href="/reminders" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#24372f] px-4 py-3 text-sm font-semibold text-white"><UiIcon name="check" className="h-4 w-4" />Open all reminders</Link>}
    >
      <div className="space-y-3">
        <Link href="/office/contacts" className="flex min-h-[76px] items-center gap-3 rounded-2xl border border-[#cbd9c4] bg-[#edf3e9] p-3.5 shadow-sm transition hover:bg-[#e6efe1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/85 text-[#5d7353]"><UiIcon name="users" className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">Professional contacts</span><span className="mt-0.5 block text-[11px] leading-4 text-ink/50">Advisers, providers, meetings and linked records</span></span>
          <UiIcon name="chevron-right" className="h-4 w-4 text-[#607455]" />
        </Link>
        {controller.officeTasks.map((task) => <AdminRow key={task.id} icon="briefcase" tone="bg-[#e2eadc] text-[#5d7353]" title={task.label} detail={task.due ?? "Office task"} onDone={() => controller.completeTask(task.id)} />)}
        {controller.officeReminders.map((reminder) => <AdminRow key={reminder.id} icon="bell" tone="bg-[#dfe8ee] text-[#506b7a]" title={reminder.title} detail={reminder.timeLabel} onDone={() => controller.completeReminder(reminder.id)} />)}
        {!controller.adminCount ? <div className="rounded-3xl border border-dashed border-[#bdcbb4] bg-[#edf3e9]/70 p-6 text-center"><UiIcon name="check" className="mx-auto h-5 w-5 text-[#607455]" /><p className="mt-3 text-sm font-semibold text-ink">Office admin is up to date</p></div> : null}
      </div>
    </ModalShell>
  );
}

function AdminRow({
  icon,
  tone,
  title,
  detail,
  onDone,
}: {
  icon: "briefcase" | "bell";
  tone: string;
  title: string;
  detail: string;
  onDone: () => void;
}) {
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/72 p-3 shadow-sm">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><UiIcon name={icon} className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{title}</p><p className="mt-0.5 text-[11px] text-ink/48">{detail}</p></div>
      <button type="button" onClick={onDone} className="rounded-full bg-[#e4ecde] px-3 py-2 text-[10px] font-semibold text-[#52664a]">Done</button>
    </article>
  );
}
