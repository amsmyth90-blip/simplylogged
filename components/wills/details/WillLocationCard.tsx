import { WillCard, WillSectionHeading } from "@/components/wills/WillUi";
import type { WillRecord } from "@/lib/will-records";

import { willAreaClass, willFieldClass } from "./WillDetailsUi";
import type { WillDetailsViewModel } from "./useWillDetails";

export function WillLocationCard({ view }: { view: WillDetailsViewModel }) {
  const fields: Array<{
    label: string;
    key: keyof Pick<
      WillRecord,
      | "originalLocationDetails"
      | "originalOrganisation"
      | "originalContactName"
      | "originalPhone"
      | "originalEmail"
      | "originalReferenceNumber"
      | "originalTrustedPeople"
    >;
    type?: string;
    placeholder?: string;
  }> = [
    {
      label: "Specific location",
      key: "originalLocationDetails",
      placeholder: "For example, labelled folder in home safe",
    },
    { label: "Firm or organisation", key: "originalOrganisation" },
    { label: "Contact person", key: "originalContactName" },
    { label: "Telephone", key: "originalPhone", type: "tel" },
    { label: "Email", key: "originalEmail", type: "email" },
    { label: "Reference number", key: "originalReferenceNumber" },
    {
      label: "People informed",
      key: "originalTrustedPeople",
      placeholder: "Names only — this does not grant access",
    },
  ];
  return (
    <WillCard>
      <WillSectionHeading
        icon="map-pin"
        title="Where is the original?"
        description="DiaryDock can store a digital copy, but the signed physical original may still be required."
      />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-[#20352a]">
            Location type
          </span>
          <select
            value={view.draft.originalLocationType}
            onChange={(event) =>
              view.updateField(
                "originalLocationType",
                event.target.value as WillRecord["originalLocationType"],
              )
            }
            className={willFieldClass}
          >
            <option value="">Choose a location</option>
            <option value="home">At home</option>
            <option value="solicitor">With a solicitor</option>
            <option value="secure-storage">In secure storage</option>
            <option value="trusted-organisation">
              With another trusted organisation
            </option>
            <option value="other">Other</option>
          </select>
        </label>
        {fields.map((field) => (
          <label key={field.key} className="block">
            <span className="text-sm font-semibold text-[#20352a]">
              {field.label}
            </span>
            <input
              type={field.type ?? "text"}
              value={view.draft[field.key]}
              onChange={(event) =>
                view.updateField(field.key, event.target.value)
              }
              className={willFieldClass}
              placeholder={field.placeholder}
            />
          </label>
        ))}
      </div>
      <label className="mt-4 block">
        <span className="text-sm font-semibold text-[#20352a]">
          Collection or access notes
        </span>
        <textarea
          value={view.draft.originalAccessNotes}
          onChange={(event) =>
            view.updateField("originalAccessNotes", event.target.value)
          }
          rows={3}
          className={willAreaClass}
        />
      </label>
    </WillCard>
  );
}
