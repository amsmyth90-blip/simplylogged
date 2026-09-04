import { useState } from "react";

import type { MobileWillVersion, WillSummaryReview as Review } from "@diarydock/wills";

import type { WillsDraftMutation } from "./wills-client";

type Props = {
  busy: boolean;
  online: boolean;
  version: MobileWillVersion | null;
  onClose: () => void;
  onSave: (mutation: WillsDraftMutation) => Promise<boolean>;
};

export function WillSummaryReview(props: Props) {
  const [review, setReview] = useState<Review>(
    props.version?.summaryReview ?? "unreviewed",
  );
  const [note, setNote] = useState(props.version?.summaryReviewNote ?? "");
  if (!props.version?.detectedSummary) return null;
  const summary = props.version.detectedSummary;
  const groups = [
    ["Executors", summary.executors],
    ["Beneficiaries", summary.beneficiaries],
    ["Guardians", summary.guardians],
    ["Questions or unclear wording", summary.questionsOrUnclearWording],
  ] as const;

  async function save() {
    if (props.busy || !props.online || !props.version) return;
    const saved = await props.onSave({
      operation: "REVIEW_VERSION",
      versionId: props.version.id,
      review,
      note: note.trim(),
    });
    if (saved) props.onClose();
  }

  return (
    <div className="wills-editor-backdrop" role="presentation">
      <section
        className="wills-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="will-summary-title"
      >
        <header>
          <div>
            <p>Machine-generated aid</p>
            <h2 id="will-summary-title">Review will summary</h2>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            aria-label="Close will summary review"
          >
            ×
          </button>
        </header>
        <p>
          Check every point against the signed document. This summary is not legal
          advice and may be incomplete or wrong.
        </p>
        <section className="wills-analysis-summary">
          <h3>Overview</h3>
          <p>{summary.overview || "No overview was detected."}</p>
          {groups.map(([label, items]) => items.length ? (
            <div key={label}>
              <strong>{label}</strong>
              <ul>
                {items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : null)}
        </section>
        <label>
          <span>Your review</span>
          <select
            value={review}
            onChange={(event) => setReview(event.target.value as Review)}
          >
            <option value="unreviewed">Not reviewed</option>
            <option value="confirmed">Checked against document</option>
            <option value="incorrect">Contains an error</option>
          </select>
        </label>
        <label>
          <span>Review note</span>
          <textarea
            rows={4}
            maxLength={4_000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        {!props.online ? <p>Connect to record your review.</p> : null}
        <footer>
          <button type="button" onClick={props.onClose}>Cancel</button>
          <button
            type="button"
            disabled={props.busy || !props.online}
            onClick={() => void save()}
          >
            {props.busy ? "Saving…" : "Save review"}
          </button>
        </footer>
      </section>
    </div>
  );
}
