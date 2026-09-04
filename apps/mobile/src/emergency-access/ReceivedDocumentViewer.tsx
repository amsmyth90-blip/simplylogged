import { useEffect, useState } from "react";

import type { ReceivedEmergencyGrant } from "@diarydock/emergency-access";

import { downloadReceivedEmergencyFile } from "./received-file-client";

type State =
  | { status: "ERROR"; message: string }
  | { status: "LOADING" }
  | { status: "READY"; mimeType: string; url: string };

export function ReceivedDocumentViewer(props: {
  accessToken: string;
  grant: ReceivedEmergencyGrant;
  onClose: () => void;
}) {
  const [state, setState] = useState<State>({ status: "LOADING" });
  useEffect(() => {
    let active = true;
    let url: string | null = null;
    void downloadReceivedEmergencyFile(props.grant.id, props.accessToken).then((file) => {
      if (!active) return;
      const buffer = file.bytes.buffer.slice(
        file.bytes.byteOffset,
        file.bytes.byteOffset + file.bytes.byteLength,
      ) as ArrayBuffer;
      url = URL.createObjectURL(new Blob([buffer], { type: file.mimeType }));
      setState({ status: "READY", mimeType: file.mimeType, url });
    }).catch((reason) => {
      if (active) setState({
        status: "ERROR",
        message: reason instanceof Error ? reason.message : "This shared document could not be opened.",
      });
    });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [props.accessToken, props.grant]);
  return (
    <div className="document-viewer-backdrop">
      <section className="document-viewer" role="dialog" aria-modal="true" aria-labelledby="received-viewer-title">
        <header><div><p className="eyebrow">Revocable shared file</p><h2 id="received-viewer-title">{props.grant.label}</h2></div><button type="button" className="quiet-button" onClick={props.onClose}>Close</button></header>
        <div className="viewer-content">
          {state.status === "LOADING" ? <p>Checking current access and opening this file…</p> : null}
          {state.status === "ERROR" ? <p className="form-message form-error">{state.message}</p> : null}
          {state.status === "READY" && state.mimeType.startsWith("image/") ? (
            // Blob URLs are already-downloaded, integrity-checked local content.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={state.url} alt={props.grant.label} />
          ) : null}
          {state.status === "READY" && state.mimeType === "application/pdf" ? <iframe src={state.url} title={props.grant.label} sandbox="allow-same-origin" /> : null}
        </div>
        <footer>Access is checked online each time and this shared file is not cached.</footer>
      </section>
    </div>
  );
}
