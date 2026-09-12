"use client";

import { useEffect, useRef, useState } from "react";
import { inspectDocumentBytes } from "@diarydock/documents";
import { emptyAppointment, parseAppointmentDraft, appointmentSchedule, type AppointmentDraft } from "../../lib/appointments/model.ts";
import { AppointmentLetterUpload, appointmentRequest, readAppointmentLetter,
  type AppointmentConnection, type AppointmentSave } from "../../lib/appointments/client.ts";
import { downloadAppointmentCalendar } from "../../lib/appointments/calendar.ts";
import { AppointmentFields } from "./AppointmentFields";
import "./appointments.css";

type Props = {
  connection: AppointmentConnection; native?: boolean;
  onClose: () => void; onSaved: () => Promise<unknown>;
  prepareNotifications?: () => Promise<boolean>;
  notifyLocally?: (id: string, draft: AppointmentDraft, offset: number | null) => Promise<void>;
  addToCalendar?: (id: string, draft: AppointmentDraft, offset: number | null) => Promise<void>;
};

export function AppointmentLetterDialog(props: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [draft, setDraft] = useState(emptyAppointment);
  const [reasons, setReasons] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [review, setReview] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [consent, setConsent] = useState(false);
  const [offset, setOffset] = useState<number | null>(1440);
  const [notify, setNotify] = useState(true);
  const [calendar, setCalendar] = useState(true);
  const [saved, setSaved] = useState(false);
  const [calendarDone, setCalendarDone] = useState(false);
  const [noticeDone, setNoticeDone] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const locked = useRef(false);
  const upload = useRef<AppointmentLetterUpload | null>(null);
  const submission = useRef<AppointmentSave | null>(null);
  const remoteNotices = useRef(false);
  const queuedCount = useRef(0);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function choose(incoming?: File) {
    if (!incoming) return;
    setMessage("");
    if (!incoming.size || incoming.size > 4 * 1024 * 1024
      || !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(incoming.type)) {
      setMessage("Choose a PDF, JPG, PNG or WebP letter under 4 MB."); return;
    }
    const inspection = inspectDocumentBytes({ declaredMimeType: incoming.type, bytes: new Uint8Array(await incoming.arrayBuffer()) });
    if (!inspection.ok) { setMessage(inspection.error); return; }
    upload.current = new AppointmentLetterUpload(crypto.randomUUID());
    submission.current = null;
    setSubmitted(false);
    setConsent(false);
    setFile(incoming); setDraft(emptyAppointment); setReview(false); setReasons([]); setConfirmed(false);
  }

  async function read() {
    if (!file || !consent || locked.current) return;
    locked.current = true; setBusy(true); setMessage("");
    try {
      const result = await readAppointmentLetter(props.connection, file, consent);
      const { reviewReasons, ...fields } = result;
      setDraft({ ...emptyAppointment, ...fields }); setReasons(reviewReasons); setReview(true); setConfirmed(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "The letter could not be read."); }
    finally { locked.current = false; setBusy(false); }
  }

  async function finishOptions(input: AppointmentSave) {
    const messages = ["Appointment and letter saved in your private health area."];
    if (input.notify && !noticeDone) {
      if (queuedCount.current > 0) { setNoticeDone(true); messages.push("Phone alerts queued."); }
      else if (props.notifyLocally) {
        try { await props.notifyLocally(input.id, input.draft, input.reminderMinutes); setNoticeDone(true); messages.push("Phone alerts scheduled on this device."); }
        catch { messages.push("Phone alerts could not be enabled. Allow notifications in your phone settings, then retry."); }
      } else messages.push("No phone is connected for alerts. Enable appointment notifications in the DiaryDock phone app.");
    }
    if (calendar && !calendarDone) {
      try {
        if (props.addToCalendar) await props.addToCalendar(input.id, input.draft, input.reminderMinutes);
        else downloadAppointmentCalendar(input.id, input.draft, input.reminderMinutes);
        setCalendarDone(true);
        messages.push(props.native ? "Added to your phone calendar." : "Calendar file downloaded. Open it in your calendar to finish adding the event.");
      } catch { messages.push("Calendar access was unavailable. Allow calendar access, then retry."); }
    }
    setMessage(messages.join(" "));
  }

  async function save() {
    if (!file || !confirmed || locked.current) return;
    locked.current = true; setBusy(true); setMessage("");
    try {
      if (!submission.current) {
        const checked = parseAppointmentDraft(draft);
        const schedule = appointmentSchedule(checked, offset);
        if (Date.parse(schedule.startAt) <= Date.now()) throw new Error("This appointment is in the past. Check the date before saving.");
        if (schedule.remindAt && Date.parse(schedule.remindAt) <= Date.now()) throw new Error("That reminder time has passed. Choose a reminder closer to the appointment.");
        remoteNotices.current = notify && props.prepareNotifications ? await props.prepareNotifications().catch(() => false) : notify;
        submission.current = { id: crypto.randomUUID(), documentId: upload.current!.documentId,
          createdAt: new Date().toISOString(), draft: checked, reminderMinutes: offset, notify, confirmed: true };
        setSubmitted(true);
      }
      const input = submission.current;
      await upload.current!.save(props.connection, file, input.draft);
      if (!saved) {
        const result = await appointmentRequest(props.connection, "/api/appointments", { ...input, notify: remoteNotices.current });
        if (result.id !== input.id) throw new Error("Appointment confirmation was invalid. Please retry.");
        queuedCount.current = Number(result.notificationsQueued) || 0;
        setSaved(true);
      }
      await finishOptions(input);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save the appointment. Please retry."); }
    finally { locked.current = false; setBusy(false); }
  }

  async function close() {
    if (busy) return;
    if (saved) await props.onSaved().catch(() => undefined);
    props.onClose();
  }

  return <dialog ref={dialog} className="appointment-dialog" aria-labelledby="appointment-dialog-title"
    onCancel={(event) => { event.preventDefault(); void close(); }}>
    <header><div><p>Private health area</p><h2 id="appointment-dialog-title">Appointment from a letter</h2></div>
      <button type="button" aria-label="Close appointment letter" disabled={busy} onClick={() => void close()}>×</button></header>
    {!saved && <p>Upload the letter, check the details and save your appointment.</p>}
    <fieldset disabled={busy || saved || submitted}>
      <label><span>Appointment letter</span><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp"
        onChange={(event) => void choose(event.target.files?.[0]).catch(() => setMessage("This file could not be opened."))} /></label>
      {file && <>
        <a href={preview} target="_blank" rel="noreferrer">View original letter: {file.name}</a>
        <label className="appointment-check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>Send this letter to OpenAI to read the appointment details. It may contain health information.</span></label>
        <div className="appointment-actions"><button type="button" disabled={!consent} onClick={() => void read()}>Read letter</button>
          <button type="button" onClick={() => setReview(true)}>Enter details myself</button></div>
      </>}
      {review && <>
        <p>Check every detail against the letter. Nothing is saved until you confirm.</p>
        {reasons.length > 0 && <ul className="appointment-review">{reasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul>}
        <AppointmentFields draft={draft} onChange={(next) => { setDraft(next); setConfirmed(false); }} />
        <label><span>Remind me</span><select value={offset ?? "none"} onChange={(e) => setOffset(e.target.value === "none" ? null : Number(e.target.value))}>
          <option value="none">No reminder</option><option value={0}>At the appointment time</option>
          <option value={15}>15 minutes before</option><option value={60}>1 hour before</option>
          <option value={1440}>1 day before</option><option value={2880}>2 days before</option><option value={10080}>1 week before</option>
        </select></label>
        <label className="appointment-check"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /><span>Send phone alerts</span></label>
        <label className="appointment-check"><input type="checkbox" checked={calendar} onChange={(e) => setCalendar(e.target.checked)} />
          <span>{props.native ? "Add to phone calendar" : "Download a calendar event"}</span></label>
        <p className="appointment-hint">Calendar entries include the title, time and location. The letter and preparation notes stay in DiaryDock. Later edits are not automatically synced to your calendar.</p>
        <label className="appointment-check"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          <span>I have checked the appointment details against the letter.</span></label>
      </>}
    </fieldset>
    {message && <p role="status" className="appointment-status">{message}</p>}
    <footer><button type="button" disabled={busy} onClick={() => void close()}>{saved ? "Done" : "Cancel"}</button>
      {review && (!saved || (calendar && !calendarDone) || (notify && !noticeDone && props.native)) &&
        <button type="button" disabled={!confirmed || busy} onClick={() => void save()}>
          {busy ? "Working…" : saved ? "Retry phone options" : submitted ? "Retry save" : "Confirm and save"}
        </button>}
    </footer>
  </dialog>;
}
