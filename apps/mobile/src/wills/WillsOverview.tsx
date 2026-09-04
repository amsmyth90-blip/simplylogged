import {
  getPreparationProgress,
  type WillsSnapshot,
} from "@diarydock/wills";

import { executorComplete, formatLegalDate } from "./wills-model";

type Props = {
  snapshot: WillsSnapshot;
  documentCount: number;
  onEditDetails: () => void;
  onOpenLetters: () => void;
  onOpenPlanning: () => void;
  onOpenWishes: () => void;
  onOpenWill: () => void;
};

export function WillsOverview(props: Props) {
  const { will } = props.snapshot;
  const current = will.versions.find((version) => version.id === will.currentVersionId);
  const preparation = getPreparationProgress(will);
  return (
    <div className="wills-overview-grid">
      <section className="wills-card wills-status-card">
        <header><div><p>My Will</p><h2>{current ? current.versionLabel : "No will version linked"}</h2></div><button type="button" onClick={props.onOpenWill}>Open</button></header>
        <div className="wills-facts">
          <article><small>Status</small><strong>{current?.status ?? "Not added"}</strong></article>
          <article><small>Signed date</small><strong>{formatLegalDate(current?.signedDate ?? "")}</strong></article>
          <article><small>Next review</small><strong>{formatLegalDate(will.nextReviewAt)}</strong></article>
          <article><small>Stored files</small><strong>{props.documentCount}</strong></article>
        </div>
      </section>
      <section className="wills-card">
        <header><div><p>Practical details</p><h2>People & location</h2></div><button type="button" onClick={props.onEditDetails}>Review</button></header>
        <div className="wills-detail-list">
          <article><small>Primary executor</small><strong>{will.primaryExecutor.name || "Not recorded"}</strong><span>{executorComplete(will.primaryExecutor) ? "Contact route recorded" : "Contact details incomplete"}</span></article>
          <article><small>Solicitor</small><strong>{will.solicitorName || will.solicitorFirm || "Not recorded"}</strong></article>
          <article><small>Original location</small><strong>{will.originalLocationDetails || "Not recorded"}</strong></article>
        </div>
      </section>
      <section className="wills-card wills-action-card">
        <button type="button" onClick={props.onOpenWishes}><span>❧</span><div><strong>My Wishes & Preferences</strong><small>Private guidance in your own words</small></div><b>›</b></button>
        <button type="button" onClick={props.onOpenLetters}><span>✉</span><div><strong>Letters of Wishes</strong><small>{props.snapshot.counts.letters} private letter{props.snapshot.counts.letters === 1 ? "" : "s"}</small></div><b>›</b></button>
        <button type="button" onClick={props.onOpenPlanning}><span>✓</span><div><strong>Will preparation</strong><small>{preparation.complete} of {preparation.total} areas complete</small></div><b>›</b></button>
      </section>
    </div>
  );
}
