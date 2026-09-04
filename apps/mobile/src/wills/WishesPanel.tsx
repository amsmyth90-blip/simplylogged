import type { WishesPreferences } from "@diarydock/wills";

import { formatLegalDate } from "./wills-model";

type Props = {
  preferences: WishesPreferences;
  onEdit: () => void;
};

function recorded(value: string) {
  return value.trim() || "Not recorded";
}

export function WishesPanel({ preferences, onEdit }: Props) {
  return (
    <section className="wills-card wills-record-card">
      <header>
        <div>
          <p>In your own words</p>
          <h2>My Wishes & Preferences</h2>
        </div>
        <button type="button" onClick={onEdit}>Review</button>
      </header>
      <p className="wills-boundary-note">
        These notes help trusted people understand your preferences. They do
        not amend your will, create consent or replace legal or medical advice.
      </p>
      <div className="wills-detail-list">
        <article>
          <small>Funeral preference</small>
          <strong>{recorded(preferences.funeralPreference)}</strong>
        </article>
        <article>
          <small>Personal message</small>
          <strong>{recorded(preferences.personalMessage)}</strong>
        </article>
        <article>
          <small>Trusted people</small>
          <strong>{recorded(preferences.trustedPeople)}</strong>
        </article>
        <article>
          <small>Last reviewed</small>
          <strong>{formatLegalDate(preferences.lastReviewed)}</strong>
        </article>
      </div>
    </section>
  );
}
