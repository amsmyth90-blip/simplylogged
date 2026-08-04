"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";

import { BottomNav } from "@/components/BottomNav";
import { useLifeDockData } from "@/components/LifeDockDataProvider";
import { ModalShell } from "@/components/ModalShell";
import { UiIcon, type IconName } from "@/components/UiIcon";
import { healthProfileProgress, type BedroomSectionId, type HealthTimelineEvent } from "@/lib/health-records";
import type { Reminder, VaultDocument } from "@/lib/mock-data";
import { upsertStructuredReminder } from "@/lib/structured-data";

const sectionMeta: Record<BedroomSectionId, { title: string; description: string; icon: IconName }> = {
  "health-profile": { title: "Health Profile", description: "A clear summary of the health information you choose to record.", icon: "heart" },
  "medical-records": { title: "Medical Records", description: "Private letters, reports and medical documents stored through All Files.", icon: "folder" },
  medications: { title: "Medications & Prescriptions", description: "User-confirmed medicines, directions and review dates.", icon: "file" },
  appointments: { title: "Appointments", description: "Healthcare appointments, preparation and follow-up.", icon: "calendar" },
  tests: { title: "Tests & Results", description: "Test records and follow-up information you have entered or reviewed.", icon: "chart" },
  "health-timeline": { title: "Health Timeline", description: "A chronological view of the events you have recorded.", icon: "clock" },
  "dental-optical": { title: "Dental & Optical", description: "Dental visits, eye tests and future review dates.", icon: "sun" },
  emergency: { title: "Emergency Medical Info", description: "Important details prepared for an emergency. This is not an emergency service.", icon: "shield" },
  vaccinations: { title: "Vaccinations", description: "Vaccination dates and the records you choose to add.", icon: "check" },
  "family-health": { title: "Family Health", description: "Link existing family profiles without granting them access to your records.", icon: "users" },
  contacts: { title: "Healthcare Contacts", description: "Reuse people from your Professional Contacts directory.", icon: "phone" },
  "care-preferences": { title: "Care Preferences", description: "Private preferences in your own words. They are not advance medical instructions.", icon: "heart" },
  wellbeing: { title: "Sleep & Wellbeing", description: "Optional private notes about sleep and general wellbeing.", icon: "bed" },
  "medical-devices": { title: "Medical Devices", description: "Record device names, key dates and notes without creating clinical conclusions.", icon: "gear" },
  allergies: { title: "Allergies", description: "Allergies and reactions exactly as you choose to record them.", icon: "alert" },
  conditions: { title: "Conditions", description: "A personal list of current or past conditions.", icon: "file" },
  procedures: { title: "Operations & Procedures", description: "Key dates and notes for procedures you have recorded.", icon: "calendar" },
};

type Draft = {
  title: string; date: string; secondary: string; detail: string; notes: string; time: string; makeReminder: boolean;
};

const emptyDraft: Draft = { title: "", date: "", secondary: "", detail: "", notes: "", time: "", makeReminder: false };

const starterHealthDocumentIds = new Set(["v5", "v9", "v10", "bed-d1", "bed-d2", "bed-d3"]);

function genuineHealthDocuments(documents: VaultDocument[]) {
  return documents.filter((document) => !starterHealthDocumentIds.has(document.id) && (document.roomId === "bedroom" || document.category === "Health & Medical"));
}

function formatDate(value: string) {
  if (!value) return "Date not recorded";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[24px] border border-[#20352a]/[0.07] bg-white/92 p-4 shadow-[0_18px_42px_-34px_rgba(32,53,42,0.6)] ${className}`}>{children}</section>;
}

function EmptyState({ icon, title, detail, action }: { icon: IconName; title: string; detail: string; action?: ReactNode }) {
  return <div className="rounded-[20px] border border-dashed border-[#6f8e72]/25 bg-[#faf9f4] p-6 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e8eee3] text-[#52705a]"><UiIcon name={icon} className="h-5 w-5" /></span><h2 className="mt-3 font-serif text-xl text-[#20352a]">{title}</h2><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#667068]">{detail}</p>{action ? <div className="mt-4">{action}</div> : null}</div>;
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#315443] px-4 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"><UiIcon name="plus" className="h-4 w-4" />{label}</button>;
}

function RecordRow({ icon, title, meta, notes }: { icon: IconName; title: string; meta: string; notes?: string }) {
  return <div className="flex min-h-16 items-start gap-3 rounded-[18px] bg-[#f7f5ef] p-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-[#52705a]"><UiIcon name={icon} className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#20352a]">{title}</p><p className="mt-1 text-[10px] text-[#667068]">{meta}</p>{notes ? <p className="mt-2 text-xs leading-5 text-[#526057]">{notes}</p> : null}</div></div>;
}

function contactName(contact: { firstName: string; lastName: string; company: string }) {
  return `${contact.firstName} ${contact.lastName}`.trim() || contact.company || "Unnamed contact";
}

function HealthProfileSection({ emergencyOnly, onMessage }: { emergencyOnly: boolean; onMessage: (message: string) => void }) {
  const { state, updateState } = useLifeDockData();
  const health = state.health;
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(health.profile);
  const progress = healthProfileProgress(health);
  const contacts = state.professionalContacts.contacts;
  const selectableContacts = contacts.filter((contact) => contact.category === "Healthcare" || contact.isEmergencyContact || [profile.gpContactId, profile.pharmacyContactId, profile.emergencyContactId].includes(contact.id));
  const gp = contacts.find((contact) => contact.id === health.profile.gpContactId);
  const pharmacy = contacts.find((contact) => contact.id === health.profile.pharmacyContactId);
  const emergencyContact = contacts.find((contact) => contact.id === health.profile.emergencyContactId);
  const currentMedications = health.medications.filter((item) => item.status === "current");
  const currentConditions = health.conditions.filter((item) => item.status !== "past");
  const lastReviewed = health.profile.lastReviewedAt ? formatDate(health.profile.lastReviewedAt.slice(0, 10)) : "Not reviewed yet";

  function beginEditing() {
    setProfile(health.profile);
    setEditing(true);
  }

  function saveProfile(event: FormEvent) {
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
    onMessage("Health Profile saved. DiaryDock has not medically verified these details.");
  }

  function contactOptions() {
    return selectableContacts.map((contact) => <option key={contact.id} value={contact.id}>{contactName(contact)}{contact.role ? ` — ${contact.role}` : ""}</option>);
  }

  return <div className="space-y-4">
    <section className="overflow-hidden rounded-[28px] bg-[#315443] p-5 text-white shadow-[0_24px_55px_-35px_rgba(32,53,42,0.72)]">
      <div className="flex items-start gap-4">
        <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-[17px] bg-white/12 text-[#dce9d7] sm:flex"><UiIcon name={emergencyOnly ? "shield" : "heart"} className="h-6 w-6" /></span>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">{emergencyOnly ? "Emergency information" : "Your private summary"}</p><h2 className="mt-1 font-serif text-2xl">{emergencyOnly ? "Ready when it matters" : "Health Profile"}</h2><p className="mt-2 max-w-lg text-xs leading-5 text-white/72">{emergencyOnly ? "Keep the essential information you would want available in an emergency." : "A clear, user-maintained summary of the information you have chosen to record."}</p></div>
        <button type="button" onClick={beginEditing} className="min-h-11 shrink-0 rounded-full border border-white/20 bg-white/10 px-4 text-xs font-semibold text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Edit</button>
      </div>
      <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-4">
        <div><div className="flex justify-between text-[10px] text-white/70"><span>Profile organised</span><span>{progress.completed} of {progress.total}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/12"><span className="block h-full rounded-full bg-[#c6d8bd]" style={{ width: `${progress.percent}%` }} /></div></div>
        <span className="font-serif text-3xl">{progress.percent}%</span>
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 text-[10px] text-white/60"><UiIcon name="check" className="h-3.5 w-3.5" /><span>Last checked: {lastReviewed}</span></div>
    </section>

    <Card>
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6f8e72]">At a glance</p><h2 className="mt-1 font-serif text-2xl">Important information</h2></div><span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#e8eee3] text-[#52705a]"><UiIcon name="lock" className="h-4 w-4" /></span></div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <ProfileTile icon="heart" label="Blood group" value={health.profile.bloodGroup || "Not recorded"} />
        <ProfileTile icon="alert" label="Allergies" value={health.allergies.length ? `${health.allergies.length} recorded` : "None recorded"} href="/bedroom/allergies" />
        <ProfileTile icon="file" label="Current conditions" value={currentConditions.length ? `${currentConditions.length} recorded` : "None recorded"} href="/bedroom/conditions" />
        <ProfileTile icon="check" label="Current medicines" value={currentMedications.length ? `${currentMedications.length} recorded` : "None recorded"} href="/bedroom/medications" />
      </div>
      <p className="mt-3 text-[10px] leading-4 text-[#778078]">“None recorded” means nothing has been entered in DiaryDock; it is not a clinical statement.</p>
    </Card>

    <Card>
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6f8e72]">Care team</p><h2 className="mt-1 font-serif text-2xl">Contacts</h2></div><Link href="/bedroom/contacts" className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-[#52705a]">Manage</Link></div>
      <div className="mt-4 space-y-2">
        <ProfileContact label="GP or practice" contact={gp} icon="heart" />
        <ProfileContact label="Pharmacy" contact={pharmacy} icon="file" />
        <ProfileContact label="Emergency contact" contact={emergencyContact} icon="phone" />
      </div>
    </Card>

    {emergencyOnly ? <Card className="bg-[linear-gradient(135deg,#f4e9e5,#fffdf8)]"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-white text-[#765f58]"><UiIcon name="shield" className="h-5 w-5" /></span><div className="min-w-0"><h2 className="font-serif text-xl">Emergency notes</h2>{health.profile.emergencyNotes ? <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#5f625e]">{health.profile.emergencyNotes}</p> : <p className="mt-2 text-xs leading-5 text-[#667068]">No emergency notes have been recorded.</p>}</div></div></Card> : null}

    {!emergencyOnly ? <>
      <Card><ProfileListHeader eyebrow="Safety details" title="Allergies" href="/bedroom/allergies" actionLabel="Add or review" />{health.allergies.length ? <div className="mt-4 space-y-2">{health.allergies.slice(0, 3).map((item) => <div key={item.id} className="rounded-[18px] bg-[#f7e9e4] p-3"><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-[#6f433c]">{item.allergen}</p><span className="rounded-full bg-white/70 px-2 py-1 text-[9px] capitalize text-[#765f58]">{item.severity.replaceAll("-", " ")}</span></div><p className="mt-1 text-[10px] text-[#765f58]">{item.reaction || "Reaction not recorded"}</p></div>)}</div> : <MiniEmpty icon="alert" text="No allergies have been entered in DiaryDock." href="/bedroom/allergies?add=1" label="Add an allergy" />}</Card>
      <Card><ProfileListHeader eyebrow="Current records" title="Medications" href="/bedroom/medications" actionLabel="View all" />{currentMedications.length ? <div className="mt-4 space-y-2">{currentMedications.slice(0, 3).map((item) => <RecordRow key={item.id} icon="file" title={item.name} meta={[item.dose, item.frequency, item.reviewDate ? `Review ${formatDate(item.reviewDate)}` : ""].filter(Boolean).join(" · ")} notes={item.notes} />)}</div> : <MiniEmpty icon="file" text="No current medications have been entered." href="/bedroom/medications?add=1" label="Add medication" />}</Card>
      <Card><ProfileListHeader eyebrow="Personal history" title="Conditions" href="/bedroom/conditions" actionLabel="View all" />{currentConditions.length ? <div className="mt-4 space-y-2">{currentConditions.slice(0, 3).map((item) => <RecordRow key={item.id} icon="heart" title={item.name} meta={[item.status.replaceAll("-", " "), formatDate(item.recordedDate)].join(" · ")} notes={item.notes} />)}</div> : <MiniEmpty icon="heart" text="No current conditions have been entered." href="/bedroom/conditions?add=1" label="Add condition" />}</Card>
      <Card className="bg-[linear-gradient(135deg,#eef2e9,#fffdf8)]"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-white text-[#52705a]"><UiIcon name="folder" className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h2 className="font-serif text-xl">Supporting records</h2><p className="mt-1 text-xs leading-5 text-[#667068]">Letters and reports remain in the existing private document store.</p><div className="mt-3 flex flex-wrap gap-2"><Link href="/bedroom/medical-records" className="inline-flex min-h-11 items-center rounded-full bg-[#315443] px-4 text-xs font-semibold text-white">View medical records</Link><Link href="/capture?room=bedroom" className="inline-flex min-h-11 items-center rounded-full border border-[#315443]/20 bg-white px-4 text-xs font-semibold">Scan a record</Link></div></div></div></Card>
    </> : null}

    <ModalShell open={editing} title={emergencyOnly ? "Edit emergency information" : "Edit Health Profile"} subtitle="Enter only information you have checked. DiaryDock will not verify or interpret it." onClose={() => setEditing(false)}>
      <form onSubmit={saveProfile} className="space-y-4">
        {!emergencyOnly ? <Field label="Blood group (optional)"><input value={profile.bloodGroup} onChange={(event) => setProfile({ ...profile, bloodGroup: event.target.value })} className="form-control" placeholder="Only if known" /></Field> : null}
        <Field label="GP or practice"><select value={profile.gpContactId} onChange={(event) => setProfile({ ...profile, gpContactId: event.target.value })} className="form-control"><option value="">Not linked</option>{contactOptions()}</select></Field>
        <Field label="Pharmacy"><select value={profile.pharmacyContactId} onChange={(event) => setProfile({ ...profile, pharmacyContactId: event.target.value })} className="form-control"><option value="">Not linked</option>{contactOptions()}</select></Field>
        <Field label="Emergency contact"><select value={profile.emergencyContactId} onChange={(event) => setProfile({ ...profile, emergencyContactId: event.target.value })} className="form-control"><option value="">Not linked</option>{contactOptions()}</select></Field>
        <Field label="Emergency notes"><textarea value={profile.emergencyNotes} onChange={(event) => setProfile({ ...profile, emergencyNotes: event.target.value })} className="form-control min-h-28 resize-y" placeholder="Information you want available in an emergency" /></Field>
        {!selectableContacts.length ? <p className="rounded-2xl bg-[#f7f5ef] p-3 text-[11px] leading-5 text-[#667068]">No suitable contacts are available yet. Add one through Professional Contacts, then return here to link it.</p> : null}
        <div className="flex gap-2"><button type="submit" className="min-h-12 flex-1 rounded-2xl bg-[#315443] px-5 text-sm font-semibold text-white">Save checked details</button><Link href="/office/contacts/new" className="inline-flex min-h-12 items-center rounded-2xl border border-[#315443]/20 px-4 text-xs font-semibold">Add contact</Link></div>
      </form>
    </ModalShell>
  </div>;
}

function ProfileTile({ icon, label, value, href }: { icon: IconName; label: string; value: string; href?: string }) {
  const content = <><span className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white text-[#52705a]"><UiIcon name={icon} className="h-4 w-4" /></span><span className="mt-3 block text-[9px] font-semibold uppercase tracking-wide text-[#7b847d]">{label}</span><span className="mt-1 block text-xs font-semibold text-[#20352a]">{value}</span></>;
  return href ? <Link href={href} className="min-h-[112px] rounded-[18px] bg-[#f7f5ef] p-3 transition hover:bg-[#eef2e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">{content}</Link> : <div className="min-h-[112px] rounded-[18px] bg-[#f7f5ef] p-3">{content}</div>;
}

function ProfileContact({ label, contact, icon }: { label: string; contact: { id: string; firstName: string; lastName: string; company: string; role: string; phone: string; email: string } | undefined; icon: IconName }) {
  const content = <><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-[#52705a]"><UiIcon name={icon} className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-[9px] font-semibold uppercase tracking-wide text-[#7b847d]">{label}</span><span className="mt-1 block truncate text-sm font-semibold text-[#20352a]">{contact ? contactName(contact) : "Not linked"}</span>{contact ? <span className="mt-1 block truncate text-[10px] text-[#667068]">{[contact.role, contact.company, contact.phone || contact.email].filter(Boolean).join(" · ")}</span> : <span className="mt-1 block text-[10px] text-[#667068]">Choose Edit to link a contact</span>}</span>{contact ? <UiIcon name="chevron-right" className="h-4 w-4 text-[#7b847d]" /> : null}</>;
  return contact ? <Link href={`/office/contacts/${contact.id}`} className="flex min-h-16 items-center gap-3 rounded-[18px] bg-[#f7f5ef] p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">{content}</Link> : <div className="flex min-h-16 items-center gap-3 rounded-[18px] bg-[#f7f5ef] p-3">{content}</div>;
}

function ProfileListHeader({ eyebrow, title, href, actionLabel }: { eyebrow: string; title: string; href: string; actionLabel: string }) {
  return <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6f8e72]">{eyebrow}</p><h2 className="mt-1 font-serif text-2xl">{title}</h2></div><Link href={href} className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-[#52705a]">{actionLabel}</Link></div>;
}

function MiniEmpty({ icon, text, href, label }: { icon: IconName; text: string; href: string; label: string }) {
  return <div className="mt-4 flex items-center gap-3 rounded-[18px] border border-dashed border-[#6f8e72]/25 bg-[#faf9f4] p-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#e8eee3] text-[#52705a]"><UiIcon name={icon} className="h-4 w-4" /></span><p className="min-w-0 flex-1 text-[11px] leading-5 text-[#667068]">{text}</p><Link href={href} className="inline-flex min-h-11 items-center rounded-full bg-white px-3 text-[10px] font-semibold text-[#52705a] shadow-sm">{label}</Link></div>;
}

export function BedroomSectionWorkspace({ section, initiallyAdding = false }: { section: BedroomSectionId; initiallyAdding?: boolean }) {
  const { state, hydrated, repositoryMode, updateState } = useLifeDockData();
  const [adding, setAdding] = useState(initiallyAdding);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [message, setMessage] = useState("");
  const meta = sectionMeta[section];
  const health = state.health;
  const contacts = state.professionalContacts.contacts;
  const healthContacts = contacts.filter((contact) => contact.category === "Healthcare" || [health.profile.gpContactId, health.profile.pharmacyContactId, health.profile.emergencyContactId].includes(contact.id));
  const documents = genuineHealthDocuments(state.vaultDocuments);

  const addable = ["medications", "appointments", "tests", "health-timeline", "dental-optical", "vaccinations", "wellbeing", "medical-devices", "allergies", "conditions", "procedures"].includes(section);

  async function saveRecord(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) { setMessage("Add a name or title before saving."); return; }
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const title = draft.title.trim();
    const timelineType: HealthTimelineEvent["type"] = section === "appointments" ? "appointment" : section === "medications" ? "medication" : section === "tests" ? "test" : section === "vaccinations" ? "vaccination" : section === "conditions" ? "condition" : section === "procedures" ? "procedure" : "other";
    let reminder: Reminder | undefined;
    if (section === "appointments" && draft.makeReminder && draft.date) {
      reminder = { id: crypto.randomUUID(), title, note: draft.notes || "Healthcare appointment added from My Health.", roomId: "bedroom", roomName: "Bedroom", group: "later", timeLabel: `${formatDate(draft.date)}${draft.time ? `, ${draft.time}` : ""}`, priority: "normal", dueDate: draft.date };
    }
    updateState((current) => {
      const next = { ...current.health, updatedAt: now };
      if (section === "medications") next.medications = [{ id, name: title, dose: draft.secondary, frequency: draft.detail, prescriber: "", status: "current", reviewDate: draft.date, reminderId: reminder?.id, notes: draft.notes, createdAt: now }, ...next.medications];
      if (section === "appointments") next.appointments = [{ id, title, provider: draft.secondary, location: draft.detail, date: draft.date, time: draft.time, status: "planned", preparationNotes: draft.notes, followUpNotes: "", reminderId: reminder?.id, createdAt: now }, ...next.appointments];
      if (section === "tests") next.tests = [{ id, title, provider: draft.secondary, date: draft.date, followUpStatus: "not-recorded", notes: draft.notes, createdAt: now }, ...next.tests];
      if (section === "vaccinations") next.vaccinations = [{ id, name: title, provider: draft.secondary, date: draft.date, nextDate: draft.detail, notes: draft.notes, createdAt: now }, ...next.vaccinations];
      if (section === "dental-optical") next.dentalOptical = [{ id, type: draft.detail === "optical" ? "optical" : "dental", title, provider: draft.secondary, date: draft.date, nextReviewDate: "", notes: draft.notes, createdAt: now }, ...next.dentalOptical];
      if (section === "wellbeing") next.wellbeing = [{ id, title, date: draft.date, sleepHours: draft.secondary ? Number(draft.secondary) : undefined, notes: draft.notes, createdAt: now }, ...next.wellbeing];
      if (section === "allergies") next.allergies = [{ id, allergen: title, reaction: draft.secondary, severity: draft.detail === "mild" || draft.detail === "moderate" || draft.detail === "severe-user-recorded" ? draft.detail : "not-recorded", notes: draft.notes, createdAt: now }, ...next.allergies];
      if (section === "conditions") next.conditions = [{ id, name: title, recordedDate: draft.date, status: draft.detail === "past" ? "past" : draft.detail === "current" ? "current" : "not-set", notes: draft.notes, createdAt: now }, ...next.conditions];
      const standaloneTimeline = ["health-timeline", "medical-devices", "procedures"].includes(section);
      if (standaloneTimeline) next.timeline = [{ id, type: timelineType, title, date: draft.date, notes: [draft.secondary, draft.detail, draft.notes].filter(Boolean).join(" · "), createdAt: now }, ...next.timeline];
      else next.timeline = [{ id: crypto.randomUUID(), type: timelineType, title, date: draft.date, notes: draft.notes, linkedRecordId: id, createdAt: now }, ...next.timeline];
      return { ...current, health: next, reminders: reminder ? [reminder, ...current.reminders] : current.reminders };
    });
    if (reminder && repositoryMode === "supabase") await upsertStructuredReminder(reminder);
    setDraft(emptyDraft); setAdding(false); setMessage("Saved to your private health area.");
  }

  if (!hydrated) return <main className="min-h-screen bg-[#f5f2ea] p-4"><div className="mx-auto max-w-[760px] animate-pulse space-y-4"><div className="h-36 rounded-[28px] bg-white/70" /><div className="h-72 rounded-[24px] bg-white/70" /></div></main>;

  return <main className="min-h-screen bg-[#f5f2ea] pb-32 text-[#20352a]">
    <div className="mx-auto max-w-[760px] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
      <header className="rounded-[28px] border border-white/80 bg-[#fffdf8]/95 p-5 shadow-[0_24px_55px_-42px_rgba(32,53,42,0.6)]">
        <div className="flex items-start gap-3"><Link href="/bedroom" aria-label="Back to My Health" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#20352a]/10 bg-white"><UiIcon name="arrow-left" className="h-5 w-5" /></Link><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">Bedroom · My Health</p><h1 className="mt-1 font-serif text-[28px] leading-tight sm:text-4xl">{meta.title}</h1><p className="mt-2 text-sm leading-6 text-[#667068]">{meta.description}</p></div><span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[#e8eee3] text-[#52705a] sm:flex"><UiIcon name={meta.icon} className="h-5 w-5" /></span></div>
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#eef2e9] px-3 py-2 text-[11px] text-[#48604e]"><UiIcon name="lock" className="h-4 w-4" /><span>Private health information. Sharing is never implied by linking a profile or contact.</span></div>
      </header>
      {message ? <p role="status" className="mt-4 rounded-2xl bg-[#e8eee3] px-4 py-3 text-xs text-[#48604e]">{message}</p> : null}
      <div className="mt-5">{renderSection()}</div>
      <p className="mt-5 rounded-2xl border border-[#20352a]/[0.07] bg-white/70 p-4 text-[11px] leading-5 text-[#667068]">DiaryDock organises information you provide. It does not diagnose conditions, verify medical accuracy, provide medical advice or replace emergency services.</p>
    </div>
    <ModalShell open={adding && addable} title={`Add to ${meta.title}`} subtitle="Enter only information you are comfortable recording. Check it against your source before relying on it." onClose={() => setAdding(false)}>
      <form onSubmit={saveRecord} className="space-y-4">
        <Field label={section === "allergies" ? "Allergen" : section === "medications" ? "Medication name" : "Name or title"}><input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="form-control" /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label={section === "medications" ? "Dose" : section === "wellbeing" ? "Sleep hours (optional)" : "Provider or detail"}><input value={draft.secondary} inputMode={section === "wellbeing" ? "decimal" : undefined} onChange={(event) => setDraft({ ...draft, secondary: event.target.value })} className="form-control" /></Field><Field label={section === "appointments" ? "Location" : section === "medications" ? "Frequency" : section === "allergies" ? "Severity" : section === "conditions" ? "Status" : section === "dental-optical" ? "Type (dental or optical)" : section === "vaccinations" ? "Next date (optional)" : "Additional detail"}><input value={draft.detail} onChange={(event) => setDraft({ ...draft, detail: event.target.value })} className="form-control" /></Field></div>
        <div className="grid gap-4 sm:grid-cols-2"><Field label={section === "medications" ? "Review date" : "Date"}><input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} className="form-control" /></Field>{section === "appointments" ? <Field label="Time"><input type="time" value={draft.time} onChange={(event) => setDraft({ ...draft, time: event.target.value })} className="form-control" /></Field> : null}</div>
        <Field label="Notes"><textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className="form-control min-h-24 resize-y" /></Field>
        {section === "appointments" ? <label className="flex min-h-12 items-center gap-3 rounded-2xl bg-[#f7f5ef] px-3 text-xs"><input type="checkbox" checked={draft.makeReminder} onChange={(event) => setDraft({ ...draft, makeReminder: event.target.checked })} className="h-4 w-4" /><span>Create a Reminder after I save this appointment</span></label> : null}
        {message ? <p className="text-xs text-[#8a5149]">{message}</p> : null}<button type="submit" className="min-h-12 w-full rounded-2xl bg-[#315443] text-sm font-semibold text-white">Save checked information</button>
      </form>
    </ModalShell>
    <BottomNav />
  </main>;

  function renderSection() {
    if (section === "health-profile" || section === "emergency") return <HealthProfileSection emergencyOnly={section === "emergency"} onMessage={setMessage} />;
    if (section === "medical-records") return <Card><div className="flex items-start justify-between gap-3"><div><h2 className="font-serif text-2xl">Your private files</h2><p className="mt-1 text-xs text-[#667068]">Uploaded through the same protected document flow as All Files.</p></div><Link href="/capture?room=bedroom" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#315443] px-4 text-xs font-semibold text-white"><UiIcon name="camera" className="h-4 w-4" />Scan</Link></div><div className="mt-4 space-y-2">{documents.length ? documents.map((document) => <Link key={document.id} href={`/document/${document.id}?from=bedroom`} className="flex min-h-16 items-center gap-3 rounded-[18px] bg-[#f7f5ef] p-3"><span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white text-[#52705a]"><UiIcon name="lock" className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{document.title}</span><span className="mt-1 block text-[10px] text-[#667068]">{document.kind} · {document.updated} · {document.reviewStatus === "needs-review" ? "Check details" : "Reviewed"}</span></span><UiIcon name="chevron-right" className="h-4 w-4 text-[#7b847d]" /></Link>) : <EmptyState icon="folder" title="No medical documents uploaded" detail="Scan or upload a document when you are ready. If reading fails, the original can still be stored privately for you to review." action={<Link href="/capture?room=bedroom" className="inline-flex min-h-11 items-center rounded-full bg-[#315443] px-4 text-xs font-semibold text-white">Add a document</Link>} />}</div></Card>;
    if (section === "family-health") return <FamilyHealth />;
    if (section === "contacts") return <Contacts />;
    if (section === "care-preferences") return <CarePreferences />;
    const records = getRecords();
    return <Card><div className="flex items-start justify-between gap-3"><div><h2 className="font-serif text-2xl">{meta.title}</h2><p className="mt-1 text-xs text-[#667068]">{records.length ? `${records.length} record${records.length === 1 ? "" : "s"}` : "Nothing recorded yet"}</p></div>{addable ? <AddButton onClick={() => { setMessage(""); setAdding(true); }} label="Add" /> : null}</div><div className="mt-4 space-y-2">{records.length ? records.map((record) => <RecordRow key={record.id} icon={record.icon} title={record.title} meta={record.meta} notes={record.notes} />) : <EmptyState icon={meta.icon} title={`No ${meta.title.toLowerCase()} yet`} detail="This area begins empty so DiaryDock never invents personal health information. Add a record only when you choose to." action={addable ? <AddButton onClick={() => setAdding(true)} label="Add first record" /> : undefined} />}</div></Card>;
  }

  function getRecords(): Array<{ id: string; icon: IconName; title: string; meta: string; notes?: string }> {
    if (section === "medications") return health.medications.map((item) => ({ id: item.id, icon: "file", title: item.name, meta: [item.dose, item.frequency, item.status, item.reviewDate ? `Review ${formatDate(item.reviewDate)}` : ""].filter(Boolean).join(" · "), notes: item.notes }));
    if (section === "appointments") return health.appointments.map((item) => ({ id: item.id, icon: "calendar", title: item.title, meta: [formatDate(item.date), item.time, item.provider, item.location, item.status].filter(Boolean).join(" · "), notes: item.preparationNotes || item.followUpNotes }));
    if (section === "tests") return health.tests.map((item) => ({ id: item.id, icon: "chart", title: item.title, meta: [formatDate(item.date), item.provider, `Follow-up ${item.followUpStatus}`].filter(Boolean).join(" · "), notes: item.notes }));
    if (section === "health-timeline" || section === "medical-devices" || section === "procedures") return [...health.timeline].filter((item) => section === "medical-devices" ? item.type === "other" : section === "procedures" ? item.type === "procedure" : true).sort((a, b) => b.date.localeCompare(a.date)).map((item) => ({ id: item.id, icon: "clock", title: item.title, meta: [formatDate(item.date), item.type].join(" · "), notes: item.notes }));
    if (section === "dental-optical") return health.dentalOptical.map((item) => ({ id: item.id, icon: "sun", title: item.title, meta: [item.type, formatDate(item.date), item.provider].filter(Boolean).join(" · "), notes: item.notes }));
    if (section === "vaccinations") return health.vaccinations.map((item) => ({ id: item.id, icon: "check", title: item.name, meta: [formatDate(item.date), item.provider, item.nextDate ? `Next ${formatDate(item.nextDate)}` : ""].filter(Boolean).join(" · "), notes: item.notes }));
    if (section === "wellbeing") return health.wellbeing.map((item) => ({ id: item.id, icon: "bed", title: item.title, meta: [formatDate(item.date), item.sleepHours !== undefined ? `${item.sleepHours} sleep hours recorded` : ""].filter(Boolean).join(" · "), notes: item.notes }));
    if (section === "allergies") return health.allergies.map((item) => ({ id: item.id, icon: "alert", title: item.allergen, meta: [item.reaction, item.severity.replaceAll("-", " ")].filter(Boolean).join(" · "), notes: item.notes }));
    if (section === "conditions") return health.conditions.map((item) => ({ id: item.id, icon: "file", title: item.name, meta: [item.status.replaceAll("-", " "), formatDate(item.recordedDate)].join(" · "), notes: item.notes }));
    return [];
  }

  function Contacts() { return <Card><div className="flex items-start justify-between gap-3"><div><h2 className="font-serif text-2xl">Healthcare directory</h2><p className="mt-1 text-xs text-[#667068]">These are reused from Professional Contacts, not duplicated.</p></div><Link href="/office/contacts/new" className="inline-flex min-h-11 items-center rounded-full bg-[#315443] px-4 text-xs font-semibold text-white">Add contact</Link></div><div className="mt-4 space-y-2">{healthContacts.length ? healthContacts.map((contact) => <Link key={contact.id} href={`/office/contacts/${contact.id}`} className="block rounded-[18px] bg-[#f7f5ef] p-3"><p className="text-sm font-semibold">{contactName(contact)}</p><p className="mt-1 text-[10px] text-[#667068]">{[contact.role, contact.company, contact.phone].filter(Boolean).join(" · ")}</p></Link>) : <EmptyState icon="phone" title="No healthcare contacts linked" detail="Create or categorise a Healthcare contact in the existing Professional Contacts directory." action={<Link href="/office/contacts/new" className="inline-flex min-h-11 items-center rounded-full bg-[#315443] px-4 text-xs font-semibold text-white">Add healthcare contact</Link>} />}</div></Card>; }

  function FamilyHealth() { return <Card><h2 className="font-serif text-2xl">Existing family profiles</h2><p className="mt-1 text-xs leading-5 text-[#667068]">Selecting a profile only organises your private view. It does not grant that person access to health information.</p><div className="mt-4 space-y-2">{state.householdMembers.map((member) => { const checked = health.familyMemberIds.includes(member.id); return <label key={member.id} className="flex min-h-14 items-center gap-3 rounded-[18px] bg-[#f7f5ef] px-3"><input type="checkbox" checked={checked} onChange={() => updateState((current) => ({ ...current, health: { ...current.health, familyMemberIds: checked ? current.health.familyMemberIds.filter((id) => id !== member.id) : [...current.health.familyMemberIds, member.id], updatedAt: new Date().toISOString() } }))} className="h-4 w-4" /><span className="flex-1 text-sm font-semibold">{member.name}</span><span className="text-[10px] text-[#667068]">{member.role}</span></label>; })}{!state.householdMembers.length ? <EmptyState icon="users" title="No family profiles available" detail="Create profiles in the existing Family Room first, then link them here." action={<Link href="/family/household" className="inline-flex min-h-11 items-center rounded-full bg-[#315443] px-4 text-xs font-semibold text-white">Open Family profiles</Link>} /> : null}</div></Card>; }

  function CarePreferences() { const [value, setValue] = useState(health.carePreferences); return <Card><h2 className="font-serif text-2xl">Your own words</h2><p className="mt-1 text-xs leading-5 text-[#667068]">This private note does not replace a legally reviewed advance decision, power of attorney or instructions from a clinician.</p><textarea value={value} onChange={(event) => setValue(event.target.value)} className="form-control mt-4 min-h-56 resize-y" placeholder="Record preferences you want to remember or discuss with a qualified professional…" /><button type="button" onClick={() => { updateState((current) => ({ ...current, health: { ...current.health, carePreferences: value, updatedAt: new Date().toISOString() } })); setMessage("Care preferences saved privately."); }} className="mt-4 min-h-12 rounded-2xl bg-[#315443] px-5 text-sm font-semibold text-white">Save preferences</button></Card>; }
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-xs font-semibold text-[#20352a]"><span className="mb-1.5 block">{label}</span>{children}</label>; }
