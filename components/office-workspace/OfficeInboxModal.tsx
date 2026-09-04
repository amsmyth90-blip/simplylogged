import Link from "next/link";

import { ModalShell } from "@/components/ModalShell";
import { UiIcon } from "@/components/UiIcon";
import type { OfficeController } from "@/components/office-workspace/useOfficeController";

export function OfficeInboxModal({ controller }: { controller: OfficeController }) {
  return (
    <ModalShell
      open={controller.panel === "inbox"}
      title="Office inbox"
      subtitle="Incoming paperwork suggested for household administration."
      onClose={() => controller.setPanel(null)}
      footer={<Link href="/intake" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#24372f] px-4 py-3 text-sm font-semibold text-white"><UiIcon name="mail" className="h-4 w-4" />Open Mailbox</Link>}
    >
      <div className="space-y-3">
        <p className="rounded-2xl border border-[#d8c9ad] bg-[#f4ead7]/75 px-4 py-3 text-xs leading-5 text-ink/60">New post starts in the Mailbox. Use the main Scan button below to add paperwork; the Office helps you act on it before the final document is stored securely in All Files.</p>
        <Link href="/office/correspondence" className="flex min-h-[76px] items-center gap-3 rounded-2xl border border-[#cbd9c4] bg-[#edf3e9] p-3.5 shadow-sm transition hover:bg-[#e6efe1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/85 text-[#5d7353]"><UiIcon name="mail" className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">Important correspondence</span><span className="mt-0.5 block text-[11px] leading-4 text-ink/50">Letters, notices, deadlines and follow-ups</span></span>
          <UiIcon name="chevron-right" className="h-4 w-4 text-[#607455]" />
        </Link>
        {controller.officeInbox.length ? controller.officeInbox.map((item) => (
          <Link key={item.id} href="/intake" className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/72 p-3 shadow-sm">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eadfca] text-[#746144]"><UiIcon name="mail" className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{item.title}</span><span className="mt-0.5 block truncate text-[11px] text-ink/48">{item.source} · {item.kind}</span></span>
            <span className="rounded-full bg-[#f2dfd7] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-[#8a5145]">New</span>
          </Link>
        )) : <div className="rounded-3xl border border-dashed border-[#bdcbb4] bg-[#edf3e9]/70 p-6 text-center"><UiIcon name="check" className="mx-auto h-5 w-5 text-[#607455]" /><p className="mt-3 text-sm font-semibold text-ink">No Office paperwork waiting</p><p className="mt-1 text-xs text-ink/50">Anything newly scanned will appear in the Mailbox first.</p></div>}
      </div>
    </ModalShell>
  );
}
