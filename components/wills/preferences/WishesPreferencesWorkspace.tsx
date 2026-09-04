"use client";

import { useEffect, useState } from "react";

import { createInitialWishesPreferences, type WishesPreferencesDraft } from "@diarydock/wills";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { WillCard, WillLegalNotice, WillPageHeader, formatWillDate } from "@/components/wills/WillUi";
import { WishesPreferenceFields } from "./WishesPreferenceFields";
import { applyWishesPreferences, wishesDraftFromRecord } from "./wishes-preferences-model";

function emptyDraft() {
  const { updatedAt, ...draft } = createInitialWishesPreferences();
  void updatedAt;
  return draft;
}

function display(value: string) {
  return value.trim() || "Not recorded";
}

export function WishesPreferencesWorkspace() {
  const { hydrated, state, updateState } = useDiaryDockData();
  const [draft, setDraft] = useState<WishesPreferencesDraft>(emptyDraft);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (hydrated && !editing) setDraft(wishesDraftFromRecord(state.willsWishes));
  }, [editing, hydrated, state.willsWishes]);

  function change(key: keyof WishesPreferencesDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function save() {
    try {
      updateState((current) => applyWishesPreferences(current, draft));
      setEditing(false);
      setMessage("Your private preferences were saved securely.");
    } catch {
      setMessage("Check the information and try saving again.");
    }
  }

  const preferences = state.willsWishes;
  return <div className="mx-auto w-full max-w-[820px] space-y-6 pb-6">
    <WillPageHeader title="My Wishes & Preferences"
      subtitle="Keep personal guidance in your own words, alongside your will records." />

    {!hydrated ? <WillCard><p className="text-sm text-[#667068]">Opening your private record…</p></WillCard>
      : editing ? <WillCard className="space-y-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6f8e72]">Private record</p>
          <h2 className="mt-1 font-serif text-2xl text-[#20352a]">Review your preferences</h2>
          <p className="mt-2 text-sm leading-6 text-[#667068]">Nothing here changes your will,
            creates medical consent or gives another person access to DiaryDock.</p>
        </div>
        <WishesPreferenceFields draft={draft} onChange={change} />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => { setEditing(false); setMessage(""); }}
            className="min-h-12 rounded-full border border-[#20352a]/15 px-5 text-sm font-semibold text-[#294436]">Cancel</button>
          <button type="button" onClick={save}
            className="min-h-12 rounded-full bg-[#20352a] px-6 text-sm font-semibold text-white">Save securely</button>
        </div>
      </WillCard> : <>
        <WillCard className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6f8e72]">In your own words</p>
              <h2 className="mt-1 font-serif text-2xl text-[#20352a]">Your private guidance</h2></div>
            <button type="button" onClick={() => { setDraft(wishesDraftFromRecord(preferences)); setEditing(true); setMessage(""); }}
              className="min-h-11 rounded-full bg-[#20352a] px-5 text-sm font-semibold text-white">Review and edit</button>
          </div>
          <p className="rounded-[16px] bg-[#eef2e9] px-4 py-3 text-sm leading-6 text-[#536158]">
            These notes help trusted people understand your preferences. They are never shared automatically.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[ ["Funeral preference", display(preferences.funeralPreference)],
              ["Personal message", display(preferences.personalMessage)],
              ["Trusted people", display(preferences.trustedPeople)],
              ["Last reviewed", formatWillDate(preferences.lastReviewed)] ].map(([label, value]) =>
              <article key={label} className="rounded-[16px] border border-[#20352a]/[0.07] bg-white p-4">
                <small className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#748078]">{label}</small>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#294436]">{value}</p>
              </article>)}
          </div>
          {preferences.updatedAt ? <p className="text-xs text-[#748078]">Updated {formatWillDate(preferences.updatedAt)}</p> : null}
        </WillCard>
      </>}
    {message ? <p role="status" className="rounded-[16px] bg-[#eef2e9] px-4 py-3 text-sm text-[#294436]">{message}</p> : null}
    <WillLegalNotice />
  </div>;
}
