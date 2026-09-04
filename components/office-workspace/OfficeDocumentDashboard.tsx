import Image from "next/image";
import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";
import { OfficeWishesJourney } from "@/components/office-workspace/OfficeWishesJourney";
import { officeDrawers } from "@/components/office-workspace/office-workspace-model";
import type { WillsWishesRecord } from "@/lib/diarydock-data";
import type { VaultDocument } from "@/lib/mock-data";

type Props = {
  open: boolean;
  drawer: (typeof officeDrawers)[number] | null;
  documents: VaultDocument[];
  totalDocuments: number;
  query: string;
  onQueryChange: (value: string) => void;
  wishesRecord: WillsWishesRecord;
  onWishesChange: (next: WillsWishesRecord) => void;
  onSaveWishes: () => void;
  onClose: () => void;
};

export function OfficeDocumentDashboard(props: Props) {
  if (!props.open || !props.drawer) return null;
  const { drawer } = props;
  const renewalCount = props.documents.filter((document) => document.dueDate).length;
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[#4f3f31] pb-[7.25rem]">
      <Image src="/images/office-interactive-v1.webp" alt="" fill unoptimized aria-hidden="true" className="fixed object-cover object-center" sizes="100vw" />
      <div className="fixed inset-0 bg-[linear-gradient(180deg,rgba(40,31,23,0.18),rgba(40,31,23,0.42))]" />
      <section role="dialog" aria-modal="true" aria-labelledby="office-document-title" className="relative mx-auto flex min-h-full w-full max-w-[34rem] flex-col px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={props.onClose} className="flex items-center gap-2 rounded-full border border-white/65 bg-white/72 px-3 py-2 text-xs font-semibold text-[#26342d] shadow-lg backdrop-blur-xl"><UiIcon name="arrow-left" className="h-4 w-4" />Office</button>
          <span className="flex items-center gap-1.5 rounded-full border border-white/45 bg-[#28352f]/58 px-3 py-2 text-[10px] font-semibold text-white shadow-lg backdrop-blur-xl"><UiIcon name="lock" className="h-3.5 w-3.5" />Securely stored</span>
        </div>
        <div className="mt-[22vh] rounded-[30px] border border-white/80 bg-white/90 p-4 shadow-[0_28px_70px_rgba(31,25,19,0.34)] backdrop-blur-2xl sm:p-5">
          <div className="flex items-start gap-3">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${drawer.tone}`}><UiIcon name={drawer.icon} className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#617455]">Office documents</p><h2 id="office-document-title" className="mt-1 text-xl font-semibold tracking-tight text-ink">{drawer.label}</h2><p className="mt-1 text-xs leading-5 text-ink/55">{drawer.detail}</p></div>
            <button type="button" onClick={props.onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/5 bg-white/70 text-ink/55"><UiIcon name="plus" className="h-4 w-4 rotate-45" /></button>
          </div>
          {drawer.id === "wishes" ? (
            <OfficeWishesJourney record={props.wishesRecord} documents={props.documents} onChange={props.onWishesChange} onSave={props.onSaveWishes} />
          ) : (
            <OfficeDocumentList {...props} drawer={drawer} renewalCount={renewalCount} />
          )}
        </div>
      </section>
    </div>
  );
}

function OfficeDocumentList({
  drawer,
  documents,
  totalDocuments,
  renewalCount,
  query,
  onQueryChange,
}: Pick<Props, "documents" | "totalDocuments" | "query" | "onQueryChange"> & {
  drawer: (typeof officeDrawers)[number];
  renewalCount: number;
}) {
  return (
    <>
      {drawer.id === "home" ? <FeatureLink href="/office/insurance" icon="shield" title="Open Insurance Hub" detail="Policies, renewals, claims and cover reviews" /> : null}
      {drawer.id === "finance" ? (
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          <FeatureLink href="/office/bills" icon="chart" title="Household bills" detail="Amounts, due dates and payments" />
          <FeatureLink href="/office/contracts" icon="briefcase" title="Contracts & subscriptions" detail="Renewals, prices and notice periods" finance />
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-[#e7ede1] px-3 py-1.5 text-[10px] font-semibold text-[#58704f]">{totalDocuments} document{totalDocuments === 1 ? "" : "s"}</span>
        {renewalCount ? <span className="rounded-full bg-[#f2ead6] px-3 py-1.5 text-[10px] font-semibold text-[#80683d]">{renewalCount} renewal{renewalCount === 1 ? "" : "s"} tracked</span> : null}
      </div>
      <label className="mt-4 flex items-center gap-3 rounded-2xl border border-white/90 bg-white/90 px-4 py-3 shadow-sm">
        <UiIcon name="search" className="h-4 w-4 shrink-0 text-ink/35" />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={`Search ${drawer.label.toLowerCase()}`}
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/38"
        />
      </label>
      <div className="mt-3 space-y-2.5">
        {documents.length ? documents.map((document) => (
          <Link key={document.id} href={`/document/${document.id}?from=office`} className="flex items-center gap-3 rounded-2xl border border-white/90 bg-white/90 p-3 shadow-sm transition hover:bg-white">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${drawer.tone}`}><UiIcon name="file" className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{document.title}</span><span className="mt-0.5 block truncate text-[11px] text-ink/48">{document.category} · {document.updated}</span></span>
            <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-ink/25" />
          </Link>
        )) : (
          <div className="rounded-3xl border border-dashed border-[#bdcbb4] bg-[#edf3e9]/78 p-6 text-center">
            <UiIcon
              name={query ? "search" : drawer.icon}
              className="mx-auto h-5 w-5 text-[#607455]"
            />
            <p className="mt-3 text-sm font-semibold text-ink">
              {query ? "No matching documents" : "No documents here yet"}
            </p>
            <p className="mt-1 text-xs text-ink/50">
              {query ? "Try a different search." : "Use the main Scan button to add one."}
            </p>
          </div>
        )}
      </div>
      <Link href="/files" className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#24372f] px-4 py-3 text-sm font-semibold text-white"><UiIcon name="folder" className="h-4 w-4" />Open All Files</Link>
    </>
  );
}

type FeatureLinkProps = {
  href: string;
  icon: "shield" | "chart" | "briefcase";
  title: string;
  detail: string;
  finance?: boolean;
};

function FeatureLink({ href, icon, title, detail, finance = false }: FeatureLinkProps) {
  const tone = finance
    ? "border-[#d8cfbb] bg-[#f3ecdf] hover:bg-[#eee4d4] focus-visible:ring-[#8d7a58]"
    : "border-[#cbd9c4] bg-[#edf3e9] hover:bg-[#e6efe1] focus-visible:ring-[#6f8e72]";
  return (
    <Link
      href={href}
      className={`${tone} ${finance ? "" : drawerLinkWidth(href)} flex min-h-[72px] items-center gap-3 rounded-2xl border p-3.5 shadow-sm transition focus-visible:outline-none focus-visible:ring-2`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/85 ${finance ? "text-[#746144]" : "text-[#5d7353]"}`}><UiIcon name={icon} className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{title}</span><span className="mt-0.5 block text-[11px] leading-4 text-ink/50">{detail}</span></span>
      <UiIcon name="chevron-right" className={`h-4 w-4 ${finance ? "text-[#746144]" : "text-[#607455]"}`} />
    </Link>
  );
}

function drawerLinkWidth(href: string) {
  return href === "/office/insurance" ? "mt-4" : "";
}
