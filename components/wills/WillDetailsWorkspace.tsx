"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { WillCard, WillLegalNotice, WillPageHeader, WillSectionHeading, formatWillDate } from "@/components/wills/WillUi";
import type { DiaryDockAppState } from "@/lib/diarydock-data";
import { createInitialWillRecord, getCurrentWillVersion, hydrateWillRecord, type WillRecord, type WillVersionStatus } from "@/lib/will-records";

function replaceWill(state: DiaryDockAppState, record: WillRecord): DiaryDockAppState {
  return { ...state, willsWishes: { ...state.willsWishes, myWill: record } };
}

const fieldClass = "mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm text-[#20352a] outline-none transition focus:border-[#6f8e72] focus:ring-2 focus:ring-[#6f8e72]/15";
const areaClass = "mt-2 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 py-3 text-sm leading-6 text-[#20352a] outline-none transition focus:border-[#6f8e72] focus:ring-2 focus:ring-[#6f8e72]/15";

export function WillDetailsWorkspace() {
  const { state, hydrated, updateState } = useDiaryDockData();
  const storedRecord = hydrateWillRecord(state.willsWishes.myWill);
  const [draft, setDraft] = useState<WillRecord>(createInitialWillRecord);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    if (hydrated) setDraft(storedRecord);
    // The form refreshes only when repository hydration completes; local edits then remain local until save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const currentVersion = getCurrentWillVersion(draft);
  const updateField = <K extends keyof WillRecord>(key: K, value: WillRecord[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = { ...draft, updatedAt: new Date().toISOString() };
    updateState((current) => replaceWill(current, next));
    setDraft(next);
    setSavedMessage("Your will details have been saved privately.");
  };

  if (!hydrated) return <div className="mx-auto w-full max-w-[760px] rounded-[24px] bg-white/70 p-8 text-sm text-[#667068] sm:max-w-[680px] xl:max-w-[760px]">Opening your private details…</div>;

  return (
    <form onSubmit={save} className="mx-auto w-full max-w-[760px] space-y-5 pb-28 sm:max-w-[680px] xl:max-w-[760px]">
      <WillPageHeader title="Will details" subtitle="Keep the practical information around your current will together." backHref="/wills/my-will" />

      <WillCard>
        <WillSectionHeading icon="file" title="Important details" description="These are your own organisational records and can be updated at any time." />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="text-sm font-semibold text-[#20352a]">Will status</span><select disabled={!currentVersion} value={currentVersion?.status ?? "draft"} onChange={(event) => setDraft((current) => ({ ...current, versions: current.versions.map((version) => version.id === current.currentVersionId ? { ...version, status: event.target.value as WillVersionStatus } : version) }))} className={`${fieldClass} disabled:bg-[#f1f1ec]`}><option value="draft">Draft</option><option value="signed">Signed copy</option><option value="superseded">Superseded</option></select><span className="mt-1 block text-[11px] text-[#758078]">{currentVersion ? `Current upload: ${currentVersion.versionLabel}` : "Upload a will before setting its status."}</span></label>
          <label className="block"><span className="text-sm font-semibold text-[#20352a]">Date uploaded</span><input readOnly value={currentVersion ? formatWillDate(currentVersion.uploadedAt) : "Not recorded"} className={`${fieldClass} bg-[#f5f5ef] text-[#667068]`} /></label>
          <label className="block"><span className="text-sm font-semibold text-[#20352a]">Date signed</span><input type="date" disabled={!currentVersion} value={currentVersion?.signedDate ?? ""} onChange={(event) => setDraft((current) => ({ ...current, versions: current.versions.map((version) => version.id === current.currentVersionId ? { ...version, signedDate: event.target.value } : version) }))} className={`${fieldClass} disabled:bg-[#f1f1ec]`} /></label>
          <label className="block"><span className="text-sm font-semibold text-[#20352a]">Last reviewed date</span><input type="date" value={draft.lastReviewedAt} onChange={(event) => updateField("lastReviewedAt", event.target.value)} className={fieldClass} /></label>
          <label className="block"><span className="text-sm font-semibold text-[#20352a]">Next review date</span><input type="date" value={draft.nextReviewAt} onChange={(event) => updateField("nextReviewAt", event.target.value)} className={fieldClass} /></label>
          <label className="block"><span className="text-sm font-semibold text-[#20352a]">Reference number</span><input value={draft.referenceNumber} onChange={(event) => updateField("referenceNumber", event.target.value)} className={fieldClass} autoComplete="off" /></label>
        </div>
      </WillCard>

      <WillCard>
        <WillSectionHeading icon="briefcase" title="Solicitor or firm" description="Record who prepared or holds information about the will, if applicable." />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="text-sm font-semibold text-[#20352a]">Solicitor name</span><input value={draft.solicitorName} onChange={(event) => updateField("solicitorName", event.target.value)} className={fieldClass} autoComplete="name" /></label>
          <label className="block"><span className="text-sm font-semibold text-[#20352a]">Firm</span><input value={draft.solicitorFirm} onChange={(event) => updateField("solicitorFirm", event.target.value)} className={fieldClass} /></label>
          <label className="block"><span className="text-sm font-semibold text-[#20352a]">Telephone</span><input type="tel" value={draft.solicitorPhone} onChange={(event) => updateField("solicitorPhone", event.target.value)} className={fieldClass} autoComplete="tel" /></label>
          <label className="block"><span className="text-sm font-semibold text-[#20352a]">Email</span><input type="email" value={draft.solicitorEmail} onChange={(event) => updateField("solicitorEmail", event.target.value)} className={fieldClass} autoComplete="email" /></label>
        </div>
      </WillCard>

      <WillCard>
        <WillSectionHeading icon="map-pin" title="Where is the original?" description="DiaryDock can store a digital copy, but the signed physical original may still be required." />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="text-sm font-semibold text-[#20352a]">Location type</span><select value={draft.originalLocationType} onChange={(event) => updateField("originalLocationType", event.target.value as WillRecord["originalLocationType"])} className={fieldClass}><option value="">Choose a location</option><option value="home">At home</option><option value="solicitor">With a solicitor</option><option value="secure-storage">In secure storage</option><option value="trusted-organisation">With another trusted organisation</option><option value="other">Other</option></select></label>
          <label className="block"><span className="text-sm font-semibold text-[#20352a]">Specific location</span><input value={draft.originalLocationDetails} onChange={(event) => updateField("originalLocationDetails", event.target.value)} className={fieldClass} placeholder="For example, labelled folder in home safe" /></label>
          <label className="block"><span className="text-sm font-semibold text-[#20352a]">Firm or organisation</span><input value={draft.originalOrganisation} onChange={(event) => updateField("originalOrganisation", event.target.value)} className={fieldClass} /></label>
          <label className="block"><span className="text-sm font-semibold text-[#20352a]">Contact person</span><input value={draft.originalContactName} onChange={(event) => updateField("originalContactName", event.target.value)} className={fieldClass} /></label>
          <label className="block"><span className="text-sm font-semibold text-[#20352a]">Telephone</span><input type="tel" value={draft.originalPhone} onChange={(event) => updateField("originalPhone", event.target.value)} className={fieldClass} /></label>
          <label className="block"><span className="text-sm font-semibold text-[#20352a]">Email</span><input type="email" value={draft.originalEmail} onChange={(event) => updateField("originalEmail", event.target.value)} className={fieldClass} /></label>
          <label className="block"><span className="text-sm font-semibold text-[#20352a]">Reference number</span><input value={draft.originalReferenceNumber} onChange={(event) => updateField("originalReferenceNumber", event.target.value)} className={fieldClass} /></label>
          <label className="block"><span className="text-sm font-semibold text-[#20352a]">People informed</span><input value={draft.originalTrustedPeople} onChange={(event) => updateField("originalTrustedPeople", event.target.value)} className={fieldClass} placeholder="Names only — this does not grant access" /></label>
        </div>
        <label className="mt-4 block"><span className="text-sm font-semibold text-[#20352a]">Collection or access notes</span><textarea value={draft.originalAccessNotes} onChange={(event) => updateField("originalAccessNotes", event.target.value)} rows={3} className={areaClass} /></label>
      </WillCard>

      <WillCard>
        <WillSectionHeading icon="users" title="Executor information" description="Recording a person here does not grant them DiaryDock access." />
        {(["primaryExecutor", "backupExecutor"] as const).map((key, index) => (
          <fieldset key={key} className={`${index ? "mt-6 border-t border-[#20352a]/[0.07] pt-5" : "mt-5"}`}>
            <legend className="text-sm font-semibold text-[#20352a]">{index ? "Backup executor" : "Primary executor"}</legend>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="text-xs font-semibold text-[#59655d]">Name</span><input value={draft[key].name} onChange={(event) => updateField(key, { ...draft[key], name: event.target.value })} className={fieldClass} /></label>
              <label className="block"><span className="text-xs font-semibold text-[#59655d]">Telephone</span><input type="tel" value={draft[key].phone} onChange={(event) => updateField(key, { ...draft[key], phone: event.target.value })} className={fieldClass} /></label>
              <label className="block"><span className="text-xs font-semibold text-[#59655d]">Email</span><input type="email" value={draft[key].email} onChange={(event) => updateField(key, { ...draft[key], email: event.target.value })} className={fieldClass} /></label>
              <label className="flex min-h-12 items-center gap-3 self-end rounded-[15px] bg-[#f1f3ec] px-3 text-sm text-[#294436]"><input type="checkbox" checked={draft[key].informed} onChange={(event) => updateField(key, { ...draft[key], informed: event.target.checked })} className="h-5 w-5 accent-[#52705a]" />This person has been informed</label>
            </div>
          </fieldset>
        ))}
        <label className="mt-5 flex min-h-12 items-center gap-3 rounded-[15px] bg-[#f1f3ec] px-3 text-sm text-[#294436]"><input type="checkbox" checked={draft.trustedPersonInformed} onChange={(event) => updateField("trustedPersonInformed", event.target.checked)} className="h-5 w-5 accent-[#52705a]" />A trusted person knows where the original is held</label>
        <Link href="/family" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-[#6f8e72]/25 px-4 text-sm font-semibold text-[#294436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"><UiIcon name="shield" className="h-4 w-4" />Open trusted-person settings</Link>
        <p className="mt-3 text-[11px] leading-5 text-[#758078]">Access is never granted automatically. Use the existing Family Room permissions to manage verified access separately.</p>
      </WillCard>

      <WillCard>
        <WillSectionHeading icon="lock" title="Private notes" description="Use this for practical instructions. Notes are stored privately and are not sent to analytics." />
        <textarea value={draft.notes} onChange={(event) => updateField("notes", event.target.value)} rows={5} className={areaClass} placeholder="Important context for your own records…" />
      </WillCard>

      {savedMessage ? <p role="status" className="rounded-[15px] bg-[#dde6d8] px-4 py-3 text-sm text-[#294436]">{savedMessage}</p> : null}
      <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#2f5140] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_-22px_rgba(32,53,42,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"><UiIcon name="check" className="h-4 w-4" />Save will details</button>
      <WillLegalNotice />
    </form>
  );
}
