import Link from "next/link";
import { useState, type FormEvent } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { ModalShell } from "@/components/ModalShell";

import { healthContactName } from "./bedroom-section-model";
import { HealthField } from "./BedroomSectionUi";

export function useHealthProfileEditor(onMessage: (message: string) => void) {
  const { state, updateState } = useDiaryDockData();
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(state.health.profile);

  const begin = () => {
    setProfile(state.health.profile);
    setEditing(true);
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    const reviewedAt = new Date().toISOString().slice(0, 10);
    updateState((current) => ({
      ...current,
      health: {
        ...current.health,
        profile: { ...profile, lastReviewedAt: reviewedAt },
        updatedAt: new Date().toISOString(),
      },
    }));
    setEditing(false);
    onMessage(
      "Health Profile saved. DiaryDock has not medically verified these details.",
    );
  };
  return { begin, editing, profile, save, setEditing, setProfile, state };
}

export type HealthProfileEditorController = ReturnType<
  typeof useHealthProfileEditor
>;

export function HealthProfileEditor({
  editor,
  emergencyOnly,
}: {
  editor: HealthProfileEditorController;
  emergencyOnly: boolean;
}) {
  const contacts = editor.state.professionalContacts.contacts;
  const selectable = contacts.filter(
    (contact) =>
      contact.category === "Healthcare" ||
      contact.isEmergencyContact ||
      [
        editor.profile.gpContactId,
        editor.profile.pharmacyContactId,
        editor.profile.emergencyContactId,
      ].includes(contact.id),
  );
  const options = selectable.map((contact) => (
    <option key={contact.id} value={contact.id}>
      {healthContactName(contact)}
      {contact.role ? ` — ${contact.role}` : ""}
    </option>
  ));

  return (
    <ModalShell
      open={editor.editing}
      title={
        emergencyOnly ? "Edit emergency information" : "Edit Health Profile"
      }
      subtitle="Enter only information you have checked. DiaryDock will not verify or interpret it."
      onClose={() => editor.setEditing(false)}
    >
      <form onSubmit={editor.save} className="space-y-4">
        {!emergencyOnly ? (
          <HealthField label="Blood group (optional)">
            <input
              value={editor.profile.bloodGroup}
              onChange={(event) =>
                editor.setProfile({
                  ...editor.profile,
                  bloodGroup: event.target.value,
                })
              }
              className="form-control"
              placeholder="Only if known"
            />
          </HealthField>
        ) : null}
        <ContactSelect
          label="GP or practice"
          value={editor.profile.gpContactId}
          options={options}
          onChange={(value) =>
            editor.setProfile({ ...editor.profile, gpContactId: value })
          }
        />
        <ContactSelect
          label="Pharmacy"
          value={editor.profile.pharmacyContactId}
          options={options}
          onChange={(value) =>
            editor.setProfile({ ...editor.profile, pharmacyContactId: value })
          }
        />
        <ContactSelect
          label="Emergency contact"
          value={editor.profile.emergencyContactId}
          options={options}
          onChange={(value) =>
            editor.setProfile({ ...editor.profile, emergencyContactId: value })
          }
        />
        <HealthField label="Emergency notes">
          <textarea
            value={editor.profile.emergencyNotes}
            onChange={(event) =>
              editor.setProfile({
                ...editor.profile,
                emergencyNotes: event.target.value,
              })
            }
            className="form-control min-h-28 resize-y"
            placeholder="Information you want available in an emergency"
          />
        </HealthField>
        {!selectable.length ? (
          <p className="rounded-2xl bg-[#f7f5ef] p-3 text-[11px] leading-5 text-[#667068]">
            No suitable contacts are available yet. Add one through Professional
            Contacts, then return here to link it.
          </p>
        ) : null}
        <div className="flex gap-2">
          <button
            type="submit"
            className="min-h-12 flex-1 rounded-2xl bg-[#315443] px-5 text-sm font-semibold text-white"
          >
            Save checked details
          </button>
          <Link
            href="/office/contacts/new"
            className="inline-flex min-h-12 items-center rounded-2xl border border-[#315443]/20 px-4 text-xs font-semibold"
          >
            Add contact
          </Link>
        </div>
      </form>
    </ModalShell>
  );
}

function ContactSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: React.ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <HealthField label={label}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="form-control"
      >
        <option value="">Not linked</option>
        {options}
      </select>
    </HealthField>
  );
}
