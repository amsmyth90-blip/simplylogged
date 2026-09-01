import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";

export default function PhysicalLinkUnavailablePage() {
  return <main className="flex min-h-[100svh] items-center justify-center bg-[#f5f1e8] px-4 text-[#20352a]"><section className="w-full max-w-md rounded-[30px] border border-white/80 bg-white/85 p-7 text-center shadow-sm"><UiIcon name="lock" className="mx-auto h-7 w-7 text-[#6f8e72]" /><h1 className="mt-4 font-serif text-3xl">This link is unavailable</h1><p className="mt-3 text-sm leading-6 text-[#667068]">It may be unknown, expired, disabled, replaced, revoked, or not available to your account. No private item details were shown.</p><Link href="/dashboard" className="mt-6 inline-flex min-h-12 items-center rounded-2xl bg-[#315443] px-5 text-sm font-semibold text-white">Back to DiaryDock</Link></section></main>;
}
