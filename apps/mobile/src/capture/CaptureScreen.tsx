import { useRef, useState, type ChangeEvent } from "react";

import { ACCEPTED_DOCUMENT_TYPES } from "@diarydock/documents";
import { documentCategories, estateRooms } from "@diarydock/capture";
import type { OfflineStore } from "@diarydock/offline-store";

import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";
import { MobileIcon } from "@mobile/components/MobileIcon";

import documentStackImage from "../../../../public/images/capture-document-stack.png";
import estateImage from "../../../../public/images/estate-dashboard-country.webp";

import {
  capturedDocumentFromFile,
  takeDocumentPhoto,
  type CapturedDocument,
} from "./capture-source";
import { usePendingNativeShare } from "./native-share-import";
import { useCaptureQueue } from "./use-capture-queue";

type CaptureScreenProps = {
  accessToken: string;
  initialRoomName?: string;
  store: OfflineStore;
  syncStatus: string;
  synchronize: () => Promise<unknown>;
  onNavigate: (destination: MobileDestination) => void;
};

function queueLabel(state: "FAILED" | "IN_FLIGHT" | "QUEUED", online: boolean) {
  if (state === "FAILED") return "Needs attention";
  if (state === "IN_FLIGHT") return "Securing upload";
  return online ? "Waiting to upload" : "Encrypted offline";
}

export function CaptureScreen(props: CaptureScreenProps) {
  const queue = useCaptureQueue(
    props.store,
    props.syncStatus,
    props.synchronize,
    props.accessToken,
    props.initialRoomName,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  usePendingNativeShare(queue.add, queue.captures.length === 0, setLocalError);

  async function select(work: () => Promise<CapturedDocument | null>) {
    setWorking(true);
    setLocalError(null);
    try {
      const capture = await work();
      if (capture) queue.add(capture);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "That document could not be opened safely.");
    } finally {
      setWorking(false);
    }
  }

  async function fromFile(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    const totalFiles = queue.captures.length + files.length;
    const includesPdf = queue.captures.some((item) => item.mimeType === "application/pdf")
      || files.some((file) => file.type.toLowerCase().split(";")[0] === "application/pdf");
    if (totalFiles > 12 || (includesPdf && totalFiles > 1)) {
      setLocalError(includesPdf
        ? "A PDF must be added as one complete document."
        : "Keep each document to twelve pages or fewer.");
      return;
    }
    setWorking(true);
    setLocalError(null);
    try {
      const captures: CapturedDocument[] = [];
      for (const file of files) captures.push(await capturedDocumentFromFile(file));
      queue.add(captures);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Those document pages could not be opened safely.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="capture-screen">
      <div className="capture-backdrop" aria-hidden="true">
        {/* Packaged artwork is bundled locally and never loaded from a remote origin. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={estateImage} alt="" />
      </div>
      <div className="capture-backdrop-wash" aria-hidden="true" />
      <header className="capture-header">
        <button type="button" aria-label="Back to All Files" onClick={() => props.onNavigate("FILES")}>
          <MobileIcon name="arrow-left" />
        </button>
        <div>
          <h1>{queue.captures.length ? "Check details" : "Add document"}</h1>
          <p>{queue.captures.length ? "Nothing is saved until you confirm" : "Add every page in reading order"}</p>
        </div>
        <span className="capture-page-count">
          {queue.captures.length
            ? `${queue.captures.length} page${queue.captures.length === 1 ? "" : "s"}`
            : <MobileIcon name="shield" />}
        </span>
      </header>

      {!queue.captures.length ? <section className="capture-hero">
        <div className="capture-artwork">
          {/* This packaged illustration exactly matches the wrapper capture screen. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={documentStackImage} alt="A secure stack of household documents ready to add" />
        </div>
        <div className="capture-intro">
          <h2>Add one or more pages</h2>
          <p>Photograph each page or choose several together.</p>
        </div>
        <div className="capture-actions">
          <button type="button" disabled={working} onClick={() => void select(takeDocumentPhoto)}>
            <span aria-hidden="true"><MobileIcon name="camera" /></span><strong>Take photo</strong>
          </button>
          <button type="button" disabled={working} onClick={() => inputRef.current?.click()}>
            <span aria-hidden="true"><MobileIcon name="file" /></span><strong>Choose pages</strong>
          </button>
          <input
            ref={inputRef}
            className="capture-file-input"
            type="file"
            accept={ACCEPTED_DOCUMENT_TYPES.join(",")}
            multiple
            onChange={(event) => void fromFile(event)}
          />
        </div>
        <p className="capture-page-limit"><MobileIcon name="leaf" />You can add up to 12 pages</p>
        {props.initialRoomName ? <p className="capture-room-target">These pages will be filed in {props.initialRoomName}.</p> : null}
      </section> : null}

      {queue.captures.length ? (
        <section className="capture-review">
          <div className="capture-preview">
            {queue.captures[0]?.previewUrl ? (
              // Native/web object URLs are local, user-selected content and never remote image input.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={queue.captures[0].previewUrl!} alt="Selected document preview" />
            ) : <span>PDF</span>}
          </div>
          <div className="capture-analysis">
            {queue.draft.captureJobId ? (
              <span>✓ Read securely — check every detail below</span>
            ) : (
              <button
                type="button"
                disabled={queue.analysing || !navigator.onLine}
                onClick={() => void queue.analyse()}
              >
                {queue.analysing ? "Reading document…" : "Read and organise for me"}
              </button>
            )}
            {!navigator.onLine ? <small>You are offline. Add the details manually and DiaryDock will upload later.</small> : null}
          </div>
          <div className="capture-pages" aria-label="Selected document pages">
            {queue.captures.map((capture, index) => (
              <div key={`${capture.fileName}-${index}`}>
                <span>{capture.mimeType === "application/pdf" ? "PDF" : index + 1}</span>
                <small>{capture.fileName}</small>
                <button type="button" aria-label={`Remove page ${index + 1}`} onClick={() => queue.remove(index)}>×</button>
              </div>
            ))}
          </div>
          <div className="capture-fields">
            <label>Document name<input value={queue.draft.title} maxLength={240} onChange={(event) => queue.setDraft({ ...queue.draft, title: event.target.value })} /></label>
            <label>Category<select value={queue.draft.category} onChange={(event) => queue.setDraft({ ...queue.draft, category: event.target.value })}>{documentCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Area<select value={queue.draft.roomName} onChange={(event) => queue.setDraft({ ...queue.draft, roomName: event.target.value })}>{estateRooms.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Who issued it<input value={queue.draft.issuer} maxLength={240} placeholder="Optional" onChange={(event) => queue.setDraft({ ...queue.draft, issuer: event.target.value })} /></label>
            <label>Useful date<input type="date" value={queue.draft.dueDate} onChange={(event) => queue.setDraft({ ...queue.draft, dueDate: event.target.value })} /></label>
            <label className="capture-wide-field">Summary<textarea rows={3} value={queue.draft.summary} maxLength={2000} placeholder="Optional notes about this document" onChange={(event) => queue.setDraft({ ...queue.draft, summary: event.target.value })} /></label>
          </div>
          {queue.draft.confirmedFields.length ? (
            <fieldset className="capture-extracted-fields">
              <legend>Details found — please check</legend>
              {queue.draft.confirmedFields.map((field, index) => (
                <label key={`${field.key}-${index}`}>{field.label}
                  <input value={field.value} maxLength={500} onChange={(event) => queue.setDraft({
                    ...queue.draft,
                    confirmedFields: queue.draft.confirmedFields.map((item, itemIndex) => (
                      itemIndex === index ? { ...item, value: event.target.value } : item
                    )),
                  })} />
                </label>
              ))}
            </fieldset>
          ) : null}
          {queue.draft.reminderTitle ? (
            <div className="capture-reminder">
              <label><input type="checkbox" checked={queue.draft.createReminder} onChange={(event) => queue.setDraft({ ...queue.draft, createReminder: event.target.checked })} />Create reminder</label>
              {queue.draft.createReminder ? (
                <><input aria-label="Reminder title" value={queue.draft.reminderTitle} maxLength={240} onChange={(event) => queue.setDraft({ ...queue.draft, reminderTitle: event.target.value })} />
                <input aria-label="Reminder timing" value={queue.draft.reminderTimeLabel} maxLength={120} onChange={(event) => queue.setDraft({ ...queue.draft, reminderTimeLabel: event.target.value })} /></>
              ) : null}
            </div>
          ) : null}
          <p className="capture-security-note">The file type and contents are checked now and checked again by the secure server before storage.</p>
          <button className="capture-save" type="button" disabled={!queue.draft.title.trim()} onClick={() => void queue.stage()}>
            Save {queue.captures.length > 1 ? `${queue.captures.length} pages` : "securely"}
          </button>
        </section>
      ) : null}

      {localError || queue.error ? <p className="form-message form-error" role="alert">{localError ?? queue.error}</p> : null}

      {queue.uploads.length ? (
        <section className="capture-queue" aria-live="polite">
          <div><p className="eyebrow">Upload queue</p><h2>Safe on this device</h2></div>
          {queue.uploads.map((item) => (
            <article key={item.jobId}>
              <span className={`queue-state queue-${item.state.toLowerCase()}`} />
              <div><strong>{item.title}</strong><small>{queueLabel(item.state, navigator.onLine)}</small></div>
              {item.state === "FAILED" ? <button type="button" onClick={() => void queue.retry(item.jobId)}>Try again</button> : null}
            </article>
          ))}
        </section>
      ) : null}
      <MobileBottomNav active="SCAN" onNavigate={props.onNavigate} />
    </main>
  );
}
