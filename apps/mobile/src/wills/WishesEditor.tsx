import { useEffect, useState } from "react";

import type {
  WishesPreferences,
  WishesPreferencesDraft,
} from "@diarydock/wills";
import { wishesPreferenceKeys } from "@diarydock/wills";

import type { WillsDraftMutation } from "./wills-client";

type Props = {
  busy: boolean;
  online: boolean;
  open: boolean;
  preferences: WishesPreferences;
  onClose: () => void;
  onSave: (mutation: WillsDraftMutation) => Promise<boolean>;
};

function draftFrom(preferences: WishesPreferences): WishesPreferencesDraft {
  return Object.fromEntries(wishesPreferenceKeys.map((key) => [
    key,
    preferences[key],
  ])) as WishesPreferencesDraft;
}

export function WishesEditor(props: Props) {
  const [draft, setDraft] = useState(() => draftFrom(props.preferences));

  useEffect(() => {
    if (props.open) setDraft(draftFrom(props.preferences));
  }, [props.open, props.preferences]);

  if (!props.open) return null;

  function change(key: keyof WishesPreferencesDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (props.busy || !props.online) return;
    if (await props.onSave({ operation: "UPDATE_WISHES", preferences: draft })) {
      props.onClose();
    }
  }

  return (
    <div className="wills-editor-backdrop" role="presentation">
      <section
        className="wills-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wishes-editor-title"
      >
        <header>
          <div>
            <p>Private preferences</p>
            <h2 id="wishes-editor-title">My Wishes & Preferences</h2>
          </div>
          <button type="button" onClick={props.onClose} aria-label="Close wishes editor">×</button>
        </header>
        <p>
          Record guidance in your own words. These notes are not legal
          instructions and are never shared automatically.
        </p>
        <PersonalDetails draft={draft} change={change} />
        <WillContext draft={draft} change={change} />
        <PersonalWishes draft={draft} change={change} />
        <ReviewDetails draft={draft} change={change} />
        {!props.online ? (
          <p>Connect to update these private preferences. The encrypted copy remains available offline.</p>
        ) : null}
        <footer>
          <button type="button" onClick={props.onClose}>Cancel</button>
          <button type="button" disabled={props.busy || !props.online} onClick={() => void save()}>
            {props.busy ? "Saving…" : "Save securely"}
          </button>
        </footer>
      </section>
    </div>
  );
}

type SectionProps = {
  draft: WishesPreferencesDraft;
  change: (key: keyof WishesPreferencesDraft, value: string) => void;
};

function PersonalDetails({ draft, change }: SectionProps) {
  return (
    <div className="wills-editor-section">
      <h3>About me</h3>
      <label><span>Full name</span><input autoFocus maxLength={160} value={draft.fullName} onChange={(event) => change("fullName", event.target.value)} /></label>
      <label><span>Address</span><textarea rows={3} maxLength={1_000} value={draft.address} onChange={(event) => change("address", event.target.value)} /></label>
      <label><span>Date of birth</span><input type="date" value={draft.dateOfBirth} onChange={(event) => change("dateOfBirth", event.target.value)} /></label>
    </div>
  );
}

function WillContext({ draft, change }: SectionProps) {
  return (
    <div className="wills-editor-section">
      <h3>Will context</h3>
      <label><span>Will status</span><input maxLength={160} value={draft.willStatus} onChange={(event) => change("willStatus", event.target.value)} /></label>
      <div className="wills-editor-row">
        <label><span>Executor</span><input maxLength={160} value={draft.executorName} onChange={(event) => change("executorName", event.target.value)} /></label>
        <label><span>Solicitor</span><input maxLength={160} value={draft.solicitorName} onChange={(event) => change("solicitorName", event.target.value)} /></label>
      </div>
      <label><span>Original will location</span><textarea rows={3} maxLength={2_000} value={draft.originalWillLocation} onChange={(event) => change("originalWillLocation", event.target.value)} /></label>
    </div>
  );
}

function PersonalWishes({ draft, change }: SectionProps) {
  return (
    <div className="wills-editor-section">
      <h3>Personal wishes</h3>
      <label><span>Funeral preference</span><textarea rows={3} maxLength={2_000} value={draft.funeralPreference} onChange={(event) => change("funeralPreference", event.target.value)} /></label>
      <label><span>Funeral details</span><textarea rows={4} maxLength={10_000} value={draft.funeralDetails} onChange={(event) => change("funeralDetails", event.target.value)} /></label>
      <label><span>Music and readings</span><textarea rows={4} maxLength={10_000} value={draft.musicAndReadings} onChange={(event) => change("musicAndReadings", event.target.value)} /></label>
      <label><span>Personal message</span><textarea rows={6} maxLength={20_000} value={draft.personalMessage} onChange={(event) => change("personalMessage", event.target.value)} /></label>
      <label><span>Special belongings</span><textarea rows={4} maxLength={10_000} value={draft.specialBelongings} onChange={(event) => change("specialBelongings", event.target.value)} /></label>
      <label><span>Pet-care wishes</span><textarea rows={4} maxLength={10_000} value={draft.petCareWishes} onChange={(event) => change("petCareWishes", event.target.value)} /></label>
    </div>
  );
}

function ReviewDetails({ draft, change }: SectionProps) {
  return (
    <div className="wills-editor-section">
      <h3>Trusted people & review</h3>
      <label><span>Trusted people</span><textarea rows={3} maxLength={2_000} value={draft.trustedPeople} onChange={(event) => change("trustedPeople", event.target.value)} /></label>
      <div className="wills-editor-row">
        <label><span>Review frequency</span><input maxLength={160} value={draft.reviewFrequency} onChange={(event) => change("reviewFrequency", event.target.value)} /></label>
        <label><span>Last reviewed</span><input type="date" value={draft.lastReviewed} onChange={(event) => change("lastReviewed", event.target.value)} /></label>
      </div>
    </div>
  );
}
