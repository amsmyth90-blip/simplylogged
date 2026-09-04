"use client";

import { useEffect, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { UiIcon } from "@/components/UiIcon";

export function AnalyticsPrivacyWorkspace() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetch("/api/product-analytics", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as {
          enabled?: boolean;
          error?: string;
        };
        if (!response.ok)
          throw new Error(
            payload.error || "Your preference could not be loaded.",
          );
        setEnabled(Boolean(payload.enabled));
      })
      .catch((error) =>
        setMessage(
          error instanceof Error
            ? error.message
            : "Your preference could not be loaded.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const changeConsent = async (next: boolean) => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/product-analytics", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "SET_CONSENT", enabled: next }),
      });
      const payload = (await response.json()) as {
        enabled?: boolean;
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || "Your preference could not be saved.");
      setEnabled(Boolean(payload.enabled));
      setMessage(
        next
          ? "Anonymous product usage is now on. You can switch it off and delete your events at any time."
          : "Product analytics is off and your stored product events have been deleted.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Your preference could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 pb-28">
      <PageHeader
        eyebrow="Privacy control"
        title="Help improve DiaryDock"
        subtitle="Choose whether DiaryDock may record a small set of anonymous-style product events. This is off until you opt in."
        backHref="/settings"
        backLabel="Settings"
        meta={
          <>
            <span className="estate-chip">Off by default</span>
            <span className="estate-chip">90-day retention</span>
          </>
        }
      />
      {message ? (
        <p
          role="status"
          className="rounded-[18px] border border-[#6f8e72]/15 bg-white/80 px-4 py-3 text-sm text-[#52705a]"
        >
          {message}
        </p>
      ) : null}

      <section className="estate-sheet p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8efe5] text-[#52705a]">
            <UiIcon name="chart" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl">Product usage analytics</h2>
                <p className="mt-1 text-sm text-[#667068]">
                  {loading
                    ? "Opening your choice…"
                    : enabled
                      ? "On — only approved event names and safe categories are recorded."
                      : "Off — no product usage events are stored."}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                disabled={loading || busy}
                onClick={() => void changeConsent(!enabled)}
                className={`relative h-8 w-14 rounded-full transition ${enabled ? "bg-[#315443]" : "bg-slate-300"} disabled:opacity-45`}
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${enabled ? "left-7" : "left-1"}`}
                />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="estate-sheet p-5">
        <h2 className="font-serif text-xl">What can be recorded</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {[
            "Setup or onboarding completed",
            "First useful actions, such as adding a document or reminder",
            "Guardian, Physical Link and Ask DiaryDock first use",
            "Organisation score band — never the underlying answers",
            "Return-use day and broad subscription tier",
          ].map((item) => (
            <div
              key={item}
              className="flex items-start gap-2 rounded-2xl bg-white/65 px-3 py-3 text-xs leading-5 text-[#667068]"
            >
              <UiIcon
                name="check"
                className="mt-0.5 h-4 w-4 shrink-0 text-[#52705a]"
              />
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="estate-sheet p-5">
        <h2 className="font-serif text-xl">What is never included</h2>
        <p className="mt-1 text-sm leading-6 text-[#667068]">
          The event service rejects unknown names and properties at both the
          server and database.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {[
            "Questions or AI answers",
            "Document titles, text, filenames or notes",
            "Names, email addresses, phone numbers or addresses",
            "Policy, account, registration or serial numbers",
            "Vault keys, recovery material or file contents",
            "Security audit-event contents",
          ].map((item) => (
            <div
              key={item}
              className="flex items-start gap-2 rounded-2xl bg-white/65 px-3 py-3 text-xs leading-5 text-[#667068]"
            >
              <UiIcon
                name="shield"
                className="mt-0.5 h-4 w-4 shrink-0 text-[#52705a]"
              />
              {item}
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs leading-5 text-[#667068]">
        DiaryDock stores opted-in product events in its existing Supabase
        project, separate from security audit records, and automatically expires
        them after 90 days. Switching this off deletes your stored product
        events immediately. No advertising or cross-site tracking is used.
      </p>
    </div>
  );
}
