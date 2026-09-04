import type { WillDetails } from "@diarydock/wills";

type Props = {
  value: WillDetails;
  onChange: <Key extends keyof WillDetails>(
    key: Key,
    value: WillDetails[Key],
  ) => void;
};

type TextKey = {
  [Key in keyof WillDetails]: WillDetails[Key] extends string ? Key : never;
}[keyof WillDetails];

export function WillOriginalStorageFields({ value, onChange }: Props) {
  function text(key: TextKey, next: string) {
    onChange(key, next as WillDetails[typeof key]);
  }

  return (
    <div className="wills-editor-section">
      <h3>Original signed will</h3>
      <label>
        <span>Location type</span>
        <select
          value={value.originalLocationType}
          onChange={(event) => onChange(
            "originalLocationType",
            event.target.value as WillDetails["originalLocationType"],
          )}
        >
          <option value="">Not recorded</option>
          <option value="home">At home</option>
          <option value="solicitor">With solicitor</option>
          <option value="secure-storage">Secure storage</option>
          <option value="trusted-organisation">Trusted organisation</option>
          <option value="other">Other</option>
        </select>
      </label>
      <TextArea label="Exact location" maximum={2_000} value={value.originalLocationDetails} onChange={(next) => text("originalLocationDetails", next)} />
      <div className="wills-editor-row">
        <TextField label="Firm or organisation" value={value.originalOrganisation} onChange={(next) => text("originalOrganisation", next)} />
        <TextField label="Contact person" value={value.originalContactName} onChange={(next) => text("originalContactName", next)} />
      </div>
      <div className="wills-editor-row">
        <TextField label="Telephone" type="tel" value={value.originalPhone} onChange={(next) => text("originalPhone", next)} />
        <TextField label="Email" type="email" value={value.originalEmail} onChange={(next) => text("originalEmail", next)} />
      </div>
      <TextField label="Storage reference number" value={value.originalReferenceNumber} onChange={(next) => text("originalReferenceNumber", next)} />
      <TextArea label="Who knows where it is" maximum={2_000} value={value.originalTrustedPeople} onChange={(next) => text("originalTrustedPeople", next)} />
      <TextArea label="Access notes" maximum={4_000} value={value.originalAccessNotes} onChange={(next) => text("originalAccessNotes", next)} />
    </div>
  );
}
function TextField(props: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span>{props.label}</span>
      <input type={props.type ?? "text"} maxLength={254} value={props.value} onChange={(event) => props.onChange(event.target.value)} />
    </label>
  );
}

function TextArea(props: {
  label: string;
  maximum: number;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span>{props.label}</span>
      <textarea rows={3} maxLength={props.maximum} value={props.value} onChange={(event) => props.onChange(event.target.value)} />
    </label>
  );
}
