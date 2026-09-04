import { useState } from "react";

import type { OfficeContactMeeting, SaveOfficeContact } from "@diarydock/office";

import { formatOfficeDate } from "./office-bills-format";

export function ContactHistory({ draft, update }: {
  draft: SaveOfficeContact;
  update: <Key extends keyof SaveOfficeContact>(key: Key, value: SaveOfficeContact[Key]) => void;
}) {
  const [note, setNote] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");

  function addNote() {
    if (!note.trim() || draft.contactNotes.length >= 100) return;
    update("contactNotes", [{
      id: crypto.randomUUID(), note: note.trim(), createdAt: new Date().toISOString(),
    }, ...draft.contactNotes]);
    setNote("");
  }

  function addMeeting() {
    if (!title.trim() || !date || draft.meetings.length >= 100) return;
    const meeting: OfficeContactMeeting = {
      id: crypto.randomUUID(),
      title: title.trim(),
      date,
      time,
      notes: meetingNotes.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    update("meetings", [meeting, ...draft.meetings]);
    setTitle(""); setDate(""); setTime(""); setMeetingNotes("");
  }

  return <>
    <h3>Contact notes</h3>
    <div className="office-inline-entry"><input value={note} maxLength={2000}
      placeholder="Add a dated note…" onChange={(event) => setNote(event.target.value)} />
      <button type="button" onClick={addNote}>Add</button></div>
    <div className="office-task-list">{draft.contactNotes.map((item) =>
      <p className="office-response" key={item.id}><span>{item.note}</span>
        <small>{new Date(item.createdAt).toLocaleString("en-GB")}</small></p>)}</div>

    <h3>Meetings and calls</h3>
    <div className="office-form-grid">
      <label className="office-wide">Title<input value={title} maxLength={240}
        onChange={(event) => setTitle(event.target.value)} /></label>
      <label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      <label>Time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
      <label className="office-wide">Meeting notes<textarea rows={2} value={meetingNotes}
        maxLength={2000} onChange={(event) => setMeetingNotes(event.target.value)} /></label>
    </div>
    <button className="office-inline-button" type="button" onClick={addMeeting}>
      Add meeting and reminder
    </button>
    <div className="office-task-list">{draft.meetings.map((meeting) =>
      <label className="office-task" key={meeting.id}><input type="checkbox"
        checked={meeting.completed} onChange={(event) => update("meetings",
          draft.meetings.map((item) => item.id === meeting.id
            ? { ...item, completed: event.target.checked } : item))} />
        <span><strong>{meeting.title}</strong><small>
          {formatOfficeDate(meeting.date)}{meeting.time ? ` · ${meeting.time}` : ""}
        </small></span></label>)}</div>
  </>;
}
