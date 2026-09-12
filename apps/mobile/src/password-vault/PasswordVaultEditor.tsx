import { useState, type FormEvent } from "react";
import { generatePassword, type VaultCredential } from "@diarydock/password-vault";

type Draft = Omit<VaultCredential, "createdAt" | "updatedAt">;
export function PasswordVaultEditor(props: {
  value: VaultCredential | null;
  busy: boolean;
  onClose: () => void;
  onSave: (draft: Draft) => Promise<void>;
}) {
  const source = props.value;
  const [draft, setDraft] = useState<Draft>(() =>
    source
      ? {
          id: source.id,
          name: source.name,
          username: source.username,
          password: source.password,
          website: source.website,
          notes: source.notes,
        }
      : { id: crypto.randomUUID(), name: "", username: "", password: "", website: "", notes: "" },
  );
  const [show, setShow] = useState(false),
    [error, setError] = useState("");
  const change = (field: keyof Draft, value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!draft.name.trim()) {
      setError("Add an account name.");
      return;
    }
    try {
      await props.onSave({ ...draft, name: draft.name.trim() });
      props.onClose();
    } catch {
      /* parent reports */
    }
  }
  return (
    <div
      className="password-vault-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-vault-edit-title"
    >
      <form onSubmit={submit} className="password-vault-editor">
        <header>
          <div>
            <small>Encrypted item</small>
            <h2 id="mobile-vault-edit-title">{source ? "Edit account" : "Add account"}</h2>
          </div>
          <button type="button" onClick={props.onClose}>
            Close
          </button>
        </header>
        <label>
          Account or service
          <input
            value={draft.name}
            onChange={(event) => change("name", event.target.value)}
            maxLength={160}
            autoComplete="off"
            autoFocus
          />
        </label>
        <label>
          Username or email
          <input
            value={draft.username}
            onChange={(event) => change("username", event.target.value)}
            maxLength={512}
            autoComplete="off"
          />
        </label>
        <label>
          Password
          <span className="password-vault-input-row">
            <input
              aria-label="Password"
              type={show ? "text" : "password"}
              value={draft.password}
              onChange={(event) => change("password", event.target.value)}
              maxLength={2048}
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setShow((value) => !value)}>
              {show ? "Hide" : "Show"}
            </button>
          </span>
        </label>
        <button
          type="button"
          className="password-vault-generate"
          onClick={() => {
            change("password", generatePassword());
            setShow(true);
          }}
        >
          Generate strong password
        </button>
        <label>
          Website
          <input
            value={draft.website}
            onChange={(event) => change("website", event.target.value)}
            maxLength={2048}
            autoComplete="off"
            inputMode="url"
          />
        </label>
        <label>
          Private notes
          <textarea
            value={draft.notes}
            onChange={(event) => change("notes", event.target.value)}
            maxLength={8192}
          />
        </label>
        {error ? (
          <p className="password-vault-error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="password-vault-primary" disabled={props.busy}>
          {props.busy ? "Encrypting…" : "Encrypt and save"}
        </button>
      </form>
    </div>
  );
}
