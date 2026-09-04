import { useEffect, useState } from "react";

import type { MobileWillRecord } from "@diarydock/wills";
import type { EditableReminder } from "@diarydock/reminders";

import type { WillsDraftMutation } from "./wills-client";

type Props = {
  busy: boolean;
  online: boolean;
  open: boolean;
  will: MobileWillRecord;
  onClose: () => void;
  onCreateReminder: (recordId: string, reminder: EditableReminder) => Promise<boolean>;
  onSave: (mutation: WillsDraftMutation) => Promise<boolean>;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function WillReviewEditor(props: Props) {
  const [reviewedAt, setReviewedAt] = useState(today);
  const [nextReviewAt, setNextReviewAt] = useState("");
  const [makeReminder, setMakeReminder] = useState(false);

  useEffect(() => {
    if (!props.open) return;
    setReviewedAt(props.will.lastReviewedAt || today());
    setNextReviewAt(props.will.nextReviewAt);
    setMakeReminder(false);
  }, [props.open, props.will.lastReviewedAt, props.will.nextReviewAt]);

  if (!props.open) return null;

  async function save() {
    if (!reviewedAt || props.busy || !props.online) return;
    if (!(await props.onSave({ operation: "MARK_REVIEWED", reviewedAt, nextReviewAt }))) return;
    if (makeReminder && nextReviewAt) {
      await props.onCreateReminder(crypto.randomUUID(), reviewReminder(nextReviewAt));
    }
    props.onClose();
  }

  return (
    <div className="wills-editor-backdrop" role="presentation">
      <section className="wills-editor" role="dialog" aria-modal="true" aria-labelledby="will-review-title">
        <header>
          <div><p>User-confirmed review</p><h2 id="will-review-title">Will review dates</h2></div>
          <button type="button" onClick={props.onClose} aria-label="Close will review editor">×</button>
        </header>
        <p>Record a review only after checking the current will and practical details. This does not confirm legal validity.</p>
        <div className="wills-editor-row">
          <label><span>Reviewed on</span><input type="date" value={reviewedAt} onChange={(event) => setReviewedAt(event.target.value)} /></label>
          <label><span>Review again</span><input type="date" value={nextReviewAt} onChange={(event) => setNextReviewAt(event.target.value)} /></label>
        </div>
        {nextReviewAt ? (
          <label className="wills-check">
            <input type="checkbox" checked={makeReminder} onChange={(event) => setMakeReminder(event.target.checked)} />
            <span>Create a reminder for this review date</span>
          </label>
        ) : null}
        {!props.online ? <p>Connect to save review dates.</p> : null}
        <footer>
          <button type="button" onClick={props.onClose}>Cancel</button>
          <button type="button" disabled={!reviewedAt || props.busy || !props.online} onClick={() => void save()}>{props.busy ? "Saving…" : "Save review dates"}</button>
        </footer>
      </section>
    </div>
  );
}

function reviewReminder(nextReviewAt: string): EditableReminder {
  return {
    title: "Review my will and Safe Room details",
    note: "Review the current will, executors, storage location and personal wishes.",
    roomId: "safe-room",
    roomName: "Safe Room",
    group: "later",
    timeLabel: nextReviewAt,
    priority: "high",
    dueAt: `${nextReviewAt}T09:00:00`,
    timeZone: "Europe/London",
  };
}
