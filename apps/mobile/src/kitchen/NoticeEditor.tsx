import { useCallback, useMemo, useRef, useState, type FormEvent } from "react";

import {
  noticeCategories,
  resolveNoticeDate,
  type KitchenNotice,
  type KitchenNoticeDraft,
  type NoticeCategory,
} from "@diarydock/kitchen";

import { takeDocumentPhoto } from "@mobile/capture/capture-source";
import { captureKitchenNotice } from "./notice-capture-client";
import { draftForNotice, noticeWhenOptions, suggestedLinks } from "./noticeboard-model";
import { useVoiceCapture } from "./use-voice-capture";

type SaveInput = {
  draft: KitchenNoticeDraft;
  linkCalendar: boolean;
  linkReminder: boolean;
  noticeId: string | null;
};

export function NoticeEditor(props: {
  accessToken: string;
  assignees: string[];
  busy: boolean;
  notice?: KitchenNotice;
  online: boolean;
  onArchive: (notice: KitchenNotice) => void;
  onClose: () => void;
  onSave: (input: SaveInput) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(() => draftForNotice(props.notice));
  const [linkReminder, setLinkReminder] = useState(Boolean(props.notice?.linkedReminderId));
  const [linkCalendar, setLinkCalendar] = useState(Boolean(props.notice?.linkedCalendarEventId));
  const [processing, setProcessing] = useState<"photo" | "voice" | null>(null);
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const whenOptions = useMemo(() => noticeWhenOptions(draft.due), [draft.due]);

  const analyse = useCallback(async (file: File | Awaited<ReturnType<typeof takeDocumentPhoto>>,
    mode: "photo" | "voice") => {
    if (!file) return;
    setProcessing(mode); setError("");
    try {
      const result = await captureKitchenNotice({ accessToken: props.accessToken, file, mode });
      setDraft((current) => ({ ...current, ...result.notice, source: mode }));
      const links = suggestedLinks(result.notice.due);
      setLinkReminder(links.linkReminder); setLinkCalendar(links.linkCalendar);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That notice could not be prepared.");
    } finally { setProcessing(null); }
  }, [props.accessToken]);

  const voice = useVoiceCapture(useCallback((file: File) => { void analyse(file, "voice"); }, [analyse]));
  const unavailable = props.busy || !props.online || Boolean(processing) || voice.recording;

  async function takePhoto() {
    setError("");
    try { await analyse(await takeDocumentPhoto(), "photo"); } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The photo could not be opened.");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim() || unavailable) return;
    if (await props.onSave({ draft, linkCalendar, linkReminder, noticeId: props.notice?.id ?? null })) {
      props.onClose();
    }
  }

  function changeDue(due: string) {
    setDraft((current) => ({ ...current, due }));
    const links = suggestedLinks(due);
    setLinkReminder(links.linkReminder); setLinkCalendar(links.linkCalendar);
  }

  return (
    <div className="notice-modal-backdrop" onClick={props.onClose}>
      <form className="notice-modal notice-editor" onSubmit={(event) => void submit(event)}
        role="dialog" aria-modal="true" aria-label={props.notice ? "Edit notice" : "Add notice"}
        onClick={(event) => event.stopPropagation()}>
        <div className="notice-drag-handle" />
        <header><div><small>{props.notice ? "Update pin" : "New pin"}</small>
          <h2>{props.notice ? "Edit family note" : "Add to the board"}</h2></div>
          <button type="button" onClick={props.onClose} aria-label="Close notice editor">×</button></header>

        {!props.notice ? <div className="notice-capture-actions">
          <button type="button" onClick={() => void takePhoto()} disabled={unavailable}><b>▣</b>Take a photo</button>
          <button type="button" className={voice.recording ? "is-recording" : ""}
            onClick={voice.recording ? voice.stop : () => void voice.start().catch(() => {
              setError("Microphone access was not available. You can still type the notice.");
            })} disabled={Boolean(processing)}><b>●</b>{voice.recording ? "Tap to finish" : "Speak"}</button>
          <button type="button" onClick={() => titleRef.current?.focus()} disabled={unavailable}><b>⌨</b>Type</button>
        </div> : null}

        {processing ? <div className="notice-processing" role="status">
          <span>{processing === "photo" ? "▣" : "●"}</span><div><strong>
            {processing === "photo" ? "Reading your photo" : "Preparing your voice note"}</strong>
          <small>Finding the useful details securely…</small></div></div> : null}
        {error ? <p className="notice-error" role="alert">{error}</p> : null}
        {!props.online ? <p className="notice-error" role="status">Connect to change this notice.</p> : null}

        <input ref={titleRef} className="notice-title-input" value={draft.title} maxLength={54}
          disabled={unavailable} required placeholder="What should everyone know?"
          onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
        <textarea value={draft.detail} maxLength={120} disabled={unavailable}
          placeholder="Add a short detail"
          onChange={(event) => setDraft((current) => ({ ...current, detail: event.target.value }))} />

        <div className="notice-selects">
          <label><span>Category</span><select value={draft.category} disabled={unavailable}
            onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as NoticeCategory }))}>
            {noticeCategories.slice(1).map((category) => <option key={category}>{category}</option>)}</select></label>
          <label><span>For</span><select value={draft.assignedTo} disabled={unavailable}
            onChange={(event) => setDraft((current) => ({ ...current, assignedTo: event.target.value }))}>
            {!props.assignees.includes(draft.assignedTo) ? <option>{draft.assignedTo}</option> : null}
            {props.assignees.map((assignee) => <option key={assignee}>{assignee}</option>)}</select></label>
          <label><span>When</span><select value={draft.due} disabled={unavailable}
            onChange={(event) => changeDue(event.target.value)}>
            {whenOptions.map((when) => <option value={when} key={when || "none"}>{when || "No date"}</option>)}</select></label>
        </div>

        {draft.due ? <fieldset className="notice-suggestions"><legend>Suggested actions</legend>
          <button type="button" className={linkReminder ? "is-active" : ""}
            onClick={() => setLinkReminder((current) => !current)}>◷ {linkReminder ? "Reminder on" : "Add reminder"}</button>
          <button type="button" className={linkCalendar ? "is-active" : ""}
            disabled={!resolveNoticeDate(draft.due)} onClick={() => setLinkCalendar((current) => !current)}>
            ▦ {linkCalendar ? "Calendar on" : "Add to calendar"}</button>
        </fieldset> : null}

        <div className="notice-state-actions">
          <button type="button" className={draft.completed ? "is-active" : ""}
            onClick={() => setDraft((current) => ({ ...current, completed: !current.completed }))}>✓ {draft.completed ? "Completed" : "Complete"}</button>
          <button type="button" className={draft.pinned ? "is-pinned" : ""}
            onClick={() => setDraft((current) => ({ ...current, pinned: !current.pinned }))}>★ {draft.pinned ? "Pinned" : "Pin note"}</button>
          {props.notice ? <button type="button" onClick={() => {
            if (props.notice) props.onArchive(props.notice);
          }}>▣ Archive</button> : null}
        </div>
        <button className="notice-save" type="submit" disabled={!draft.title.trim() || unavailable}>
          {props.notice ? "Save changes" : "Pin to noticeboard"}</button>
      </form>
    </div>
  );
}
