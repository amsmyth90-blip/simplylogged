import { useEffect, useState } from "react";

import type {
  EmergencyAccessDirectory,
  ReceivedEmergencyGrant,
} from "@diarydock/emergency-access";

import { BrandMark } from "@mobile/components/BrandMark";
import { ProgressiveRecordList } from "@mobile/components/ProgressiveRecordList";
import { ReceivedAccess } from "./ReceivedAccess";
import { ReceivedDocumentViewer } from "./ReceivedDocumentViewer";
import { TrustedContactForm } from "./TrustedContactForm";
import { TrustedPeople } from "./TrustedPeople";
import { TrustedResources } from "./TrustedResources";
import { useEmergencyAccess } from "./use-emergency-access";

export function TrustedAccessScreen(props: {
  accessToken: string;
  disableOnline?: boolean;
  initialDirectory?: EmergencyAccessDirectory;
  onBack: () => void;
}) {
  const model = useEmergencyAccess(props);
  const [mode, setMode] = useState<"RECEIVED" | "SHARING">("SHARING");
  const [selectedId, setSelectedId] = useState("");
  const [viewer, setViewer] = useState<ReceivedEmergencyGrant | null>(null);
  const directory = model.directory;
  useEffect(() => {
    if (
      !directory ||
      directory.contacts.some((contact) => contact.id === selectedId)
    )
      return;
    setSelectedId(
      directory.contacts.find((contact) => contact.status !== "REVOKED")?.id ??
        "",
    );
  }, [directory, selectedId]);
  const selected = directory?.contacts.find(
    (contact) => contact.id === selectedId,
  );
  return (
    <main className="trusted-screen">
      <header className="trusted-header">
        <button
          type="button"
          onClick={props.onBack}
          aria-label="Back to Emergency"
        >
          ‹
        </button>
        <div>
          <BrandMark />
          <span>
            <strong>Trusted access</strong>
            <small>Limited and revocable</small>
          </span>
        </div>
        <span className={model.online ? "trusted-online" : "trusted-offline"}>
          {model.online ? "Online" : "Offline"}
        </span>
      </header>
      <section className="trusted-hero">
        <p className="trusted-kicker">Emergency sharing</p>
        <h1>A narrow view for people you trust.</h1>
        <p>
          Choose each item individually. Trusted people never receive your whole
          account or Vault.
        </p>
        <div>
          <span>Nothing shared by default</span>
          <span>14-day invitations</span>
          <span>Revocable</span>
        </div>
      </section>
      <nav className="trusted-tabs" aria-label="Trusted access views">
        <button
          type="button"
          aria-current={mode === "SHARING" ? "page" : undefined}
          onClick={() => setMode("SHARING")}
        >
          My sharing <span>{directory?.contacts.length ?? 0}</span>
        </button>
        <button
          type="button"
          aria-current={mode === "RECEIVED" ? "page" : undefined}
          onClick={() => setMode("RECEIVED")}
        >
          Shared with me <span>{directory?.received.length ?? 0}</span>
        </button>
      </nav>
      {model.error ? (
        <p className="trusted-message" role="alert">
          {model.error}{" "}
          <button type="button" onClick={() => void model.refresh()}>
            Try again
          </button>
        </p>
      ) : null}
      {model.loading ? (
        <p className="trusted-message">Loading current trusted access…</p>
      ) : null}
      {directory && mode === "SHARING" ? (
        <div className="trusted-content">
          <section className="trusted-safety trusted-card">
            <span>♢</span>
            <div>
              <h2>A narrow emergency view</h2>
              <p>
                Invitations must be accepted by the invited email. Changes
                require a recent sign-in and are recorded in the security
                history.
              </p>
            </div>
          </section>
          <TrustedContactForm
            busy={model.busy}
            invitePath={model.invitePath}
            onClearInvite={() => model.setInvitePath(null)}
            onMutate={model.mutate}
          />
          <TrustedPeople
            busy={model.busy}
            contacts={directory.contacts}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMutate={model.mutate}
          />
          {selected && selected.status !== "REVOKED" ? (
            <TrustedResources
              busy={model.busy}
              contact={selected}
              resources={directory.resources}
              onMutate={model.mutate}
            />
          ) : null}
          {directory.notifications.length ? (
            <section className="trusted-card trusted-notices">
              <p className="trusted-kicker">Security history</p>
              <h2>Recent access changes</h2>
              <ProgressiveRecordList
                initialCount={8}
                items={directory.notifications}
                noun="access changes"
                renderItem={(notice) => (
                <p key={notice.id}>
                  <span>
                    {notice.eventType.replaceAll("_", " ").toLowerCase()}
                    {notice.label ? ` · ${notice.label}` : ""}
                  </span>
                  <time dateTime={notice.createdAt}>
                    {new Intl.DateTimeFormat("en-GB", {
                      dateStyle: "medium",
                    }).format(new Date(notice.createdAt))}
                  </time>
                </p>
                )}
              />
            </section>
          ) : null}
        </div>
      ) : null}
      {directory && mode === "RECEIVED" ? (
        <ReceivedAccess
          grants={directory.received}
          onOpenDocument={setViewer}
        />
      ) : null}
      {!model.loading && !directory ? (
        <section className="trusted-card trusted-empty-state">
          <h2>Connect to open trusted access</h2>
          <p>
            This screen is deliberately not stored offline so revoked access
            cannot remain available from an old directory.
          </p>
        </section>
      ) : null}
      <footer className="trusted-footer">
        DiaryDock never releases information automatically after inactivity or
        death. This view is not an emergency service.
      </footer>
      {viewer ? (
        <ReceivedDocumentViewer
          accessToken={props.accessToken}
          grant={viewer}
          onClose={() => setViewer(null)}
        />
      ) : null}
    </main>
  );
}
