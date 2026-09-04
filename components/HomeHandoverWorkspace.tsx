"use client";

import Link from "next/link";

import { HandoverSharing } from "@/components/home-handover/HandoverSharing";
import { useHomeHandover } from "@/components/home-handover/useHomeHandover";
import { PageHeader } from "@/components/PageHeader";
import { UiIcon } from "@/components/UiIcon";

export function HomeHandoverWorkspace() {
  const handover = useHomeHandover();
  const {
    busyKey,
    candidates,
    createDraft,
    draft,
    exclusions,
    items,
    loading,
    message,
    name,
    publication,
    publish,
    received,
    recipientEmail,
    revoke,
    selectedKeys,
    setName,
    setRecipientEmail,
    toggleItem,
  } = handover;

  return (
    <div className="space-y-5 pb-28">
      <PageHeader
        eyebrow="Home Handover"
        title="Prepare useful home information"
        subtitle="Prepare selected appliance, boiler and property information, then grant one person time-limited read-only access."
        backHref="/settings"
        backLabel="Settings"
        meta={
          <>
            <span className="estate-chip">Private draft</span>
            <span className="estate-chip">Explicit selection only</span>
          </>
        }
      />

      {message ? (
        <div
          role="status"
          className="rounded-[18px] border border-[#6f8e72]/15 bg-white/80 px-4 py-3 text-sm text-[#52705a]"
        >
          {message}
          {message.includes("sign in again") ? (
            <Link href="/login" className="ml-2 font-semibold underline">
              Sign in again
            </Link>
          ) : null}
        </div>
      ) : null}

      <section className="estate-sheet p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8efe5] text-[#52705a]">
            <UiIcon name="home" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-serif text-xl">
              Deliberate and revocable
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#667068]">
              DiaryDock records a minimal preview for each selected item. Nothing
              is shared automatically: you choose one email, review the list and
              can revoke access at any time.
            </p>
          </div>
        </div>
      </section>

      {!draft && !loading ? (
        <section className="estate-sheet p-5">
          <h2 className="font-serif text-xl">Start a private draft</h2>
          <form
            onSubmit={createDraft}
            className="mt-4 flex flex-col gap-3 sm:flex-row"
          >
            <label className="min-w-0 flex-1 text-xs font-semibold text-[#667068]">
              Draft name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                className="form-control"
              />
            </label>
            <button
              disabled={busyKey === "create" || !name.trim()}
              className="min-h-12 self-end rounded-[15px] bg-[#315443] px-5 text-sm font-semibold text-white disabled:opacity-45"
            >
              Create private draft
            </button>
          </form>
        </section>
      ) : null}

      {draft ? (
        <>
          <section className="space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#789078]">
                Draft
              </p>
              <h2 className="font-serif text-2xl">{draft.name}</h2>
              <p className="mt-1 text-sm text-[#667068]">
                Choose each item deliberately. Eligible property documents
                appear only when linked to an eligible home item.
              </p>
            </div>
            <div className="estate-sheet divide-y divide-white/70 overflow-hidden">
              {candidates.length ? (
                candidates.map((candidate) => {
                  const key = `${candidate.resourceType}:${candidate.resourceId}`;
                  const selected = selectedKeys.has(key);
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef2e9] text-[#52705a]">
                        <UiIcon
                          name={candidate.resourceType === "DOCUMENT" ? "file" : "gear"}
                          className="h-4 w-4"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {candidate.label}
                        </span>
                        <span className="block truncate text-xs text-[#667068]">
                          {candidate.detail || "Property item"}
                        </span>
                      </span>
                      <button
                        disabled={Boolean(busyKey)}
                        onClick={() => void toggleItem(candidate)}
                        className={`min-h-10 rounded-xl px-3 text-xs font-semibold ${selected ? "bg-red-50 text-red-600" : "bg-[#315443] text-white"}`}
                      >
                        {selected ? "Remove" : "Add"}
                      </button>
                    </div>
                  );
                })
              ) : (
                <p className="p-5 text-sm leading-6 text-[#667068]">
                  No eligible appliances, boilers or equipment are available
                  yet. Add them under Physical Links first; personal documents
                  are never offered here.
                </p>
              )}
            </div>
          </section>

          <section className="estate-sheet p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl">Private preview</h2>
                <p className="mt-1 text-sm text-[#667068]">
                  {items.length} explicitly selected{" "}
                  {items.length === 1 ? "item" : "items"}
                </p>
              </div>
              <span className="rounded-full bg-[#eef2e9] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#52705a]">
                Not shared
              </span>
            </div>
            {items.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[20px] border border-[#315443]/10 bg-white/75 p-4"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#789078]">
                      {item.resourceType === "ASSET"
                        ? "Home item"
                        : "Property document"}
                    </p>
                    <h3 className="mt-2 font-semibold">
                      {item.label}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-[#667068]">
                      {item.detail || "Only the minimal handover preview is stored."}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-2xl bg-white/65 p-4 text-sm text-[#667068]">
                Nothing selected. Your draft remains empty and private.
              </p>
            )}
          </section>
        </>
      ) : null}

      <HandoverSharing busyKey={busyKey} draftExists={Boolean(draft)} itemCount={items.length}
        publication={publication} received={received} recipientEmail={recipientEmail}
        onRecipientEmailChange={setRecipientEmail} onPublish={publish} onRevoke={revoke} />

      <section className="estate-sheet p-5">
        <h2 className="font-serif text-xl">Always excluded</h2>
        <p className="mt-1 text-sm leading-6 text-[#667068]">
          These categories are blocked by the handover data model, not merely
          hidden in the screen.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {exclusions.map((exclusion) => (
            <div
              key={exclusion}
              className="flex items-center gap-2 rounded-2xl bg-white/65 px-3 py-3 text-xs font-semibold text-[#667068]"
            >
              <UiIcon
                name="shield"
                className="h-4 w-4 shrink-0 text-[#52705a]"
              />
              {exclusion}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
