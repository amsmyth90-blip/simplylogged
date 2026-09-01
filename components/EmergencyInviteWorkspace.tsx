"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { UiIcon } from "@/components/UiIcon";

export function EmergencyInviteWorkspace({ publicId, secret, signedIn }: { publicId: string; secret: string; signedIn: boolean }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const accept = async () => { setBusy(true); setError(""); try { const response = await fetch("/api/emergency-access/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publicId, secret }) }); const payload = await response.json() as { error?: string; next?: string }; if (!response.ok) throw new Error(payload.error || "This invitation could not be accepted."); router.replace(payload.next || "/emergency/shared"); } catch (caught) { setError(caught instanceof Error ? caught.message : "This invitation could not be accepted."); setBusy(false); } };
  return <div className="mx-auto max-w-xl py-8"><section className="estate-sheet p-6 sm:p-8"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8efe5] text-[#52705a]"><UiIcon name="shield" className="h-6 w-6" /></span><p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#6f8e72]">Trusted emergency access</p><h1 className="mt-2 font-serif text-3xl">A limited DiaryDock view was shared with you</h1><p className="mt-3 text-sm leading-6 text-[#667068]">Accepting does not make you a household member. You will see only the specific emergency items selected for your signed-in email address, and the owner can revoke them at any time.</p>{error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}{signedIn ? <button type="button" disabled={busy} onClick={() => void accept()} className="mt-6 min-h-12 w-full rounded-[15px] bg-[#315443] px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Checking invitation…" : "Accept limited access"}</button> : <><Link href="/login?message=Sign+in+with+the+invited+email,+then+reopen+your+invitation+link." className="mt-6 flex min-h-12 items-center justify-center rounded-[15px] bg-[#315443] px-4 text-sm font-semibold text-white">Sign in first</Link><p className="mt-2 text-center text-xs text-[#667068]">After signing in, reopen this invitation link.</p></>}</section></div>;
}
