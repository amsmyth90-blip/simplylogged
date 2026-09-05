import { useState } from "react";

import { BrandMark } from "@mobile/components/BrandMark";

type OfflineStorageErrorScreenProps = {
  message: string;
  onRetry: () => Promise<void>;
  onReturnToSignIn: () => Promise<void>;
};

export function OfflineStorageErrorScreen(props: OfflineStorageErrorScreenProps) {
  const [working, setWorking] = useState(false);

  async function run(action: () => Promise<void>) {
    if (working) return;
    setWorking(true);
    try {
      await action();
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="mobile-shell">
      <section className="auth-card" aria-labelledby="offline-storage-title">
        <header className="auth-card-header">
          <BrandMark />
          <p className="eyebrow">Secure storage</p>
          <h1 id="offline-storage-title">DiaryDock could not finish opening</h1>
          <p>Retry the encrypted storage check or return to sign in.</p>
        </header>
        <div className="auth-confirmation">
          <p className="form-message form-error" role="alert">{props.message}</p>
          <button type="button" disabled={working} onClick={() => void run(props.onRetry)}>
            {working ? "Checking…" : "Try again"}
          </button>
          <button className="auth-text-button" type="button" disabled={working}
            onClick={() => void run(props.onReturnToSignIn)}>
            Return to sign in
          </button>
        </div>
      </section>
    </main>
  );
}
