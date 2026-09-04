import { useEffect, useState } from "react";

import type { DocumentSummary } from "@diarydock/documents";
import { type OfflineStore, tryCacheFile } from "@diarydock/offline-store";

import { downloadDocumentFile } from "./document-file-client";

type ViewerState =
  | { status: "ERROR"; message: string }
  | { status: "LOADING" }
  | { status: "READY"; availableOffline: boolean; mimeType: string; url: string };

type DocumentViewerProps = {
  accessToken: string;
  document: DocumentSummary;
  onClose: () => void;
  store: OfflineStore;
};

function objectUrl(bytes: Uint8Array, mimeType: string) {
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return URL.createObjectURL(new Blob([data], { type: mimeType }));
}

export function DocumentViewer(props: DocumentViewerProps) {
  const [state, setState] = useState<ViewerState>({ status: "LOADING" });

  useEffect(() => {
    let active = true;
    let currentUrl: string | null = null;
    void (async () => {
      try {
        const version = props.document.fileVersion ?? props.document.revision;
        const cached = await props.store.getCachedFile(props.document.id, version);
        const file = cached ?? await downloadDocumentFile(props.document.id, props.accessToken);
        const availableOffline = Boolean(cached) || await tryCacheFile(props.store, {
            documentId: props.document.id,
            version,
            ...file,
          });
        if (!active) return;
        currentUrl = objectUrl(file.bytes, file.mimeType);
        setState({ status: "READY", availableOffline, mimeType: file.mimeType, url: currentUrl });
      } catch {
        if (active) setState({
          status: "ERROR",
          message: navigator.onLine
            ? "This file could not be opened safely."
            : "This file is not cached on this device yet. Connect once to make it available offline.",
        });
      }
    })();
    return () => {
      active = false;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [props.accessToken, props.document, props.store]);

  return (
    <div className="document-viewer-backdrop">
      <section className="document-viewer" role="dialog" aria-modal="true" aria-labelledby="viewer-title">
        <header>
          <div><p className="eyebrow">Secure file</p><h2 id="viewer-title">{props.document.title}</h2></div>
          <button type="button" className="quiet-button" onClick={props.onClose}>Close</button>
        </header>
        <div className="viewer-content">
          {state.status === "LOADING" ? <p>Opening and checking this file…</p> : null}
          {state.status === "ERROR" ? <p className="form-message form-error">{state.message}</p> : null}
          {state.status === "READY" && state.mimeType.startsWith("image/") ? (
            // Blob URLs are local, integrity-checked content and cannot use Next.js image optimization.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={state.url} alt={props.document.title} />
          ) : null}
          {state.status === "READY" && state.mimeType === "application/pdf" ? (
            <iframe src={state.url} title={props.document.title} sandbox="allow-same-origin" />
          ) : null}
        </div>
        {state.status === "READY" ? <footer>{state.availableOffline
          ? "Encrypted copy available offline on this device"
          : "Open now · this device could not retain an offline copy"}</footer> : null}
      </section>
    </div>
  );
}
