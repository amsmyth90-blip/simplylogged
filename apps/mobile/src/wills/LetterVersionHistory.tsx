import { useState } from "react";

import type { MobileLetterContentVersion } from "@diarydock/wills";

type Attempt = { id: string; createdAt: string };

type Props = {
  busy: boolean;
  letterId: string;
  online: boolean;
  versions: MobileLetterContentVersion[];
  onRestore: (
    letterId: string,
    versionId: string,
    newVersionId: string,
    createdAt: string,
  ) => Promise<boolean>;
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function LetterVersionHistory(props: Props) {
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({});
  const versions = [...props.versions].sort((left, right) =>
    right.versionNumber - left.versionNumber,
  );

  function restore(versionId: string) {
    const attempt = attempts[versionId] ?? {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    if (!attempts[versionId]) {
      setAttempts((current) => ({ ...current, [versionId]: attempt }));
    }
    return props.onRestore(
      props.letterId,
      versionId,
      attempt.id,
      attempt.createdAt,
    );
  }

  if (!versions.length) return null;

  return (
    <div className="wills-editor-section">
      <h3>Version history</h3>
      <p className="wills-inline-note">
        Earlier letter bodies stay on the secure server and are not copied to
        the offline history. Restoring creates a new version.
      </p>
      <div className="wills-letter-history">
        {versions.map((version, index) => (
          <article key={version.id}>
            <div>
              <strong>Version {version.versionNumber}</strong>
              <small>{formatDate(version.createdAt)} · {version.title}</small>
            </div>
            <button
              type="button"
              disabled={index === 0 || props.busy || !props.online}
              onClick={() => void restore(version.id)}
            >
              {index === 0 ? "Current" : "Restore"}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
