import Link from "next/link";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { KitchenFeatureShell } from "@/components/kitchen-feature/KitchenFeatureShell";

export function KitchenDocuments() {
  const { state } = useDiaryDockData();
  const saved = state.vaultDocuments.filter(
    (document) => document.roomId === "kitchen" || document.roomName === "Kitchen",
  );
  return (
    <KitchenFeatureShell title="Kitchen documents" subtitle="Manuals, warranties, appliance receipts and kitchen records.">
      <Link href="/capture?room=kitchen" className="flex items-center justify-center gap-2 rounded-[22px] bg-[#263b35] py-3.5 text-sm font-semibold text-white">
        <UiIcon name="plus" className="h-4 w-4" />
        Add Kitchen document
      </Link>
      {saved.length ? (
        <div className="mt-4 space-y-2.5">
          {saved.map((document) => (
            <article key={document.id} className="flex items-center gap-3 rounded-[22px] border border-white/90 bg-white/78 p-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e7f0e2] text-[#5b7751]"><UiIcon name="file" className="h-5 w-5" /></span>
              <div className="min-w-0"><h2 className="truncate text-sm font-semibold">{document.title}</h2><p className="mt-0.5 text-[11px] text-slate-500">{document.category} · {document.updated}</p></div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-[22px] border border-[#20352a]/10 bg-white/80 p-5 text-center">
          <UiIcon name="file" className="mx-auto h-6 w-6 text-[#6f8e72]" />
          <h2 className="mt-2 text-sm font-semibold text-[#20352a]">No Kitchen documents yet</h2>
          <p className="mt-1 text-xs text-[#667068]">Add a manual, warranty or receipt when you are ready.</p>
        </div>
      )}
    </KitchenFeatureShell>
  );
}
