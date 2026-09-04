"use client";

import { useState } from "react";

import {
  BillsCard,
  BillsHeader,
  BillsSectionTitle,
  BillsShell,
  fieldClass,
} from "@/components/bills/BillsUi";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import type { Reminder } from "@/lib/mock-data";
import type { ProfessionalContactMeeting } from "@/lib/professional-contact-records";
import { upsertStructuredReminder } from "@/lib/structured-data";

import {
  ContactsNotice,
  contactDateTime,
  formatContactDate,
  fullContactName,
} from "./contacts-shared";

function MeetingRows({
  meetings,
  updateMeeting,
}: {
  meetings: ProfessionalContactMeeting[];
  updateMeeting: (id: string, completed: boolean) => void;
}) {
  if (!meetings.length)
    return (
      <p className="rounded-[14px] bg-[#f7f7f1] px-3 py-4 text-center text-xs text-[#667068]">
        None recorded.
      </p>
    );
  return meetings.map((meeting) => (
    <label
      key={meeting.id}
      className="flex min-h-[66px] items-center gap-3 rounded-[16px] bg-[#f7f7f1] px-3"
    >
      <input
        type="checkbox"
        checked={meeting.completed}
        onChange={(event) => updateMeeting(meeting.id, event.target.checked)}
        className="h-4 w-4 accent-[#45604d]"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[#20352a]">
          {meeting.title}
        </span>
        <span className="mt-0.5 block text-[11px] text-[#667068]">
          {formatContactDate(meeting.date)}
          {meeting.time ? ` · ${meeting.time}` : ""}
        </span>
      </span>
    </label>
  ));
}

export function ContactMeetings({ contactId }: { contactId: string }) {
  const { state, updateState } = useDiaryDockData();
  const contact = state.professionalContacts.contacts.find(
    (item) => item.id === contactId,
  );
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  if (!contact)
    return (
      <BillsShell>
        <BillsHeader
          title="Contact Not Found"
          subtitle="This contact is not available."
          backHref="/office/contacts"
        />
      </BillsShell>
    );
  const upcoming = [...contact.meetings]
    .filter(
      (meeting) =>
        !meeting.completed &&
        contactDateTime(meeting.date, meeting.time) >= Date.now(),
    )
    .sort(
      (a, b) =>
        contactDateTime(a.date, a.time) - contactDateTime(b.date, b.time),
    );
  const history = [...contact.meetings]
    .filter(
      (meeting) =>
        meeting.completed ||
        contactDateTime(meeting.date, meeting.time) < Date.now(),
    )
    .sort(
      (a, b) =>
        contactDateTime(b.date, b.time) - contactDateTime(a.date, a.time),
    );
  const updateMeeting = (meetingId: string, completed: boolean) =>
    updateState((current) => ({
      ...current,
      professionalContacts: {
        contacts: current.professionalContacts.contacts.map((item) =>
          item.id === contact.id
            ? {
                ...item,
                meetings: item.meetings.map((meeting) =>
                  meeting.id === meetingId
                    ? { ...meeting, completed }
                    : meeting,
                ),
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      },
    }));
  const addMeeting = async () => {
    if (!title.trim() || !date) {
      setMessage("Add a meeting title and date.");
      return;
    }
    const now = new Date().toISOString();
    const meeting: ProfessionalContactMeeting = {
      id: crypto.randomUUID(),
      title: title.trim(),
      date,
      time,
      notes: notes.trim(),
      completed: false,
      createdAt: now,
    };
    const reminder: Reminder = {
      id: `contact-meeting-${meeting.id}`,
      title: `${meeting.title} · ${fullContactName(contact)}`,
      note:
        meeting.notes ||
        `${contact.role || contact.category}${contact.company ? ` at ${contact.company}` : ""}`,
      roomId: "office",
      roomName: "Office",
      group: "later",
      timeLabel: `${formatContactDate(date)}${time ? `, ${time}` : ""}`,
      priority: "normal",
      dueDate: date,
    };
    updateState((current) => ({
      ...current,
      reminders: [reminder, ...current.reminders],
      professionalContacts: {
        contacts: current.professionalContacts.contacts.map((item) =>
          item.id === contact.id
            ? { ...item, meetings: [meeting, ...item.meetings], updatedAt: now }
            : item,
        ),
      },
    }));
    await upsertStructuredReminder(reminder);
    setTitle("");
    setDate("");
    setTime("");
    setNotes("");
    setMessage("Meeting and reminder added.");
  };
  return (
    <BillsShell>
      <BillsHeader
        title="Meetings & Linked Information"
        subtitle={`Meetings, calls and review reminders for ${fullContactName(contact)}.`}
        backHref={`/office/contacts/${contact.id}`}
      />
      <BillsCard>
        <BillsSectionTitle
          icon="calendar"
          title="Add meeting or call"
          detail="A matching reminder will be added to DiaryDock"
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[#667068] sm:col-span-2">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={fieldClass}
              placeholder="Policy review, annual meeting…"
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Date
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Time
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068] sm:col-span-2">
            Notes
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void addMeeting()}
          className="mt-4 min-h-12 w-full rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
        >
          Add meeting and reminder
        </button>
        {message ? (
          <p
            role="status"
            className="mt-3 text-xs font-semibold text-[#52705a]"
          >
            {message}
          </p>
        ) : null}
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="calendar"
          title="Upcoming"
          detail={`${upcoming.length} meeting${upcoming.length === 1 ? "" : "s"}`}
        />
        <div className="mt-4 space-y-2">
          <MeetingRows meetings={upcoming} updateMeeting={updateMeeting} />
        </div>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="clock"
          title="Contact history"
          detail={`${history.length} completed or past item${history.length === 1 ? "" : "s"}`}
        />
        <div className="mt-4 space-y-2">
          <MeetingRows meetings={history} updateMeeting={updateMeeting} />
        </div>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="folder"
          title="Linked information"
          detail="Records connected to this professional"
        />
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-[14px] bg-[#f7f7f1] p-3">
            <p className="text-xl font-semibold text-[#20352a]">
              {contact.linkedDocumentIds.length}
            </p>
            <p className="text-[10px] text-[#667068]">Documents</p>
          </div>
          <div className="rounded-[14px] bg-[#f7f7f1] p-3">
            <p className="text-xl font-semibold text-[#20352a]">
              {contact.linkedPolicyIds.length +
                contact.linkedContractIds.length}
            </p>
            <p className="text-[10px] text-[#667068]">Policies & contracts</p>
          </div>
          <div className="col-span-2 rounded-[14px] bg-[#f7f7f1] p-3">
            <p className="text-xl font-semibold text-[#20352a]">
              {contact.linkedBillIds.length}
            </p>
            <p className="text-[10px] text-[#667068]">Bills & accounts</p>
          </div>
        </div>
      </BillsCard>
      <ContactsNotice />
    </BillsShell>
  );
}
