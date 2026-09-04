import type { EmergencyAccessController } from "./useEmergencyAccess";

export function AddTrustedPerson({
  access,
}: {
  access: EmergencyAccessController;
}) {
  const update = (field: keyof typeof access.draft, value: string) =>
    access.setDraft((draft) => ({ ...draft, [field]: value }));
  return (
    <section className="estate-sheet p-5">
      <h2 className="font-serif text-xl">Add a trusted person</h2>
      <form onSubmit={access.create} className="mt-4 grid gap-3 sm:grid-cols-3">
        <TrustedField
          label="Name"
          value={access.draft.name}
          onChange={(value) => update("name", value)}
        />
        <TrustedField
          label="Email"
          type="email"
          value={access.draft.email}
          onChange={(value) => update("email", value)}
        />
        <TrustedField
          label="Relationship"
          value={access.draft.relation}
          onChange={(value) => update("relation", value)}
          placeholder="Neighbour, sibling…"
        />
        <button
          disabled={
            access.busy ||
            !access.draft.name.trim() ||
            !access.draft.email.trim()
          }
          className="min-h-12 rounded-[15px] bg-[#315443] px-4 text-sm font-semibold text-white disabled:opacity-45 sm:col-span-3"
        >
          Create invitation
        </button>
      </form>
    </section>
  );
}

function TrustedField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email";
  placeholder?: string;
}) {
  return (
    <label className="text-xs font-semibold text-[#667068]">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={type === "email" ? 254 : 120}
        className="form-control"
        placeholder={placeholder}
      />
    </label>
  );
}
