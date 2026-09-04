import type { MobileWillRecord } from "@diarydock/wills";

import { formatLegalDate } from "./wills-model";

type Props = {
  will: MobileWillRecord;
  onAdd: () => void;
  onEditDetails: () => void;
  onReview: (versionId: string) => void;
  onReviewDates: () => void;
  onSetCurrent: (versionId: string) => void;
};

export function WillRecords(props: Props) {
  return (
    <section className="wills-card wills-record-card">
      <header>
        <div><p>Private legal record</p><h2>Will versions</h2></div>
        <button type="button" onClick={props.onAdd}>＋ Link file</button>
      </header>
      <div className="wills-version-list">
        {props.will.versions.map((version) => (
          <article
            key={version.id}
            className={version.id === props.will.currentVersionId ? "is-current" : ""}
          >
            <span>{version.status === "signed" ? "✓" : "W"}</span>
            <div>
              <strong>{version.versionLabel}</strong>
              <small>
                {version.status} · uploaded
                {` ${formatLegalDate(version.uploadedAt.slice(0, 10))}`}
              </small>
              {version.notes ? <p>{version.notes}</p> : null}
            </div>
            <footer>
              {version.id !== props.will.currentVersionId ? (
                <button type="button" onClick={() => props.onSetCurrent(version.id)}>
                  Make current
                </button>
              ) : <b>Current</b>}
              {version.detectedSummary ? (
                <button type="button" onClick={() => props.onReview(version.id)}>
                  Review summary
                </button>
              ) : null}
            </footer>
          </article>
        ))}
        {!props.will.versions.length ? (
          <div className="wills-empty">
            <span>♢</span>
            <strong>No will version linked</strong>
            <p>
              Scan a will document into the Safe Room, then link it here after
              checking the file.
            </p>
          </div>
        ) : null}
      </div>
      <div className="wills-secondary-actions">
        <button
          className="wills-secondary-action"
          type="button"
          onClick={props.onEditDetails}
        >
          Manage executors, solicitor and original location
        </button>
        <button
          className="wills-secondary-action"
          type="button"
          onClick={props.onReviewDates}
        >
          Record review dates
        </button>
      </div>
    </section>
  );
}
