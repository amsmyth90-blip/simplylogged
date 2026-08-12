"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { BottomNav } from "@/components/BottomNav";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { ModalShell } from "@/components/ModalShell";
import { UiIcon, type IconName } from "@/components/UiIcon";
import { healthProfileProgress } from "@/lib/health-records";
import type { VaultDocument } from "@/lib/mock-data";

type BedroomSection = {
  title: string;
  description: string;
  href: string;
  icon: IconName;
  tone?: "sage" | "lavender" | "blush";
};

const primarySections: BedroomSection[] = [
  { title: "Health Profile", description: "Your important health information in one clear summary.", href: "/bedroom/health-profile", icon: "heart" },
  { title: "Medical Records", description: "Store letters, reports, discharge notes and medical documents.", href: "/bedroom/medical-records", icon: "folder", tone: "lavender" },
  { title: "Medications & Prescriptions", description: "Keep current medicines, prescriptions and renewal dates organised.", href: "/bedroom/medications", icon: "file", tone: "blush" },
  { title: "Appointments", description: "Manage healthcare appointments, preparation and follow-up.", href: "/bedroom/appointments", icon: "calendar" },
  { title: "Tests & Results", description: "Store test records and follow-up information over time.", href: "/bedroom/tests", icon: "chart", tone: "lavender" },
  { title: "Health Timeline", description: "See your appointments, treatments and key events in order.", href: "/bedroom/health-timeline", icon: "clock" },
  { title: "Dental & Optical", description: "Keep dental visits, eye tests, prescriptions and records together.", href: "/bedroom/dental-optical", icon: "sun", tone: "blush" },
  { title: "Emergency Medical Info", description: "Prepare the information someone may need in an emergency.", href: "/bedroom/emergency", icon: "shield", tone: "lavender" },
];

const secondarySections: BedroomSection[] = [
  { title: "Vaccinations", description: "Dates and records", href: "/bedroom/vaccinations", icon: "check" },
  { title: "Family Health", description: "Linked family profiles", href: "/bedroom/family-health", icon: "users" },
  { title: "Healthcare Contacts", description: "GP, pharmacy and clinics", href: "/bedroom/contacts", icon: "phone" },
  { title: "Care Preferences", description: "Your recorded preferences", href: "/bedroom/care-preferences", icon: "heart" },
  { title: "Sleep & Wellbeing", description: "Private personal notes", href: "/bedroom/wellbeing", icon: "bed" },
  { title: "Health Insurance", description: "Link the Insurance Hub", href: "/office/insurance", icon: "shield" },
  { title: "Medical Devices", description: "Organise device records", href: "/bedroom/medical-devices", icon: "gear" },
  { title: "Allergies", description: "User-recorded details", href: "/bedroom/allergies", icon: "alert" },
  { title: "Conditions", description: "Personal health history", href: "/bedroom/conditions", icon: "file" },
  { title: "Operations & Procedures", description: "Key dates and notes", href: "/bedroom/procedures", icon: "calendar" },
];

const starterHealthDocumentIds = new Set(["v5", "v9", "v10", "bed-d1", "bed-d2", "bed-d3"]);

export function genuineHealthDocuments(documents: VaultDocument[]) {
  return documents.filter(
    (document) =>
      !starterHealthDocumentIds.has(document.id) &&
      (document.roomId === "bedroom" || document.category === "Health & Medical"),
  );
}

function formatDate(value: string) {
  if (!value) return "Date not recorded";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function daysFromNow(value: string) {
  const time = new Date(`${value}T12:00:00`).getTime();
  if (!value || Number.isNaN(time)) return Number.POSITIVE_INFINITY;
  return Math.ceil((time - Date.now()) / 86_400_000);
}

function countForSection(title: string, counts: Record<string, number>) {
  return counts[title] ?? 0;
}

function SectionCard({ section, count }: { section: BedroomSection; count: number }) {
  const tone =
    section.tone === "lavender"
      ? "bg-[#efebf3] text-[#665c72]"
      : section.tone === "blush"
        ? "bg-[#f4e9e5] text-[#765f58]"
        : "bg-[#e8eee3] text-[#48604e]";
  return (
    <Link
      href={section.href}
      className="group flex min-h-[96px] items-center gap-3 rounded-[22px] border border-[#20352a]/[0.07] bg-white/92 p-4 shadow-[0_16px_36px_-30px_rgba(32,53,42,0.55)] transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] motion-reduce:transform-none"
    >
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] ${tone}`}><UiIcon name={section.icon} className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#20352a]">{section.title}</span><span className="mt-1 block text-[11px] leading-4 text-[#667068]">{section.description}</span></span>
      {count > 0 ? <span className="rounded-full bg-[#eef2e9] px-2 py-1 text-[10px] font-semibold text-[#52705a]">{count}</span> : null}
      <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-[#7b847d] transition group-hover:translate-x-0.5 motion-reduce:transform-none" />
    </Link>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[24px] border border-[#20352a]/[0.07] bg-white/90 p-4 shadow-[0_18px_42px_-34px_rgba(32,53,42,0.6)] ${className}`}>{children}</section>;
}

function PanelHeading({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <div className="flex items-start justify-between gap-3"><div><h2 className="font-serif text-xl text-[#20352a]">{title}</h2>{detail ? <p className="mt-1 text-[11px] leading-4 text-[#667068]">{detail}</p> : null}</div>{action}</div>;
}

function EmptyPreview({ icon, title, detail }: { icon: IconName; title: string; detail: string }) {
  return <div className="mt-4 rounded-[18px] border border-dashed border-[#6f8e72]/25 bg-[#faf9f4] p-5 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#e8eee3] text-[#52705a]"><UiIcon name={icon} className="h-5 w-5" /></span><p className="mt-3 text-sm font-semibold text-[#20352a]">{title}</p><p className="mt-1 text-[11px] leading-5 text-[#667068]">{detail}</p></div>;
}

export function BedroomHealthWorkspace() {
  const { state, hydrated } = useDiaryDockData();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const health = state.health;
  const profileProgress = healthProfileProgress(health);
  const healthDocuments = useMemo(() => genuineHealthDocuments(state.vaultDocuments), [state.vaultDocuments]);
  const upcomingAppointments = useMemo(() => health.appointments.filter((item) => item.status === "planned" && daysFromNow(item.date) >= 0).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)), [health.appointments]);
  const currentMedications = health.medications.filter((item) => item.status === "current");
  const timeline = [...health.timeline].sort((a, b) => b.date.localeCompare(a.date));
  const contacts = state.professionalContacts.contacts;
  const gp = contacts.find((contact) => contact.id === health.profile.gpContactId);
  const pharmacy = contacts.find((contact) => contact.id === health.profile.pharmacyContactId);

  const sectionCounts: Record<string, number> = {
    "Health Profile": profileProgress.completed,
    "Medical Records": healthDocuments.length,
    "Medications & Prescriptions": currentMedications.length,
    Appointments: upcomingAppointments.length,
    "Tests & Results": health.tests.length,
    "Health Timeline": health.timeline.length,
    "Dental & Optical": health.dentalOptical.length,
    "Emergency Medical Info": profileProgress.completed,
    Vaccinations: health.vaccinations.length,
    "Family Health": health.familyMemberIds.length,
    "Healthcare Contacts": [health.profile.gpContactId, health.profile.pharmacyContactId].filter(Boolean).length,
    Allergies: health.allergies.length,
    Conditions: health.conditions.length,
    "Sleep & Wellbeing": health.wellbeing.length,
  };

  const reviews = [
    ...upcomingAppointments.filter((item) => daysFromNow(item.date) <= 14).map((item) => ({ id: `appointment-${item.id}`, icon: "calendar" as IconName, text: `${item.title} is coming up ${formatDate(item.date)}.`, href: `/bedroom/appointments` })),
    ...currentMedications.filter((item) => item.reviewDate && daysFromNow(item.reviewDate) <= 30).map((item) => ({ id: `medication-${item.id}`, icon: "file" as IconName, text: `${item.name} has a recorded review date of ${formatDate(item.reviewDate)}.`, href: "/bedroom/medications" })),
    ...healthDocuments.filter((item) => item.reviewStatus === "needs-review").map((item) => ({ id: `document-${item.id}`, icon: "folder" as IconName, text: `${item.title} needs your review.`, href: `/document/${item.id}?from=bedroom` })),
    ...(!health.profile.emergencyContactId || !health.profile.gpContactId ? [{ id: "profile-incomplete", icon: "shield" as IconName, text: "Your emergency profile still has important details to add.", href: "/bedroom/emergency" }] : []),
  ].slice(0, 5);

  const searchable = [
    ...primarySections.map((item) => ({ title: item.title, detail: item.description, href: item.href, icon: item.icon })),
    ...secondarySections.map((item) => ({ title: item.title, detail: item.description, href: item.href, icon: item.icon })),
    ...currentMedications.map((item) => ({ title: item.name, detail: [item.dose, item.frequency].filter(Boolean).join(" · ") || "Medication", href: "/bedroom/medications", icon: "file" as IconName })),
    ...health.appointments.map((item) => ({ title: item.title, detail: [item.provider, formatDate(item.date)].filter(Boolean).join(" · "), href: "/bedroom/appointments", icon: "calendar" as IconName })),
    ...healthDocuments.map((item) => ({ title: item.title, detail: [item.issuer, item.updated].filter(Boolean).join(" · "), href: `/document/${item.id}?from=bedroom`, icon: "folder" as IconName })),
  ];
  const searchResults = query.trim() ? searchable.filter((item) => `${item.title} ${item.detail}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 10) : [];

  if (!hydrated) return <main className="min-h-screen bg-[#f5f2ea] p-4"><div className="mx-auto max-w-[1080px] space-y-4 animate-pulse"><div className="h-48 rounded-[28px] bg-white/70" /><div className="h-36 rounded-[24px] bg-white/70" /><div className="grid gap-3 sm:grid-cols-2"><div className="h-24 rounded-[22px] bg-white/70" /><div className="h-24 rounded-[22px] bg-white/70" /></div></div></main>;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f2ea] pb-32 text-[#20352a]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true"><span className="absolute -right-24 top-12 h-80 w-80 rounded-full bg-[#dfe7d8]/55 blur-3xl" /><span className="absolute -left-24 top-[38rem] h-72 w-72 rounded-full bg-[#eadde6]/40 blur-3xl" /></div>
      <div className="relative mx-auto w-full max-w-[1080px] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <header className="overflow-hidden rounded-[30px] border border-white/80 bg-[#fffdf8]/92 p-5 shadow-[0_25px_60px_-42px_rgba(32,53,42,0.6)] sm:p-7">
          <div className="flex items-start gap-3"><Link href="/room/bedroom" aria-label="Back to Bedroom" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#20352a]/10 bg-white"><UiIcon name="arrow-left" className="h-5 w-5" /></Link><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6f8e72]">Bedroom</p><h1 className="mt-1 font-serif text-4xl tracking-tight">My Health</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#667068]">Keep your health records, appointments and important medical information organised in one private place.</p></div><div className="flex gap-2"><button type="button" onClick={() => setSearchOpen((value) => !value)} aria-label="Search Bedroom health records" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#20352a]/10 bg-white"><UiIcon name="search" className="h-4 w-4" /></button><button type="button" onClick={() => setAddOpen(true)} aria-label="Add health information" className="flex h-11 w-11 items-center justify-center rounded-full bg-[#315443] text-white"><UiIcon name="plus" className="h-4 w-4" /></button></div></div>
          <div className="mt-5 flex items-center gap-2 rounded-2xl bg-[#eef2e9] px-3 py-2 text-[11px] text-[#48604e]"><UiIcon name="lock" className="h-4 w-4" /><span>Private to your account unless you explicitly share a supported record.</span></div>
          {searchOpen ? <div className="mt-4"><label className="relative block"><span className="sr-only">Search health records</span><UiIcon name="search" className="absolute left-3 top-3.5 h-4 w-4 text-[#667068]" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your health records" className="min-h-11 w-full rounded-2xl border border-[#20352a]/10 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#6f8e72]" /></label>{query.trim() ? <div className="mt-2 max-h-72 space-y-1 overflow-y-auto rounded-2xl border border-[#20352a]/10 bg-white p-2">{searchResults.length ? searchResults.map((item) => <Link key={`${item.href}-${item.title}`} href={item.href} className="flex min-h-12 items-center gap-3 rounded-xl px-3 hover:bg-[#f5f4ed]"><UiIcon name={item.icon} className="h-4 w-4 text-[#52705a]" /><span className="min-w-0"><span className="block truncate text-xs font-semibold">{item.title}</span><span className="block truncate text-[10px] text-[#667068]">{item.detail}</span></span></Link>) : <p className="p-3 text-xs text-[#667068]">No authorised Bedroom records match that search.</p>}</div> : null}</div> : null}
        </header>

        <section className="mt-5 overflow-hidden rounded-[28px] bg-[#315443] p-5 text-white shadow-[0_24px_55px_-35px_rgba(32,53,42,0.72)]"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">Your health at a glance</p><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{[{ label: "Appointments", value: upcomingAppointments.length }, { label: "Current medicines", value: currentMedications.length }, { label: "Recorded allergies", value: health.allergies.length }, { label: "Needs review", value: healthDocuments.filter((item) => item.reviewStatus === "needs-review").length }].map((item) => <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.08] p-3"><p className="text-2xl font-semibold">{item.value}</p><p className="mt-1 text-[9px] uppercase tracking-wide text-white/65">{item.label}</p></div>)}</div><div className="mt-4"><div className="flex justify-between text-[10px]"><span>Emergency profile</span><span>{profileProgress.completed} of {profileProgress.total} details organised</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/12"><span className="block h-full rounded-full bg-[#c6d8bd]" style={{ width: `${profileProgress.percent}%` }} /></div></div></section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <Panel><PanelHeading title="Things to review" detail="Only actions based on information you have recorded." />{reviews.length ? <div className="mt-4 space-y-2">{reviews.map((item) => <Link key={item.id} href={item.href} className="flex min-h-14 items-center gap-3 rounded-2xl bg-[#f7f5ef] px-3 text-xs"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#6f8e72]"><UiIcon name={item.icon} className="h-4 w-4" /></span><span className="min-w-0 flex-1 leading-5">{item.text}</span><UiIcon name="chevron-right" className="h-4 w-4 text-[#7b847d]" /></Link>)}</div> : <EmptyPreview icon="check" title="Nothing needs your review" detail="DiaryDock will show recorded appointments, review dates and documents here when relevant." />}</Panel>
          <Panel><PanelHeading title="Health profile preview" detail="A restrained summary of information you have chosen to record." action={<Link href="/bedroom/health-profile" className="min-h-11 px-2 py-3 text-[11px] font-semibold text-[#52705a]">View profile</Link>} /><dl className="mt-4 grid grid-cols-2 gap-2 text-xs">{[{ label: "GP", value: gp ? `${gp.firstName} ${gp.lastName}`.trim() || gp.company : "Not linked" }, { label: "Pharmacy", value: pharmacy ? pharmacy.company || `${pharmacy.firstName} ${pharmacy.lastName}`.trim() : "Not linked" }, { label: "Allergies", value: health.allergies.length ? `${health.allergies.length} recorded` : "None recorded" }, { label: "Current medicines", value: currentMedications.length ? `${currentMedications.length} recorded` : "None recorded" }, { label: "Blood group", value: health.profile.bloodGroup ? "Recorded" : "Not recorded" }, { label: "Emergency contact", value: health.profile.emergencyContactId ? "Recorded" : "Not recorded" }].map((item) => <div key={item.label} className="rounded-2xl bg-[#f7f5ef] p-3"><dt className="text-[9px] font-semibold uppercase tracking-wide text-[#7b847d]">{item.label}</dt><dd className="mt-1 font-semibold text-[#20352a]">{item.value}</dd></div>)}</dl></Panel>
        </div>

        <section className="mt-7"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">Bedroom</p><h2 className="mt-1 font-serif text-3xl">Your health records</h2></div><div className="mt-4 grid gap-3 md:grid-cols-2">{primarySections.map((section) => <SectionCard key={section.href} section={section} count={countForSection(section.title, sectionCounts)} />)}</div></section>

        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          <Panel><PanelHeading title="Upcoming appointments" detail="The next appointments you have recorded." action={<Link href="/bedroom/appointments" className="min-h-11 px-2 py-3 text-[11px] font-semibold text-[#52705a]">View all</Link>} />{upcomingAppointments.length ? <div className="mt-4 space-y-2">{upcomingAppointments.slice(0, 3).map((item) => <Link key={item.id} href="/bedroom/appointments" className="flex min-h-16 items-center gap-3 rounded-2xl bg-[#f7f5ef] p-3"><span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#e8eee3] text-[#52705a]"><UiIcon name="calendar" className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{item.title}</span><span className="mt-1 block text-[10px] text-[#667068]">{formatDate(item.date)}{item.time ? ` · ${item.time}` : ""}{item.provider ? ` · ${item.provider}` : ""}</span></span><UiIcon name="chevron-right" className="h-4 w-4 text-[#7b847d]" /></Link>)}</div> : <EmptyPreview icon="calendar" title="No upcoming appointments" detail="Add an appointment when you are ready. Calendar and reminders are only created with your approval." />}</Panel>
          <Panel><PanelHeading title="Current medications" detail="User-confirmed information only; no medication advice." action={<Link href="/bedroom/medications" className="min-h-11 px-2 py-3 text-[11px] font-semibold text-[#52705a]">View all</Link>} />{currentMedications.length ? <div className="mt-4 space-y-2">{currentMedications.slice(0, 3).map((item) => <div key={item.id} className="rounded-2xl bg-[#f7f5ef] p-3"><div className="flex justify-between gap-3"><p className="text-xs font-semibold">{item.name}</p><span className="text-[10px] text-[#667068]">{item.reviewDate ? `Review ${formatDate(item.reviewDate)}` : "No review date"}</span></div><p className="mt-1 text-[10px] text-[#667068]">{[item.dose, item.frequency, item.prescriber].filter(Boolean).join(" · ") || "Details not recorded"}</p></div>)}</div> : <EmptyPreview icon="file" title="No current medications recorded" detail="Only add medicines and directions exactly as confirmed by you or your healthcare provider." />}</Panel>
          <Panel><PanelHeading title="Recent medical records" detail="Files remain in private All Files storage." action={<Link href="/bedroom/medical-records" className="min-h-11 px-2 py-3 text-[11px] font-semibold text-[#52705a]">View records</Link>} />{healthDocuments.length ? <div className="mt-4 space-y-2">{healthDocuments.slice(0, 3).map((item) => <Link key={item.id} href={`/document/${item.id}?from=bedroom`} className="flex min-h-16 items-center gap-3 rounded-2xl bg-[#f7f5ef] p-3"><span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#efebf3] text-[#665c72]"><UiIcon name="lock" className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{item.title}</span><span className="mt-1 block text-[10px] text-[#667068]">{item.kind} · {item.updated} · {item.reviewStatus === "needs-review" ? "Check details" : "Reviewed"}</span></span></Link>)}</div> : <EmptyPreview icon="folder" title="No medical records uploaded" detail="Use the secure scan flow to store a file. Failed analysis will not prevent private storage." />}</Panel>
          <Panel><PanelHeading title="Health timeline" detail="Your latest user-recorded health events." action={<Link href="/bedroom/health-timeline" className="min-h-11 px-2 py-3 text-[11px] font-semibold text-[#52705a]">View timeline</Link>} />{timeline.length ? <div className="mt-4 space-y-2">{timeline.slice(0, 4).map((item) => <div key={item.id} className="flex gap-3 rounded-2xl bg-[#f7f5ef] p-3"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#6f8e72]" /><span><span className="block text-xs font-semibold">{item.title}</span><span className="mt-1 block text-[10px] capitalize text-[#667068]">{formatDate(item.date)} · {item.type}</span></span></div>)}</div> : <EmptyPreview icon="clock" title="No timeline entries yet" detail="Dates, documents and events you confirm can be organised here over time." />}</Panel>
        </div>

        <Panel className="mt-5 bg-[linear-gradient(135deg,#eef2e9,#fffdf8)]"><div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-white text-[#52705a]"><UiIcon name="shield" className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h2 className="font-serif text-xl">Emergency profile</h2><p className="mt-1 text-xs leading-5 text-[#667068]">{profileProgress.completed === profileProgress.total ? "Your emergency information is organised. It has not been medically verified." : `${profileProgress.total - profileProgress.completed} important details still need to be added.`}</p><Link href="/bedroom/emergency" className="mt-3 inline-flex min-h-11 items-center rounded-full bg-[#315443] px-4 text-xs font-semibold text-white">Review emergency information</Link></div></div></Panel>

        <section className="mt-7"><h2 className="font-serif text-3xl">More health records</h2><div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">{secondarySections.map((section) => <Link key={section.href} href={section.href} className="min-h-[118px] rounded-[20px] border border-[#20352a]/[0.07] bg-white/90 p-4 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] motion-reduce:transform-none"><span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#e8eee3] text-[#52705a]"><UiIcon name={section.icon} className="h-4 w-4" /></span><span className="mt-3 block text-xs font-semibold">{section.title}</span><span className="mt-1 block text-[10px] leading-4 text-[#667068]">{countForSection(section.title, sectionCounts) ? `${countForSection(section.title, sectionCounts)} recorded` : section.description}</span></Link>)}</div></section>

        <p className="mt-7 rounded-2xl border border-[#20352a]/[0.07] bg-white/70 p-4 text-[11px] leading-5 text-[#667068]">DiaryDock helps you organise health information and documents. It does not provide medical advice, diagnosis or emergency care.</p>
      </div>

      <ModalShell open={addOpen} title="Add to My Health" subtitle="Choose what you want to organise. DiaryDock will not create clinical conclusions automatically." onClose={() => setAddOpen(false)}>
        <div className="grid gap-2 sm:grid-cols-2">{[
          ["Upload medical document", "/capture?room=bedroom", "camera"],
          ["Add medication", "/bedroom/medications?add=1", "file"],
          ["Add appointment", "/bedroom/appointments?add=1", "calendar"],
          ["Add test result", "/bedroom/tests?add=1", "chart"],
          ["Add condition", "/bedroom/conditions?add=1", "heart"],
          ["Add allergy", "/bedroom/allergies?add=1", "alert"],
          ["Add vaccination", "/bedroom/vaccinations?add=1", "check"],
          ["Add timeline entry", "/bedroom/health-timeline?add=1", "clock"],
          ["Add healthcare contact", "/office/contacts/new", "phone"],
          ["Add emergency information", "/bedroom/emergency", "shield"],
        ].map(([label, href, icon]) => <Link key={href} href={href} className="flex min-h-14 items-center gap-3 rounded-2xl border border-[#20352a]/[0.07] bg-white px-3 text-xs font-semibold"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8eee3] text-[#52705a]"><UiIcon name={icon as IconName} className="h-4 w-4" /></span>{label}<UiIcon name="chevron-right" className="ml-auto h-4 w-4 text-[#7b847d]" /></Link>)}</div>
      </ModalShell>
      <BottomNav />
    </main>
  );
}
