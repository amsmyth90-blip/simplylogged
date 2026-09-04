"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { UiIcon, type IconName } from "@/components/UiIcon";
import { IntakeItemCard } from "@/components/intake/IntakeItemCard";
import {
  intakeCategory as categoryForRoom,
  intakeDocumentKind as kindForMail,
  intakeRoomId as roomIdFromName,
  intakeSourceCards as sourceCards,
  type IntakeAction,
} from "@/components/intake/intake-rules";
import type { MailItem } from "@/lib/diarydock-data";
import { roomDetails, type Reminder, type RoomDocument, type VaultDocument } from "@/lib/mock-data";
import { upsertStructuredDocument, upsertStructuredReminder } from "@/lib/structured-data";

export function IntakeWorkspace() {
  const { state, updateState, repositoryMode } = useDiaryDockData();
  const [filter, setFilter] = useState<MailItem["routeStatus"] | "all">("new");
  const [message, setMessage] = useState("Ready to sort incoming items.");

  const counts = useMemo(() => {
    const total = state.mailboxItems.length;
    const fresh = state.mailboxItems.filter((item) => item.routeStatus === "new").length;
    const filed = state.mailboxItems.filter((item) => item.routeStatus === "vault" || item.routeStatus === "room").length;
    const followUps = state.mailboxItems.filter((item) => item.routeStatus === "reminder").length;

    return { total, fresh, filed, followUps };
  }, [state.mailboxItems]);

  const visibleItems = useMemo(() => {
    if (filter === "all") {
      return state.mailboxItems;
    }

    return state.mailboxItems.filter((item) => item.routeStatus === filter);
  }, [filter, state.mailboxItems]);

  const routeItem = (item: MailItem, target: IntakeAction) => {
    const roomId = roomIdFromName(item.suggestedRoom);
    const room = roomDetails[roomId] ?? roomDetails.office;
    const routeStatus = target;
    const timestamp = Date.now();
    const documentId = crypto.randomUUID();
    const reminderId = crypto.randomUUID();
    const nextDocument: VaultDocument | null =
      target === "vault"
        ? {
            id: documentId,
            title: item.title,
            category: categoryForRoom(room.id),
            kind: kindForMail(item),
            size: "Pending review",
            updated: "Just now",
            roomId: room.id,
            roomName: room.name,
            issuer: item.source,
            reviewStatus: "needs-review",
            reviewReasons: ["Filed from Intake Queue"]
          }
        : null;
    const nextReminder: Reminder | null =
      target === "reminder"
        ? {
            id: reminderId,
            title: `Review ${item.title}`,
            note: `${item.source} arrived in the Intake Queue and needs a decision.`,
            roomId: room.id,
            roomName: room.name,
            group: "today",
            timeLabel: "Today",
            priority: item.kind === "Bill" ? "high" : "normal"
          }
        : null;
    const nextRoomDocument: RoomDocument | null =
      target === "room"
        ? {
            id: `${room.id}-intake-${item.id}-${timestamp}`,
            title: item.title,
            kind: kindForMail(item),
            size: "Pending review",
            updated: "Just now"
          }
        : null;

    updateState((current) => ({
      ...current,
      mailboxItems: current.mailboxItems.map((entry) =>
        entry.id === item.id ? { ...entry, routeStatus } : entry
      ),
      vaultDocuments: nextDocument
        ? [nextDocument, ...current.vaultDocuments.filter((document) => document.id !== nextDocument.id)]
        : current.vaultDocuments,
      reminders: nextReminder
        ? [nextReminder, ...current.reminders.filter((reminder) => reminder.id !== nextReminder.id)]
        : current.reminders,
      roomDocuments: nextRoomDocument
        ? {
            ...current.roomDocuments,
            [room.id]: [nextRoomDocument, ...(current.roomDocuments[room.id] ?? [])]
          }
        : current.roomDocuments,
      roomActivity:
        target === "ignored"
          ? current.roomActivity
          : {
              ...current.roomActivity,
              [room.id]: [
                {
                  id: `${room.id}-intake-activity-${timestamp}`,
                  text:
                    target === "vault"
                      ? `Saved ${item.title} to All Files from Intake`
                      : target === "reminder"
                        ? `Created a follow-up reminder for ${item.title}`
                        : `Sent ${item.title} into ${room.name}`,
                  when: "Just now",
                  by: "DiaryDock"
                },
                ...(current.roomActivity[room.id] ?? [])
              ]
            }
    }));

    if (repositoryMode === "supabase") {
      if (nextDocument) void upsertStructuredDocument(nextDocument);
      if (nextReminder) void upsertStructuredReminder(nextReminder);
    }

    const nextMessage =
      target === "vault"
        ? `${item.title} was saved to All Files.`
        : target === "reminder"
          ? `${item.title} now has a reminder.`
          : target === "room"
            ? `${item.title} was sent to ${room.name}.`
            : `${item.title} was ignored.`;

    setMessage(nextMessage);
  };

  return (
    <div className="immersive-page">
      <PageHeader
        eyebrow="Mailbox"
        title="Intake Queue"
        subtitle="A calm place for bills, appointments, letters, shared files and scans before they are filed into the right room."
        backHref="/dashboard"
        backLabel="Estate map"
        heroImage="/images/pages/mailbox-hero.webp"
        heroPosition="center 48%"
        heroTone="linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(71,59,38,0.15) 40%, rgba(37,31,23,0.56) 100%)"
        badge="Incoming"
        action={
          <Link
            href="/capture"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/14 text-white shadow-[0_18px_30px_-22px_rgba(15,23,42,0.45)] backdrop-blur-md"
            aria-label="Scan a document"
          >
            <UiIcon name="plus" className="h-5 w-5" />
          </Link>
        }
        meta={
          <>
            <span className="estate-chip border-white/30 bg-white/14 text-white/82">{counts.fresh} new</span>
            <span className="estate-chip border-white/30 bg-white/14 text-white/82">{counts.filed} filed</span>
            <span className="estate-chip border-white/30 bg-white/14 text-white/82">{counts.followUps} follow-ups</span>
          </>
        }
      />

      <section className="relative z-20 estate-sheet p-5 sm:-mt-20 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: "Incoming", value: counts.total, icon: "mail" as IconName },
            { label: "Needs filing", value: counts.fresh, icon: "alert" as IconName },
            { label: "Filed", value: counts.filed, icon: "folder" as IconName },
            { label: "Follow-ups", value: counts.followUps, icon: "calendar" as IconName }
          ].map((item) => (
            <article key={item.label} className="rounded-[24px] border border-white/70 bg-white/58 p-4 shadow-[0_20px_40px_-32px_rgba(54,44,24,0.24)]">
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sage/55 text-moss">
                  <UiIcon name={item.icon} className="h-4 w-4" />
                </span>
                <span className="text-[28px] font-semibold tracking-tight text-ink">{item.value}</span>
              </div>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/45">{item.label}</p>
            </article>
          ))}
        </div>

        <p className="mt-4 rounded-2xl border border-white/70 bg-white/55 px-4 py-3 text-sm text-ink/60">
          {message}
        </p>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Intake sources" hint="What can feed into this queue" actionLabel="Scan now" actionHref="/capture" />
        <div className="grid gap-3 sm:grid-cols-3">
          {sourceCards.map((card) => (
            <article key={card.title} className="estate-sheet p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-ink shadow-soft">
                  <UiIcon name={card.icon} className="h-4 w-4" />
                </span>
                <span className="rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/50">
                  {card.badge}
                </span>
              </div>
              <h2 className="mt-4 text-base font-semibold text-ink">{card.title}</h2>
              <p className="mt-1.5 text-sm leading-6 text-ink/58">{card.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionHeader title="To be filed" hint="Confirm where DiaryDock should put each item" />
          <div className="flex rounded-full border border-white/70 bg-white/60 p-1 shadow-soft backdrop-blur-md">
            {(["new", "all"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  filter === item ? "bg-ink text-white shadow-soft" : "text-ink/55 hover:bg-white/70"
                }`}
              >
                {item === "new" ? "Needs filing" : "All"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {visibleItems.map((item) => (
            <IntakeItemCard key={item.id} item={item} onRoute={routeItem} />
          ))}

          {!visibleItems.length ? (
            <div className="estate-sheet p-6 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage/55 text-moss">
                <UiIcon name="check" className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-ink">Nothing waiting right now</h2>
              <p className="mt-2 text-sm leading-6 text-ink/58">
                New scans, shared documents and future email imports will appear here for confirmation.
              </p>
              <Link href="/capture" className="mt-4 inline-flex rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-soft">
                Scan a document
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
