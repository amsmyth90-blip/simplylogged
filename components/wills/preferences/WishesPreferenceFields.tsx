import type { WishesPreferencesDraft } from "@diarydock/wills";

type Change = (key: keyof WishesPreferencesDraft, value: string) => void;
type Props = { draft: WishesPreferencesDraft; onChange: Change };

function Field({ label, field, draft, onChange, maximum = 160, type = "text" }: {
  label: string;
  field: keyof WishesPreferencesDraft;
  draft: WishesPreferencesDraft;
  onChange: Change;
  maximum?: number;
  type?: "text" | "date";
}) {
  return <label className="space-y-2 text-sm font-semibold text-[#294436]">
    <span>{label}</span>
    <input type={type} value={draft[field]} maxLength={maximum}
      onChange={(event) => onChange(field, event.target.value)}
      className="min-h-12 w-full rounded-[14px] border border-[#20352a]/10 bg-white px-4 font-normal text-[#20352a] outline-none focus:border-[#6f8e72] focus:ring-2 focus:ring-[#6f8e72]/20" />
  </label>;
}

function Notes({ label, field, draft, onChange, maximum, rows = 4 }: {
  label: string;
  field: keyof WishesPreferencesDraft;
  draft: WishesPreferencesDraft;
  onChange: Change;
  maximum: number;
  rows?: number;
}) {
  return <label className="space-y-2 text-sm font-semibold text-[#294436]">
    <span>{label}</span>
    <textarea value={draft[field]} maxLength={maximum} rows={rows}
      onChange={(event) => onChange(field, event.target.value)}
      className="w-full resize-y rounded-[14px] border border-[#20352a]/10 bg-white px-4 py-3 font-normal leading-6 text-[#20352a] outline-none focus:border-[#6f8e72] focus:ring-2 focus:ring-[#6f8e72]/20" />
  </label>;
}

export function WishesPreferenceFields({ draft, onChange }: Props) {
  return <div className="space-y-5">
    <section className="grid gap-4 rounded-[18px] bg-[#f7f5ee] p-4 sm:grid-cols-2">
      <h3 className="sm:col-span-2 font-serif text-xl text-[#20352a]">About me</h3>
      <Field label="Full name" field="fullName" draft={draft} onChange={onChange} />
      <Field label="Date of birth" field="dateOfBirth" type="date" maximum={10}
        draft={draft} onChange={onChange} />
      <div className="sm:col-span-2"><Notes label="Address" field="address" maximum={1_000}
        rows={3} draft={draft} onChange={onChange} /></div>
    </section>

    <section className="grid gap-4 rounded-[18px] bg-[#f7f5ee] p-4 sm:grid-cols-2">
      <h3 className="sm:col-span-2 font-serif text-xl text-[#20352a]">Will context</h3>
      <Field label="Will status" field="willStatus" draft={draft} onChange={onChange} />
      <Field label="Executor" field="executorName" draft={draft} onChange={onChange} />
      <Field label="Solicitor" field="solicitorName" draft={draft} onChange={onChange} />
      <div className="sm:col-span-2"><Notes label="Where the original will is kept"
        field="originalWillLocation" maximum={2_000} rows={3}
        draft={draft} onChange={onChange} /></div>
    </section>

    <section className="grid gap-4 rounded-[18px] bg-[#f7f5ee] p-4">
      <h3 className="font-serif text-xl text-[#20352a]">Personal wishes</h3>
      <Notes label="Funeral preference" field="funeralPreference" maximum={2_000}
        rows={3} draft={draft} onChange={onChange} />
      <Notes label="Funeral details" field="funeralDetails" maximum={10_000}
        draft={draft} onChange={onChange} />
      <Notes label="Music and readings" field="musicAndReadings" maximum={10_000}
        draft={draft} onChange={onChange} />
      <Notes label="Personal message" field="personalMessage" maximum={20_000}
        rows={6} draft={draft} onChange={onChange} />
      <Notes label="Special belongings" field="specialBelongings" maximum={10_000}
        draft={draft} onChange={onChange} />
      <Notes label="Pet-care wishes" field="petCareWishes" maximum={10_000}
        draft={draft} onChange={onChange} />
    </section>

    <section className="grid gap-4 rounded-[18px] bg-[#f7f5ee] p-4 sm:grid-cols-2">
      <h3 className="sm:col-span-2 font-serif text-xl text-[#20352a]">Trusted people and review</h3>
      <div className="sm:col-span-2"><Notes label="Trusted people" field="trustedPeople"
        maximum={2_000} rows={3} draft={draft} onChange={onChange} /></div>
      <Field label="Review frequency" field="reviewFrequency" draft={draft} onChange={onChange} />
      <Field label="Last reviewed" field="lastReviewed" type="date" maximum={10}
        draft={draft} onChange={onChange} />
    </section>
  </div>;
}
