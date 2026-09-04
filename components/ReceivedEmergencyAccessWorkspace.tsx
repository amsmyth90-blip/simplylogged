"use client";

import { useEffect, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { UiIcon } from "@/components/UiIcon";

type ReceivedGrant = {
  id: string;
  resource_type: string;
  label: string;
  snapshot: Record<string, unknown>;
  granted_at: string;
  trusted_emergency_contacts:
    | { name?: string; relation?: string; status?: string }
    | Array<{ name?: string; relation?: string; status?: string }>;
};
type AccessNotice = {
  id: string;
  event_type: string;
  label: string;
  created_at: string;
};
const text = (value: unknown) => (typeof value === "string" ? value : "");

export function ReceivedEmergencyAccessWorkspace() {
  const [grants, setGrants] = useState<ReceivedGrant[]>([]);
  const [notices, setNotices] = useState<AccessNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch("/api/emergency-access", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as {
          received?: ReceivedGrant[];
          notifications?: AccessNotice[];
          error?: string;
        };
        if (!response.ok)
          throw new Error(
            payload.error || "Shared emergency access could not be loaded.",
          );
        setGrants(payload.received ?? []);
        setNotices(payload.notifications ?? []);
      })
      .catch((caught) =>
        setError(
          caught instanceof Error
            ? caught.message
            : "Shared emergency access could not be loaded.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);
  return (
    <div className="space-y-5 pb-28">
      <PageHeader
        eyebrow="Trusted access"
        title="Shared with me"
        subtitle="Only the emergency items another DiaryDock user explicitly selected for you appear here."
        backHref="/dashboard"
        backLabel="Home"
        meta={
          <>
            <span className="estate-chip">Limited view</span>
            <span className="estate-chip">Read only</span>
          </>
        }
      />
      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}
      {loading ? (
        <div className="estate-sheet p-5 text-sm text-[#667068]">
          Loading shared items…
        </div>
      ) : grants.length ? (
        <div className="space-y-3">
          {grants.map((grant) => {
            const snapshot = grant.snapshot || {};
            const steps = Array.isArray(snapshot.steps)
              ? snapshot.steps.filter(
                  (item): item is string => typeof item === "string",
                )
              : [];
            return (
              <article key={grant.id} className="estate-sheet p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef2e9] text-[#52705a]">
                    <UiIcon
                      name={
                        grant.resource_type === "CONTACT"
                          ? "phone"
                          : grant.resource_type === "DOCUMENT"
                            ? "file"
                            : "shield"
                      }
                      className="h-4 w-4"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6f8e72]">
                      {grant.resource_type.replace("_", " ")}
                    </p>
                    <h2 className="mt-1 font-serif text-xl">{grant.label}</h2>
                  </div>
                </div>
                {text(snapshot.summary) ? (
                  <p className="mt-3 text-sm leading-6 text-[#667068]">
                    {text(snapshot.summary)}
                  </p>
                ) : null}
                {text(snapshot.value) ? (
                  <p className="mt-3 text-sm font-medium">
                    {text(snapshot.value)}
                  </p>
                ) : null}
                {text(snapshot.phone) ? (
                  <a
                    href={`tel:${text(snapshot.phone).replace(/\s/g, "")}`}
                    className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#315443] px-4 text-sm font-semibold text-white"
                  >
                    <UiIcon name="phone" className="h-4 w-4" />
                    {text(snapshot.phone)}
                  </a>
                ) : null}
                {steps.length ? (
                  <ol className="mt-3 space-y-2">
                    {steps.map((step, index) => (
                      <li
                        key={`${grant.id}-${index}`}
                        className="flex gap-2 text-sm leading-6"
                      >
                        <span className="font-semibold text-[#52705a]">
                          {index + 1}.
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                ) : null}
                {grant.resource_type === "DOCUMENT" && snapshot.downloadable ? (
                  <a
                    href={`/api/emergency-access/file/${grant.id}`}
                    rel="noreferrer"
                    className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#315443] px-4 text-sm font-semibold text-white"
                  >
                    Open selected document
                  </a>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="estate-sheet p-5">
          <h2 className="font-serif text-xl">Nothing shared with you</h2>
          <p className="mt-2 text-sm leading-6 text-[#667068]">
            You have no active trusted emergency grants. Revoked items disappear
            immediately.
          </p>
        </div>
      )}
      {notices.length ? (
        <section className="estate-sheet p-5">
          <h2 className="font-serif text-xl">Recent changes</h2>
          <div className="mt-3 space-y-2">
            {notices.slice(0, 8).map((notice) => (
              <p key={notice.id} className="text-xs text-[#667068]">
                {notice.event_type.replaceAll("_", " ").toLowerCase()}{" "}
                {notice.label ? `· ${notice.label}` : ""}
              </p>
            ))}
          </div>
        </section>
      ) : null}
      <p className="text-xs leading-5 text-[#667068]">
        This view is not an emergency service. For urgent help, contact the
        relevant emergency service or professional directly.
      </p>
    </div>
  );
}
