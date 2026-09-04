import { UiIcon } from "@/components/UiIcon";
import type { WillsWishesRecord } from "@/lib/diarydock-data";

type Props = {
  record: WillsWishesRecord;
  update: (field: keyof WillsWishesRecord, value: string) => void;
};

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-[#dad8cf] bg-[#faf9f5] px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-[#758a6f]";
const areaClass = `${fieldClass} resize-none`;

export function AboutWishesForm({ record, update }: Props) {
  return (
    <div className="space-y-3">
      <FormHeading
        title="About me"
        detail="The personal details that identify this record."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-ink/65">
          Full name
          <input
            value={record.fullName}
            onChange={(event) => update("fullName", event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-semibold text-ink/65">
          Date of birth
          <input
            type="date"
            value={record.dateOfBirth}
            onChange={(event) => update("dateOfBirth", event.target.value)}
            className={fieldClass}
          />
        </label>
      </div>
      <label className="block text-xs font-semibold text-ink/65">
        Home address
        <textarea
          rows={3}
          value={record.address}
          onChange={(event) => update("address", event.target.value)}
          className={areaClass}
        />
      </label>
    </div>
  );
}

export function WillWishesForm({ record, update }: Props) {
  return (
    <div className="space-y-3">
      <FormHeading
        title="My will"
        detail="Record where the legal will is held and who should act."
      />
      <label className="block text-xs font-semibold text-ink/65">
        Will status
        <select
          value={record.willStatus}
          onChange={(event) => update("willStatus", event.target.value)}
          className={fieldClass}
        >
          <option>Not started</option>
          <option>Draft in progress</option>
          <option>Signed original stored at home</option>
          <option>Signed original stored with solicitor</option>
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-ink/65">
          Primary executor
          <input
            value={record.executorName}
            onChange={(event) => update("executorName", event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-semibold text-ink/65">
          Solicitor
          <input
            value={record.solicitorName}
            onChange={(event) => update("solicitorName", event.target.value)}
            className={fieldClass}
          />
        </label>
      </div>
      <label className="block text-xs font-semibold text-ink/65">
        Where is the original held?
        <input
          value={record.originalWillLocation}
          onChange={(event) =>
            update("originalWillLocation", event.target.value)
          }
          className={fieldClass}
        />
      </label>
    </div>
  );
}

export function FuneralWishesForm({ record, update }: Props) {
  return (
    <div className="space-y-3">
      <FormHeading
        title="Funeral wishes"
        detail="Guidance for your family; these wishes can be changed at any time."
      />
      <label className="block text-xs font-semibold text-ink/65">
        Preference
        <select
          value={record.funeralPreference}
          onChange={(event) => update("funeralPreference", event.target.value)}
          className={fieldClass}
        >
          <option value="">Not decided</option>
          <option>Burial</option>
          <option>Cremation</option>
          <option>Natural burial</option>
          <option>Let my family decide</option>
        </select>
      </label>
      <label className="block text-xs font-semibold text-ink/65">
        Service and personal preferences
        <textarea
          rows={4}
          value={record.funeralDetails}
          onChange={(event) => update("funeralDetails", event.target.value)}
          className={`${areaClass} leading-6`}
          placeholder="Location, atmosphere, flowers, dress, people to involve…"
        />
      </label>
      <label className="block text-xs font-semibold text-ink/65">
        Music and readings
        <textarea
          rows={3}
          value={record.musicAndReadings}
          onChange={(event) => update("musicAndReadings", event.target.value)}
          className={`${areaClass} leading-6`}
        />
      </label>
    </div>
  );
}

export function MessagesWishesForm({ record, update }: Props) {
  return (
    <div className="space-y-3">
      <FormHeading
        title="My wishes journal"
        detail="A warmer place for personal messages and practical wishes."
      />
      <div className="rounded-2xl border border-[#e2d8c8] bg-[repeating-linear-gradient(180deg,#fffdf8_0px,#fffdf8_31px,#ece3d6_32px)] p-4">
        <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7a694d]">
          A note to my family
          <textarea
            rows={6}
            value={record.personalMessage}
            onChange={(event) => update("personalMessage", event.target.value)}
            className="mt-2 w-full resize-none bg-transparent text-sm font-normal leading-8 text-ink outline-none"
            placeholder="Write a message in your own words…"
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-ink/65">
          Special belongings
          <textarea
            rows={3}
            value={record.specialBelongings}
            onChange={(event) =>
              update("specialBelongings", event.target.value)
            }
            className={areaClass}
            placeholder="Items and who should receive them…"
          />
        </label>
        <label className="text-xs font-semibold text-ink/65">
          Pet care wishes
          <textarea
            rows={3}
            value={record.petCareWishes}
            onChange={(event) => update("petCareWishes", event.target.value)}
            className={areaClass}
          />
        </label>
      </div>
    </div>
  );
}

export function AccessWishesForm({ record, update }: Props) {
  return (
    <div className="space-y-3">
      <FormHeading
        title="Access & review"
        detail="Choose who knows this record exists and when to check it again."
      />
      <label className="block text-xs font-semibold text-ink/65">
        Trusted people
        <input
          value={record.trustedPeople}
          onChange={(event) => update("trustedPeople", event.target.value)}
          className={fieldClass}
          placeholder="Names separated by commas"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-ink/65">
          Review frequency
          <select
            value={record.reviewFrequency}
            onChange={(event) => update("reviewFrequency", event.target.value)}
            className={fieldClass}
          >
            <option>Every 6 months</option>
            <option>Every 12 months</option>
            <option>Every 2 years</option>
            <option>After a major life change</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-ink/65">
          Last reviewed
          <input
            value={record.lastReviewed}
            onChange={(event) => update("lastReviewed", event.target.value)}
            className={fieldClass}
          />
        </label>
      </div>
      <div className="rounded-2xl border border-[#d7dfd1] bg-[#edf3e9]/75 p-3 text-xs leading-5 text-ink/58">
        <UiIcon
          name="lock"
          className="mr-2 inline h-3.5 w-3.5 text-[#607457]"
        />
        Private by default. Sharing this record should always be an explicit
        choice.
      </div>
    </div>
  );
}

function FormHeading({ title, detail }: { title: string; detail: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-xs text-ink/50">{detail}</p>
    </div>
  );
}
