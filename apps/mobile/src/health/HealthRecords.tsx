import type { HealthRecord } from "@diarydock/health";

export type HealthView =
  | "overview"
  | "medications"
  | "appointments"
  | "allergies"
  | "history";

type DisplayRecord = {
  id: string;
  title: string;
  meta: string;
  notes: string;
  marker: string;
};

function date(value: string) {
  if (!value) return "Date not recorded";
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.valueOf())
    ? value
    : new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(parsed);
}

function records(health: HealthRecord, view: HealthView): DisplayRecord[] {
  if (view === "medications") {
    return health.medications.map((item) => ({
      id: item.id,
      title: item.name,
      meta: [item.dose, item.frequency, item.status].filter(Boolean).join(" · "),
      notes: item.notes,
      marker: "Rx",
    }));
  }
  if (view === "appointments") {
    return health.appointments.map((item) => ({
      id: item.id,
      title: item.title,
      meta: [date(item.date), item.time, item.provider, item.status].filter(Boolean).join(" · "),
      notes: item.preparationNotes || item.followUpNotes,
      marker: "CAL",
    }));
  }
  if (view === "allergies") {
    return [
      ...health.allergies.map((item) => ({
        id: item.id,
        title: item.allergen,
        meta: [item.reaction, item.severity.replaceAll("-", " ")].filter(Boolean).join(" · "),
        notes: item.notes,
        marker: "!",
      })),
      ...health.conditions.map((item) => ({
        id: item.id,
        title: item.name,
        meta: [item.status.replaceAll("-", " "), date(item.recordedDate)].join(" · "),
        notes: item.notes,
        marker: "C",
      })),
    ];
  }
  return [
    ...health.tests.map((item) => ({
      id: item.id,
      title: item.title,
      meta: [date(item.date), item.provider, `Follow-up ${item.followUpStatus}`].filter(Boolean).join(" · "),
      notes: item.notes,
      marker: "T",
    })),
    ...health.vaccinations.map((item) => ({
      id: item.id,
      title: item.name,
      meta: [date(item.date), item.provider, item.nextDate ? `Next ${date(item.nextDate)}` : ""].filter(Boolean).join(" · "),
      notes: item.notes,
      marker: "V",
    })),
    ...health.dentalOptical.map((item) => ({
      id: item.id,
      title: item.title,
      meta: [item.type, date(item.date), item.provider].filter(Boolean).join(" · "),
      notes: item.notes,
      marker: item.type === "dental" ? "D" : "O",
    })),
    ...health.wellbeing.map((item) => ({
      id: item.id,
      title: item.title,
      meta: [date(item.date), item.sleepHours === undefined ? "" : `${item.sleepHours} sleep hours`].filter(Boolean).join(" · "),
      notes: item.notes,
      marker: "W",
    })),
    ...health.timeline.filter((item) => !item.linkedRecordId).map((item) => ({
      id: item.id,
      title: item.title,
      meta: [date(item.date), item.type].join(" · "),
      notes: item.notes,
      marker: "•",
    })),
  ];
}

export function HealthOverview({
  health,
  onEdit,
}: {
  health: HealthRecord;
  onEdit: () => void;
}) {
  const currentMedications = health.medications.filter((item) => item.status === "current");
  const currentConditions = health.conditions.filter((item) => item.status !== "past");
  return (
    <div className="health-overview-grid">
      <section className="health-card health-profile-card">
        <header><div><p>Private health profile</p><h2>Essential information</h2></div><button className="health-edit-profile" type="button" onClick={onEdit}>Review</button></header>
        <div className="health-profile-facts">
          <article><small>Blood group</small><strong>{health.profile.bloodGroup || "Not recorded"}</strong></article>
          <article><small>Allergies</small><strong>{health.allergies.length || "None recorded"}</strong></article>
          <article><small>Current medicines</small><strong>{currentMedications.length || "None recorded"}</strong></article>
          <article><small>Current conditions</small><strong>{currentConditions.length || "None recorded"}</strong></article>
        </div>
        {health.profile.emergencyNotes ? <p className="health-emergency-note"><strong>Emergency notes</strong>{health.profile.emergencyNotes}</p> : null}
      </section>
      <section className="health-card">
        <header><div><p>Care preferences</p><h2>Your notes</h2></div></header>
        <p className="health-long-note">{health.carePreferences || "No care preferences recorded. DiaryDock never invents personal health information."}</p>
      </section>
    </div>
  );
}

export function HealthRecordList({ health, view }: { health: HealthRecord; view: Exclude<HealthView, "overview"> }) {
  const visible = records(health, view);
  const titles = { medications: "Medications", appointments: "Appointments", allergies: "Allergies & conditions", history: "Health timeline" };
  return (
    <section className="health-card health-record-card">
      <header><div><p>Private records</p><h2>{titles[view]}</h2></div><strong>{visible.length}</strong></header>
      <div className="health-record-list">
        {visible.map((item) => <article key={item.id}><span>{item.marker}</span><div><strong>{item.title}</strong><small>{item.meta}</small>{item.notes ? <p>{item.notes}</p> : null}</div></article>)}
        {!visible.length ? <div className="health-empty"><span>♡</span><strong>Nothing recorded here yet</strong><p>This private area begins empty and only contains information you add.</p></div> : null}
      </div>
    </section>
  );
}
